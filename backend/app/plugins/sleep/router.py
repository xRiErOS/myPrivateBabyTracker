"""Sleep plugin CRUD router — all endpoints require auth."""

from collections import defaultdict
from datetime import date, datetime, timedelta

from fastapi import APIRouter, Depends, Query
from sqlalchemy import and_, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.errors import NotFoundError, ValidationError
from app.database import get_session
from app.logging import get_logger
from app.middleware.auth import get_current_user
from app.models.child import Child
from app.models.user import User
from app.plugins.sleep.models import SleepEntry
from app.models.tag import delete_entry_tags
from app.plugins.sleep.schemas import (
    SleepChartResponse,
    SleepCreate,
    SleepDayPoint,
    SleepResponse,
    SleepType,
    SleepUpdate,
)

logger = get_logger("sleep")

router = APIRouter(prefix="/sleep", tags=["sleep"])


def _compute_duration(start_time: datetime, end_time: datetime | None) -> int | None:
    """Compute duration in minutes from start and end time.

    Handles mixed naive/aware datetimes by normalizing to UTC.
    """
    if end_time is None:
        return None
    # Normalize: strip tzinfo for subtraction (both should be UTC)
    st = start_time.replace(tzinfo=None) if start_time.tzinfo else start_time
    et = end_time.replace(tzinfo=None) if end_time.tzinfo else end_time
    delta = et - st
    return int(delta.total_seconds() / 60)


async def _check_overlap(
    db: AsyncSession,
    child_id: int,
    start_time: datetime,
    end_time: datetime | None,
    exclude_id: int | None = None,
) -> None:
    """Raise ValidationError if a sleep entry overlaps the given time range.

    Overlap logic:
    - Two finished entries overlap when: new_start < existing_end AND new_end > existing_start
    - An ongoing entry (end_time=NULL) overlaps with anything that starts after its start_time
    - A new ongoing entry overlaps with anything that ends after its start_time (or is also ongoing)
    """
    conditions = [SleepEntry.child_id == child_id]

    if exclude_id is not None:
        conditions.append(SleepEntry.id != exclude_id)

    # Build overlap condition:
    # existing overlaps new when:
    #   existing_start < new_end (or new_end is NULL → always true)
    #   AND existing_end > new_start (or existing_end is NULL → always true)
    if end_time is not None:
        start_before_new_end = SleepEntry.start_time < end_time
    else:
        # New entry is ongoing → any existing entry's start is "before new end"
        start_before_new_end = True  # noqa: F841 — replaced below
        # Simplify: ongoing new entry overlaps if existing_end > new_start OR existing is also ongoing
        start_before_new_end = True

    if end_time is not None:
        overlap_cond = and_(
            SleepEntry.start_time < end_time,
            or_(
                SleepEntry.end_time.is_(None),
                SleepEntry.end_time > start_time,
            ),
        )
    else:
        # New entry is ongoing: overlaps if existing hasn't ended before new_start
        overlap_cond = or_(
            SleepEntry.end_time.is_(None),
            SleepEntry.end_time > start_time,
        )

    conditions.append(overlap_cond)

    stmt = select(SleepEntry).where(*conditions).limit(1)
    result = await db.execute(stmt)
    existing = result.scalar_one_or_none()

    if existing is not None:
        existing_start = existing.start_time.isoformat() if existing.start_time else "?"
        raise ValidationError(
            f"Ueberlappender Schlaf-Eintrag existiert "
            f"(ID: {existing.id}, Start: {existing_start})"
        )


