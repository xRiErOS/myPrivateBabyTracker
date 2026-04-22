"""Pydantic schemas for Health plugin CRUD.

Field constraints enforce Security K3 — max_length and range limits
on all user input fields.
"""

from datetime import datetime
from enum import Enum

from pydantic import BaseModel, Field, model_validator

from app.schemas.base import UTCDatetime


class HealthEntryType(str, Enum):
    """Valid health entry types."""

    spit_up = "spit_up"
    tummy_ache = "tummy_ache"


class HealthSeverity(str, Enum):
    """Valid severity levels."""

    mild = "mild"
    moderate = "moderate"
    severe = "severe"


class HealthDuration(str, Enum):
    """Valid duration levels — only for tummy_ache."""

    short = "short"
    medium = "medium"
    long = "long"


class HealthCreate(BaseModel):
    """Schema for creating a new health entry."""

    child_id: int = Field(..., gt=0)
    entry_type: HealthEntryType
    severity: HealthSeverity
    duration: HealthDuration | None = None
    time: datetime
    notes: str | None = Field(default=None, max_length=2000)
    feeding_id: int | None = Field(default=None, gt=0)

    @model_validator(mode="after")
    def validate_duration(self):
        """Duration is only allowed for tummy_ache entries."""
        if self.duration is not None and self.entry_type != HealthEntryType.tummy_ache:
            raise ValueError("duration is only allowed for tummy_ache entries")
        return self


class HealthUpdate(BaseModel):
    """Schema for updating a health entry. All fields optional."""

    entry_type: HealthEntryType | None = None
    severity: HealthSeverity | None = None
    duration: HealthDuration | None = None
    time: datetime | None = None
    notes: str | None = Field(default=None, max_length=2000)
    feeding_id: int | None = Field(default=None, gt=0)


class HealthResponse(BaseModel):
    """Schema for health entry API responses."""

    id: int
    child_id: int
    entry_type: HealthEntryType
    severity: HealthSeverity
    duration: HealthDuration | None
    time: UTCDatetime
    notes: str | None
    feeding_id: int | None
    created_at: UTCDatetime

    model_config = {"from_attributes": True}
