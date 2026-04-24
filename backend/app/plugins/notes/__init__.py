"""Notes plugin — shared notes for parent communication.

Discovered automatically by PluginRegistry (ADR-1).
"""

from fastapi import FastAPI

from app.plugins._base import PluginBase, WidgetDef
from app.plugins.notes.models import SharedNote
from app.plugins.notes.router import router


class NotesPlugin(PluginBase):
    """Shared notes plugin for parent communication."""

    name = "notes"
    display_name = "Notizen"

    def register_routes(self, app: FastAPI) -> None:
        """Register notes CRUD routes under /api/v1/notes/."""
        app.include_router(router, prefix="/api/v1")

    def register_models(self) -> list[type]:
        """Return SharedNote model for Alembic discovery."""
        return [SharedNote]

    def register_widgets(self) -> list[WidgetDef]:
        """No dashboard widget — accessed via NoteWidget in frontend."""
        return []
