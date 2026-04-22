"""Diaper plugin CRUD router -- all endpoints require auth."""

from datetime import datetime

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.errors import NotFoundError
from app.database import get_session
from app.logging import get_logger
from app.middleware.auth import get_current_user
from app.models.user import User
from app.plugins.diaper.models import DiaperEntry
from app.models.tag import delete_entry_tags
from app.plugins.diaper.schemas import DiaperCreate, DiaperResponse, DiaperUpdate

logger = get_logger("diaper")

router = APIRouter(prefix="/api/v1/diaper", tags=["diaper"])


@router.get("/", response_model=list[DiaperResponse])
async def list_diaper_entries(
    child_id: int | None = Query(default=None, gt=0),
    diaper_type: str | None = Query(default=None),
    date_from: datetime | None = Query(default=None),
    date_to: datetime | None = Query(default=None),
    user: User | None = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    """List diaper entries with optional filters."""
    stmt = select(DiaperEntry)

    if child_id is not None:
        stmt = stmt.where(DiaperEntry.child_id == child_id)
    if diaper_type is not None:
        stmt = stmt.where(DiaperEntry.diaper_type == diaper_type)
    if date_from is not None:
        stmt = stmt.where(DiaperEntry.time >= date_from)
    if date_to is not None:
        stmt = stmt.where(DiaperEntry.time <= date_to)

    stmt = stmt.order_by(DiaperEntry.time.desc())
    result = await db.execute(stmt)
    return result.scalars().all()


@router.post("/", response_model=DiaperResponse, status_code=201)
async def create_diaper_entry(
    data: DiaperCreate,
    user: User | None = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    """Create a new diaper entry."""
    entry = DiaperEntry(
        child_id=data.child_id,
        time=data.time,
        diaper_type=data.diaper_type.value,
        color=data.color,
        has_rash=data.has_rash,
        notes=data.notes,
    )
    db.add(entry)
    await db.commit()
    await db.refresh(entry)
    logger.info("diaper_entry_created", entry_id=entry.id, child_id=entry.child_id)
    return entry


@router.get("/{entry_id}", response_model=DiaperResponse)
async def get_diaper_entry(
    entry_id: int,
    user: User | None = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    """Get a diaper entry by ID."""
    result = await db.execute(
        select(DiaperEntry).where(DiaperEntry.id == entry_id)
    )
    entry = result.scalar_one_or_none()
    if entry is None:
        raise NotFoundError(f"Diaper entry with id {entry_id} not found")
    return entry


@router.patch("/{entry_id}", response_model=DiaperResponse)
async def update_diaper_entry(
    entry_id: int,
    data: DiaperUpdate,
    user: User | None = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    """Update a diaper entry (partial update)."""
    result = await db.execute(
        select(DiaperEntry).where(DiaperEntry.id == entry_id)
    )
    entry = result.scalar_one_or_none()
    if entry is None:
        raise NotFoundError(f"Diaper entry with id {entry_id} not found")

    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        if field == "diaper_type" and value is not None:
            setattr(entry, field, value.value if hasattr(value, "value") else value)
        else:
            setattr(entry, field, value)

    await db.commit()
    await db.refresh(entry)
    logger.info(
        "diaper_entry_updated",
        entry_id=entry.id,
        fields=list(update_data.keys()),
    )
    return entry


@router.delete("/{entry_id}", status_code=204)
async def delete_diaper_entry(
    entry_id: int,
    user: User | None = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    """Delete a diaper entry."""
    result = await db.execute(
        select(DiaperEntry).where(DiaperEntry.id == entry_id)
    )
    entry = result.scalar_one_or_none()
    if entry is None:
        raise NotFoundError(f"Diaper entry with id {entry_id} not found")

    await delete_entry_tags(db, "diaper", entry.id)
    await db.delete(entry)
    await db.commit()
    logger.info("diaper_entry_deleted", entry_id=entry_id)
