"""Temperature plugin CRUD router — all endpoints require auth."""

from datetime import datetime

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.errors import NotFoundError
from app.database import get_session
from app.logging import get_logger
from app.middleware.auth import get_current_user
from app.models.user import User
from app.plugins.temperature.models import TemperatureEntry
from app.plugins.temperature.schemas import (
    TemperatureCreate,
    TemperatureResponse,
    TemperatureUpdate,
)

logger = get_logger("temperature")

router = APIRouter(prefix="/temperature", tags=["temperature"])


@router.post("/", response_model=TemperatureResponse, status_code=201)
async def create_temperature(
    data: TemperatureCreate,
    user: User | None = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    """Create a new temperature measurement."""
    entry = TemperatureEntry(
        child_id=data.child_id,
        measured_at=data.measured_at,
        temperature_celsius=data.temperature_celsius,
        notes=data.notes,
    )
    db.add(entry)
    await db.commit()
    await db.refresh(entry)
    logger.info(
        "temperature_created",
        entry_id=entry.id,
        child_id=entry.child_id,
        celsius=entry.temperature_celsius,
    )
    return entry


@router.get("/", response_model=list[TemperatureResponse])
async def list_temperature(
    child_id: int | None = Query(default=None, gt=0),
    date_from: datetime | None = Query(default=None),
    date_to: datetime | None = Query(default=None),
    user: User | None = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    """List temperature entries with optional filters."""
    stmt = select(TemperatureEntry).order_by(TemperatureEntry.measured_at.desc())

    if child_id is not None:
        stmt = stmt.where(TemperatureEntry.child_id == child_id)
    if date_from is not None:
        stmt = stmt.where(TemperatureEntry.measured_at >= date_from)
    if date_to is not None:
        stmt = stmt.where(TemperatureEntry.measured_at <= date_to)

    result = await db.execute(stmt)
    return result.scalars().all()


@router.get("/{entry_id}", response_model=TemperatureResponse)
async def get_temperature(
    entry_id: int,
    user: User | None = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    """Get a temperature entry by ID."""
    result = await db.execute(
        select(TemperatureEntry).where(TemperatureEntry.id == entry_id)
    )
    entry = result.scalar_one_or_none()
    if entry is None:
        raise NotFoundError(f"Temperature entry with id {entry_id} not found")
    return entry


@router.patch("/{entry_id}", response_model=TemperatureResponse)
async def update_temperature(
    entry_id: int,
    data: TemperatureUpdate,
    user: User | None = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    """Update a temperature entry (partial update)."""
    result = await db.execute(
        select(TemperatureEntry).where(TemperatureEntry.id == entry_id)
    )
    entry = result.scalar_one_or_none()
    if entry is None:
        raise NotFoundError(f"Temperature entry with id {entry_id} not found")

    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(entry, field, value)

    await db.commit()
    await db.refresh(entry)
    logger.info("temperature_updated", entry_id=entry.id, fields=list(update_data.keys()))
    return entry


@router.delete("/{entry_id}", status_code=204)
async def delete_temperature(
    entry_id: int,
    user: User | None = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    """Delete a temperature entry."""
    result = await db.execute(
        select(TemperatureEntry).where(TemperatureEntry.id == entry_id)
    )
    entry = result.scalar_one_or_none()
    if entry is None:
        raise NotFoundError(f"Temperature entry with id {entry_id} not found")

    await db.delete(entry)
    await db.commit()
    logger.info("temperature_deleted", entry_id=entry_id)