@router.post("/", response_model=SleepResponse, status_code=201)
async def create_sleep(
    data: SleepCreate,
    user: User | None = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    """Create a new sleep entry."""
    await _check_overlap(db, data.child_id, data.start_time, data.end_time)

    entry = SleepEntry(
        child_id=data.child_id,
        start_time=data.start_time,
        end_time=data.end_time,
        duration_minutes=_compute_duration(data.start_time, data.end_time),
        sleep_type=data.sleep_type.value,
        location=data.location,
        quality=data.quality,
        notes=data.notes,
    )
    db.add(entry)
    await db.commit()
    await db.refresh(entry)
    logger.info("sleep_created", entry_id=entry.id, child_id=entry.child_id)
    return entry


@router.get("/", response_model=list[SleepResponse])
async def list_sleep(
    child_id: int | None = Query(default=None, gt=0),
    date_from: datetime | None = Query(default=None),
    date_to: datetime | None = Query(default=None),
    sleep_type: SleepType | None = Query(default=None),
    user: User | None = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    """List sleep entries with optional filters."""
    stmt = select(SleepEntry).order_by(SleepEntry.start_time.desc())

    if child_id is not None:
        stmt = stmt.where(SleepEntry.child_id == child_id)
    if date_from is not None:
        stmt = stmt.where(SleepEntry.start_time >= date_from)
    if date_to is not None:
        stmt = stmt.where(SleepEntry.start_time <= date_to)
    if sleep_type is not None:
        stmt = stmt.where(SleepEntry.sleep_type == sleep_type.value)

    result = await db.execute(stmt)
    return result.scalars().all()


# ---------------------------------------------------------------------------
# Sleep target hours by age (NSF/AAP recommendations)
# ---------------------------------------------------------------------------

_SLEEP_TARGETS: list[tuple[int, float, float, str]] = [
    # (max_age_months, min_hours, max_hours, label)
    (3, 14.0, 17.0, "0-3 Monate"),
    (11, 12.0, 15.0, "4-11 Monate"),
    (24, 11.0, 14.0, "1-2 Jahre"),
    (60, 10.0, 13.0, "3-5 Jahre"),
]


def _get_sleep_target(child: Child) -> tuple[float, float, str]:
    """Return (min_hours, max_hours, age_group) for a child's current age."""
    today = date.today()
    # Use corrected age for preterm babies
    ref_date = (
        child.estimated_birth_date
        if child.is_preterm and child.estimated_birth_date
        else child.birth_date
    )
    age_months = (today.year - ref_date.year) * 12 + (today.month - ref_date.month)
    for max_months, min_h, max_h, label in _SLEEP_TARGETS:
        if age_months <= max_months:
            return min_h, max_h, label
    # Fallback for children older than 5
    return 9.0, 12.0, "5+ Jahre"


def _split_sleep_by_day(
    start: datetime, end: datetime
) -> list[tuple[date, float]]:
    """Split a sleep entry across midnight boundaries.

    Returns list of (date, hours) tuples.
    """
    # Normalize to naive UTC
    st = start.replace(tzinfo=None) if start.tzinfo else start
    et = end.replace(tzinfo=None) if end.tzinfo else end

    result: list[tuple[date, float]] = []
    current = st
    while current.date() < et.date():
        # Remaining hours until midnight
        midnight = datetime(current.year, current.month, current.day) + timedelta(days=1)
        hours = (midnight - current).total_seconds() / 3600
        result.append((current.date(), hours))
        current = midnight
    # Last segment (or only segment if no midnight crossing)
    hours = (et - current).total_seconds() / 3600
    if hours > 0:
        result.append((current.date(), hours))
    return result


@router.get("/chart", response_model=SleepChartResponse)
async def sleep_chart(
    child_id: int = Query(..., gt=0),
    days: int = Query(default=30, ge=1, le=365),
    user: User | None = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    """Return aggregated daily sleep data for charting."""
    # Load child
    result = await db.execute(select(Child).where(Child.id == child_id))
    child = result.scalar_one_or_none()
    if child is None:
        raise NotFoundError(f"Child with id {child_id} not found")

    # Date range
    today = date.today()
    start_date = today - timedelta(days=days - 1)
    start_dt = datetime(start_date.year, start_date.month, start_date.day)

    # Fetch all completed sleep entries in range
    stmt = (
        select(SleepEntry)
        .where(
            SleepEntry.child_id == child_id,
            SleepEntry.end_time.isnot(None),
            SleepEntry.start_time >= start_dt,
        )
        .order_by(SleepEntry.start_time)
    )
    entries_result = await db.execute(stmt)
    entries = entries_result.scalars().all()

    # Aggregate by day with midnight splitting
    nap_by_day: dict[date, float] = defaultdict(float)
    night_by_day: dict[date, float] = defaultdict(float)

    for entry in entries:
        segments = _split_sleep_by_day(entry.start_time, entry.end_time)
        for day, hours in segments:
            if entry.sleep_type == "nap":
                nap_by_day[day] += hours
            else:
                night_by_day[day] += hours

    # Build measurements for each day in range
    measurements: list[SleepDayPoint] = []
    current_date = start_date
    while current_date <= today:
        nap_h = round(nap_by_day.get(current_date, 0.0), 2)
        night_h = round(night_by_day.get(current_date, 0.0), 2)
        total_h = round(nap_h + night_h, 2)
        measurements.append(
            SleepDayPoint(
                date=current_date.isoformat(),
                total_hours=total_h,
                nap_hours=nap_h,
                night_hours=night_h,
            )
        )
        current_date += timedelta(days=1)

    target_min, target_max, age_group = _get_sleep_target(child)

    return SleepChartResponse(
        child_name=child.name,
        is_preterm=child.is_preterm,
        measurements=measurements,
        target_min_hours=target_min,
        target_max_hours=target_max,
        age_group=age_group,
    )


@router.get("/{entry_id}", response_model=SleepResponse)
async def get_sleep(
    entry_id: int,
    user: User | None = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    """Get a sleep entry by ID."""
    result = await db.execute(select(SleepEntry).where(SleepEntry.id == entry_id))
    entry = result.scalar_one_or_none()
    if entry is None:
        raise NotFoundError(f"Sleep entry with id {entry_id} not found")
    return entry


@router.patch("/{entry_id}", response_model=SleepResponse)
async def update_sleep(
    entry_id: int,
    data: SleepUpdate,
    user: User | None = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    """Update a sleep entry (partial update)."""
    result = await db.execute(select(SleepEntry).where(SleepEntry.id == entry_id))
    entry = result.scalar_one_or_none()
    if entry is None:
        raise NotFoundError(f"Sleep entry with id {entry_id} not found")

    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        if field == "sleep_type" and value is not None:
            setattr(entry, field, value.value if hasattr(value, "value") else value)
        else:
            setattr(entry, field, value)

    # Check overlap with updated times (exclude own entry)
    await _check_overlap(
        db, entry.child_id, entry.start_time, entry.end_time, exclude_id=entry.id
    )

    # Recompute duration if times changed
    entry.duration_minutes = _compute_duration(entry.start_time, entry.end_time)

    await db.commit()
    await db.refresh(entry)
    logger.info("sleep_updated", entry_id=entry.id, fields=list(update_data.keys()))
    return entry


@router.delete("/{entry_id}", status_code=204)
async def delete_sleep(
    entry_id: int,
    user: User | None = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    """Delete a sleep entry."""
    result = await db.execute(select(SleepEntry).where(SleepEntry.id == entry_id))
    entry = result.scalar_one_or_none()
    if entry is None:
        raise NotFoundError(f"Sleep entry with id {entry_id} not found")

    await delete_entry_tags(db, "sleep", entry.id)
    await db.delete(entry)
    await db.commit()
    logger.info("sleep_deleted", entry_id=entry_id)
