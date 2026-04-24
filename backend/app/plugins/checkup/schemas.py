"""Pydantic schemas for Checkup plugin CRUD.

Field constraints enforce Security K3 — max_length and range limits
on all user input fields.
"""

from datetime import date as date_type

from pydantic import BaseModel, Field

from app.schemas.base import UTCDatetime


class CheckupTypeResponse(BaseModel):
    """Schema for checkup type (U1-U9) API responses."""

    id: int
    name: str
    display_name: str
    recommended_age_weeks_min: int
    recommended_age_weeks_max: int
    description: str | None

    model_config = {"from_attributes": True}


class CheckupCreate(BaseModel):
    """Schema for creating a new checkup entry."""

    child_id: int = Field(..., gt=0)
    checkup_type_id: int = Field(..., gt=0)
    date: date_type
    doctor: str | None = Field(default=None, max_length=200)
    weight_grams: int | None = Field(default=None, ge=500, le=30000)
    height_cm: float | None = Field(default=None, ge=20.0, le=120.0)
    head_circumference_cm: float | None = Field(default=None, ge=20.0, le=60.0)
    notes: str | None = Field(default=None, max_length=2000)
    is_completed: bool = True


class CheckupUpdate(BaseModel):
    """Schema for updating a checkup entry. All fields optional."""

    date: date_type | None = None
    doctor: str | None = Field(default=None, max_length=200)
    weight_grams: int | None = Field(default=None, ge=500, le=30000)
    height_cm: float | None = Field(default=None, ge=20.0, le=120.0)
    head_circumference_cm: float | None = Field(default=None, ge=20.0, le=60.0)
    notes: str | None = Field(default=None, max_length=2000)
    is_completed: bool | None = None


class CheckupResponse(BaseModel):
    """Schema for checkup entry API responses."""

    id: int
    child_id: int
    checkup_type_id: int
    checkup_type_name: str
    checkup_type_display_name: str
    date: date_type
    doctor: str | None
    weight_grams: int | None
    height_cm: float | None
    head_circumference_cm: float | None
    notes: str | None
    is_completed: bool
    created_at: UTCDatetime

    model_config = {"from_attributes": True}


class NextCheckupResponse(BaseModel):
    """Schema for next upcoming checkup info."""

    checkup_type: CheckupTypeResponse
    is_due: bool
    is_overdue: bool
    age_weeks_current: float
    days_until_due: int | None
