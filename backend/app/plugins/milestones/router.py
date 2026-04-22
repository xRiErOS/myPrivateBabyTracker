"""Milestones plugin CRUD router — categories, templates, entries, photos, leaps."""

import json
import os
import uuid
from datetime import date, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.errors import NotFoundError
from app.database import get_session
from app.logging import get_logger
from app.middleware.auth import get_current_user
from app.models.child import Child
from app.models.user import User
from app.plugins.milestones.models import (
    LeapDefinition,
    MilestoneCategory,
    MilestoneEntry,
    MilestonePhoto,
    MilestoneTemplate,
)
from app.models.tag import delete_entry_tags
from app.plugins.milestones.schemas import (
    CategoryCreate,
    CategoryResponse,
    CategoryUpdate,
    Confidence,
    LeapResponse,
    LeapStatusItem,
    LeapStatusResponse,
    MilestoneCompleteRequest,
    MilestoneCreate,
    MilestoneResponse,
    MilestoneUpdate,
    PhotoResponse,
    SourceType,
    SuggestionResponse,
    TemplateResponse,
)

logger = get_logger("milestones")

# --- Category Router ---
category_router = APIRouter(prefix="/milestone-categories", tags=["milestone-categories"])


@category_router.get("/", response_model=list[CategoryResponse])
async def list_categories(
    child_id: int | None = Query(default=None, gt=0),
    user: User | None = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    """List all system categories + custom categories for a child."""
    stmt = select(MilestoneCategory)
    if child_id is not None:
        stmt = stmt.where(
            (MilestoneCategory.is_system == True) | (MilestoneCategory.child_id == child_id)
        )
    else:
        stmt = stmt.where(MilestoneCategory.is_system == True)
    stmt = stmt.order_by(MilestoneCategory.id)
    result = await db.execute(stmt)
    return result.scalars().all()


@category_router.post("/", response_model=CategoryResponse, status_code=201)
async def create_category(
    data: CategoryCreate,
    user: User | None = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    """Create a custom milestone category."""
    cat = MilestoneCategory(
        name=data.name,
        color=data.color,
        icon=data.icon,
        is_system=False,
        child_id=data.child_id,
    )
    db.add(cat)
    await db.commit()
    await db.refresh(cat)
    logger.info("category_created", category_id=cat.id, name=cat.name)
    return cat


@category_router.patch("/{category_id}", response_model=CategoryResponse)
async def update_category(
    category_id: int,
    data: CategoryUpdate,
    user: User | None = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    """Update a custom category (system categories are read-only)."""
    result = await db.execute(
        select(MilestoneCategory).where(MilestoneCategory.id == category_id)
    )
    cat = result.scalar_one_or_none()
    if cat is None:
        raise NotFoundError(f"Category with id {category_id} not found")
    if cat.is_system:
        raise HTTPException(status_code=403, detail="System categories cannot be modified")

    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(cat, field, value)

    await db.commit()
    await db.refresh(cat)
    logger.info("category_updated", category_id=cat.id)
    return cat


@category_router.delete("/{category_id}", status_code=204)
async def delete_category(
    category_id: int,
    user: User | None = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    """Delete a custom category (only if no entries reference it)."""
    result = await db.execute(
        select(MilestoneCategory).where(MilestoneCategory.id == category_id)
    )
    cat = result.scalar_one_or_none()
    if cat is None:
        raise NotFoundError(f"Category with id {category_id} not found")
    if cat.is_system:
        raise HTTPException(status_code=403, detail="System categories cannot be deleted")

    # Check for referencing entries
    count_result = await db.execute(
        select(func.count()).where(MilestoneEntry.category_id == category_id)
    )
    count = count_result.scalar()
    if count > 0:
        raise HTTPException(
            status_code=409,
            detail=f"Category has {count} entries — remove them first",
        )

    await db.delete(cat)
    await db.commit()
    logger.info("category_deleted", category_id=category_id)


# --- Template Router ---
template_router = APIRouter(prefix="/milestone-templates", tags=["milestone-templates"])


@template_router.get("/", response_model=list[TemplateResponse])
async def list_templates(
    category_id: int | None = Query(default=None, gt=0),
    source_type: SourceType | None = Query(default=None),
    user: User | None = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    """List all milestone templates with optional filters."""
    stmt = select(MilestoneTemplate).order_by(
        MilestoneTemplate.sort_order, MilestoneTemplate.id
    )
    if category_id is not None:
        stmt = stmt.where(MilestoneTemplate.category_id == category_id)
    if source_type is not None:
        stmt = stmt.where(MilestoneTemplate.source_type == source_type.value)
    result = await db.execute(stmt)
    return result.scalars().all()


@template_router.get("/suggestions", response_model=list[SuggestionResponse])
async def get_suggestions(
    child_id: int = Query(..., gt=0),
    user: User | None = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    """Get age-appropriate milestone suggestions for a child."""
    # Get child
    child_result = await db.execute(select(Child).where(Child.id == child_id))
    child = child_result.scalar_one_or_none()
    if child is None:
        raise NotFoundError(f"Child with id {child_id} not found")

    # Calculate age in weeks
    ref_date = child.estimated_birth_date if child.estimated_birth_date else child.birth_date
    age_weeks = (date.today() - ref_date).days / 7

    # Get templates in age range (with 4-week buffer)
    stmt = select(MilestoneTemplate).where(
        MilestoneTemplate.suggested_age_weeks_min != None,
        MilestoneTemplate.suggested_age_weeks_min <= age_weeks + 4,
        MilestoneTemplate.suggested_age_weeks_max >= age_weeks - 4,
    ).order_by(MilestoneTemplate.sort_order, MilestoneTemplate.id)
    templates_result = await db.execute(stmt)
    templates = templates_result.scalars().all()

    # Get completed template IDs for this child
    completed_result = await db.execute(
        select(MilestoneEntry.template_id).where(
            MilestoneEntry.child_id == child_id,
            MilestoneEntry.template_id != None,
            MilestoneEntry.completed == True,
        )
    )
    completed_ids = {row[0] for row in completed_result.all()}

    suggestions = []
    for t in templates:
        is_completed = t.id in completed_ids
        is_current = (
            t.suggested_age_weeks_min is not None
            and t.suggested_age_weeks_min <= age_weeks <= (t.suggested_age_weeks_max or 999)
        )
        suggestions.append(
            SuggestionResponse(
                id=t.id,
                title=t.title,
                description=t.description,
                category_id=t.category_id,
                source_type=t.source_type,
                suggested_age_weeks_min=t.suggested_age_weeks_min,
                suggested_age_weeks_max=t.suggested_age_weeks_max,
                is_completed=is_completed,
                is_current=is_current,
            )
        )

    return suggestions


# --- Milestone Entry Router ---
milestone_router = APIRouter(prefix="/milestones", tags=["milestones"])


@milestone_router.post("/", response_model=MilestoneResponse, status_code=201)
async def create_milestone(
    data: MilestoneCreate,
    user: User | None = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    """Create a new milestone entry."""
    entry = MilestoneEntry(
        child_id=data.child_id,
        template_id=data.template_id,
        title=data.title,
        category_id=data.category_id,
        source_type=data.source_type.value,
        completed=data.completed,
        completed_date=data.completed_date,
        confidence=data.confidence.value,
        notes=data.notes,
    )
    db.add(entry)
    await db.commit()
    await db.refresh(entry)
    logger.info("milestone_created", entry_id=entry.id, child_id=entry.child_id)
    return entry


@milestone_router.get("/", response_model=list[MilestoneResponse])
async def list_milestones(
    child_id: int | None = Query(default=None, gt=0),
    category_id: int | None = Query(default=None, gt=0),
    completed: bool | None = Query(default=None),
    source_type: SourceType | None = Query(default=None),
    date_from: date | None = Query(default=None),
    date_to: date | None = Query(default=None),
    q: str | None = Query(default=None, max_length=200),
    user: User | None = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    """List milestone entries with optional filters."""
    stmt = select(MilestoneEntry).order_by(MilestoneEntry.completed_date.desc().nullslast(), MilestoneEntry.id.desc())

    if child_id is not None:
        stmt = stmt.where(MilestoneEntry.child_id == child_id)
    if category_id is not None:
        stmt = stmt.where(MilestoneEntry.category_id == category_id)
    if completed is not None:
        stmt = stmt.where(MilestoneEntry.completed == completed)
    if source_type is not None:
        stmt = stmt.where(MilestoneEntry.source_type == source_type.value)
    if date_from is not None:
        stmt = stmt.where(MilestoneEntry.completed_date >= date_from)
    if date_to is not None:
        stmt = stmt.where(MilestoneEntry.completed_date <= date_to)
    if q is not None:
        search_term = f"%{q}%"
        stmt = stmt.where(
            MilestoneEntry.title.ilike(search_term) | MilestoneEntry.notes.ilike(search_term)
        )

    result = await db.execute(stmt)
    return result.scalars().all()


@milestone_router.get("/{entry_id}", response_model=MilestoneResponse)
async def get_milestone(
    entry_id: int,
    user: User | None = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    """Get a milestone entry by ID."""
    result = await db.execute(
        select(MilestoneEntry).where(MilestoneEntry.id == entry_id)
    )
    entry = result.scalar_one_or_none()
    if entry is None:
        raise NotFoundError(f"Milestone entry with id {entry_id} not found")
    return entry


@milestone_router.patch("/{entry_id}", response_model=MilestoneResponse)
async def update_milestone(
    entry_id: int,
    data: MilestoneUpdate,
    user: User | None = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    """Update a milestone entry (partial update)."""
    result = await db.execute(
        select(MilestoneEntry).where(MilestoneEntry.id == entry_id)
    )
    entry = result.scalar_one_or_none()
    if entry is None:
        raise NotFoundError(f"Milestone entry with id {entry_id} not found")

    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        if field == "confidence" and value is not None:
            setattr(entry, field, value.value)
        else:
            setattr(entry, field, value)

    await db.commit()
    await db.refresh(entry)
    logger.info("milestone_updated", entry_id=entry.id, fields=list(update_data.keys()))
    return entry


@milestone_router.delete("/{entry_id}", status_code=204)
async def delete_milestone(
    entry_id: int,
    user: User | None = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    """Delete a milestone entry (cascade deletes photos)."""
    result = await db.execute(
        select(MilestoneEntry).where(MilestoneEntry.id == entry_id)
    )
    entry = result.scalar_one_or_none()
    if entry is None:
        raise NotFoundError(f"Milestone entry with id {entry_id} not found")

    # Delete associated photo files
    for photo in entry.photos:
        _delete_photo_file(photo.file_path)

    await delete_entry_tags(db, "milestones", entry.id)
    await db.delete(entry)
    await db.commit()
    logger.info("milestone_deleted", entry_id=entry_id)


@milestone_router.post("/{entry_id}/complete", response_model=MilestoneResponse)
async def complete_milestone(
    entry_id: int,
    data: MilestoneCompleteRequest,
    user: User | None = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    """Quick-complete a milestone (set completed + date)."""
    result = await db.execute(
        select(MilestoneEntry).where(MilestoneEntry.id == entry_id)
    )
    entry = result.scalar_one_or_none()
    if entry is None:
        raise NotFoundError(f"Milestone entry with id {entry_id} not found")

    entry.completed = True
    entry.completed_date = data.completed_date
    entry.confidence = data.confidence.value
    if data.notes is not None:
        entry.notes = data.notes

    await db.commit()
    await db.refresh(entry)
    logger.info("milestone_completed", entry_id=entry.id, date=str(data.completed_date))
    return entry


# --- Photo Upload ---

UPLOAD_BASE = os.path.join(os.getcwd(), "data", "uploads", "milestones")
ALLOWED_MIME_TYPES = {"image/jpeg", "image/png", "image/webp"}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB


@milestone_router.post("/{entry_id}/photo", response_model=PhotoResponse, status_code=201)
async def upload_photo(
    entry_id: int,
    file: UploadFile = File(...),
    user: User | None = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    """Upload a photo for a milestone entry."""
    # Verify entry exists
    result = await db.execute(
        select(MilestoneEntry).where(MilestoneEntry.id == entry_id)
    )
    entry = result.scalar_one_or_none()
    if entry is None:
        raise NotFoundError(f"Milestone entry with id {entry_id} not found")

    # Validate MIME type
    if file.content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type: {file.content_type}. Allowed: JPEG, PNG, WebP",
        )

    # Read file content
    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File too large (max 10 MB)")

    # Generate storage path
    ext = file.filename.rsplit(".", 1)[-1] if file.filename and "." in file.filename else "jpg"
    filename = f"{uuid.uuid4()}.{ext}"
    child_dir = os.path.join(UPLOAD_BASE, str(entry.child_id))
    os.makedirs(child_dir, exist_ok=True)
    file_path = os.path.join(child_dir, filename)

    # Write file
    with open(file_path, "wb") as f:
        f.write(content)

    # Create DB record
    relative_path = f"milestones/{entry.child_id}/{filename}"
    photo = MilestonePhoto(
        milestone_entry_id=entry_id,
        file_path=relative_path,
        file_name=file.filename or filename,
        file_size=len(content),
        mime_type=file.content_type,
    )
    db.add(photo)
    await db.commit()
    await db.refresh(photo)
    logger.info("photo_uploaded", photo_id=photo.id, milestone_id=entry_id, size=len(content))
    return photo


@milestone_router.delete("/{entry_id}/photo/{photo_id}", status_code=204)
async def delete_photo(
    entry_id: int,
    photo_id: int,
    user: User | None = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    """Delete a photo from a milestone entry."""
    result = await db.execute(
        select(MilestonePhoto).where(
            MilestonePhoto.id == photo_id,
            MilestonePhoto.milestone_entry_id == entry_id,
        )
    )
    photo = result.scalar_one_or_none()
    if photo is None:
        raise NotFoundError(f"Photo with id {photo_id} not found for milestone {entry_id}")

    # Delete file
    _delete_photo_file(photo.file_path)

    await db.delete(photo)
    await db.commit()
    logger.info("photo_deleted", photo_id=photo_id, milestone_id=entry_id)


def _delete_photo_file(relative_path: str) -> None:
    """Delete a photo file from disk (best-effort)."""
    full_path = os.path.join(os.getcwd(), "data", "uploads", relative_path)
    try:
        if os.path.exists(full_path):
            os.remove(full_path)
    except OSError:
        logger.warning("photo_file_delete_failed", path=full_path)


# --- Leap Router ---
leap_router = APIRouter(prefix="/leaps", tags=["leaps"])


@leap_router.get("/", response_model=list[LeapResponse])
async def list_leaps(
    user: User | None = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    """List all leap definitions."""
    result = await db.execute(
        select(LeapDefinition).order_by(LeapDefinition.leap_number)
    )
    return result.scalars().all()


@leap_router.get("/status", response_model=LeapStatusResponse)
async def get_leap_status(
    child_id: int = Query(..., gt=0),
    user: User | None = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    """Get leap status computed for a specific child."""
    # Get child
    child_result = await db.execute(select(Child).where(Child.id == child_id))
    child = child_result.scalar_one_or_none()
    if child is None:
        raise NotFoundError(f"Child with id {child_id} not found")

    # Reference date: ET for preterm, birth_date otherwise
    ref_date = child.estimated_birth_date if child.estimated_birth_date else child.birth_date
    age_weeks = (date.today() - ref_date).days / 7

    # Get all leaps
    leaps_result = await db.execute(
        select(LeapDefinition).order_by(LeapDefinition.leap_number)
    )
    leaps = leaps_result.scalars().all()

    items = []
    active_leap = None

    for leap in leaps:
        # Compute status
        if age_weeks > leap.sun_start_weeks:
            status = "past"
        elif age_weeks >= leap.storm_start_weeks and age_weeks <= leap.storm_end_weeks:
            status = "active_storm"
        elif age_weeks > leap.storm_end_weeks and age_weeks <= leap.sun_start_weeks:
            status = "active_sun"
        elif age_weeks >= leap.storm_start_weeks - 2:
            status = "upcoming"
        else:
            status = "far_future"

        # Compute calendar dates
        storm_start_date = ref_date + timedelta(weeks=leap.storm_start_weeks)
        storm_end_date = ref_date + timedelta(weeks=leap.storm_end_weeks)
        sun_start_date = ref_date + timedelta(weeks=leap.sun_start_weeks)

        item = LeapStatusItem(
            id=leap.id,
            leap_number=leap.leap_number,
            title=leap.title,
            description=leap.description,
            storm_start_weeks=leap.storm_start_weeks,
            storm_end_weeks=leap.storm_end_weeks,
            sun_start_weeks=leap.sun_start_weeks,
            new_skills=leap.new_skills,
            storm_signs=leap.storm_signs,
            status=status,
            storm_start_date=storm_start_date,
            storm_end_date=storm_end_date,
            sun_start_date=sun_start_date,
        )
        items.append(item)

        if status in ("active_storm", "active_sun"):
            active_leap = item

    return LeapStatusResponse(
        child_age_weeks=round(age_weeks, 1),
        reference_date=ref_date,
        leaps=items,
        active_leap=active_leap,
    )
