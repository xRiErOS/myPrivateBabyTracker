"""Checkup plugin — U-Untersuchungen tracking (U1-U9).

Discovered automatically by PluginRegistry (ADR-1).
"""

from fastapi import FastAPI

from app.plugins._base import PluginBase, WidgetDef
from app.plugins.checkup.models import CheckupEntry, CheckupType
from app.plugins.checkup.router import router
from app.plugins.checkup.widget import checkup_widget


class CheckupPlugin(PluginBase):
    """Pediatric checkup tracking plugin."""

    name = "checkup"
    display_name = "U-Untersuchungen"

    def register_routes(self, app: FastAPI) -> None:
        """Register checkup CRUD routes under /api/v1/checkup/."""
        app.include_router(router, prefix="/api/v1")

    def register_models(self) -> list[type]:
        """Return CheckupEntry and CheckupType models for Alembic discovery."""
        return [CheckupEntry, CheckupType]

    def register_widgets(self) -> list[WidgetDef]:
        """Return checkup dashboard widget."""
        return [checkup_widget]
