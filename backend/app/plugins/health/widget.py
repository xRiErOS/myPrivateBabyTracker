"""Health plugin dashboard widget definition."""

from app.plugins._base import WidgetDef

health_widget = WidgetDef(
    name="health_summary",
    display_name="Gesundheit heute",
    size="small",
    endpoint="/api/v1/health/",
)
