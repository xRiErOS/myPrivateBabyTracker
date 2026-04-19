"""Plugin Registry: Discovery, registration, and lookup.

Implements ADR-1 — filesystem scan with base class pattern.
Scans all subdirectories of ``backend/app/plugins/`` on startup,
imports their ``__init__`` modules, and collects ``PluginBase`` subclasses.
"""

import importlib
import pkgutil
from pathlib import Path

import structlog

from app.plugins._base import PluginBase

logger = structlog.get_logger("plugin_registry")


class PluginRegistry:
    """Registry for plugin instances.

    Usage::

        registry = PluginRegistry()
        registry.discover()           # auto-scan plugins/ directory
        registry.register(MyPlugin()) # manual registration
        registry.get("sleep")         # lookup by name
        registry.get_all()            # all registered plugins
    """

    def __init__(self) -> None:
        self._plugins: dict[str, PluginBase] = {}

    def register(self, plugin: PluginBase) -> None:
        """Register a plugin instance.

        Args:
            plugin: A PluginBase subclass instance.

        Raises:
            TypeError: If plugin is not a PluginBase instance.
            ValueError: If a plugin with the same name is already registered.
        """
        if not isinstance(plugin, PluginBase):
            raise TypeError(
                f"Expected PluginBase instance, got {type(plugin).__name__}"
            )
        if plugin.name in self._plugins:
            raise ValueError(
                f"Plugin '{plugin.name}' is already registered."
            )
        self._plugins[plugin.name] = plugin
        logger.info(
            "plugin_registered",
            name=plugin.name,
            version=plugin.version,
            display_name=plugin.display_name,
        )

    def get(self, name: str) -> PluginBase | None:
        """Get a registered plugin by name, or None if not found."""
        return self._plugins.get(name)

    def get_all(self) -> list[PluginBase]:
        """Return all registered plugins as a list."""
        return list(self._plugins.values())

    def discover(self, plugins_dir: Path | None = None) -> list[PluginBase]:
        """Auto-discover plugins by scanning the plugins/ directory.

        Imports all subpackages (skipping private ``_``-prefixed modules),
        finds concrete ``PluginBase`` subclasses, instantiates and registers them.

        Args:
            plugins_dir: Directory to scan. Defaults to the ``plugins/`` package dir.

        Returns:
            List of newly discovered and registered plugin instances.
        """
        if plugins_dir is None:
            plugins_dir = Path(__file__).parent

        # Import all subpackages so PluginBase subclasses get registered
        _import_plugin_modules(plugins_dir)

        # Find all concrete subclasses not yet registered
        discovered: list[PluginBase] = []
        for cls in _collect_subclasses(PluginBase):
            # Skip classes that lack required attributes (e.g. test stubs)
            if not isinstance(getattr(cls, "name", None), str):
                continue
            if cls.name in self._plugins:
                continue
            try:
                instance = cls()
                self.register(instance)
                discovered.append(instance)
            except Exception:
                logger.exception(
                    "plugin_discovery_failed",
                    plugin_class=cls.__name__,
                )

        logger.info(
            "plugin_discovery_complete",
            total=len(self._plugins),
            new=len(discovered),
            names=[p.name for p in self._plugins.values()],
        )
        return discovered


def _import_plugin_modules(plugins_dir: Path) -> None:
    """Import all subpackages in the given directory.

    Skips modules whose names start with ``_`` (private).
    """
    for info in pkgutil.iter_modules([str(plugins_dir)]):
        if info.name.startswith("_"):
            continue
        module_name = f"app.plugins.{info.name}"
        try:
            importlib.import_module(module_name)
        except Exception:
            logger.exception("plugin_import_failed", module=module_name)


def _collect_subclasses(base: type) -> list[type]:
    """Recursively collect all concrete subclasses of a base class."""
    result: list[type] = []
    for cls in base.__subclasses__():
        if getattr(cls, "__abstractmethods__", None):
            # Still abstract — recurse into its subclasses
            result.extend(_collect_subclasses(cls))
        else:
            result.append(cls)
    return result


# ---------------------------------------------------------------------------
# Module-level singleton for convenience
# ---------------------------------------------------------------------------

plugin_registry = PluginRegistry()
"""Module-level singleton instance. Use this in main.py and elsewhere."""
