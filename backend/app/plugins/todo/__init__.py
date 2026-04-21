"""Todo plugin — task list with recurring templates.

Discovered automatically by PluginRegistry (ADR-1).
"""

from fastapi import FastAPI

from app.plugins._base import PluginBase
from app.plugins.todo.models import TodoEntry, TodoTemplate
from app.plugins.todo.router import router, template_router


class TodoPlugin(PluginBase):
    """Baby todo list plugin."""

    name = "todo"
    display_name = "ToDo-Liste"

    def register_routes(self, app: FastAPI) -> None:
        """Register todo CRUD + template routes under /api/v1/."""
        app.include_router(router, prefix="/api/v1")
        app.include_router(template_router, prefix="/api/v1")

    def register_models(self) -> list[type]:
        """Return TodoEntry and TodoTemplate models for Alembic discovery."""
        return [TodoEntry, TodoTemplate]

    def register_widgets(self) -> list:
        """No dashboard widget for todos."""
        return []
