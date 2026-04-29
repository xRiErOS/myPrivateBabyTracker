"""Motherhealth plugin — Wochenbett / Hebammen-Notizen (MBT-109).

Privacy-first Freitext-Notizbuch für Mutter (Wochenbett, Hebammen-Visite).
Plugin standardmäßig deaktiviert. Kein Dashboard-Widget (bewusste Privacy-Entscheidung).

Discovered automatically by PluginRegistry (ADR-1).
"""

from fastapi import FastAPI

from app.plugins._base import PluginBase, WidgetDef
from app.plugins.motherhealth.models import MotherHealthEntry
from app.plugins.motherhealth.router import router


class MotherHealthPlugin(PluginBase):
    """Mother health / postpartum notes plugin."""

    name = "motherhealth"
    display_name = "Muttergesundheit"

    def register_routes(self, app: FastAPI) -> None:
        """Register motherhealth CRUD routes under /api/v1/motherhealth/."""
        app.include_router(router, prefix="/api/v1")

    def register_models(self) -> list[type]:
        """Return MotherHealthEntry model for Alembic discovery."""
        return [MotherHealthEntry]

    def register_widgets(self) -> list[WidgetDef]:
        """No dashboard widget — privacy-first design (MBT-109)."""
        return []
