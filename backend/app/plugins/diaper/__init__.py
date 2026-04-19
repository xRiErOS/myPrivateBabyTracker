"""Diaper Plugin -- tracks diaper changes for children."""

from fastapi import FastAPI

from app.plugins._base import PluginBase, WidgetDef
from app.plugins.diaper.models import DiaperEntry
from app.plugins.diaper.router import router
from app.plugins.diaper.widget import get_widget


class DiaperPlugin(PluginBase):
    """Plugin for tracking diaper changes."""

    name = "diaper"
    display_name = "Windeln"

    def register_routes(self, app: FastAPI) -> None:
        """Register diaper CRUD routes."""
        app.include_router(router)

    def register_models(self) -> list[type]:
        """Return diaper models for Alembic discovery."""
        return [DiaperEntry]

    def register_widgets(self) -> list[WidgetDef]:
        """Return dashboard widgets for this plugin."""
        return [get_widget()]
