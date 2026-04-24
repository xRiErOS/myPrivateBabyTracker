"""Pydantic schemas for Sleep plugin CRUD.

Field constraints enforce Security K3 — max_length and range limits
on all user input fields.
"""

from datetime import datetime
from enum import Enum

from pydantic import BaseModel, Field, model_validator

from app.schemas.base import UTCDatetime


class SleepType(str, Enum):
    """Valid sleep types."""

    nap = "nap"
    night = "night"


class SleepCreate(BaseModel):
    """Schema for creating a new sleep entry."""

    child_id: int = Field(..., gt=0)
    start_time: datetime
    end_time: datetime | None = None
    sleep_type: SleepType
    location: str | None = Field(default=None, max_length=50)
    quality: int | None = Field(default=None, ge=1, le=5)
    notes: str | None = Field(default=None, max_length=2000)

    @model_validator(mode="after")
    def validate_times(self):
        """Ensure end_time is after start_time if provided."""
        if self.end_time is not None and self.end_time <= self.start_time:
            raise ValueError("end_time must be after start_time")
        return self


class SleepUpdate(BaseModel):
    """Schema for updating a sleep entry. All fields optional."""

    start_time: datetime | None = None
    end_time: datetime | None = None
    sleep_type: SleepType | None = None
    location: str | None = Field(default=None, max_length=50)
    quality: int | None = Field(default=None, ge=1, le=5)
    notes: str | None = Field(default=None, max_length=2000)


class SleepResponse(BaseModel):
    """Schema for sleep entry API responses."""

    id: int
    child_id: int
    start_time: UTCDatetime
    end_time: UTCDatetime | None
    duration_minutes: int | None
    sleep_type: SleepType
    location: str | None
    quality: int | None
    notes: str | None
    created_at: UTCDatetime

    model_config = {"from_attributes": True}


class SleepDayPoint(BaseModel):
    """A single day's aggregated sleep data."""

    date: str  # YYYY-MM-DD
    total_hours: float
    nap_hours: float
    night_hours: float


class SleepChartResponse(BaseModel):
    """Response for sleep chart endpoint."""

    child_name: str
    is_preterm: bool
    measurements: list[SleepDayPoint]
    target_min_hours: float
    target_max_hours: float
    age_group: str
