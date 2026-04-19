"""Sleep plugin CRUD router — all endpoints require auth."""

from datetime import datetime

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.errors import NotFoundError
from app.database import get_session
from app.logging import get_logger
from app.middleware.auth import get_current_user
from app.models.user import User
from app.plugins.sleep.models import SleepEntry
from app.plugins.sleep.schemas import SleepCreate, SleepResponse, SleepType, SleepUpdate

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


@router.post("/", response_model=SleepResponse, status_code=201)
async def create_sleep(
    data: SleepCreate,
    user: User | None = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    """Create a new sleep entry."""
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

    await db.delete(entry)
    await db.commit()
    logger.info("sleep_deleted", entry_id=entry_id)
