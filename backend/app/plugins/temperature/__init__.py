"""Temperature plugin — tracks body temperature measurements for children.

Discovered automatically by PluginRegistry (ADR-1).
"""

from fastapi import FastAPI

from app.plugins._base import PluginBase, WidgetDef
from app.plugins.temperature.models import TemperatureEntry
from app.plugins.temperature.router import router
from app.plugins.temperature.widget import temperature_widget


class TemperaturePlugin(PluginBase):
    """Body temperature tracking plugin."""

    name = "temperature"
    display_name = "Temperatur"

    def register_routes(self, app: FastAPI) -> None:
        """Register temperature CRUD routes under /api/v1/temperature/."""
        app.include_router(router, prefix="/api/v1")

    def register_models(self) -> list[type]:
        """Return TemperatureEntry model for Alembic discovery."""
        return [TemperatureEntry]

    def register_widgets(self) -> list[WidgetDef]:
        """Return temperature dashboard widget."""
        return [temperature_widget]
