"""TummyTime plugin -- tracks tummy time sessions for children.

Discovered automatically by PluginRegistry (ADR-1).
"""

from fastapi import FastAPI

from app.plugins._base import PluginBase, WidgetDef
from app.plugins.tummytime.models import TummyTimeEntry
from app.plugins.tummytime.router import router
from app.plugins.tummytime.widget import tummy_time_widget


class TummyTimePlugin(PluginBase):
    """Tummy time tracking plugin."""

    name = "tummytime"
    display_name = "Bauchlage"

    def register_routes(self, app: FastAPI) -> None:
        """Register tummy time CRUD routes under /api/v1/tummy-time/."""
        app.include_router(router, prefix="/api/v1")

    def register_models(self) -> list[type]:
        """Return TummyTimeEntry model for Alembic discovery."""
        return [TummyTimeEntry]

    def register_widgets(self) -> list[WidgetDef]:
        """Return tummy time dashboard widget."""
        return [tummy_time_widget]
