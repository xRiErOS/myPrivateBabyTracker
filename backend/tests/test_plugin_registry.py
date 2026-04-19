"""Tests for Plugin SDK: PluginBase, WidgetDef, PluginRegistry, Discovery."""

import pytest
from fastapi import APIRouter, FastAPI
from fastapi.testclient import TestClient

from app.plugins._base import PluginBase, WidgetDef


# ---------------------------------------------------------------------------
# Fixtures: Fake plugins for testing
# ---------------------------------------------------------------------------


class FakePlugin(PluginBase):
    """Minimal valid plugin for testing."""

    name = "fake"
    display_name = "Fake Plugin"

    def register_routes(self, app: FastAPI) -> None:
        router = APIRouter(prefix="/api/v1/fake", tags=["fake"])

        @router.get("/ping")
        async def ping():
            return {"plugin": "fake"}

        app.include_router(router)

    def register_models(self) -> list[type]:
        return []


class AnotherFakePlugin(PluginBase):
    """Second fake plugin for duplicate-registration tests."""

    name = "another"
    display_name = "Another Plugin"

    def register_routes(self, app: FastAPI) -> None:
        pass

    def register_models(self) -> list[type]:
        return []


# ---------------------------------------------------------------------------
# PluginBase tests
# ---------------------------------------------------------------------------


class TestPluginBase:
    """Tests for the PluginBase abstract base class."""

    def test_plugin_base_properties(self):
        """Default properties are set correctly."""
        p = FakePlugin()
        assert p.name == "fake"
        assert p.display_name == "Fake Plugin"
        assert p.version == "1.0.0"
        assert p.api_level == 1
        assert p.settings_schema == {}

    def test_plugin_base_default_widgets(self):
        """Default register_widgets returns empty list."""
        p = FakePlugin()
        assert p.register_widgets() == []

    def test_plugin_base_on_event_noop(self):
        """Default on_event does nothing (no exception)."""
        p = FakePlugin()
        p.on_event("test.event", {"key": "value"})

    def test_plugin_base_requires_name(self):
        """PluginBase without name/display_name raises TypeError."""
        with pytest.raises(TypeError):

            class BadPlugin(PluginBase):
                def register_routes(self, app):
                    pass

                def register_models(self):
                    return []

            BadPlugin()

    def test_plugin_base_requires_register_routes(self):
        """PluginBase without register_routes raises TypeError."""
        with pytest.raises(TypeError):

            class BadPlugin(PluginBase):
                name = "bad"
                display_name = "Bad"

                def register_models(self):
                    return []

            BadPlugin()

    def test_plugin_base_requires_register_models(self):
        """PluginBase without register_models raises TypeError."""
        with pytest.raises(TypeError):

            class BadPlugin(PluginBase):
                name = "bad"
                display_name = "Bad"

                def register_routes(self, app):
                    pass

            BadPlugin()


# ---------------------------------------------------------------------------
# WidgetDef tests
# ---------------------------------------------------------------------------


class TestWidgetDef:
    """Tests for WidgetDef dataclass."""

    def test_widget_def_creation(self):
        w = WidgetDef(
            name="sleep_summary",
            display_name="Schlaf heute",
            size="small",
            endpoint="/api/v1/sleep/widget",
        )
        assert w.name == "sleep_summary"
        assert w.display_name == "Schlaf heute"
        assert w.size == "small"
        assert w.endpoint == "/api/v1/sleep/widget"

    def test_widget_def_equality(self):
        """Dataclass equality works."""
        w1 = WidgetDef(name="a", display_name="A", size="small", endpoint="/a")
        w2 = WidgetDef(name="a", display_name="A", size="small", endpoint="/a")
        assert w1 == w2

    def test_widget_with_plugin(self):
        """Plugin can return widgets via register_widgets."""

        class WidgetPlugin(PluginBase):
            name = "widgeted"
            display_name = "Widget Plugin"

            def register_routes(self, app):
                pass

            def register_models(self):
                return []

            def register_widgets(self) -> list[WidgetDef]:
                return [
                    WidgetDef(
                        name="test_widget",
                        display_name="Test",
                        size="medium",
                        endpoint="/api/v1/widgeted/widget",
                    )
                ]

        p = WidgetPlugin()
        widgets = p.register_widgets()
        assert len(widgets) == 1
        assert widgets[0].name == "test_widget"


