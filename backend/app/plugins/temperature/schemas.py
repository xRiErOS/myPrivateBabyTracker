"""Pydantic schemas for Temperature plugin CRUD.

Field constraints enforce Security K3 — max_length and range limits
on all user input fields.
"""

from datetime import datetime

from pydantic import BaseModel, Field

from app.schemas.base import UTCDatetime


class TemperatureCreate(BaseModel):
    """Schema for creating a new temperature entry."""

    child_id: int = Field(..., gt=0)
    measured_at: datetime
    temperature_celsius: float = Field(..., ge=34.0, le=43.0)
    notes: str | None = Field(default=None, max_length=2000)


class TemperatureUpdate(BaseModel):
    """Schema for updating a temperature entry. All fields optional."""

    measured_at: datetime | None = None
    temperature_celsius: float | None = Field(default=None, ge=34.0, le=43.0)
    notes: str | None = Field(default=None, max_length=2000)


class TemperatureResponse(BaseModel):
    """Schema for temperature entry API responses."""

    id: int
    child_id: int
    measured_at: UTCDatetime
    temperature_celsius: float
    notes: str | None
    created_at: UTCDatetime

    model_config = {"from_attributes": True}
