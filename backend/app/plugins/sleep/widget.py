"""Sleep plugin dashboard widget definition."""

from app.plugins._base import WidgetDef

sleep_widget = WidgetDef(
    name="sleep_summary",
    display_name="Schlaf heute",
    size="medium",
    endpoint="/api/v1/sleep/",
)
