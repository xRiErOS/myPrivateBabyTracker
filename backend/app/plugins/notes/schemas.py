"""Pydantic schemas for Notes plugin CRUD.

Field constraints enforce Security K3.
"""

from pydantic import BaseModel, Field

from app.schemas.base import UTCDatetime


class NoteCreate(BaseModel):
    """Schema for creating a new shared note."""

    child_id: int = Field(..., gt=0)
    title: str = Field(..., min_length=1, max_length=200)
    content: str = Field(default="", max_length=5000)
    pinned: bool = False


class NoteUpdate(BaseModel):
    """Schema for updating a shared note. All fields optional."""

    title: str | None = Field(default=None, min_length=1, max_length=200)
    content: str | None = Field(default=None, max_length=5000)
    pinned: bool | None = None


class NoteResponse(BaseModel):
    """Schema for shared note API responses."""

    id: int
    child_id: int
    title: str
    content: str
    pinned: bool
    author_name: str | None
    created_at: UTCDatetime
    updated_at: UTCDatetime

    model_config = {"from_attributes": True}
