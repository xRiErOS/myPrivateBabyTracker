"""Tests for /api/v1/preferences PATCH — locale switch (Backlog #183)."""

import os
from typing import AsyncGenerator

import pytest
from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

os.environ.setdefault("SECRET_KEY", "a" * 32)
os.environ.setdefault("DATABASE_URL", "sqlite:///test.db")
os.environ.setdefault("ENVIRONMENT", "dev")
os.environ.setdefault("CSRF_ENABLED", "false")


@pytest.fixture
async def prefs_app() -> AsyncGenerator[tuple[FastAPI, AsyncClient], None]:
    """App with forward-auth and preferences router mounted."""
    os.environ["AUTH_MODE"] = "forward"
    os.environ["CSRF_ENABLED"] = "false"

    from app.config import get_settings
    get_settings.cache_clear()

    from app.api.preferences import router as prefs_router
    from app.database import get_session
    from app.middleware.security import HeaderStrippingMiddleware
    from app.models.base import Base

    engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    factory = async_sessionmaker(engine, expire_on_commit=False)

    async def _override_session():
        async with factory() as session:
            yield session

    app = FastAPI()
    app.add_middleware(
        HeaderStrippingMiddleware, trusted_proxies="", trust_all=True
    )
    app.include_router(prefs_router, prefix="/api/v1")
    app.dependency_overrides[get_session] = _override_session

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield app, ac

    await engine.dispose()
    os.environ["AUTH_MODE"] = "disabled"
    get_settings.cache_clear()


class TestPreferencesLocale:
    """Locale switch via PATCH /preferences/ (Backlog #183)."""

    async def test_get_preferences_creates_defaults(self, prefs_app):
        """GET creates default preferences row when missing."""
        _, client = prefs_app
        resp = await client.get(
            "/api/v1/preferences/",
            headers={"Remote-User": "erik"},
        )
        assert resp.status_code == 200, resp.text
        body = resp.json()
        assert body["locale"] == "de"
        assert body["timezone"] == "Europe/Berlin"

    async def test_patch_locale_to_en_succeeds(self, prefs_app):
        """PATCH locale=en updates User.locale and returns 200."""
        _, client = prefs_app
        # Ensure user exists
        await client.get(
            "/api/v1/preferences/", headers={"Remote-User": "erik"}
        )
        resp = await client.patch(
            "/api/v1/preferences/",
            headers={"Remote-User": "erik"},
            json={"locale": "en"},
        )
        assert resp.status_code == 200, resp.text
        body = resp.json()
        assert body["locale"] == "en"

    async def test_patch_locale_back_to_de_succeeds(self, prefs_app):
        """PATCH locale=de works after switching to en."""
        _, client = prefs_app
        await client.get(
            "/api/v1/preferences/", headers={"Remote-User": "erik"}
        )
        # en → de roundtrip
        resp1 = await client.patch(
            "/api/v1/preferences/",
            headers={"Remote-User": "erik"},
            json={"locale": "en"},
        )
        assert resp1.status_code == 200, resp1.text
        resp2 = await client.patch(
            "/api/v1/preferences/",
            headers={"Remote-User": "erik"},
            json={"locale": "de"},
        )
        assert resp2.status_code == 200, resp2.text
        assert resp2.json()["locale"] == "de"

    async def test_patch_locale_persists_after_reload(self, prefs_app):
        """GET after PATCH returns the updated locale."""
        _, client = prefs_app
        await client.get(
            "/api/v1/preferences/", headers={"Remote-User": "erik"}
        )
        await client.patch(
            "/api/v1/preferences/",
            headers={"Remote-User": "erik"},
            json={"locale": "en"},
        )
        resp = await client.get(
            "/api/v1/preferences/", headers={"Remote-User": "erik"}
        )
        assert resp.status_code == 200
        assert resp.json()["locale"] == "en"

    async def test_patch_locale_does_not_clobber_quick_actions(self, prefs_app):
        """PATCH with only locale must not erase previously set quick_actions."""
        _, client = prefs_app
        await client.get(
            "/api/v1/preferences/", headers={"Remote-User": "erik"}
        )
        # Set quick_actions first
        await client.patch(
            "/api/v1/preferences/",
            headers={"Remote-User": "erik"},
            json={"quick_actions": ["sleep", "feeding", "diaper"]},
        )
        # Now switch locale only
        resp = await client.patch(
            "/api/v1/preferences/",
            headers={"Remote-User": "erik"},
            json={"locale": "en"},
        )
        assert resp.status_code == 200, resp.text
        body = resp.json()
        assert body["locale"] == "en"
        assert body["quick_actions"] == ["sleep", "feeding", "diaper"]


    async def test_patch_with_invalid_locale_returns_422(self, prefs_app):
        """Locale exceeding max_length=10 must be rejected with 422."""
        _, client = prefs_app
        await client.get(
            "/api/v1/preferences/", headers={"Remote-User": "erik"}
        )
        resp = await client.patch(
            "/api/v1/preferences/",
            headers={"Remote-User": "erik"},
            json={"locale": "x" * 50},
        )
        assert resp.status_code == 422, resp.text

    async def test_patch_quick_actions_accepts_four_items(self, prefs_app):
        """MBT-182: bis zu 4 Quick-Actions sind erlaubt."""
        _, client = prefs_app
        await client.get(
            "/api/v1/preferences/", headers={"Remote-User": "erik"}
        )
        resp = await client.patch(
            "/api/v1/preferences/",
            headers={"Remote-User": "erik"},
            json={"quick_actions": ["sleep", "feeding", "diaper", "weight"]},
        )
        assert resp.status_code == 200, resp.text
        body = resp.json()
        assert body["quick_actions"] == ["sleep", "feeding", "diaper", "weight"]

    async def test_patch_quick_actions_rejects_five_items(self, prefs_app):
        """MBT-182: mehr als 4 Quick-Actions führen zu 422."""
        _, client = prefs_app
        await client.get(
            "/api/v1/preferences/", headers={"Remote-User": "erik"}
        )
        resp = await client.patch(
            "/api/v1/preferences/",
            headers={"Remote-User": "erik"},
            json={
                "quick_actions": [
                    "sleep",
                    "feeding",
                    "diaper",
                    "weight",
                    "temperature",
                ]
            },
        )
        assert resp.status_code == 422, resp.text
