"""Children CRUD router — all endpoints require auth."""

import io
import json
import os
import shutil
import zipfile
from dataclasses import asdict, dataclass
from datetime import date, datetime
from typing import Any

from fastapi import APIRouter, Body, Depends, Query
from fastapi.responses import JSONResponse, StreamingResponse
from sqlalchemy import delete, func, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.errors import NotFoundError
from app.database import get_session
from app.logging import get_logger
from app.middleware.auth import get_current_user
from app.models.alert_config import AlertConfig
from app.models.child import Child
from app.models.tag import EntryTag, Tag
from app.models.user import User
from app.schemas.child import ChildCreate, ChildResponse, ChildUpdate

logger = get_logger("children")

router = APIRouter(prefix="/children", tags=["children"])

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _serialize(obj: Any) -> Any:
    """JSON-serialize datetime / date objects."""
    if isinstance(obj, (datetime, date)):
        return obj.isoformat()
    return obj


def _rows_to_dicts(rows: list[Any]) -> list[dict]:
    """Convert SQLAlchemy model instances to plain dicts."""
    result = []
    for row in rows:
        d = {c.name: _serialize(getattr(row, c.name)) for c in row.__table__.columns}
        result.append(d)
    return result


async def _collect_child_data(db: AsyncSession, child_id: int) -> dict[str, list[dict]]:
    """Collect all data for a child grouped by plugin table."""
    from app.plugins.checkup.models import CheckupEntry
    from app.plugins.diaper.models import DiaperEntry
    from app.plugins.feeding.models import FeedingEntry
    from app.plugins.health.models import HealthEntry
    from app.plugins.medication.models import MedicationEntry
    from app.plugins.milestones.models import MilestoneEntry, MilestonePhoto
    from app.plugins.notes.models import SharedNote
    from app.plugins.sleep.models import SleepEntry
    from app.plugins.temperature.models import TemperatureEntry
    from app.plugins.todo.models import Habit, HabitCompletion, TodoEntry, TodoTemplate
    from app.plugins.tummytime.models import TummyTimeEntry
    from app.plugins.vitamind3.models import VitaminD3Entry
    from app.plugins.weight.models import WeightEntry

    # Models with direct child_id FK
    direct_tables: dict[str, Any] = {
        "sleep_entries": SleepEntry,
        "feeding_entries": FeedingEntry,
        "diaper_entries": DiaperEntry,
        "temperature_entries": TemperatureEntry,
        "weight_entries": WeightEntry,
        "medication_entries": MedicationEntry,
        "health_entries": HealthEntry,
        "tummytime_entries": TummyTimeEntry,
        "todo_entries": TodoEntry,
        "todo_templates": TodoTemplate,
        "habits": Habit,
        "habit_completions": HabitCompletion,
        "vitamind3_entries": VitaminD3Entry,
        "milestone_entries": MilestoneEntry,
        "shared_notes": SharedNote,
        "checkup_entries": CheckupEntry,
        "alert_configs": AlertConfig,
    }

    data: dict[str, list[dict]] = {}

    for table_key, model in direct_tables.items():
        rows = (await db.execute(select(model).where(model.child_id == child_id))).scalars().all()
        data[table_key] = _rows_to_dicts(rows)

    # milestone_photos: no direct child_id, link via milestone_entry_id
    photo_stmt = (
        select(MilestonePhoto)
        .join(MilestoneEntry, MilestoneEntry.id == MilestonePhoto.milestone_entry_id)
        .where(MilestoneEntry.child_id == child_id)
    )
    data["milestone_photos"] = _rows_to_dicts(
        (await db.execute(photo_stmt)).scalars().all()
    )

    # Tags and entry_tags
    tags_result = await db.execute(select(Tag).where(Tag.child_id == child_id))
    tags = tags_result.scalars().all()
    data["tags"] = _rows_to_dicts(tags)

    tag_ids = [t.id for t in tags]
    if tag_ids:
        entry_tags_result = await db.execute(
            select(EntryTag).where(EntryTag.tag_id.in_(tag_ids))
        )
        data["entry_tags"] = _rows_to_dicts(entry_tags_result.scalars().all())
    else:
        data["entry_tags"] = []

    return data


async def _count_child_data(db: AsyncSession, child_id: int) -> dict[str, int]:
    """Return row counts per table for display in purge confirmation."""
    full = await _collect_child_data(db, child_id)
    return {k: len(v) for k, v in full.items()}


# ---------------------------------------------------------------------------
# CRUD
# ---------------------------------------------------------------------------

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
    child = Child(**data.model_dump())
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
    """Get a child by ID. Soft-deleted children (is_active=False) return 404."""
    result = await db.execute(
        select(Child).where(Child.id == child_id, Child.is_active.is_(True))
    )
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


# ---------------------------------------------------------------------------
# Export
# ---------------------------------------------------------------------------

