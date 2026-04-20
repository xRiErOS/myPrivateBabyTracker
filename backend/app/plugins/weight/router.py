"""Weight plugin CRUD router — all endpoints require auth."""

from datetime import datetime

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.errors import NotFoundError
from app.database import get_session
from app.logging import get_logger
from app.middleware.auth import get_current_user
from app.models.user import User
from app.plugins.weight.models import WeightEntry
from app.plugins.weight.schemas import WeightCreate, WeightResponse, WeightUpdate

logger = get_logger("weight")

router = APIRouter(prefix="/weight", tags=["weight"])


@router.post("/", response_model=WeightResponse, status_code=201)
async def create_weight(
    data: WeightCreate,
    user: User | None = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    """Create a new weight measurement."""
    entry = WeightEntry(
        child_id=data.child_id,
        measured_at=data.measured_at,
        weight_grams=data.weight_grams,
        notes=data.notes,
    )
    db.add(entry)
    await db.commit()
    await db.refresh(entry)
    logger.info(
        "weight_created",
        entry_id=entry.id,
        child_id=entry.child_id,
        grams=entry.weight_grams,
    )
    return entry


@router.get("/", response_model=list[WeightResponse])
async def list_weight(
    child_id: int | None = Query(default=None, gt=0),
    date_from: datetime | None = Query(default=None),
    date_to: datetime | None = Query(default=None),
    user: User | None = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    """List weight entries with optional filters."""
    stmt = select(WeightEntry).order_by(WeightEntry.measured_at.desc())

    if child_id is not None:
        stmt = stmt.where(WeightEntry.child_id == child_id)
    if date_from is not None:
        stmt = stmt.where(WeightEntry.measured_at >= date_from)
    if date_to is not None:
        stmt = stmt.where(WeightEntry.measured_at <= date_to)

    result = await db.execute(stmt)
    return result.scalars().all()


@router.get("/{entry_id}", response_model=WeightResponse)
async def get_weight(
    entry_id: int,
    user: User | None = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    """Get a weight entry by ID."""
    result = await db.execute(
        select(WeightEntry).where(WeightEntry.id == entry_id)
    )
    entry = result.scalar_one_or_none()
    if entry is None:
        raise NotFoundError(f"Weight entry with id {entry_id} not found")
    return entry


@router.patch("/{entry_id}", response_model=WeightResponse)
async def update_weight(
    entry_id: int,
    data: WeightUpdate,
    user: User | None = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    """Update a weight entry (partial update)."""
    result = await db.execute(
        select(WeightEntry).where(WeightEntry.id == entry_id)
    )
    entry = result.scalar_one_or_none()
    if entry is None:
        raise NotFoundError(f"Weight entry with id {entry_id} not found")

    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(entry, field, value)

    await db.commit()
    await db.refresh(entry)
    logger.info("weight_updated", entry_id=entry.id, fields=list(update_data.keys()))
    return entry


@router.delete("/{entry_id}", status_code=204)
async def delete_weight(
    entry_id: int,
    user: User | None = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    """Delete a weight entry."""
    result = await db.execute(
        select(WeightEntry).where(WeightEntry.id == entry_id)
    )
    entry = result.scalar_one_or_none()
    if entry is None:
        raise NotFoundError(f"Weight entry with id {entry_id} not found")

    await db.delete(entry)
    await db.commit()
    logger.info("weight_deleted", entry_id=entry_id)
