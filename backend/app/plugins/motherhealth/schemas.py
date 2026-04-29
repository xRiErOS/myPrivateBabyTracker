"""Pydantic schemas for MotherHealth plugin CRUD (MBT-109).

Field constraints enforce Security K3.
"""

from pydantic import BaseModel, Field

from app.schemas.base import UTCDatetime


class MotherHealthCreate(BaseModel):
    """Schema for creating a new mother-health entry."""

    child_id: int = Field(..., gt=0)
    content: str = Field(..., min_length=1, max_length=4000)


class MotherHealthUpdate(BaseModel):
    """Schema for updating an existing mother-health entry."""

    content: str | None = Field(default=None, min_length=1, max_length=4000)


class MotherHealthResponse(BaseModel):
    """Schema for mother-health entry API responses."""

    id: int
    child_id: int
    content: str
    created_at: UTCDatetime
    updated_at: UTCDatetime

    model_config = {"from_attributes": True}
