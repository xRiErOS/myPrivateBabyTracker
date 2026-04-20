"""Pydantic schemas for Weight plugin CRUD.

Field constraints enforce Security K3.
Weight in grams (e.g. 3500 = 3.5 kg).
"""

from datetime import datetime

from pydantic import BaseModel, Field

from app.schemas.base import UTCDatetime


class WeightCreate(BaseModel):
    """Schema for creating a new weight entry."""

    child_id: int = Field(..., gt=0)
    measured_at: datetime
    weight_grams: int = Field(..., ge=500, le=30000)
    notes: str | None = Field(default=None, max_length=2000)


class WeightUpdate(BaseModel):
    """Schema for updating a weight entry. All fields optional."""

    measured_at: datetime | None = None
    weight_grams: int | None = Field(default=None, ge=500, le=30000)
    notes: str | None = Field(default=None, max_length=2000)


class WeightResponse(BaseModel):
    """Schema for weight entry API responses."""

    id: int
    child_id: int
    measured_at: UTCDatetime
    weight_grams: int
    notes: str | None
    created_at: UTCDatetime

    model_config = {"from_attributes": True}
