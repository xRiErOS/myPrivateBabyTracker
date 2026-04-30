"""Pydantic schemas for Child CRUD operations.

Field constraints enforce Security K3 — max_length on all user inputs.
"""

from datetime import date
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, Field

from app.schemas.base import UTCDatetime


Gender = Literal["male", "female", "other"]


class ChildCreate(BaseModel):
    """Schema for creating a new child."""

    name: str = Field(..., min_length=1, max_length=100)
    birth_date: date
    estimated_birth_date: date | None = None
    is_preterm: bool = False
    gender: Gender | None = None
    birth_weight_g: int | None = Field(default=None, ge=0, le=10000)
    birth_length_cm: Decimal | None = Field(default=None, ge=0, le=100, max_digits=5, decimal_places=2)
    notes: str | None = Field(default=None, max_length=2000)
    # MBT-175: Stillmodus pro Kind
    breastfeeding_enabled: bool = True
    feeding_hybrid: bool = False


class ChildUpdate(BaseModel):
    """Schema for updating a child. All fields optional."""

    name: str | None = Field(default=None, min_length=1, max_length=100)
    birth_date: date | None = None
    estimated_birth_date: date | None = None
    is_preterm: bool | None = None
    gender: Gender | None = None
    birth_weight_g: int | None = Field(default=None, ge=0, le=10000)
    birth_length_cm: Decimal | None = Field(default=None, ge=0, le=100, max_digits=5, decimal_places=2)
    notes: str | None = Field(default=None, max_length=2000)
    is_active: bool | None = None
    breastfeeding_enabled: bool | None = None
    feeding_hybrid: bool | None = None


class ChildResponse(BaseModel):
    """Schema for child API responses."""

    id: int
    name: str
    birth_date: date
    estimated_birth_date: date | None
    is_preterm: bool
    gender: Gender | None
    birth_weight_g: int | None
    birth_length_cm: Decimal | None
    notes: str | None
    is_active: bool
    breastfeeding_enabled: bool
    feeding_hybrid: bool
    created_at: UTCDatetime

    model_config = {"from_attributes": True}
