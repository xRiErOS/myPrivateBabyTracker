"""Tag CRUD router + entry-tag association endpoints."""

from datetime import datetime

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.errors import NotFoundError, ValidationError
from app.database import get_session
from app.logging import get_logger
from app.middleware.auth import get_current_user
from app.models.tag import EntryTag, Tag
from app.models.user import User
from app.schemas.tag import (
    EntryTagCreate,
    EntryTagResponse,
    EntryTagUpdate,
    TagCreate,
    TagResponse,
    TagUpdate,
)

logger = get_logger("tags")

router = APIRouter(prefix="/tags", tags=["tags"])


# --- Entry summary helpers ---

FEEDING_TYPE_LABELS = {"breast_left": "Brust L", "breast_right": "Brust R", "bottle": "Flasche", "solid": "Beikost"}
DIAPER_TYPE_LABELS = {"wet": "Nass", "dirty": "Dreckig", "mixed": "Beides", "dry": "Trocken"}
SEVERITY_LABELS = {"mild": "Wenig", "moderate": "Mittel", "severe": "Stark"}

# SQL queries per entry_type to build summary strings
SUMMARY_QUERIES: dict[str, str] = {
    "sleep": "SELECT start_time, duration_minutes, notes FROM sleep_entries WHERE id = :id",
    "feeding": "SELECT start_time, feeding_type, amount_ml, notes FROM feeding_entries WHERE id = :id",
    "diaper": "SELECT time, diaper_type, notes FROM diaper_entries WHERE id = :id",
    "temperature": "SELECT measured_at, temperature_celsius, notes FROM temperature_entries WHERE id = :id",
    "weight": "SELECT measured_at, weight_grams, notes FROM weight_entries WHERE id = :id",
    "medication": "SELECT given_at, medication_name, dose, notes FROM medication_entries WHERE id = :id",
    "health": "SELECT time, entry_type, severity, notes FROM health_entries WHERE id = :id",
    "todo": "SELECT title, completed_at FROM todo_entries WHERE id = :id",
}


def _fmt_time(ts: datetime | str | None) -> str:
    if ts is None:
        return ""
    if isinstance(ts, str):
        try:
            ts = datetime.fromisoformat(ts)
        except (ValueError, TypeError):
            return ""
    return ts.strftime("%H:%M")


def _build_summary(entry_type: str, row: dict) -> str:
    """Build a short summary string from an entry row."""
    if entry_type == "sleep":
        dur = row.get("duration_minutes")
        t = _fmt_time(row.get("start_time"))
        if dur:
            h, m = divmod(int(dur), 60)
            return f"{t}, {h}:{m:02d} h" if h else f"{t}, {m} Min."
        return f"{t}, laufend"
    elif entry_type == "feeding":
        t = _fmt_time(row.get("start_time"))
        ft = FEEDING_TYPE_LABELS.get(row.get("feeding_type", ""), row.get("feeding_type", ""))
        amt = row.get("amount_ml")
        return f"{t}, {ft}" + (f", {int(amt)} ml" if amt else "")
    elif entry_type == "diaper":
        t = _fmt_time(row.get("time"))
        dt = DIAPER_TYPE_LABELS.get(row.get("diaper_type", ""), row.get("diaper_type", ""))
        return f"{t}, {dt}"
    elif entry_type == "temperature":
        t = _fmt_time(row.get("measured_at"))
        val = row.get("temperature_celsius")
        return f"{t}, {val} °C" if val else t
    elif entry_type == "weight":
        t = _fmt_time(row.get("measured_at"))
        g = row.get("weight_grams")
        return f"{t}, {int(g) / 1000:.2f} kg" if g else t
    elif entry_type == "medication":
        t = _fmt_time(row.get("given_at"))
        name = row.get("medication_name") or "Medikament"
        dose = row.get("dose")
        return f"{t}, {name}" + (f", {dose}" if dose else "")
    elif entry_type == "health":
        t = _fmt_time(row.get("time"))
        ht = "Spucken" if row.get("entry_type") == "spit_up" else "Bauchschmerzen"
        sev = SEVERITY_LABELS.get(row.get("severity", ""), "")
        return f"{t}, {ht}, {sev}" if sev else f"{t}, {ht}"
    elif entry_type == "todo":
        title = row.get("title") or "ToDo"
        done = "erledigt" if row.get("completed_at") else "offen"
        return f"{title} ({done})"

    return ""


