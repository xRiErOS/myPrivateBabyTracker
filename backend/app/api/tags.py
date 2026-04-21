"""Tag CRUD router + entry-tag association endpoints."""

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
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
    return result.scalars().all()


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
