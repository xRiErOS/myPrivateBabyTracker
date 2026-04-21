"""Health plugin — tracks gastrointestinal symptoms (spit-up, tummy ache).

Discovered automatically by PluginRegistry (ADR-1).
"""

from fastapi import FastAPI

from app.plugins._base import PluginBase, WidgetDef
from app.plugins.health.models import HealthEntry
from app.plugins.health.router import router
from app.plugins.health.widget import health_widget


class HealthPlugin(PluginBase):
    """Health tracking plugin."""

    name = "health"
    display_name = "Gesundheit"

    def register_routes(self, app: FastAPI) -> None:
        """Register health CRUD routes under /api/v1/health/."""
        app.include_router(router, prefix="/api/v1")

    def register_models(self) -> list[type]:
        """Return HealthEntry model for Alembic discovery."""
        return [HealthEntry]

    def register_widgets(self) -> list[WidgetDef]:
        """Return health dashboard widget."""
        return [health_widget]
