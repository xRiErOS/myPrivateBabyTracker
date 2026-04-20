"""Pydantic schemas for Tag CRUD and EntryTag association.

Field constraints enforce Security K3.
"""

from pydantic import BaseModel, Field

from app.schemas.base import UTCDatetime


class TagCreate(BaseModel):
    """Schema for creating a new tag."""

    child_id: int = Field(..., gt=0)
    name: str = Field(..., min_length=1, max_length=100)
    color: str = Field(default="#8839ef", pattern=r"^#[0-9a-fA-F]{6}$", max_length=7)


class TagUpdate(BaseModel):
    """Schema for updating a tag. All fields optional."""

    name: str | None = Field(default=None, min_length=1, max_length=100)
    color: str | None = Field(default=None, pattern=r"^#[0-9a-fA-F]{6}$", max_length=7)


class TagResponse(BaseModel):
    """Schema for tag API responses."""

    id: int
    child_id: int
    name: str
    color: str
    created_at: UTCDatetime

    model_config = {"from_attributes": True}


class EntryTagCreate(BaseModel):
    """Schema for attaching a tag to an entry."""

    tag_id: int = Field(..., gt=0)
    entry_type: str = Field(..., min_length=1, max_length=50)
    entry_id: int = Field(..., gt=0)


class EntryTagResponse(BaseModel):
    """Schema for entry-tag association responses."""

    id: int
    tag_id: int
    entry_type: str
    entry_id: int
    tag: TagResponse

    model_config = {"from_attributes": True}
