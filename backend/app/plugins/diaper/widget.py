"""Dashboard widget definition for the Diaper plugin."""

from app.plugins._base import WidgetDef


def get_widget() -> WidgetDef:
    """Return the diaper summary widget definition."""
    return WidgetDef(
        name="diaper_summary",
        display_name="Windeln heute",
        size="small",
        endpoint="/api/v1/diaper/",
    )
