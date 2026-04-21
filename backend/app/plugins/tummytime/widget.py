"""TummyTime plugin dashboard widget definition."""

from app.plugins._base import WidgetDef

tummy_time_widget = WidgetDef(
    name="tummy_time_summary",
    display_name="Bauchlage heute",
    size="medium",
    endpoint="/api/v1/tummy-time/",
)
