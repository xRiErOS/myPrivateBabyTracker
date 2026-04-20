"""Pydantic schemas for Medication plugin CRUD.

Field constraints enforce Security K3.
"""

from datetime import datetime

from pydantic import BaseModel, Field

from app.schemas.base import UTCDatetime


class MedicationCreate(BaseModel):
    """Schema for creating a new medication entry."""

    child_id: int = Field(..., gt=0)
    given_at: datetime
    medication_name: str = Field(..., min_length=1, max_length=200)
    medication_master_id: int | None = Field(default=None, gt=0)
    dose: str | None = Field(default=None, max_length=100)
    notes: str | None = Field(default=None, max_length=2000)


class MedicationUpdate(BaseModel):
    """Schema for updating a medication entry. All fields optional."""

    given_at: datetime | None = None
    medication_name: str | None = Field(default=None, min_length=1, max_length=200)
    medication_master_id: int | None = Field(default=None, gt=0)
    dose: str | None = Field(default=None, max_length=100)
    notes: str | None = Field(default=None, max_length=2000)


class MedicationResponse(BaseModel):
    """Schema for medication entry API responses."""

    id: int
    child_id: int
    given_at: UTCDatetime
    medication_name: str
    medication_master_id: int | None
    dose: str | None
    notes: str | None
    created_at: UTCDatetime

    model_config = {"from_attributes": True}
