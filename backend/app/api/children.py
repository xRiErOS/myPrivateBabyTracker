"""Children CRUD router — all endpoints require auth."""

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.errors import NotFoundError
from app.database import get_session
from app.logging import get_logger
from app.middleware.auth import get_current_user
from app.models.child import Child
from app.models.user import User
from app.schemas.child import ChildCreate, ChildResponse, ChildUpdate

logger = get_logger("children")

router = APIRouter(prefix="/children", tags=["children"])


@router.get("/", response_model=list[ChildResponse])
async def list_children(
    user: User | None = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    """List all active children."""
    result = await db.execute(
        select(Child).where(Child.is_active.is_(True)).order_by(Child.name)
    )
    return result.scalars().all()


@router.post("/", response_model=ChildResponse, status_code=201)
async def create_child(
    data: ChildCreate,
    user: User | None = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    """Create a new child."""
    child = Child(
        name=data.name,
        birth_date=data.birth_date,
        notes=data.notes,
    )
    db.add(child)
    await db.commit()
    await db.refresh(child)
    logger.info("child_created", child_id=child.id, name=child.name)
    return child


@router.get("/{child_id}", response_model=ChildResponse)
async def get_child(
    child_id: int,
    user: User | None = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    """Get a child by ID."""
    result = await db.execute(select(Child).where(Child.id == child_id))
    child = result.scalar_one_or_none()
    if child is None:
        raise NotFoundError(f"Child with id {child_id} not found")
    return child


@router.patch("/{child_id}", response_model=ChildResponse)
async def update_child(
    child_id: int,
    data: ChildUpdate,
    user: User | None = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    """Update a child (partial update)."""
    result = await db.execute(select(Child).where(Child.id == child_id))
    child = result.scalar_one_or_none()
    if child is None:
        raise NotFoundError(f"Child with id {child_id} not found")

    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(child, field, value)

    await db.commit()
    await db.refresh(child)
    logger.info("child_updated", child_id=child.id, fields=list(update_data.keys()))
    return child


@router.delete("/{child_id}", status_code=204)
async def delete_child(
    child_id: int,
    user: User | None = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    """Soft-delete a child (set is_active=False)."""
    result = await db.execute(select(Child).where(Child.id == child_id))
    child = result.scalar_one_or_none()
    if child is None:
        raise NotFoundError(f"Child with id {child_id} not found")

    child.is_active = False
    await db.commit()
    logger.info("child_deactivated", child_id=child.id)
