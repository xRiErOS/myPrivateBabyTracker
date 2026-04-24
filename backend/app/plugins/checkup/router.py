"""Checkup (U-Untersuchungen) CRUD router.

Provides endpoints for tracking U1-U9 pediatric checkups including
scheduled dates, measurements, and next-due calculation.
"""

from datetime import date

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.errors import NotFoundError
from app.database import get_session
from app.logging import get_logger
from app.middleware.auth import get_current_user
from app.models.child import Child
from app.models.user import User
from app.plugins.checkup.models import CheckupEntry, CheckupType
from app.plugins.checkup.schemas import (
    CheckupCreate,
    CheckupResponse,
    CheckupTypeResponse,
    CheckupUpdate,
    NextCheckupResponse,
)

logger = get_logger("checkup")

router = APIRouter(prefix="/checkup", tags=["checkup"])


def _to_response(entry: CheckupEntry) -> CheckupResponse:
    """Convert CheckupEntry to CheckupResponse with type info."""
    return CheckupResponse(
        id=entry.id,
        child_id=entry.child_id,
        checkup_type_id=entry.checkup_type_id,
        checkup_type_name=entry.checkup_type.name,
        checkup_type_display_name=entry.checkup_type.display_name,
        date=entry.date,
        doctor=entry.doctor,
        weight_grams=entry.weight_grams,
        height_cm=entry.height_cm,
        head_circumference_cm=entry.head_circumference_cm,
        notes=entry.notes,
        is_completed=entry.is_completed,
        created_at=entry.created_at,
    )


@router.get("/types", response_model=list[CheckupTypeResponse])
async def list_checkup_types(
    user: User | None = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    """List all available checkup types (U1-U9)."""
    result = await db.execute(select(CheckupType).order_by(CheckupType.id))
    return result.scalars().all()


@router.get("/", response_model=list[CheckupResponse])
async def list_checkups(
    child_id: int | None = Query(default=None, gt=0),
    user: User | None = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    """List all checkup entries, optionally filtered by child."""
    stmt = select(CheckupEntry).order_by(CheckupEntry.date.desc())
    if child_id:
        stmt = stmt.where(CheckupEntry.child_id == child_id)
    result = await db.execute(stmt)
    return [_to_response(e) for e in result.scalars().all()]


@router.get("/next/{child_id}", response_model=NextCheckupResponse | None)
async def get_next_checkup(
    child_id: int,
    user: User | None = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    """Get the next upcoming or overdue checkup for a child."""
    # Load child
    child_result = await db.execute(select(Child).where(Child.id == child_id))
    child = child_result.scalar_one_or_none()
    if child is None:
        raise NotFoundError(f"Child with id {child_id} not found")

    # Load completed checkup type IDs
    completed_result = await db.execute(
        select(CheckupEntry.checkup_type_id)
        .where(CheckupEntry.child_id == child_id, CheckupEntry.is_completed.is_(True))
    )
    completed_type_ids = set(completed_result.scalars().all())

    # Load all checkup types
    types_result = await db.execute(select(CheckupType).order_by(CheckupType.id))
    all_types = types_result.scalars().all()

    # Calculate current age in weeks
    today = date.today()
    age_weeks = (today - child.birth_date).days / 7.0

    # Find next uncompleted checkup
    for ct in all_types:
        if ct.id in completed_type_ids:
            continue

        is_due = age_weeks >= ct.recommended_age_weeks_min
        is_overdue = age_weeks > ct.recommended_age_weeks_max
        days_until = max(0, int((ct.recommended_age_weeks_min * 7) - (today - child.birth_date).days))

        return NextCheckupResponse(
            checkup_type=CheckupTypeResponse.model_validate(ct),
            is_due=is_due,
            is_overdue=is_overdue,
            age_weeks_current=round(age_weeks, 1),
            days_until_due=days_until if not is_due else None,
        )

    return None  # All checkups completed


@router.get("/{entry_id}", response_model=CheckupResponse)
async def get_checkup(
    entry_id: int,
    user: User | None = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    """Get a single checkup entry by ID."""
    result = await db.execute(select(CheckupEntry).where(CheckupEntry.id == entry_id))
    entry = result.scalar_one_or_none()
    if entry is None:
        raise NotFoundError(f"Checkup entry with id {entry_id} not found")
    return _to_response(entry)


@router.post("/", response_model=CheckupResponse, status_code=201)
async def create_checkup(
    data: CheckupCreate,
    user: User | None = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    """Create a new checkup entry."""
    # Verify checkup type exists
    type_result = await db.execute(
        select(CheckupType).where(CheckupType.id == data.checkup_type_id)
    )
    if type_result.scalar_one_or_none() is None:
        raise NotFoundError(f"Checkup type with id {data.checkup_type_id} not found")

    entry = CheckupEntry(**data.model_dump())
    db.add(entry)
    await db.commit()
    await db.refresh(entry)
    logger.info("checkup_created", entry_id=entry.id, child_id=entry.child_id)
    return _to_response(entry)


@router.patch("/{entry_id}", response_model=CheckupResponse)
async def update_checkup(
    entry_id: int,
    data: CheckupUpdate,
    user: User | None = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    """Update a checkup entry (partial update)."""
    result = await db.execute(select(CheckupEntry).where(CheckupEntry.id == entry_id))
    entry = result.scalar_one_or_none()
    if entry is None:
        raise NotFoundError(f"Checkup entry with id {entry_id} not found")

    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(entry, field, value)

    await db.commit()
    await db.refresh(entry)
    logger.info("checkup_updated", entry_id=entry.id)
    return _to_response(entry)


@router.delete("/{entry_id}", status_code=204)
async def delete_checkup(
    entry_id: int,
    user: User | None = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    """Delete a checkup entry."""
    result = await db.execute(select(CheckupEntry).where(CheckupEntry.id == entry_id))
    entry = result.scalar_one_or_none()
    if entry is None:
        raise NotFoundError(f"Checkup entry with id {entry_id} not found")

    await db.delete(entry)
    await db.commit()
    logger.info("checkup_deleted", entry_id=entry_id)
