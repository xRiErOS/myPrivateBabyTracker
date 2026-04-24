"""Milestones plugin CRUD router — categories, templates, entries, photos, leaps."""

import io
import json
import os
import uuid
import zipfile
from datetime import date, timedelta
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from fastapi.responses import FileResponse, StreamingResponse
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
    MediaPhotoResponse,
    MilestoneCompleteRequest,
    MilestoneCreate,
    MilestoneResponse,
    MilestoneUpdate,
    PhotoResponse,
    SourceType,
    StorageInfoResponse,
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


# --- Photo Upload + Proxy + Media Management ---

UPLOAD_BASE = os.path.join(os.getcwd(), "data", "uploads", "milestones")
ALLOWED_MIME_TYPES = {"image/jpeg", "image/png", "image/webp"}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB
MAX_PHOTOS_PER_ENTRY = 3
ORIGINAL_MAX_PX = 2048
THUMB_SIZE_PX = 400
JPEG_QUALITY = 80


def _process_image(content: bytes, ext: str) -> tuple[bytes, bytes]:
    """Resize original to max 2048px, create 400px JPEG thumbnail.

    Returns (processed_original_bytes, thumbnail_bytes).
    """
    from PIL import Image

    img = Image.open(io.BytesIO(content))
    img = img.convert("RGB")  # Ensure RGB for JPEG output

    # Resize original if larger than 2048px on any side
    if max(img.size) > ORIGINAL_MAX_PX:
        img.thumbnail((ORIGINAL_MAX_PX, ORIGINAL_MAX_PX), Image.LANCZOS)

    # Save processed original as JPEG
    orig_buf = io.BytesIO()
    img.save(orig_buf, format="JPEG", quality=JPEG_QUALITY)
    orig_bytes = orig_buf.getvalue()

    # Create thumbnail (400px)
    thumb = img.copy()
    thumb.thumbnail((THUMB_SIZE_PX, THUMB_SIZE_PX), Image.LANCZOS)
    thumb_buf = io.BytesIO()
    thumb.save(thumb_buf, format="JPEG", quality=JPEG_QUALITY)
    thumb_bytes = thumb_buf.getvalue()

    return orig_bytes, thumb_bytes


