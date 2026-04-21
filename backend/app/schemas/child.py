"""Pydantic schemas for Child CRUD operations.

Field constraints enforce Security K3 — max_length on all user inputs.
"""

from datetime import date, datetime

from pydantic import BaseModel, Field

from app.schemas.base import UTCDatetime


class ChildCreate(BaseModel):
    """Schema for creating a new child."""

    name: str = Field(..., min_length=1, max_length=100)
    birth_date: date
    estimated_birth_date: date | None = None
    is_preterm: bool = False
    notes: str | None = Field(default=None, max_length=2000)


class ChildUpdate(BaseModel):
    """Schema for updating a child. All fields optional."""

    name: str | None = Field(default=None, min_length=1, max_length=100)
    birth_date: date | None = None
    estimated_birth_date: date | None = None
    is_preterm: bool | None = None
    notes: str | None = Field(default=None, max_length=2000)
    is_active: bool | None = None


class ChildResponse(BaseModel):
    """Schema for child API responses."""

    id: int
    name: str
    birth_date: date
    estimated_birth_date: date | None
    is_preterm: bool
    notes: str | None
    is_active: bool
    created_at: UTCDatetime

    model_config = {"from_attributes": True}
