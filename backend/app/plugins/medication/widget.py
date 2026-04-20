"""Medication plugin dashboard widget definition."""

from app.plugins._base import WidgetDef

medication_widget = WidgetDef(
    name="medication_today",
    display_name="Medikamente",
    size="medium",
    endpoint="/api/v1/medication/",
)
