"""TummyTime plugin CRUD router -- all endpoints require auth."""

from datetime import datetime

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.errors import NotFoundError
from app.database import get_session
from app.logging import get_logger
from app.middleware.auth import get_current_user
from app.models.user import User
from app.plugins.tummytime.models import TummyTimeEntry
from app.plugins.tummytime.schemas import TummyTimeCreate, TummyTimeResponse, TummyTimeUpdate

logger = get_logger("tummytime")

router = APIRouter(prefix="/tummy-time", tags=["tummy-time"])


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


@router.post("/", response_model=TummyTimeResponse, status_code=201)
async def create_tummy_time(
    data: TummyTimeCreate,
    user: User | None = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    """Create a new tummy time entry."""
    entry = TummyTimeEntry(
        child_id=data.child_id,
        start_time=data.start_time,
        end_time=data.end_time,
        duration_minutes=_compute_duration(data.start_time, data.end_time),
        notes=data.notes,
    )
    db.add(entry)
    await db.commit()
    await db.refresh(entry)
    logger.info("tummy_time_created", entry_id=entry.id, child_id=entry.child_id)
    return entry


@router.get("/", response_model=list[TummyTimeResponse])
async def list_tummy_time(
    child_id: int | None = Query(default=None, gt=0),
    date_from: datetime | None = Query(default=None),
    date_to: datetime | None = Query(default=None),
    user: User | None = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    """List tummy time entries with optional filters."""
    stmt = select(TummyTimeEntry).order_by(TummyTimeEntry.start_time.desc())

    if child_id is not None:
        stmt = stmt.where(TummyTimeEntry.child_id == child_id)
    if date_from is not None:
        stmt = stmt.where(TummyTimeEntry.start_time >= date_from)
    if date_to is not None:
        stmt = stmt.where(TummyTimeEntry.start_time <= date_to)

    result = await db.execute(stmt)
    return result.scalars().all()


@router.get("/{entry_id}", response_model=TummyTimeResponse)
async def get_tummy_time(
    entry_id: int,
    user: User | None = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    """Get a tummy time entry by ID."""
    result = await db.execute(select(TummyTimeEntry).where(TummyTimeEntry.id == entry_id))
    entry = result.scalar_one_or_none()
    if entry is None:
        raise NotFoundError(f"Tummy time entry with id {entry_id} not found")
    return entry


@router.patch("/{entry_id}", response_model=TummyTimeResponse)
async def update_tummy_time(
    entry_id: int,
    data: TummyTimeUpdate,
    user: User | None = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    """Update a tummy time entry (partial update)."""
    result = await db.execute(select(TummyTimeEntry).where(TummyTimeEntry.id == entry_id))
    entry = result.scalar_one_or_none()
    if entry is None:
        raise NotFoundError(f"Tummy time entry with id {entry_id} not found")

    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(entry, field, value)

    # Recompute duration if times changed
    entry.duration_minutes = _compute_duration(entry.start_time, entry.end_time)

    await db.commit()
    await db.refresh(entry)
    logger.info("tummy_time_updated", entry_id=entry.id, fields=list(update_data.keys()))
    return entry


@router.delete("/{entry_id}", status_code=204)
async def delete_tummy_time(
    entry_id: int,
    user: User | None = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    """Delete a tummy time entry."""
    result = await db.execute(select(TummyTimeEntry).where(TummyTimeEntry.id == entry_id))
    entry = result.scalar_one_or_none()
    if entry is None:
        raise NotFoundError(f"Tummy time entry with id {entry_id} not found")

    await db.delete(entry)
    await db.commit()
    logger.info("tummy_time_deleted", entry_id=entry_id)
