"""Todo plugin — task list with recurring templates and habits.

Discovered automatically by PluginRegistry (ADR-1).
"""

from fastapi import FastAPI

from app.plugins._base import PluginBase
from app.plugins.todo.models import Habit, HabitCompletion, TodoEntry, TodoTemplate
from app.plugins.todo.router import habit_router, router, template_router


class TodoPlugin(PluginBase):
    """Baby todo list + habits plugin."""

    name = "todo"
    display_name = "Tasks & Habits"

    def register_routes(self, app: FastAPI) -> None:
        """Register todo CRUD + template + habit routes under /api/v1/."""
        app.include_router(router, prefix="/api/v1")
        app.include_router(template_router, prefix="/api/v1")
        app.include_router(habit_router, prefix="/api/v1")

    def register_models(self) -> list[type]:
        """Return all models for Alembic discovery."""
        return [TodoEntry, TodoTemplate, Habit, HabitCompletion]

    def register_widgets(self) -> list:
        """No dashboard widget for todos."""
        return []
