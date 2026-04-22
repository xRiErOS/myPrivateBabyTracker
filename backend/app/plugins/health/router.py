"""Health plugin CRUD router — all endpoints require auth."""

from datetime import datetime

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.errors import NotFoundError
from app.database import get_session
from app.logging import get_logger
from app.middleware.auth import get_current_user
from app.models.user import User
from app.plugins.health.models import HealthEntry
from app.plugins.health.schemas import (
    HealthCreate,
    HealthEntryType,
    HealthResponse,
    HealthUpdate,
)

logger = get_logger("health")

router = APIRouter(prefix="/health", tags=["health"])


@router.post("/", response_model=HealthResponse, status_code=201)
async def create_health(
    data: HealthCreate,
    user: User | None = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    """Create a new health entry."""
    entry = HealthEntry(
        child_id=data.child_id,
        entry_type=data.entry_type.value,
        severity=data.severity.value,
        duration=data.duration.value if data.duration else None,
        time=data.time,
        notes=data.notes,
        feeding_id=data.feeding_id,
    )
    db.add(entry)
    await db.commit()
    await db.refresh(entry)
    logger.info("health_created", entry_id=entry.id, child_id=entry.child_id)
    return entry


@router.get("/", response_model=list[HealthResponse])
async def list_health(
    child_id: int | None = Query(default=None, gt=0),
    date_from: datetime | None = Query(default=None),
    date_to: datetime | None = Query(default=None),
    entry_type: HealthEntryType | None = Query(default=None),
    user: User | None = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    """List health entries with optional filters."""
    stmt = select(HealthEntry).order_by(HealthEntry.time.desc())

    if child_id is not None:
        stmt = stmt.where(HealthEntry.child_id == child_id)
    if date_from is not None:
        stmt = stmt.where(HealthEntry.time >= date_from)
    if date_to is not None:
        stmt = stmt.where(HealthEntry.time <= date_to)
    if entry_type is not None:
        stmt = stmt.where(HealthEntry.entry_type == entry_type.value)

    result = await db.execute(stmt)
    return result.scalars().all()


@router.get("/{entry_id}", response_model=HealthResponse)
async def get_health(
    entry_id: int,
    user: User | None = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    """Get a health entry by ID."""
    result = await db.execute(select(HealthEntry).where(HealthEntry.id == entry_id))
    entry = result.scalar_one_or_none()
    if entry is None:
        raise NotFoundError(f"Health entry with id {entry_id} not found")
    return entry


@router.patch("/{entry_id}", response_model=HealthResponse)
async def update_health(
    entry_id: int,
    data: HealthUpdate,
    user: User | None = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    """Update a health entry (partial update)."""
    result = await db.execute(select(HealthEntry).where(HealthEntry.id == entry_id))
    entry = result.scalar_one_or_none()
    if entry is None:
        raise NotFoundError(f"Health entry with id {entry_id} not found")

    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        if field in ("entry_type", "severity", "duration") and value is not None:
            setattr(entry, field, value.value if hasattr(value, "value") else value)
        else:
            setattr(entry, field, value)

    await db.commit()
    await db.refresh(entry)
    logger.info("health_updated", entry_id=entry.id, fields=list(update_data.keys()))
    return entry


@router.delete("/{entry_id}", status_code=204)
async def delete_health(
    entry_id: int,
    user: User | None = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    """Delete a health entry."""
    result = await db.execute(select(HealthEntry).where(HealthEntry.id == entry_id))
    entry = result.scalar_one_or_none()
    if entry is None:
        raise NotFoundError(f"Health entry with id {entry_id} not found")

    await db.delete(entry)
    await db.commit()
    logger.info("health_deleted", entry_id=entry_id)