@milestone_router.post("/{entry_id}/photo", response_model=PhotoResponse, status_code=201)
async def upload_photo(
    entry_id: int,
    file: UploadFile = File(...),
    user: User | None = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    """Upload a photo for a milestone entry (max 3 per entry)."""
    # Verify entry exists
    result = await db.execute(
        select(MilestoneEntry).where(MilestoneEntry.id == entry_id)
    )
    entry = result.scalar_one_or_none()
    if entry is None:
        raise NotFoundError(f"Milestone entry with id {entry_id} not found")

    # Check photo count limit
    count_result = await db.execute(
        select(func.count()).where(MilestonePhoto.milestone_entry_id == entry_id)
    )
    photo_count = count_result.scalar() or 0
    if photo_count >= MAX_PHOTOS_PER_ENTRY:
        raise HTTPException(
            status_code=400,
            detail=f"Maximum {MAX_PHOTOS_PER_ENTRY} photos per milestone reached",
        )

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

    # Process image: resize original + generate thumbnail
    orig_bytes, thumb_bytes = _process_image(content, "jpg")

    # Generate storage path (always JPEG after processing)
    base_name = str(uuid.uuid4())
    filename = f"{base_name}.jpg"
    thumb_filename = f"{base_name}_thumb.jpg"
    child_dir = os.path.join(UPLOAD_BASE, str(entry.child_id))
    os.makedirs(child_dir, exist_ok=True)

    # Write original
    file_path = os.path.join(child_dir, filename)
    with open(file_path, "wb") as f:
        f.write(orig_bytes)

    # Write thumbnail
    thumb_path = os.path.join(child_dir, thumb_filename)
    with open(thumb_path, "wb") as f:
        f.write(thumb_bytes)

    # Create DB record
    relative_path = f"milestones/{entry.child_id}/{filename}"
    photo = MilestonePhoto(
        milestone_entry_id=entry_id,
        file_path=relative_path,
        file_name=file.filename or filename,
        file_size=len(orig_bytes),
        mime_type="image/jpeg",
    )
    db.add(photo)
    await db.commit()
    await db.refresh(photo)
    logger.info("photo_uploaded", photo_id=photo.id, milestone_id=entry_id, size=len(orig_bytes))
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

    # Delete file + thumbnail
    _delete_photo_file(photo.file_path)
    _delete_photo_file(_thumb_path(photo.file_path))

    await db.delete(photo)
    await db.commit()
    logger.info("photo_deleted", photo_id=photo_id, milestone_id=entry_id)


@milestone_router.patch("/{entry_id}/photos/{photo_id}", response_model=PhotoResponse)
async def replace_photo(
    entry_id: int,
    photo_id: int,
    file: UploadFile = File(...),
    user: User | None = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    """Replace an existing photo (delete old file + upload new one)."""
    result = await db.execute(
        select(MilestonePhoto).where(
            MilestonePhoto.id == photo_id,
            MilestonePhoto.milestone_entry_id == entry_id,
        )
    )
    photo = result.scalar_one_or_none()
    if photo is None:
        raise NotFoundError(f"Photo with id {photo_id} not found for milestone {entry_id}")

    # Validate
    if file.content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type: {file.content_type}. Allowed: JPEG, PNG, WebP",
        )
    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File too large (max 10 MB)")

    # Delete old files
    _delete_photo_file(photo.file_path)
    _delete_photo_file(_thumb_path(photo.file_path))

    # Process new image
    orig_bytes, thumb_bytes = _process_image(content, "jpg")

    # Get child_id from entry
    entry_result = await db.execute(
        select(MilestoneEntry).where(MilestoneEntry.id == entry_id)
    )
    entry = entry_result.scalar_one_or_none()
    if entry is None:
        raise NotFoundError(f"Milestone entry with id {entry_id} not found")

    base_name = str(uuid.uuid4())
    filename = f"{base_name}.jpg"
    thumb_filename = f"{base_name}_thumb.jpg"
    child_dir = os.path.join(UPLOAD_BASE, str(entry.child_id))
    os.makedirs(child_dir, exist_ok=True)

    with open(os.path.join(child_dir, filename), "wb") as f:
        f.write(orig_bytes)
    with open(os.path.join(child_dir, thumb_filename), "wb") as f:
        f.write(thumb_bytes)

    # Update DB record
    photo.file_path = f"milestones/{entry.child_id}/{filename}"
    photo.file_name = file.filename or filename
    photo.file_size = len(orig_bytes)
    photo.mime_type = "image/jpeg"

    await db.commit()
    await db.refresh(photo)
    logger.info("photo_replaced", photo_id=photo.id, milestone_id=entry_id)
    return photo


# --- Auth-protected photo proxy ---

@milestone_router.get("/photos/{filename:path}", response_class=FileResponse)
async def serve_photo(
    filename: str,
    thumb: bool = Query(default=False),
    user: User | None = Depends(get_current_user),
):
    """Serve a photo file with auth check. Use ?thumb=true for thumbnail."""
    # Sanitize: prevent path traversal
    safe_name = Path(filename).name
    if safe_name != filename.split("/")[-1]:
        raise HTTPException(status_code=400, detail="Invalid filename")

    # Reconstruct path from filename — expect format: {child_id}/{uuid}.jpg
    parts = filename.split("/")
    if len(parts) != 2:
        raise HTTPException(status_code=400, detail="Invalid path format")

    child_id_str, file_part = parts
    if thumb:
        # Replace .jpg with _thumb.jpg
        base = file_part.rsplit(".", 1)[0]
        file_part = f"{base}_thumb.jpg"

    full_path = os.path.join(UPLOAD_BASE, child_id_str, file_part)
    if not os.path.exists(full_path):
        raise HTTPException(status_code=404, detail="Photo not found")

    return FileResponse(
        full_path,
        media_type="image/jpeg",
        headers={"Cache-Control": "private, max-age=86400"},
    )


# --- Media management endpoints ---

media_router = APIRouter(prefix="/milestones/media", tags=["milestones-media"])


@media_router.get("/", response_model=list[MediaPhotoResponse])
async def list_media(
    child_id: int = Query(..., gt=0),
    category_id: int | None = Query(default=None, gt=0),
    user: User | None = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    """List all photos for a child, optionally filtered by milestone category."""
    stmt = (
        select(MilestonePhoto)
        .join(MilestoneEntry, MilestonePhoto.milestone_entry_id == MilestoneEntry.id)
        .where(MilestoneEntry.child_id == child_id)
        .order_by(MilestonePhoto.created_at.desc())
    )
    if category_id is not None:
        stmt = stmt.where(MilestoneEntry.category_id == category_id)

    result = await db.execute(stmt)
    photos = result.scalars().all()

    items = []
    for p in photos:
        entry = p.entry
        items.append(
            MediaPhotoResponse(
                id=p.id,
                milestone_entry_id=p.milestone_entry_id,
                milestone_title=entry.title if entry else "",
                category_id=entry.category_id if entry else 0,
                child_id=entry.child_id if entry else 0,
                file_path=p.file_path,
                file_name=p.file_name,
                file_size=p.file_size,
                mime_type=p.mime_type,
                created_at=p.created_at,
            )
        )
    return items


@media_router.get("/storage", response_model=StorageInfoResponse)
async def get_storage_info(
    child_id: int | None = Query(default=None, gt=0),
    user: User | None = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    """Get storage usage info for uploaded photos."""
    stmt = select(func.count(), func.sum(MilestonePhoto.file_size))
    if child_id is not None:
        stmt = (
            stmt.join(MilestoneEntry, MilestonePhoto.milestone_entry_id == MilestoneEntry.id)
            .where(MilestoneEntry.child_id == child_id)
        )
    result = await db.execute(stmt)
    row = result.one()
    total_count = row[0] or 0
    total_size = row[1] or 0

    # Estimate thumbnails (roughly 10% of originals)
    return StorageInfoResponse(
        total_photos=total_count,
        total_size_bytes=total_size,
        total_size_with_thumbs_bytes=int(total_size * 1.1),
    )


@media_router.get("/{photo_id}", response_model=MediaPhotoResponse)
async def get_media_photo(
    photo_id: int,
    user: User | None = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    """Get single photo info by ID."""
    result = await db.execute(
        select(MilestonePhoto).where(MilestonePhoto.id == photo_id)
    )
    photo = result.scalar_one_or_none()
    if photo is None:
        raise NotFoundError(f"Photo with id {photo_id} not found")

    entry = photo.entry
    return MediaPhotoResponse(
        id=photo.id,
        milestone_entry_id=photo.milestone_entry_id,
        milestone_title=entry.title if entry else "",
        category_id=entry.category_id if entry else 0,
        child_id=entry.child_id if entry else 0,
        file_path=photo.file_path,
        file_name=photo.file_name,
        file_size=photo.file_size,
        mime_type=photo.mime_type,
        created_at=photo.created_at,
    )


@media_router.delete("/{photo_id}", status_code=204)
async def delete_media_photo(
    photo_id: int,
    user: User | None = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    """Delete a photo by ID (with thumbnail)."""
    result = await db.execute(
        select(MilestonePhoto).where(MilestonePhoto.id == photo_id)
    )
    photo = result.scalar_one_or_none()
    if photo is None:
        raise NotFoundError(f"Photo with id {photo_id} not found")

    _delete_photo_file(photo.file_path)
    _delete_photo_file(_thumb_path(photo.file_path))

    await db.delete(photo)
    await db.commit()
    logger.info("media_photo_deleted", photo_id=photo_id)


@media_router.get("/download-zip")
async def download_zip(
    child_id: int = Query(..., gt=0),
    user: User | None = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    """Download all photos for a child as a ZIP archive."""
    stmt = (
        select(MilestonePhoto)
        .join(MilestoneEntry, MilestonePhoto.milestone_entry_id == MilestoneEntry.id)
        .where(MilestoneEntry.child_id == child_id)
        .order_by(MilestonePhoto.created_at)
    )
    result = await db.execute(stmt)
    photos = result.scalars().all()

    if not photos:
        raise HTTPException(status_code=404, detail="No photos found for this child")

    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        for photo in photos:
            full_path = os.path.join(os.getcwd(), "data", "uploads", photo.file_path)
            if os.path.exists(full_path):
                # Use milestone title + original filename in archive
                entry_title = photo.entry.title if photo.entry else "unknown"
                safe_title = "".join(c for c in entry_title if c.isalnum() or c in " _-")[:50]
                arc_name = f"{safe_title}/{photo.file_name}"
                zf.write(full_path, arc_name)

    buf.seek(0)
    return StreamingResponse(
        buf,
        media_type="application/zip",
        headers={"Content-Disposition": f'attachment; filename="milestones_photos_{child_id}.zip"'},
    )


def _thumb_path(relative_path: str) -> str:
    """Derive thumbnail path from original path: abc.jpg -> abc_thumb.jpg."""
    base, ext = relative_path.rsplit(".", 1)
    return f"{base}_thumb.{ext}"


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