@router.get("/{child_id}/export")
async def export_child_data(
    child_id: int,
    format: str = Query(default="json", pattern="^(json|csv)$"),
    user: User | None = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    """Export all data for a child as JSON or ZIP of CSV files."""
    result = await db.execute(select(Child).where(Child.id == child_id))
    child = result.scalar_one_or_none()
    if child is None:
        raise NotFoundError(f"Child with id {child_id} not found")

    data = await _collect_child_data(db, child_id)

    child_slug = child.name.lower().replace(" ", "_")

    if format == "json":
        payload = {
            "child": {
                "id": child.id,
                "name": child.name,
                "birth_date": child.birth_date.isoformat() if child.birth_date else None,
                "estimated_birth_date": child.estimated_birth_date.isoformat() if child.estimated_birth_date else None,
                "exported_at": datetime.utcnow().isoformat() + "Z",
            },
            "data": data,
        }
        content = json.dumps(payload, ensure_ascii=False, indent=2, default=str)
        filename = f"mybaby_export_{child_slug}.json"
        return StreamingResponse(
            iter([content.encode("utf-8")]),
            media_type="application/json",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'},
        )

    # CSV — ZIP with one file per table
    import csv

    buf = io.BytesIO()
    with zipfile.ZipFile(buf, mode="w", compression=zipfile.ZIP_DEFLATED) as zf:
        for table_name, rows in data.items():
            if not rows:
                continue
            csv_buf = io.StringIO()
            writer = csv.DictWriter(csv_buf, fieldnames=list(rows[0].keys()))
            writer.writeheader()
            writer.writerows(rows)
            zf.writestr(f"{table_name}.csv", csv_buf.getvalue())

    buf.seek(0)
    filename = f"mybaby_export_{child_slug}.zip"
    return StreamingResponse(
        iter([buf.read()]),
        media_type="application/zip",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


# ---------------------------------------------------------------------------
# Purge
# ---------------------------------------------------------------------------

@router.get("/{child_id}/purge-preview")
async def purge_preview(
    child_id: int,
    user: User | None = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    """Return record counts per table — used by frontend before confirming purge."""
    result = await db.execute(select(Child).where(Child.id == child_id))
    child = result.scalar_one_or_none()
    if child is None:
        raise NotFoundError(f"Child with id {child_id} not found")

    counts = await _count_child_data(db, child_id)
    return {"child_id": child_id, "child_name": child.name, "counts": counts}


@router.delete("/{child_id}/purge", status_code=200)
async def purge_child_data(
    child_id: int,
    body: dict = Body(...),
    delete_child: bool = Query(default=False),
    user: User | None = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    """Purge all data for a child. Requires confirm='DELETE ALL DATA' in body."""
    if body.get("confirm") != "DELETE ALL DATA":
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail="Missing or wrong confirmation string.")

    result = await db.execute(select(Child).where(Child.id == child_id))
    child = result.scalar_one_or_none()
    if child is None:
        raise NotFoundError(f"Child with id {child_id} not found")

    child_name = child.name

    from app.plugins.checkup.models import CheckupEntry
    from app.plugins.diaper.models import DiaperEntry
    from app.plugins.feeding.models import FeedingEntry
    from app.plugins.health.models import HealthEntry
    from app.plugins.medication.models import MedicationEntry
    from app.plugins.milestones.models import MilestoneCategory, MilestoneEntry, MilestonePhoto
    from app.plugins.notes.models import SharedNote
    from app.plugins.sleep.models import SleepEntry
    from app.plugins.temperature.models import TemperatureEntry
    from app.plugins.todo.models import Habit, HabitCompletion, TodoEntry, TodoTemplate
    from app.plugins.tummytime.models import TummyTimeEntry
    from app.plugins.vitamind3.models import VitaminD3Entry
    from app.plugins.weight.models import WeightEntry

    # Delete milestone photos from disk first
    uploads_dir = f"/app/data/uploads/milestones/{child_id}"
    if os.path.exists(uploads_dir):
        shutil.rmtree(uploads_dir)
        logger.info("purge_photos_deleted", child_id=child_id, path=uploads_dir)

    # Delete in dependency order
    # 1. entry_tags linked via tags of this child
    tags_result = await db.execute(select(Tag).where(Tag.child_id == child_id))
    tag_ids = [t.id for t in tags_result.scalars().all()]
    if tag_ids:
        await db.execute(delete(EntryTag).where(EntryTag.tag_id.in_(tag_ids)))

    # 2. Tags
    await db.execute(delete(Tag).where(Tag.child_id == child_id))

    # 3. Alert config
    await db.execute(delete(AlertConfig).where(AlertConfig.child_id == child_id))

    # 4. All plugin tables with direct child_id FK (HabitCompletion has child_id too)
    plugin_models = [
        SleepEntry, FeedingEntry, DiaperEntry, TemperatureEntry, WeightEntry,
        MedicationEntry, HealthEntry, TummyTimeEntry, TodoEntry, TodoTemplate,
        HabitCompletion, Habit, VitaminD3Entry, MilestoneEntry, SharedNote,
        CheckupEntry, MilestoneCategory,
    ]
    for model in plugin_models:
        await db.execute(delete(model).where(model.child_id == child_id))

    if delete_child:
        await db.execute(delete(Child).where(Child.id == child_id))
        logger.info("child_purged_and_deleted", child_id=child_id, name=child_name)
    else:
        logger.info("child_data_purged", child_id=child_id, name=child_name)

    await db.commit()

    return {
        "success": True,
        "child_id": child_id,
        "child_name": child_name,
        "deleted_child": delete_child,
    }
