"""MedicationMaster CRUD router — manage predefined medications."""

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.errors import NotFoundError
from app.database import get_session
from app.logging import get_logger
from app.middleware.auth import get_current_user
from app.models.medication_master import MedicationMaster
from app.models.user import User
from app.schemas.medication_master import (
    MedicationMasterCreate,
    MedicationMasterResponse,
    MedicationMasterUpdate,
)

logger = get_logger("medication_masters")

router = APIRouter(prefix="/medication-masters", tags=["medication-masters"])


@router.post("/", response_model=MedicationMasterResponse, status_code=201)
async def create_medication_master(
    data: MedicationMasterCreate,
    user: User | None = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    """Create a new medication master entry."""
    entry = MedicationMaster(
        name=data.name,
        active_ingredient=data.active_ingredient,
        default_unit=data.default_unit,
        notes=data.notes,
    )
    db.add(entry)
    await db.commit()
    await db.refresh(entry)
    logger.info("medication_master_created", entry_id=entry.id, name=entry.name)
    return entry


@router.get("/", response_model=list[MedicationMasterResponse])
async def list_medication_masters(
    active_only: bool = Query(default=True),
    user: User | None = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    """List medication masters, optionally filtered to active only."""
    stmt = select(MedicationMaster).order_by(MedicationMaster.name)
    if active_only:
        stmt = stmt.where(MedicationMaster.is_active == True)  # noqa: E712
    result = await db.execute(stmt)
    return result.scalars().all()


@router.get("/{entry_id}", response_model=MedicationMasterResponse)
async def get_medication_master(
    entry_id: int,
    user: User | None = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    """Get a medication master by ID."""
    result = await db.execute(
        select(MedicationMaster).where(MedicationMaster.id == entry_id)
    )
    entry = result.scalar_one_or_none()
    if entry is None:
        raise NotFoundError(f"Medication master with id {entry_id} not found")
    return entry


@router.patch("/{entry_id}", response_model=MedicationMasterResponse)
async def update_medication_master(
    entry_id: int,
    data: MedicationMasterUpdate,
    user: User | None = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    """Update a medication master (partial update)."""
    result = await db.execute(
        select(MedicationMaster).where(MedicationMaster.id == entry_id)
    )
    entry = result.scalar_one_or_none()
    if entry is None:
        raise NotFoundError(f"Medication master with id {entry_id} not found")

    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(entry, field, value)

    await db.commit()
    await db.refresh(entry)
    logger.info("medication_master_updated", entry_id=entry.id, fields=list(update_data.keys()))
    return entry


@router.delete("/{entry_id}", status_code=204)
async def delete_medication_master(
    entry_id: int,
    user: User | None = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    """Delete a medication master."""
    result = await db.execute(
        select(MedicationMaster).where(MedicationMaster.id == entry_id)
    )
    entry = result.scalar_one_or_none()
    if entry is None:
        raise NotFoundError(f"Medication master with id {entry_id} not found")

    await db.delete(entry)
    await db.commit()
    logger.info("medication_master_deleted", entry_id=entry_id)
