"""Pydantic schemas for Todo plugin CRUD.

Field constraints enforce Security K3.
"""

from datetime import datetime

from pydantic import BaseModel, Field

from app.schemas.base import UTCDatetime


class TodoCreate(BaseModel):
    """Schema for creating a new todo entry."""

    child_id: int = Field(..., gt=0)
    title: str = Field(..., min_length=1, max_length=200)
    details: str | None = Field(default=None, max_length=2000)
    due_date: datetime | None = None


class TodoUpdate(BaseModel):
    """Schema for updating a todo entry. All fields optional."""

    title: str | None = Field(default=None, min_length=1, max_length=200)
    details: str | None = Field(default=None, max_length=2000)
    due_date: datetime | None = None
    is_done: bool | None = None


class TodoResponse(BaseModel):
    """Schema for todo entry API responses."""

    id: int
    child_id: int
    title: str
    details: str | None
    due_date: UTCDatetime | None
    is_done: bool
    completed_at: UTCDatetime | None
    created_at: UTCDatetime

    model_config = {"from_attributes": True}
