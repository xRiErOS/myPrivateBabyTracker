"""Weight plugin dashboard widget definition."""

from app.plugins._base import WidgetDef

weight_widget = WidgetDef(
    name="weight_latest",
    display_name="Gewicht",
    size="small",
    endpoint="/api/v1/weight/",
)
