"""Temperature plugin dashboard widget definition."""

from app.plugins._base import WidgetDef

temperature_widget = WidgetDef(
    name="temperature_latest",
    display_name="Temperatur",
    size="small",
    endpoint="/api/v1/temperature/",
)