def _append_notes(summary: str, row: dict) -> str:
    """Append notes to summary if present (for search)."""
    notes = row.get("notes")
    if notes:
        return f"{summary} — {notes}"
    return summary


async def _enrich_summaries(
    entry_tags: list[EntryTag], db: AsyncSession
) -> dict[tuple[str, int], str]:
    """Batch-fetch entry summaries for a list of entry-tags."""
    summaries: dict[tuple[str, int], str] = {}
    # Group by entry_type to batch queries
    by_type: dict[str, list[int]] = {}
    for et in entry_tags:
        by_type.setdefault(et.entry_type, []).append(et.entry_id)

    for entry_type, ids in by_type.items():
        query_template = SUMMARY_QUERIES.get(entry_type)
        if not query_template:
            continue
        for entry_id in set(ids):
            result = await db.execute(text(query_template), {"id": entry_id})
            row = result.mappings().first()
            if row:
                row_dict = dict(row)
                summary = _build_summary(entry_type, row_dict)
                summaries[(entry_type, entry_id)] = _append_notes(summary, row_dict)

    return summaries

# Valid entry types matching plugin table names
VALID_ENTRY_TYPES = frozenset([
    "sleep", "feeding", "diaper", "vitamind3", "temperature", "weight", "medication", "todo",
])


