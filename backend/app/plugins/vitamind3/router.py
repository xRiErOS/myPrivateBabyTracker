"""VitaminD3 plugin CRUD router — list, create, delete."""

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.errors import NotFoundError, ValidationError
from app.database import get_session
from app.logging import get_logger
from app.middleware.auth import get_current_user
from app.models.user import User
from app.plugins.vitamind3.models import VitaminD3Entry
from app.models.tag import delete_entry_tags
from app.plugins.vitamind3.schemas import VitaminD3Create, VitaminD3Response

logger = get_logger("vitamind3")

router = APIRouter(prefix="/vitamind3", tags=["vitamind3"])


@router.post("/", response_model=VitaminD3Response, status_code=201)
async def create_vitamind3(
    data: VitaminD3Create,
    user: User | None = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    """Record Vitamin D3 given for a child on a specific date.

    Returns 422 if already recorded for that child+date (double-entry protection).
    """
    # Check for duplicate
    result = await db.execute(
        select(VitaminD3Entry).where(
            VitaminD3Entry.child_id == data.child_id,
            VitaminD3Entry.date == data.date,
        )
    )
    existing = result.scalar_one_or_none()
    if existing is not None:
        raise ValidationError(
            f"Vitamin D3 wurde heute bereits erfasst (ID: {existing.id})"
        )

    entry = VitaminD3Entry(
        child_id=data.child_id,
        date=data.date,
    )
    db.add(entry)
    await db.commit()
    await db.refresh(entry)
    logger.info("vitamind3_created", entry_id=entry.id, child_id=entry.child_id, date=data.date)
    return entry


@router.get("/", response_model=list[VitaminD3Response])
async def list_vitamind3(
    child_id: int | None = Query(default=None, gt=0),
    month: str | None = Query(default=None, pattern=r"^\d{4}-\d{2}$"),
    user: User | None = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    """List Vitamin D3 entries. Optional filters: child_id, month (YYYY-MM)."""
    stmt = select(VitaminD3Entry).order_by(VitaminD3Entry.date.desc())

    if child_id is not None:
        stmt = stmt.where(VitaminD3Entry.child_id == child_id)
    if month is not None:
        stmt = stmt.where(VitaminD3Entry.date.startswith(month))

    result = await db.execute(stmt)
    return result.scalars().all()


@router.delete("/{entry_id}", status_code=204)
async def delete_vitamind3(
    entry_id: int,
    user: User | None = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    """Delete a Vitamin D3 entry."""
    result = await db.execute(
        select(VitaminD3Entry).where(VitaminD3Entry.id == entry_id)
    )
    entry = result.scalar_one_or_none()
    if entry is None:
        raise NotFoundError(f"VitaminD3 entry with id {entry_id} not found")

    await delete_entry_tags(db, "vitamind3", entry.id)
    await db.delete(entry)
    await db.commit()
    logger.info("vitamind3_deleted", entry_id=entry_id)
