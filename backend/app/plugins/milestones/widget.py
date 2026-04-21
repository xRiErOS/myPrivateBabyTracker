"""Milestones dashboard widget definition."""

from app.plugins._base import WidgetDef

milestones_widget = WidgetDef(
    name="milestones_overview",
    display_name="Meilensteine",
    size="medium",
    endpoint="/api/v1/milestones/?completed=true&limit=5",
)
