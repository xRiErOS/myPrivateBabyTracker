"""MotherHealth plugin CRUD router (MBT-109 + Strukturierung).

Eintragstypen: lochia | pain | mood | note (Discriminated Union).
"""

from fastapi import APIRouter, Body, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.errors import NotFoundError
from app.database import get_session
from app.logging import get_logger
from app.middleware.auth import get_current_user
from app.models.user import User
from app.plugins.motherhealth.models import MotherHealthEntry
from app.plugins.motherhealth.schemas import (
    EntryType,
    MotherHealthCreate,
    MotherHealthResponse,
    MotherHealthUpdate,
)

logger = get_logger("motherhealth")

router = APIRouter(prefix="/motherhealth", tags=["motherhealth"])


def _to_response(entry: MotherHealthEntry) -> MotherHealthResponse:
    return MotherHealthResponse.model_validate(entry)


@router.get("/", response_model=list[MotherHealthResponse])
async def list_entries(
    child_id: int | None = Query(default=None, gt=0),
    entry_type: EntryType | None = Query(default=None),
    user: User | None = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    """List all mother-health entries, optionally filtered by child/type.

    Sorted newest first (created_at desc).
    """
    stmt = select(MotherHealthEntry).order_by(
        MotherHealthEntry.created_at.desc(), MotherHealthEntry.id.desc()
    )
    if child_id:
        stmt = stmt.where(MotherHealthEntry.child_id == child_id)
    if entry_type:
        stmt = stmt.where(MotherHealthEntry.entry_type == entry_type)
    result = await db.execute(stmt)
    return [_to_response(e) for e in result.scalars().all()]


@router.get("/{entry_id}", response_model=MotherHealthResponse)
async def get_entry(
    entry_id: int,
    user: User | None = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    """Get a single mother-health entry by ID."""
    result = await db.execute(
        select(MotherHealthEntry).where(MotherHealthEntry.id == entry_id)
    )
    entry = result.scalar_one_or_none()
    if entry is None:
        raise NotFoundError(f"MotherHealth entry with id {entry_id} not found")
    return _to_response(entry)


@router.post("/", response_model=MotherHealthResponse, status_code=201)
async def create_entry(
    data: MotherHealthCreate = Body(...),
    user: User | None = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    """Create a new mother-health entry (Discriminated Union by entry_type)."""
    payload = data.model_dump()
    entry = MotherHealthEntry(**payload)
    db.add(entry)
    await db.commit()
    await db.refresh(entry)
    logger.info(
        "motherhealth_created",
        entry_id=entry.id,
        child_id=entry.child_id,
        entry_type=entry.entry_type,
    )
    return _to_response(entry)


@router.patch("/{entry_id}", response_model=MotherHealthResponse)
async def update_entry(
    entry_id: int,
    data: MotherHealthUpdate,
    user: User | None = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    """Update a mother-health entry (partial)."""
    result = await db.execute(
        select(MotherHealthEntry).where(MotherHealthEntry.id == entry_id)
    )
    entry = result.scalar_one_or_none()
    if entry is None:
        raise NotFoundError(f"MotherHealth entry with id {entry_id} not found")

    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(entry, field, value)

    await db.commit()
    await db.refresh(entry)
    logger.info("motherhealth_updated", entry_id=entry.id)
    return _to_response(entry)


@router.delete("/{entry_id}", status_code=204)
async def delete_entry(
    entry_id: int,
    user: User | None = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    """Delete a mother-health entry."""
    result = await db.execute(
        select(MotherHealthEntry).where(MotherHealthEntry.id == entry_id)
    )
    entry = result.scalar_one_or_none()
    if entry is None:
        raise NotFoundError(f"MotherHealth entry with id {entry_id} not found")

    await db.delete(entry)
    await db.commit()
    logger.info("motherhealth_deleted", entry_id=entry_id)
