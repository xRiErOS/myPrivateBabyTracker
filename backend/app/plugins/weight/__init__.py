"""Weight plugin — tracks body weight measurements for children.

Discovered automatically by PluginRegistry (ADR-1).
"""

from fastapi import FastAPI

from app.plugins._base import PluginBase, WidgetDef
from app.plugins.weight.models import WeightEntry
from app.plugins.weight.router import router
from app.plugins.weight.widget import weight_widget


class WeightPlugin(PluginBase):
    """Body weight tracking plugin."""

    name = "weight"
    display_name = "Gewicht"

    def register_routes(self, app: FastAPI) -> None:
        """Register weight CRUD routes under /api/v1/weight/."""
        app.include_router(router, prefix="/api/v1")

    def register_models(self) -> list[type]:
        """Return WeightEntry model for Alembic discovery."""
        return [WeightEntry]

    def register_widgets(self) -> list[WidgetDef]:
        """Return weight dashboard widget."""
        return [weight_widget]
