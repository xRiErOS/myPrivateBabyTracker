"""Pydantic schemas for Diaper plugin CRUD.

Field constraints enforce Security K3 -- max_length and range limits
on all user input fields.
"""

from datetime import datetime
from enum import Enum

from pydantic import BaseModel, Field


class DiaperType(str, Enum):
    """Valid diaper types."""

    wet = "wet"
    dirty = "dirty"
    mixed = "mixed"
    dry = "dry"


class DiaperCreate(BaseModel):
    """Schema for creating a new diaper entry."""

    child_id: int = Field(..., gt=0)
    time: datetime
    diaper_type: DiaperType
    color: str | None = Field(default=None, max_length=30)
    consistency: str | None = Field(default=None, max_length=30)
    has_rash: bool = Field(default=False)
    notes: str | None = Field(default=None, max_length=2000)


class DiaperUpdate(BaseModel):
    """Schema for updating a diaper entry. All fields optional."""

    time: datetime | None = None
    diaper_type: DiaperType | None = None
    color: str | None = Field(default=None, max_length=30)
    consistency: str | None = Field(default=None, max_length=30)
    has_rash: bool | None = None
    notes: str | None = Field(default=None, max_length=2000)


class DiaperResponse(BaseModel):
    """Schema for diaper entry API responses."""

    id: int
    child_id: int
    time: datetime
    diaper_type: DiaperType
    color: str | None
    consistency: str | None
    has_rash: bool
    notes: str | None
    created_at: datetime

    model_config = {"from_attributes": True}
