"""Medication plugin CRUD router — all endpoints require auth."""

from datetime import datetime

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.errors import NotFoundError
from app.database import get_session
from app.logging import get_logger
from app.middleware.auth import get_current_user
from app.models.user import User
from app.plugins.medication.models import MedicationEntry
from app.models.tag import delete_entry_tags
from app.plugins.medication.schemas import (
    MedicationCreate,
    MedicationResponse,
    MedicationUpdate,
)

logger = get_logger("medication")

router = APIRouter(prefix="/medication", tags=["medication"])


@router.post("/", response_model=MedicationResponse, status_code=201)
async def create_medication(
    data: MedicationCreate,
    user: User | None = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    """Create a new medication entry."""
    entry = MedicationEntry(
        child_id=data.child_id,
        given_at=data.given_at,
        medication_name=data.medication_name,
        medication_master_id=data.medication_master_id,
        dose=data.dose,
        notes=data.notes,
    )
    db.add(entry)
    await db.commit()
    await db.refresh(entry)
    logger.info(
        "medication_created",
        entry_id=entry.id,
        child_id=entry.child_id,
        name=entry.medication_name,
    )
    return entry


@router.get("/", response_model=list[MedicationResponse])
async def list_medication(
    child_id: int | None = Query(default=None, gt=0),
    date_from: datetime | None = Query(default=None),
    date_to: datetime | None = Query(default=None),
    medication_name: str | None = Query(default=None, max_length=200),
    user: User | None = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    """List medication entries with optional filters."""
    stmt = select(MedicationEntry).order_by(MedicationEntry.given_at.desc())

    if child_id is not None:
        stmt = stmt.where(MedicationEntry.child_id == child_id)
    if date_from is not None:
        stmt = stmt.where(MedicationEntry.given_at >= date_from)
    if date_to is not None:
        stmt = stmt.where(MedicationEntry.given_at <= date_to)
    if medication_name is not None:
        stmt = stmt.where(MedicationEntry.medication_name == medication_name)

    result = await db.execute(stmt)
    return result.scalars().all()


@router.get("/{entry_id}", response_model=MedicationResponse)
async def get_medication(
    entry_id: int,
    user: User | None = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    """Get a medication entry by ID."""
    result = await db.execute(
        select(MedicationEntry).where(MedicationEntry.id == entry_id)
    )
    entry = result.scalar_one_or_none()
    if entry is None:
        raise NotFoundError(f"Medication entry with id {entry_id} not found")
    return entry


@router.patch("/{entry_id}", response_model=MedicationResponse)
async def update_medication(
    entry_id: int,
    data: MedicationUpdate,
    user: User | None = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    """Update a medication entry (partial update)."""
    result = await db.execute(
        select(MedicationEntry).where(MedicationEntry.id == entry_id)
    )
    entry = result.scalar_one_or_none()
    if entry is None:
        raise NotFoundError(f"Medication entry with id {entry_id} not found")

    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(entry, field, value)

    await db.commit()
    await db.refresh(entry)
    logger.info("medication_updated", entry_id=entry.id, fields=list(update_data.keys()))
    return entry


@router.delete("/{entry_id}", status_code=204)
async def delete_medication(
    entry_id: int,
    user: User | None = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    """Delete a medication entry."""
    result = await db.execute(
        select(MedicationEntry).where(MedicationEntry.id == entry_id)
    )
    entry = result.scalar_one_or_none()
    if entry is None:
        raise NotFoundError(f"Medication entry with id {entry_id} not found")

    await delete_entry_tags(db, "medication", entry.id)
    await db.delete(entry)
    await db.commit()
    logger.info("medication_deleted", entry_id=entry_id)
