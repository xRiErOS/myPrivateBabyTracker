"""Schemas for alert config and active warnings."""

from pydantic import BaseModel, Field


class AlertConfigUpdate(BaseModel):
    """Schema for updating alert config thresholds."""

    wet_diaper_enabled: bool | None = None
    wet_diaper_min: int | None = Field(default=None, ge=1, le=20)

    no_stool_enabled: bool | None = None
    no_stool_hours: int | None = Field(default=None, ge=12, le=120)

    low_feeding_enabled: bool | None = None
    low_feeding_ml: int | None = Field(default=None, ge=100, le=2000)

    fever_enabled: bool | None = None
    fever_threshold: float | None = Field(default=None, ge=36.0, le=42.0)

    feeding_interval_enabled: bool | None = None
    feeding_interval_hours: int | None = Field(default=None, ge=1, le=24)

    leap_storm_enabled: bool | None = None
    min_age_weeks: int | None = Field(default=None, ge=0, le=520)
    max_age_weeks: int | None = Field(default=None, ge=0, le=520)


class AlertConfigResponse(BaseModel):
    """Schema for alert config API response."""

    id: int
    child_id: int
    wet_diaper_enabled: bool
    wet_diaper_min: int
    no_stool_enabled: bool
    no_stool_hours: int
    low_feeding_enabled: bool
    low_feeding_ml: int
    fever_enabled: bool
    fever_threshold: float
    feeding_interval_enabled: bool
    feeding_interval_hours: int
    leap_storm_enabled: bool
    min_age_weeks: int | None = None
    max_age_weeks: int | None = None

    model_config = {"from_attributes": True}


class Alert(BaseModel):
    """A single active alert/warning."""

    type: str  # "wet_diaper" | "no_stool" | "low_feeding" | "fever" | "feeding_interval"
    severity: str  # "warning" | "critical"
    message: str
    value: float | int | None = None
    threshold: float | int | None = None


class AlertsResponse(BaseModel):
    """Response with all active alerts for a child."""

    child_id: int
    alerts: list[Alert]