@router.post("/", response_model=TagResponse, status_code=201)
async def create_tag(
    data: TagCreate,
    user: User | None = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    """Create a new tag for a child."""
    # Check uniqueness
    existing = await db.execute(
        select(Tag).where(Tag.child_id == data.child_id, Tag.name == data.name)
    )
    if existing.scalar_one_or_none() is not None:
        raise ValidationError(f"Tag '{data.name}' existiert bereits fuer dieses Kind")

    tag = Tag(child_id=data.child_id, name=data.name, color=data.color)
    db.add(tag)
    await db.commit()
    await db.refresh(tag)
    logger.info("tag_created", tag_id=tag.id, child_id=tag.child_id, name=tag.name)
    return tag


@router.get("/", response_model=list[TagResponse])
async def list_tags(
    child_id: int | None = Query(default=None, gt=0),
    user: User | None = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    """List tags, optionally filtered by child."""
    stmt = select(Tag).order_by(Tag.name)
    if child_id is not None:
        stmt = stmt.where(Tag.child_id == child_id)
    result = await db.execute(stmt)
    return result.scalars().all()


@router.get("/{tag_id}", response_model=TagResponse)
async def get_tag(
    tag_id: int,
    user: User | None = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    """Get a tag by ID."""
    result = await db.execute(select(Tag).where(Tag.id == tag_id))
    tag = result.scalar_one_or_none()
    if tag is None:
        raise NotFoundError(f"Tag with id {tag_id} not found")
    return tag


@router.patch("/{tag_id}", response_model=TagResponse)
async def update_tag(
    tag_id: int,
    data: TagUpdate,
    user: User | None = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    """Update a tag (partial update)."""
    result = await db.execute(select(Tag).where(Tag.id == tag_id))
    tag = result.scalar_one_or_none()
    if tag is None:
        raise NotFoundError(f"Tag with id {tag_id} not found")

    update_data = data.model_dump(exclude_unset=True)

    # Check name uniqueness if changing name
    if "name" in update_data and update_data["name"] != tag.name:
        existing = await db.execute(
            select(Tag).where(
                Tag.child_id == tag.child_id,
                Tag.name == update_data["name"],
                Tag.id != tag_id,
            )
        )
        if existing.scalar_one_or_none() is not None:
            raise ValidationError(f"Tag '{update_data['name']}' existiert bereits fuer dieses Kind")

    for field, value in update_data.items():
        setattr(tag, field, value)

    await db.commit()
    await db.refresh(tag)
    logger.info("tag_updated", tag_id=tag.id, fields=list(update_data.keys()))
    return tag


@router.delete("/{tag_id}", status_code=204)
async def delete_tag(
    tag_id: int,
    user: User | None = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    """Delete a tag and all its entry associations."""
    result = await db.execute(select(Tag).where(Tag.id == tag_id))
    tag = result.scalar_one_or_none()
    if tag is None:
        raise NotFoundError(f"Tag with id {tag_id} not found")

    await db.delete(tag)
    await db.commit()
    logger.info("tag_deleted", tag_id=tag_id)


# --- Entry-Tag Association Endpoints ---


@router.post("/entries", response_model=EntryTagResponse, status_code=201)
async def attach_tag(
    data: EntryTagCreate,
    user: User | None = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    """Attach a tag to an entry."""
    if data.entry_type not in VALID_ENTRY_TYPES:
        raise ValidationError(f"Ungueltiger entry_type: {data.entry_type}")

    # Verify tag exists
    tag_result = await db.execute(select(Tag).where(Tag.id == data.tag_id))
    if tag_result.scalar_one_or_none() is None:
        raise NotFoundError(f"Tag with id {data.tag_id} not found")

    # Check duplicate
    existing = await db.execute(
        select(EntryTag).where(
            EntryTag.tag_id == data.tag_id,
            EntryTag.entry_type == data.entry_type,
            EntryTag.entry_id == data.entry_id,
        )
    )
    if existing.scalar_one_or_none() is not None:
        raise ValidationError("Tag ist bereits an diesen Eintrag angehaengt")

    entry_tag = EntryTag(
        tag_id=data.tag_id,
        entry_type=data.entry_type,
        entry_id=data.entry_id,
    )
    db.add(entry_tag)
    await db.commit()
    await db.refresh(entry_tag, attribute_names=["tag"])
    logger.info(
        "tag_attached",
        tag_id=data.tag_id,
        entry_type=data.entry_type,
        entry_id=data.entry_id,
    )
    return entry_tag


@router.patch("/entries/{entry_tag_id}", response_model=EntryTagResponse)
async def update_entry_tag(
    entry_tag_id: int,
    data: EntryTagUpdate,
    user: User | None = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    """Update an entry-tag (archive/unarchive)."""
    result = await db.execute(
        select(EntryTag).options(selectinload(EntryTag.tag)).where(EntryTag.id == entry_tag_id)
    )
    entry_tag = result.scalar_one_or_none()
    if entry_tag is None:
        raise NotFoundError(f"EntryTag with id {entry_tag_id} not found")

    entry_tag.is_archived = data.is_archived
    await db.commit()
    await db.refresh(entry_tag, attribute_names=["tag"])
    logger.info("entry_tag_updated", entry_tag_id=entry_tag_id, is_archived=data.is_archived)
    return entry_tag


@router.delete("/entries/{entry_tag_id}", status_code=204)
async def detach_tag(
    entry_tag_id: int,
    user: User | None = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    """Detach a tag from an entry."""
    result = await db.execute(select(EntryTag).where(EntryTag.id == entry_tag_id))
    entry_tag = result.scalar_one_or_none()
    if entry_tag is None:
        raise NotFoundError(f"EntryTag with id {entry_tag_id} not found")

    await db.delete(entry_tag)
    await db.commit()
    logger.info("tag_detached", entry_tag_id=entry_tag_id)


@router.get("/entries/", response_model=list[EntryTagResponse])
async def list_entry_tags(
    entry_type: str | None = Query(default=None, min_length=1, max_length=50),
    entry_id: int | None = Query(default=None, gt=0),
    tag_id: int | None = Query(default=None, gt=0),
    include_archived: bool = Query(default=False),
    user: User | None = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    """List entry-tag associations with filters."""
    stmt = select(EntryTag).options(selectinload(EntryTag.tag))

    if entry_type is not None:
        stmt = stmt.where(EntryTag.entry_type == entry_type)
    if entry_id is not None:
        stmt = stmt.where(EntryTag.entry_id == entry_id)
    if tag_id is not None:
        stmt = stmt.where(EntryTag.tag_id == tag_id)
    if not include_archived:
        stmt = stmt.where(EntryTag.is_archived == False)

    result = await db.execute(stmt)
    entry_tags = result.scalars().all()

    # Enrich with entry summaries when listing for a specific tag
    if tag_id is not None and entry_tags:
        summaries = await _enrich_summaries(entry_tags, db)
        enriched = []
        for et in entry_tags:
            resp = EntryTagResponse.model_validate(et)
            resp.entry_summary = summaries.get((et.entry_type, et.entry_id))
            enriched.append(resp)
        return enriched

    return entry_tags


@router.post("/entries/bulk-detach", status_code=204)
async def bulk_detach_tags(
    entry_tag_ids: list[int],
    user: User | None = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    """Bulk-detach tags from entries."""
    if not entry_tag_ids:
        return
    result = await db.execute(
        select(EntryTag).where(EntryTag.id.in_(entry_tag_ids))
    )
    for et in result.scalars().all():
        await db.delete(et)
    await db.commit()
    logger.info("tags_bulk_detached", count=len(entry_tag_ids))
