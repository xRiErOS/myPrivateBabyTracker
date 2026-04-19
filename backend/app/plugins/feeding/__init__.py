"""Feeding Plugin — tracks breastfeeding, bottle, and solid food intake.

Registers as 'feeding' in the plugin registry via PluginBase discovery.
"""

from fastapi import FastAPI

from app.plugins._base import PluginBase, WidgetDef
from app.plugins.feeding.models import FeedingEntry
from app.plugins.feeding.router import router
from app.plugins.feeding.widget import feeding_widget


class FeedingPlugin(PluginBase):
    """Feeding tracking plugin."""

    name = "feeding"
    display_name = "Mahlzeiten"

    def register_routes(self, app: FastAPI) -> None:
        """Register feeding CRUD routes under /api/v1/feeding/."""
        app.include_router(router, prefix="/api/v1")

    def register_models(self) -> list[type]:
        """Return FeedingEntry for Alembic discovery."""
        return [FeedingEntry]

    def register_widgets(self) -> list[WidgetDef]:
        """Return feeding dashboard widget (size=medium, order=2)."""
        return [feeding_widget]
