"""VitaminD3 plugin dashboard widget definition."""

from app.plugins._base import WidgetDef

vitamind3_widget = WidgetDef(
    name="vitamind3_calendar",
    display_name="Vitamin D3",
    size="medium",
    endpoint="/api/v1/vitamind3/",
)