# ---------------------------------------------------------------------------
# PluginRegistry tests
# ---------------------------------------------------------------------------


class TestPluginRegistry:
    """Tests for the PluginRegistry singleton."""

    def setup_method(self):
        """Fresh registry for each test."""
        from app.plugins.registry import PluginRegistry

        self.registry = PluginRegistry()

    def test_register_and_get(self):
        """Register a plugin, then retrieve it by name."""
        plugin = FakePlugin()
        self.registry.register(plugin)
        assert self.registry.get("fake") is plugin

    def test_get_nonexistent_returns_none(self):
        """Getting a non-registered plugin returns None."""
        assert self.registry.get("nonexistent") is None

    def test_get_all(self):
        """get_all returns all registered plugins."""
        p1 = FakePlugin()
        p2 = AnotherFakePlugin()
        self.registry.register(p1)
        self.registry.register(p2)
        all_plugins = self.registry.get_all()
        assert len(all_plugins) == 2
        names = [p.name for p in all_plugins]
        assert "fake" in names
        assert "another" in names

    def test_duplicate_registration_raises(self):
        """Registering same plugin name twice raises ValueError."""
        self.registry.register(FakePlugin())
        with pytest.raises(ValueError, match="already registered"):
            self.registry.register(FakePlugin())

    def test_register_validates_plugin_type(self):
        """Registering a non-PluginBase raises TypeError."""
        with pytest.raises(TypeError, match="PluginBase"):
            self.registry.register("not a plugin")  # type: ignore


# ---------------------------------------------------------------------------
# Discovery tests
# ---------------------------------------------------------------------------


class TestDiscovery:
    """Tests for filesystem-based plugin discovery."""

    def test_discover_returns_list(self):
        """discover() returns a list (may be empty before plugins exist)."""
        from app.plugins.registry import PluginRegistry

        registry = PluginRegistry()
        plugins = registry.discover()
        assert isinstance(plugins, list)

    def test_discovered_plugins_are_plugin_base(self):
        """All discovered plugins are PluginBase instances."""
        from app.plugins.registry import PluginRegistry

        registry = PluginRegistry()
        plugins = registry.discover()
        for p in plugins:
            assert isinstance(p, PluginBase)


# ---------------------------------------------------------------------------
# Integration: Plugin router mounting
# ---------------------------------------------------------------------------


class TestPluginRouterMount:
    """Test that plugin routers get mounted correctly on a FastAPI app."""

    def test_plugin_router_is_mounted(self):
        """FakePlugin's /api/v1/fake/ping endpoint is reachable."""
        app = FastAPI()
        plugin = FakePlugin()
        plugin.register_routes(app)

        client = TestClient(app)
        resp = client.get("/api/v1/fake/ping")
        assert resp.status_code == 200
        assert resp.json() == {"plugin": "fake"}


# ---------------------------------------------------------------------------
# on_startup / on_shutdown hooks
# ---------------------------------------------------------------------------


class TestLifecycleHooks:
    """Test plugin lifecycle hooks."""

    def test_on_startup_called(self):
        """on_startup hook is callable."""
        called = []

        class HookPlugin(PluginBase):
            name = "hooked"
            display_name = "Hooked"

            def register_routes(self, app):
                pass

            def register_models(self):
                return []

            def on_startup(self):
                called.append("startup")

            def on_shutdown(self):
                called.append("shutdown")

        p = HookPlugin()
        p.on_startup()
        p.on_shutdown()
        assert called == ["startup", "shutdown"]
