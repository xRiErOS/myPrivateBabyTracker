"""FastAPI router for the Feeding plugin.

Provides CRUD endpoints under /api/v1/feeding/*.
All routes require authentication.
"""

from datetime import datetime

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.errors import NotFoundError
from app.database import get_session
from app.logging import get_logger
from app.middleware.auth import get_current_user
from app.models.user import User
from app.plugins.feeding.models import FeedingEntry
from app.models.tag import delete_entry_tags
from app.plugins.feeding.schemas import FeedingCreate, FeedingResponse, FeedingUpdate

logger = get_logger("feeding")

router = APIRouter(prefix="/feeding", tags=["feeding"])


@router.post("/", response_model=FeedingResponse, status_code=201)
async def create_feeding(
    data: FeedingCreate,
    user: User | None = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    """Create a new feeding entry."""
    entry = FeedingEntry(
        child_id=data.child_id,
        start_time=data.start_time,
        end_time=data.end_time,
        feeding_type=data.feeding_type,
        amount_ml=data.amount_ml,
        food_type=data.food_type,
        duration_minutes=data.duration_minutes,
        notes=data.notes,
    )
    db.add(entry)
    await db.commit()
    await db.refresh(entry)
    logger.info("feeding_created", entry_id=entry.id, child_id=entry.child_id)
    return entry


@router.get("/", response_model=list[FeedingResponse])
async def list_feedings(
    child_id: int | None = Query(default=None),
    feeding_type: str | None = Query(default=None),
    date_from: datetime | None = Query(default=None),
    date_to: datetime | None = Query(default=None),
    user: User | None = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    """List feeding entries with optional filters."""
    stmt = select(FeedingEntry).order_by(FeedingEntry.start_time.desc())

    if child_id is not None:
        stmt = stmt.where(FeedingEntry.child_id == child_id)
    if feeding_type is not None:
        stmt = stmt.where(FeedingEntry.feeding_type == feeding_type)
    if date_from is not None:
        stmt = stmt.where(FeedingEntry.start_time >= date_from)
    if date_to is not None:
        stmt = stmt.where(FeedingEntry.start_time <= date_to)

    result = await db.execute(stmt)
    return result.scalars().all()


@router.get("/{entry_id}", response_model=FeedingResponse)
async def get_feeding(
    entry_id: int,
    user: User | None = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    """Get a single feeding entry by ID."""
    result = await db.execute(
        select(FeedingEntry).where(FeedingEntry.id == entry_id)
    )
    entry = result.scalar_one_or_none()
    if entry is None:
        raise NotFoundError(f"Feeding entry with id {entry_id} not found")
    return entry


@router.patch("/{entry_id}", response_model=FeedingResponse)
async def update_feeding(
    entry_id: int,
    data: FeedingUpdate,
    user: User | None = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    """Update a feeding entry (partial update)."""
    result = await db.execute(
        select(FeedingEntry).where(FeedingEntry.id == entry_id)
    )
    entry = result.scalar_one_or_none()
    if entry is None:
        raise NotFoundError(f"Feeding entry with id {entry_id} not found")

    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(entry, field, value)

    await db.commit()
    await db.refresh(entry)
    logger.info("feeding_updated", entry_id=entry.id, fields=list(update_data.keys()))
    return entry


@router.delete("/{entry_id}", status_code=204)
async def delete_feeding(
    entry_id: int,
    user: User | None = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    """Delete a feeding entry."""
    result = await db.execute(
        select(FeedingEntry).where(FeedingEntry.id == entry_id)
    )
    entry = result.scalar_one_or_none()
    if entry is None:
        raise NotFoundError(f"Feeding entry with id {entry_id} not found")

    await delete_entry_tags(db, "feeding", entry.id)
    await db.delete(entry)
    await db.commit()
    logger.info("feeding_deleted", entry_id=entry_id)
