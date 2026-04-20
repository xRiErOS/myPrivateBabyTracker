"""Todo plugin CRUD router — all endpoints require auth."""

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.errors import NotFoundError
from app.database import get_session
from app.logging import get_logger
from app.middleware.auth import get_current_user
from app.models.user import User
from app.plugins.todo.models import TodoEntry
from app.plugins.todo.schemas import TodoCreate, TodoResponse, TodoUpdate

logger = get_logger("todo")

router = APIRouter(prefix="/todo", tags=["todo"])


@router.post("/", response_model=TodoResponse, status_code=201)
async def create_todo(
    data: TodoCreate,
    user: User | None = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    """Create a new todo entry."""
    entry = TodoEntry(
        child_id=data.child_id,
        title=data.title,
        details=data.details,
        due_date=data.due_date,
    )
    db.add(entry)
    await db.commit()
    await db.refresh(entry)
    logger.info("todo_created", entry_id=entry.id, child_id=entry.child_id)
    return entry


@router.get("/", response_model=list[TodoResponse])
async def list_todos(
    child_id: int | None = Query(default=None, gt=0),
    show_done: bool = Query(default=True),
    user: User | None = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    """List todo entries with optional filters."""
    stmt = select(TodoEntry).order_by(TodoEntry.is_done, TodoEntry.created_at.desc())

    if child_id is not None:
        stmt = stmt.where(TodoEntry.child_id == child_id)
    if not show_done:
        stmt = stmt.where(TodoEntry.is_done == False)  # noqa: E712

    result = await db.execute(stmt)
    return result.scalars().all()


@router.get("/{entry_id}", response_model=TodoResponse)
async def get_todo(
    entry_id: int,
    user: User | None = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    """Get a todo entry by ID."""
    result = await db.execute(select(TodoEntry).where(TodoEntry.id == entry_id))
    entry = result.scalar_one_or_none()
    if entry is None:
        raise NotFoundError(f"Todo entry with id {entry_id} not found")
    return entry


@router.patch("/{entry_id}", response_model=TodoResponse)
async def update_todo(
    entry_id: int,
    data: TodoUpdate,
    user: User | None = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    """Update a todo entry (partial update)."""
    result = await db.execute(select(TodoEntry).where(TodoEntry.id == entry_id))
    entry = result.scalar_one_or_none()
    if entry is None:
        raise NotFoundError(f"Todo entry with id {entry_id} not found")

    update_data = data.model_dump(exclude_unset=True)

    # Auto-set completed_at when marking as done
    if "is_done" in update_data:
        if update_data["is_done"] and not entry.is_done:
            entry.completed_at = datetime.now(timezone.utc)
        elif not update_data["is_done"] and entry.is_done:
            entry.completed_at = None

    for field, value in update_data.items():
        setattr(entry, field, value)

    await db.commit()
    await db.refresh(entry)
    logger.info("todo_updated", entry_id=entry.id, fields=list(update_data.keys()))
    return entry


@router.delete("/{entry_id}", status_code=204)
async def delete_todo(
    entry_id: int,
    user: User | None = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    """Delete a todo entry."""
    result = await db.execute(select(TodoEntry).where(TodoEntry.id == entry_id))
    entry = result.scalar_one_or_none()
    if entry is None:
        raise NotFoundError(f"Todo entry with id {entry_id} not found")

    await db.delete(entry)
    await db.commit()
    logger.info("todo_deleted", entry_id=entry_id)
