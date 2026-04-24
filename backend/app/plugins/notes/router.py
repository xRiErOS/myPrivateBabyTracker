"""Notes plugin CRUD router — shared notes for parent communication."""

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.errors import NotFoundError
from app.database import get_session
from app.logging import get_logger
from app.middleware.auth import get_current_user
from app.models.user import User
from app.plugins.notes.models import SharedNote
from app.plugins.notes.schemas import NoteCreate, NoteResponse, NoteUpdate

logger = get_logger("notes")

router = APIRouter(prefix="/notes", tags=["notes"])


def _to_response(note: SharedNote) -> NoteResponse:
    """Convert SharedNote to NoteResponse with author name."""
    return NoteResponse(
        id=note.id,
        child_id=note.child_id,
        title=note.title,
        content=note.content,
        pinned=note.pinned,
        author_name=note.author.display_name if note.author else None,
        created_at=note.created_at,
        updated_at=note.updated_at,
    )


@router.get("/", response_model=list[NoteResponse])
async def list_notes(
    child_id: int | None = Query(default=None, gt=0),
    user: User | None = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    """List all shared notes, optionally filtered by child. Pinned first."""
    stmt = select(SharedNote).order_by(
        SharedNote.pinned.desc(), SharedNote.updated_at.desc()
    )
    if child_id:
        stmt = stmt.where(SharedNote.child_id == child_id)
    result = await db.execute(stmt)
    return [_to_response(n) for n in result.scalars().all()]


@router.get("/{note_id}", response_model=NoteResponse)
async def get_note(
    note_id: int,
    user: User | None = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    """Get a single note by ID."""
    result = await db.execute(select(SharedNote).where(SharedNote.id == note_id))
    note = result.scalar_one_or_none()
    if note is None:
        raise NotFoundError(f"Note with id {note_id} not found")
    return _to_response(note)


@router.post("/", response_model=NoteResponse, status_code=201)
async def create_note(
    data: NoteCreate,
    user: User | None = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    """Create a new shared note."""
    note = SharedNote(
        child_id=data.child_id,
        title=data.title,
        content=data.content,
        pinned=data.pinned,
        author_id=user.id if user else None,
    )
    db.add(note)
    await db.commit()
    await db.refresh(note)
    logger.info("note_created", note_id=note.id, child_id=note.child_id)
    return _to_response(note)


@router.patch("/{note_id}", response_model=NoteResponse)
async def update_note(
    note_id: int,
    data: NoteUpdate,
    user: User | None = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    """Update a shared note (partial update)."""
    result = await db.execute(select(SharedNote).where(SharedNote.id == note_id))
    note = result.scalar_one_or_none()
    if note is None:
        raise NotFoundError(f"Note with id {note_id} not found")

    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(note, field, value)

    await db.commit()
    await db.refresh(note)
    logger.info("note_updated", note_id=note.id)
    return _to_response(note)


@router.delete("/{note_id}", status_code=204)
async def delete_note(
    note_id: int,
    user: User | None = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    """Delete a shared note."""
    result = await db.execute(select(SharedNote).where(SharedNote.id == note_id))
    note = result.scalar_one_or_none()
    if note is None:
        raise NotFoundError(f"Note with id {note_id} not found")

    await db.delete(note)
    await db.commit()
    logger.info("note_deleted", note_id=note_id)
