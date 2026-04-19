"""Dashboard widget definition for the Feeding plugin."""

from app.plugins._base import WidgetDef

feeding_widget = WidgetDef(
    name="feeding_summary",
    display_name="Mahlzeiten heute",
    size="medium",
    endpoint="/api/v1/feeding/",
)
