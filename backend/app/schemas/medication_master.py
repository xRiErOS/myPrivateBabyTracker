"""Pydantic schemas for MedicationMaster CRUD.

Field constraints enforce Security K3.
"""

from pydantic import BaseModel, Field

from app.schemas.base import UTCDatetime


class MedicationMasterCreate(BaseModel):
    """Schema for creating a new medication master entry."""

    name: str = Field(..., min_length=1, max_length=200)
    active_ingredient: str | None = Field(default=None, max_length=200)
    default_unit: str = Field(default="Tablette", max_length=50)
    notes: str | None = Field(default=None, max_length=2000)


class MedicationMasterUpdate(BaseModel):
    """Schema for updating a medication master. All fields optional."""

    name: str | None = Field(default=None, min_length=1, max_length=200)
    active_ingredient: str | None = Field(default=None, max_length=200)
    default_unit: str | None = Field(default=None, max_length=50)
    notes: str | None = Field(default=None, max_length=2000)
    is_active: bool | None = None


class MedicationMasterResponse(BaseModel):
    """Schema for medication master API responses."""

    id: int
    name: str
    active_ingredient: str | None
    default_unit: str
    notes: str | None
    is_active: bool
    created_at: UTCDatetime

    model_config = {"from_attributes": True}
