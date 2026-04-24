"""Pydantic schemas for Milestones plugin CRUD.

Field constraints enforce Security K3 — max_length and range limits
on all user input fields.
"""

from datetime import date
from enum import Enum

from pydantic import BaseModel, Field

from app.schemas.base import UTCDatetime


# --- Enums ---


class SourceType(str, Enum):
    """Valid source types for milestone entries/templates."""

    medical = "medical"
    emotional = "emotional"
    custom = "custom"
    leap = "leap"


class Confidence(str, Enum):
    """Confidence level for milestone completion date."""

    exact = "exact"
    approximate = "approximate"
    unsure = "unsure"


# --- Milestone Categories ---


class CategoryCreate(BaseModel):
    """Schema for creating a custom milestone category."""

    name: str = Field(..., min_length=1, max_length=100)
    color: str = Field(default="#8839ef", max_length=7)
    icon: str | None = Field(default=None, max_length=50)
    child_id: int = Field(..., gt=0)


class CategoryUpdate(BaseModel):
    """Schema for updating a custom category."""

    name: str | None = Field(default=None, min_length=1, max_length=100)
    color: str | None = Field(default=None, max_length=7)
    icon: str | None = Field(default=None, max_length=50)


class CategoryResponse(BaseModel):
    """Schema for category API responses."""

    id: int
    name: str
    color: str
    icon: str | None
    is_system: bool
    child_id: int | None
    created_at: UTCDatetime

    model_config = {"from_attributes": True}


# --- Milestone Templates ---


class TemplateResponse(BaseModel):
    """Schema for milestone template API responses."""

    id: int
    title: str
    description: str | None
    category_id: int
    source_type: str
    suggested_age_weeks_min: int | None
    suggested_age_weeks_max: int | None
    sort_order: int
    created_at: UTCDatetime

    model_config = {"from_attributes": True}


class SuggestionResponse(BaseModel):
    """Template with completion status for a specific child."""

    id: int
    title: str
    description: str | None
    category_id: int
    source_type: str
    suggested_age_weeks_min: int | None
    suggested_age_weeks_max: int | None
    is_completed: bool
    is_current: bool


# --- Milestone Entries ---


class MilestoneCreate(BaseModel):
    """Schema for creating a milestone entry."""

    child_id: int = Field(..., gt=0)
    template_id: int | None = Field(default=None, gt=0)
    title: str = Field(..., min_length=1, max_length=200)
    category_id: int = Field(..., gt=0)
    source_type: SourceType = SourceType.custom
    completed: bool = False
    completed_date: date | None = None
    confidence: Confidence = Confidence.exact
    notes: str | None = Field(default=None, max_length=2000)


class MilestoneUpdate(BaseModel):
    """Schema for updating a milestone entry. All fields optional."""

    title: str | None = Field(default=None, min_length=1, max_length=200)
    category_id: int | None = Field(default=None, gt=0)
    completed: bool | None = None
    completed_date: date | None = None
    confidence: Confidence | None = None
    notes: str | None = Field(default=None, max_length=2000)


class MilestoneCompleteRequest(BaseModel):
    """Schema for quick-complete action."""

    completed_date: date
    confidence: Confidence = Confidence.exact
    notes: str | None = Field(default=None, max_length=2000)


class PhotoResponse(BaseModel):
    """Schema for milestone photo API responses."""

    id: int
    milestone_entry_id: int
    file_path: str
    file_name: str
    file_size: int
    mime_type: str
    created_at: UTCDatetime

    model_config = {"from_attributes": True}


class MediaPhotoResponse(BaseModel):
    """Extended photo response for media management — includes milestone context."""

    id: int
    milestone_entry_id: int
    milestone_title: str
    category_id: int
    child_id: int
    file_path: str
    file_name: str
    file_size: int
    mime_type: str
    created_at: UTCDatetime


class StorageInfoResponse(BaseModel):
    """Storage usage info for uploaded photos."""

    total_photos: int
    total_size_bytes: int
    total_size_with_thumbs_bytes: int


class MilestoneResponse(BaseModel):
    """Schema for milestone entry API responses."""

    id: int
    child_id: int
    template_id: int | None
    title: str
    category_id: int
    source_type: str
    completed: bool
    completed_date: date | None
    confidence: str
    notes: str | None
    photos: list[PhotoResponse] = []
    created_at: UTCDatetime

    model_config = {"from_attributes": True}


# --- Leap Definitions ---


class LeapResponse(BaseModel):
    """Schema for leap definition API responses."""

    id: int
    leap_number: int
    title: str
    description: str
    storm_start_weeks: float
    storm_end_weeks: float
    sun_start_weeks: float
    new_skills: str | None
    storm_signs: str | None
    sort_order: int
    created_at: UTCDatetime

    model_config = {"from_attributes": True}


class LeapStatusItem(BaseModel):
    """Single leap with computed status for a child."""

    id: int
    leap_number: int
    title: str
    description: str
    storm_start_weeks: float
    storm_end_weeks: float
    sun_start_weeks: float
    new_skills: str | None
    storm_signs: str | None
    status: str  # "past" | "active_storm" | "active_sun" | "upcoming" | "far_future"
    storm_start_date: date | None
    storm_end_date: date | None
    sun_start_date: date | None


class LeapStatusResponse(BaseModel):
    """All leaps with computed status for a child."""

    child_age_weeks: float
    reference_date: date
    leaps: list[LeapStatusItem]
    active_leap: LeapStatusItem | None
