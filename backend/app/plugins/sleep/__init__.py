"""Sleep plugin — tracks naps and night sleep for children.

Discovered automatically by PluginRegistry (ADR-1).
"""

from fastapi import FastAPI

from app.plugins._base import PluginBase, WidgetDef
from app.plugins.sleep.models import SleepEntry
from app.plugins.sleep.router import router
from app.plugins.sleep.widget import sleep_widget


class SleepPlugin(PluginBase):
    """Sleep tracking plugin."""

    name = "sleep"
    display_name = "Schlaf"

    def register_routes(self, app: FastAPI) -> None:
        """Register sleep CRUD routes under /api/v1/sleep/."""
        app.include_router(router, prefix="/api/v1")

    def register_models(self) -> list[type]:
        """Return SleepEntry model for Alembic discovery."""
        return [SleepEntry]

    def register_widgets(self) -> list[WidgetDef]:
        """Return sleep dashboard widget."""
        return [sleep_widget]
