"""Milestones plugin — tracks developmental milestones, emotional firsts, and leaps.

Discovered automatically by PluginRegistry (ADR-1).
"""

from fastapi import FastAPI

from app.plugins._base import PluginBase, WidgetDef
from app.plugins.milestones.models import (
    LeapDefinition,
    MilestoneCategory,
    MilestoneEntry,
    MilestonePhoto,
    MilestoneTemplate,
)
from app.plugins.milestones.router import (
    category_router,
    leap_router,
    media_router,
    milestone_router,
    template_router,
)
from app.plugins.milestones.widget import milestones_widget


class MilestonesPlugin(PluginBase):
    """Milestones & Development tracking plugin."""

    name = "milestones"
    display_name = "Meilensteine"

    def register_routes(self, app: FastAPI) -> None:
        """Register milestone CRUD routes under /api/v1/."""
        app.include_router(category_router, prefix="/api/v1")
        app.include_router(template_router, prefix="/api/v1")
        app.include_router(milestone_router, prefix="/api/v1")
        app.include_router(media_router, prefix="/api/v1")
        app.include_router(leap_router, prefix="/api/v1")

    def register_models(self) -> list[type]:
        """Return all milestone models for Alembic discovery."""
        return [
            MilestoneCategory,
            MilestoneTemplate,
            MilestoneEntry,
            MilestonePhoto,
            LeapDefinition,
        ]

    def register_widgets(self) -> list[WidgetDef]:
        """Return milestones dashboard widget."""
        return [milestones_widget]
