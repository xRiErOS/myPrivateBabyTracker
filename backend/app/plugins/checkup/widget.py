"""Checkup plugin dashboard widget definition."""

from app.plugins._base import WidgetDef

checkup_widget = WidgetDef(
    name="checkup_next",
    display_name="Nächste U-Untersuchung",
    size="small",
    endpoint="/api/v1/checkup/next/",
)
