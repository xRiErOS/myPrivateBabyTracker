"""Pydantic schemas for Feeding plugin.

Field constraints enforce Security K3:
- notes: max_length=2000
- amount_ml: ge=0, le=1000
- food_type: max_length=100
"""

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

from app.schemas.base import UTCDatetime


FEEDING_TYPES = Literal["breast_left", "breast_right", "bottle", "solid"]


class FeedingCreate(BaseModel):
    """Schema for creating a feeding entry."""

    child_id: int
    start_time: datetime
    end_time: datetime | None = None
    feeding_type: FEEDING_TYPES
    amount_ml: float | None = Field(default=None, ge=0, le=1000)
    food_type: str | None = Field(default=None, max_length=100)
    duration_minutes: int | None = Field(default=None, ge=0)
    notes: str | None = Field(default=None, max_length=2000)


class FeedingUpdate(BaseModel):
    """Schema for updating a feeding entry. All fields optional."""

    start_time: datetime | None = None
    end_time: datetime | None = None
    feeding_type: FEEDING_TYPES | None = None
    amount_ml: float | None = Field(default=None, ge=0, le=1000)
    food_type: str | None = Field(default=None, max_length=100)
    duration_minutes: int | None = Field(default=None, ge=0)
    notes: str | None = Field(default=None, max_length=2000)


class FeedingResponse(BaseModel):
    """Schema for feeding entry API responses."""

    id: int
    child_id: int
    start_time: UTCDatetime
    end_time: UTCDatetime | None
    feeding_type: str
    amount_ml: float | None
    food_type: str | None
    duration_minutes: int | None
    notes: str | None
    created_at: UTCDatetime

    model_config = {"from_attributes": True}
