"""VitaminD3 plugin — tracks daily Vitamin D3 administration.

Discovered automatically by PluginRegistry (ADR-1).
"""

from fastapi import FastAPI

from app.plugins._base import PluginBase, WidgetDef
from app.plugins.vitamind3.models import VitaminD3Entry
from app.plugins.vitamind3.router import router
from app.plugins.vitamind3.widget import vitamind3_widget


class VitaminD3Plugin(PluginBase):
    """Vitamin D3 tracking plugin."""

    name = "vitamind3"
    display_name = "Vitamin D3"

    def register_routes(self, app: FastAPI) -> None:
        """Register vitamind3 routes under /api/v1/vitamind3/."""
        app.include_router(router, prefix="/api/v1")

    def register_models(self) -> list[type]:
        """Return VitaminD3Entry model for Alembic discovery."""
        return [VitaminD3Entry]

    def register_widgets(self) -> list[WidgetDef]:
        """Return vitamind3 dashboard widget."""
        return [vitamind3_widget]
