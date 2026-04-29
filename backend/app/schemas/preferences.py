"""User preferences schemas."""

from pydantic import BaseModel, Field


class PreferencesResponse(BaseModel):
    """User preferences (returned by GET /preferences).

    MBT-175: breastfeeding_enabled wurde auf children.breastfeeding_enabled
    verschoben — pro Kind konfigurierbar statt pro User.
    """

    feeding_hybrid: bool = False
    quick_actions: list[str] | None = None
    widget_order: list[str] | None = None
    track_visibility: dict[str, bool] | None = None
    timezone: str = "Europe/Berlin"
    locale: str = "de"
    tutorial_completed: bool = False
    tutorial_step: int = 0

    model_config = {"from_attributes": True}


class PreferencesUpdate(BaseModel):
    """Partial update for user preferences."""

    feeding_hybrid: bool | None = None
    quick_actions: list[str] | None = None
    widget_order: list[str] | None = None
    track_visibility: dict[str, bool] | None = None
    timezone: str | None = Field(default=None, max_length=50)
    locale: str | None = Field(default=None, max_length=10)
    tutorial_completed: bool | None = None
    tutorial_step: int | None = Field(default=None, ge=0, le=100)
