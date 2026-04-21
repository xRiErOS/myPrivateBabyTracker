"""Pydantic schemas for TummyTime plugin CRUD.

Field constraints enforce Security K3 -- max_length and range limits
on all user input fields.
"""

from datetime import datetime

from pydantic import BaseModel, Field, model_validator

from app.schemas.base import UTCDatetime


class TummyTimeCreate(BaseModel):
    """Schema for creating a new tummy time entry."""

    child_id: int = Field(..., gt=0)
    start_time: datetime
    end_time: datetime | None = None
    notes: str | None = Field(default=None, max_length=2000)

    @model_validator(mode="after")
    def validate_times(self):
        """Ensure end_time is after start_time if provided."""
        if self.end_time is not None and self.end_time <= self.start_time:
            raise ValueError("end_time must be after start_time")
        return self


class TummyTimeUpdate(BaseModel):
    """Schema for updating a tummy time entry. All fields optional."""

    start_time: datetime | None = None
    end_time: datetime | None = None
    notes: str | None = Field(default=None, max_length=2000)


class TummyTimeResponse(BaseModel):
    """Schema for tummy time entry API responses."""

    id: int
    child_id: int
    start_time: UTCDatetime
    end_time: UTCDatetime | None
    duration_minutes: int | None
    notes: str | None
    created_at: UTCDatetime

    model_config = {"from_attributes": True}
