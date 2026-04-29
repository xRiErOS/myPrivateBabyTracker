"""User preferences schemas."""

from pydantic import BaseModel, Field


# MBT-182: FAB Radial-Menü unterstützt bis zu 4 konfigurierbare Slots.
QUICK_ACTIONS_MAX = 4


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
    # MBT-182: maximal 4 Quick-Actions (FAB-Radial-Menü).
    quick_actions: list[str] | None = Field(default=None, max_length=QUICK_ACTIONS_MAX)
    widget_order: list[str] | None = None
    track_visibility: dict[str, bool] | None = None
    timezone: str | None = Field(default=None, max_length=50)
    locale: str | None = Field(default=None, max_length=10)
    tutorial_completed: bool | None = None
    tutorial_step: int | None = Field(default=None, ge=0, le=100)
