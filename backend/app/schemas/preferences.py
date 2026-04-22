"""User preferences schemas."""

from pydantic import BaseModel, Field


class PreferencesResponse(BaseModel):
    """User preferences (returned by GET /preferences)."""

    breastfeeding_enabled: bool = True
    feeding_hybrid: bool = False
    quick_actions: list[str] | None = None
    widget_order: list[str] | None = None
    track_visibility: dict[str, bool] | None = None
    timezone: str = "Europe/Berlin"
    locale: str = "de"

    model_config = {"from_attributes": True}


class PreferencesUpdate(BaseModel):
    """Partial update for user preferences."""

    breastfeeding_enabled: bool | None = None
    feeding_hybrid: bool | None = None
    quick_actions: list[str] | None = None
    widget_order: list[str] | None = None
    track_visibility: dict[str, bool] | None = None
    timezone: str | None = Field(default=None, max_length=50)
    locale: str | None = Field(default=None, max_length=10)
