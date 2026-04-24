"""Growth plugin — WHO percentile charts for weight tracking.

Discovered automatically by PluginRegistry (ADR-1).
"""

from fastapi import FastAPI

from app.plugins._base import PluginBase, WidgetDef
from app.plugins.growth.router import router


class GrowthPlugin(PluginBase):
    """WHO growth percentile chart plugin."""

    name = "growth"
    display_name = "Wachstumskurven"

    def register_routes(self, app: FastAPI) -> None:
        """Register growth chart routes under /api/v1/growth/."""
        app.include_router(router, prefix="/api/v1")

    def register_models(self) -> list[type]:
        """No own models — reads from weight_entries."""
        return []

    def register_widgets(self) -> list[WidgetDef]:
        """No dashboard widget — accessible via Weight page."""
        return []
