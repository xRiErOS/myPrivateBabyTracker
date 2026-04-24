"""Todo plugin CRUD router — entries + templates for recurring tasks + habits."""

from datetime import date, datetime, timedelta, timezone

from fastapi import APIRouter, Depends, Query
from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.errors import NotFoundError
from app.database import get_session
from app.logging import get_logger
from app.middleware.auth import get_current_user
from app.models.user import User
from app.plugins.todo.models import Habit, HabitCompletion, TodoEntry, TodoTemplate
from app.models.tag import delete_entry_tags
from app.plugins.todo.schemas import (
    HabitCreate,
    HabitResponse,
    HabitUpdate,
    HabitCompletionResponse,
    TodoCreate,
    TodoResponse,
    TodoTemplateCreate,
    TodoTemplateResponse,
    TodoTemplateUpdate,
    TodoUpdate,
)

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

    await delete_entry_tags(db, "todo", entry.id)
    await db.delete(entry)
    await db.commit()
    logger.info("todo_deleted", entry_id=entry_id)


# ---------------------------------------------------------------------------
# Todo Templates (Recurring Tasks)
# ---------------------------------------------------------------------------

template_router = APIRouter(prefix="/todo-templates", tags=["todo-templates"])


@template_router.post("/", response_model=TodoTemplateResponse, status_code=201)
async def create_template(
    data: TodoTemplateCreate,
    user: User | None = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    """Create a new todo template."""
    template = TodoTemplate(
        child_id=data.child_id,
        title=data.title,
        details=data.details,
    )
    db.add(template)
    await db.commit()
    await db.refresh(template)
    logger.info("todo_template_created", template_id=template.id, child_id=template.child_id)
    return template


@template_router.get("/", response_model=list[TodoTemplateResponse])
async def list_templates(
    child_id: int | None = Query(default=None, gt=0),
    active_only: bool = Query(default=True),
    user: User | None = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    """List todo templates with optional filters."""
    stmt = select(TodoTemplate).order_by(TodoTemplate.title)

    if child_id is not None:
        stmt = stmt.where(TodoTemplate.child_id == child_id)
    if active_only:
        stmt = stmt.where(TodoTemplate.is_active == True)  # noqa: E712

    result = await db.execute(stmt)
    return result.scalars().all()


@template_router.patch("/{template_id}", response_model=TodoTemplateResponse)
async def update_template(
    template_id: int,
    data: TodoTemplateUpdate,
    user: User | None = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    """Update a todo template."""
    result = await db.execute(select(TodoTemplate).where(TodoTemplate.id == template_id))
    template = result.scalar_one_or_none()
    if template is None:
        raise NotFoundError(f"Todo template with id {template_id} not found")

    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(template, field, value)

    await db.commit()
    await db.refresh(template)
    logger.info("todo_template_updated", template_id=template.id)
    return template


@template_router.delete("/{template_id}", status_code=204)
async def delete_template(
    template_id: int,
    user: User | None = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    """Delete a todo template."""
    result = await db.execute(select(TodoTemplate).where(TodoTemplate.id == template_id))
    template = result.scalar_one_or_none()
    if template is None:
        raise NotFoundError(f"Todo template with id {template_id} not found")

    await db.delete(template)
    await db.commit()
    logger.info("todo_template_deleted", template_id=template_id)


@template_router.post("/{template_id}/clone", response_model=TodoResponse, status_code=201)
async def clone_template_to_today(
    template_id: int,
    user: User | None = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    """Clone a template to a new todo entry with due_date = today."""
    result = await db.execute(select(TodoTemplate).where(TodoTemplate.id == template_id))
    template = result.scalar_one_or_none()
    if template is None:
        raise NotFoundError(f"Todo template with id {template_id} not found")

    now = datetime.now(timezone.utc)
    entry = TodoEntry(
        child_id=template.child_id,
        title=template.title,
        details=template.details,
        due_date=now,
        template_id=template.id,
    )
    db.add(entry)
    await db.commit()
    await db.refresh(entry)
    logger.info("todo_cloned_from_template", entry_id=entry.id, template_id=template_id)
    return entry


# ---------------------------------------------------------------------------
# Habits
# ---------------------------------------------------------------------------

habit_router = APIRouter(prefix="/habits", tags=["habits"])


def _calculate_streak(completions: list[HabitCompletion], recurrence: str, weekdays_str: str | None) -> int:
    """Calculate current streak for a habit based on completion history."""
    if not completions:
        return 0

    today = date.today()
    completed_dates = {c.completed_date for c in completions}

    if recurrence == "daily":
        streak = 0
        check_date = today
        while check_date in completed_dates:
            streak += 1
            check_date -= timedelta(days=1)
        return streak
    else:
        # Weekly — check each expected weekday going backwards
        if not weekdays_str:
            return 0
        weekdays = [int(x) for x in weekdays_str.split(",") if x.strip()]
        if not weekdays:
            return 0

        streak = 0
        check_date = today
        # Walk back up to 365 days
        for _ in range(365):
            if check_date.weekday() in weekdays:
                if check_date in completed_dates:
                    streak += 1
                else:
                    break
            check_date -= timedelta(days=1)
        return streak


async def _build_habit_response(habit: Habit) -> dict:
    """Build HabitResponse dict with computed streak and today's completion."""
    today = date.today()
    completed_today = any(c.completed_date == today for c in habit.completions)
    streak = _calculate_streak(habit.completions, habit.recurrence, habit.weekdays)

    # Parse weekdays
    weekdays = None
    if habit.weekdays:
        weekdays = [int(x) for x in habit.weekdays.split(",") if x.strip()]

    return {
        "id": habit.id,
        "child_id": habit.child_id,
        "title": habit.title,
        "details": habit.details,
        "recurrence": habit.recurrence,
        "weekdays": weekdays,
        "is_active": habit.is_active,
        "streak": streak,
        "completed_today": completed_today,
        "created_at": habit.created_at,
    }


@habit_router.post("/", response_model=HabitResponse, status_code=201)
async def create_habit(
    data: HabitCreate,
    user: User | None = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    """Create a new habit."""
    weekdays_str = ",".join(str(d) for d in data.weekdays) if data.weekdays else None
    habit = Habit(
        child_id=data.child_id,
        title=data.title,
        details=data.details,
        recurrence=data.recurrence,
        weekdays=weekdays_str,
    )
    db.add(habit)
    await db.commit()
    await db.refresh(habit)
    logger.info("habit_created", habit_id=habit.id, child_id=habit.child_id)
    return await _build_habit_response(habit)


@habit_router.get("/", response_model=list[HabitResponse])
async def list_habits(
    child_id: int | None = Query(default=None, gt=0),
    active_only: bool = Query(default=True),
    user: User | None = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    """List habits with streak and today's completion status."""
    stmt = select(Habit).order_by(Habit.title)

    if child_id is not None:
        stmt = stmt.where(Habit.child_id == child_id)
    if active_only:
        stmt = stmt.where(Habit.is_active == True)  # noqa: E712

    result = await db.execute(stmt)
    habits = result.scalars().all()
    return [await _build_habit_response(h) for h in habits]


@habit_router.get("/{habit_id}", response_model=HabitResponse)
async def get_habit(
    habit_id: int,
    user: User | None = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    """Get a habit by ID."""
    result = await db.execute(select(Habit).where(Habit.id == habit_id))
    habit = result.scalar_one_or_none()
    if habit is None:
        raise NotFoundError(f"Habit with id {habit_id} not found")
    return await _build_habit_response(habit)


@habit_router.patch("/{habit_id}", response_model=HabitResponse)
async def update_habit(
    habit_id: int,
    data: HabitUpdate,
    user: User | None = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    """Update a habit (partial update)."""
    result = await db.execute(select(Habit).where(Habit.id == habit_id))
    habit = result.scalar_one_or_none()
    if habit is None:
        raise NotFoundError(f"Habit with id {habit_id} not found")

    update_data = data.model_dump(exclude_unset=True)

    # Convert weekdays list to comma-separated string
    if "weekdays" in update_data:
        wd = update_data.pop("weekdays")
        update_data["weekdays"] = ",".join(str(d) for d in wd) if wd else None

    for field, value in update_data.items():
        setattr(habit, field, value)

    await db.commit()
    await db.refresh(habit)
    logger.info("habit_updated", habit_id=habit.id)
    return await _build_habit_response(habit)


@habit_router.delete("/{habit_id}", status_code=204)
async def delete_habit(
    habit_id: int,
    user: User | None = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    """Delete a habit and all its completions."""
    result = await db.execute(select(Habit).where(Habit.id == habit_id))
    habit = result.scalar_one_or_none()
    if habit is None:
        raise NotFoundError(f"Habit with id {habit_id} not found")
    await db.delete(habit)
    await db.commit()
    logger.info("habit_deleted", habit_id=habit_id)


@habit_router.post("/{habit_id}/complete", response_model=HabitCompletionResponse, status_code=201)
async def complete_habit(
    habit_id: int,
    user: User | None = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    """Mark a habit as completed for today. Idempotent — returns existing if already done."""
    result = await db.execute(select(Habit).where(Habit.id == habit_id))
    habit = result.scalar_one_or_none()
    if habit is None:
        raise NotFoundError(f"Habit with id {habit_id} not found")

    today = date.today()
    existing = await db.execute(
        select(HabitCompletion).where(
            and_(HabitCompletion.habit_id == habit_id, HabitCompletion.completed_date == today)
        )
    )
    completion = existing.scalar_one_or_none()
    if completion is not None:
        return completion

    completion = HabitCompletion(
        habit_id=habit_id,
        child_id=habit.child_id,
        completed_date=today,
        completed_at=datetime.now(timezone.utc),
    )
    db.add(completion)
    await db.commit()
    await db.refresh(completion)
    logger.info("habit_completed", habit_id=habit_id, date=str(today))
    return completion


@habit_router.delete("/{habit_id}/complete", status_code=204)
async def uncomplete_habit(
    habit_id: int,
    user: User | None = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    """Unmark today's completion for a habit."""
    today = date.today()
    result = await db.execute(
        select(HabitCompletion).where(
            and_(HabitCompletion.habit_id == habit_id, HabitCompletion.completed_date == today)
        )
    )
    completion = result.scalar_one_or_none()
    if completion is None:
        raise NotFoundError(f"No completion for habit {habit_id} today")
    await db.delete(completion)
    await db.commit()
    logger.info("habit_uncompleted", habit_id=habit_id, date=str(today))
