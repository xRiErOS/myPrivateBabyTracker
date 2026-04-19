"""Pydantic schemas for VitaminD3 plugin.

Field constraints enforce Security K3.
"""

from pydantic import BaseModel, Field

from app.schemas.base import UTCDatetime


class VitaminD3Create(BaseModel):
    """Schema for recording Vitamin D3 given today."""

    child_id: int = Field(..., gt=0)
    date: str = Field(..., pattern=r"^\d{4}-\d{2}-\d{2}$", max_length=10)


class VitaminD3Response(BaseModel):
    """Schema for Vitamin D3 API responses."""

    id: int
    child_id: int
    date: str
    given_at: UTCDatetime
    created_at: UTCDatetime

    model_config = {"from_attributes": True}
