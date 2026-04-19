"""Plugin SDK: Abstract base class and widget definition.

All MyBaby plugins must inherit from PluginBase and implement
the required abstract methods. See ADR-1 for design rationale.
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass

from fastapi import FastAPI


@dataclass
class WidgetDef:
    """Dashboard widget definition exposed by a plugin.

    Attributes:
        name: Machine-readable widget identifier (e.g. "sleep_summary").
        display_name: Human-readable title (e.g. "Schlaf heute").
        size: Layout size hint — "small", "medium", or "large".
        endpoint: API endpoint that delivers widget data.
    """

    name: str
    display_name: str
    size: str  # "small" | "medium" | "large"
    endpoint: str


class PluginBase(ABC):
    """Abstract base class for all MyBaby plugins.

    Subclasses MUST define ``name`` and ``display_name`` as class attributes
    and implement ``register_routes`` and ``register_models``.

    Example::

        class SleepPlugin(PluginBase):
            name = "sleep"
            display_name = "Schlaf"

            def register_routes(self, app: FastAPI) -> None:
                app.include_router(sleep_router)

            def register_models(self) -> list[type]:
                return [SleepEntry]
    """

    # --- Required class attributes (enforced via __init_subclass__) ---------

    name: str
    display_name: str

    def __init_subclass__(cls, **kwargs: object) -> None:
        """Validate that concrete subclasses define name and display_name."""
        super().__init_subclass__(**kwargs)
        # Only validate non-abstract subclasses
        if not getattr(cls, "__abstractmethods__", None):
            for attr in ("name", "display_name"):
                if not isinstance(getattr(cls, attr, None), str):
                    raise TypeError(
                        f"Plugin class {cls.__name__} must define '{attr}' as a string class attribute."
                    )

    # --- Optional properties with defaults ----------------------------------

    @property
    def version(self) -> str:
        """Plugin version string (default: 1.0.0)."""
        return "1.0.0"

    @property
    def api_level(self) -> int:
        """API compatibility level (default: 1). See ADR-7."""
        return 1

    @property
    def settings_schema(self) -> dict:
        """JSON Schema for plugin-specific settings (default: empty)."""
        return {}

    # --- Required abstract methods ------------------------------------------

    @abstractmethod
    def register_routes(self, app: FastAPI) -> None:
        """Register FastAPI routes under ``/api/v1/{plugin_name}/``."""
        ...

    @abstractmethod
    def register_models(self) -> list[type]:
        """Return SQLAlchemy model classes for Alembic migration discovery."""
        ...

    # --- Optional hooks -----------------------------------------------------

    def register_widgets(self) -> list[WidgetDef]:
        """Return dashboard widget definitions (default: none)."""
        return []

    def on_event(self, event: str, payload: dict) -> None:
        """Handle events from other plugins or core (default: no-op)."""
        pass

    def on_startup(self) -> None:
        """Called during application startup (default: no-op)."""
        pass

    def on_shutdown(self) -> None:
        """Called during application shutdown (default: no-op)."""
        pass
