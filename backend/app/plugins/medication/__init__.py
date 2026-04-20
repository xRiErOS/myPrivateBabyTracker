"""Medication plugin — tracks medication administration for children.

Discovered automatically by PluginRegistry (ADR-1).
More flexible than VitaminD3: supports any medication with name, dose, frequency.
"""

from fastapi import FastAPI

from app.plugins._base import PluginBase, WidgetDef
from app.plugins.medication.models import MedicationEntry
from app.plugins.medication.router import router
from app.plugins.medication.widget import medication_widget


class MedicationPlugin(PluginBase):
    """Medication tracking plugin."""

    name = "medication"
    display_name = "Medikamente"

    def register_routes(self, app: FastAPI) -> None:
        """Register medication CRUD routes under /api/v1/medication/."""
        app.include_router(router, prefix="/api/v1")

    def register_models(self) -> list[type]:
        """Return MedicationEntry model for Alembic discovery."""
        return [MedicationEntry]

    def register_widgets(self) -> list[WidgetDef]:
        """Return medication dashboard widget."""
        return [medication_widget]
