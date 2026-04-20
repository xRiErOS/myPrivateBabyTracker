"""Todo plugin — simple task list for pediatrician/midwife topics.

Discovered automatically by PluginRegistry (ADR-1).
"""

from fastapi import FastAPI

from app.plugins._base import PluginBase
from app.plugins.todo.models import TodoEntry
from app.plugins.todo.router import router


class TodoPlugin(PluginBase):
    """Baby todo list plugin."""

    name = "todo"
    display_name = "ToDo-Liste"

    def register_routes(self, app: FastAPI) -> None:
        """Register todo CRUD routes under /api/v1/todo/."""
        app.include_router(router, prefix="/api/v1")

    def register_models(self) -> list[type]:
        """Return TodoEntry model for Alembic discovery."""
        return [TodoEntry]

    def register_widgets(self) -> list:
        """No dashboard widget for todos."""
        return []
