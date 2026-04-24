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
    crying = "crying"


class HealthSeverity(str, Enum):
    """Valid severity levels."""

    mild = "mild"
    moderate = "moderate"
    severe = "severe"


class HealthDuration(str, Enum):
    """Valid duration levels — for tummy_ache and crying."""

    short = "short"
    medium = "medium"
    long = "long"


class SoothingMethod(str, Enum):
    """Valid soothing methods for crying entries."""

    nursing = "nursing"
    rocking = "rocking"
    carrying = "carrying"
    pacifier = "pacifier"
    singing = "singing"
    white_noise = "white_noise"
    swaddling = "swaddling"
    other = "other"


class HealthCreate(BaseModel):
    """Schema for creating a new health entry."""

    child_id: int = Field(..., gt=0)
    entry_type: HealthEntryType
    severity: HealthSeverity
    duration: HealthDuration | None = None
    duration_minutes: int | None = Field(default=None, ge=1, le=1440)
    soothing_method: SoothingMethod | None = None
    time: datetime
    notes: str | None = Field(default=None, max_length=2000)
    feeding_id: int | None = Field(default=None, gt=0)

    @model_validator(mode="after")
    def validate_duration(self):
        """Duration is only allowed for tummy_ache and crying entries."""
        if self.duration is not None and self.entry_type not in (
            HealthEntryType.tummy_ache, HealthEntryType.crying
        ):
            raise ValueError("duration is only allowed for tummy_ache and crying entries")
        return self

    @model_validator(mode="after")
    def validate_soothing(self):
        """Soothing method is only allowed for crying entries."""
        if self.soothing_method is not None and self.entry_type != HealthEntryType.crying:
            raise ValueError("soothing_method is only allowed for crying entries")
        return self


class HealthUpdate(BaseModel):
    """Schema for updating a health entry. All fields optional."""

    entry_type: HealthEntryType | None = None
    severity: HealthSeverity | None = None
    duration: HealthDuration | None = None
    duration_minutes: int | None = Field(default=None, ge=1, le=1440)
    soothing_method: SoothingMethod | None = None
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
    duration_minutes: int | None
    soothing_method: SoothingMethod | None
    time: UTCDatetime
    notes: str | None
    feeding_id: int | None
    created_at: UTCDatetime

    model_config = {"from_attributes": True}
