"""Tests for authentication middleware and dependencies."""

import os

import pytest
from fastapi import Depends, FastAPI
from fastapi.testclient import TestClient

os.environ.setdefault("SECRET_KEY", "a" * 32)
os.environ.setdefault("DATABASE_URL", "sqlite:///test.db")
os.environ.setdefault("ENVIRONMENT", "dev")
os.environ.setdefault("CSRF_ENABLED", "false")

from app.middleware.auth import get_current_user, hash_password, require_role, verify_password
from app.middleware.security import HeaderStrippingMiddleware


def _create_auth_test_app(auth_mode: str = "forward"):
    """Create a minimal FastAPI app for auth testing with trust_all proxy."""
    os.environ["AUTH_MODE"] = auth_mode
    os.environ["CSRF_ENABLED"] = "false"

    from app.config import get_settings
    get_settings.cache_clear()

    app = FastAPI()

    # Header stripping with trust_all=True so testclient IP is trusted
    app.add_middleware(HeaderStrippingMiddleware, trusted_proxies="", trust_all=True)

    return app


class TestArgon2:
    """Password hashing with Argon2."""

    def test_hash_and_verify(self):
        """Password can be hashed and verified."""
        pw = "secureP@ssw0rd!"
        hashed = hash_password(pw)
        assert hashed != pw
        assert verify_password(pw, hashed)

    def test_wrong_password_fails(self):
        """Wrong password does not verify."""
        hashed = hash_password("correct")
        assert not verify_password("wrong", hashed)


class TestForwardAuth:
    """Forward-auth mode: Remote-User header creates/finds users."""

    @pytest.fixture
    def forward_app(self):
        """App configured for forward-auth with trusted proxy."""
        from app.database import init_db
        init_db("sqlite:///test_auth.db")

        test_app = _create_auth_test_app("forward")

        @test_app.get("/api/auth/me")
        async def me(user=Depends(get_current_user)):
            if user is None:
                return {"username": "anonymous"}
            return {"username": user.username, "role": user.role}

        # Create tables
        from sqlalchemy import create_engine
        from app.models.base import Base
        engine = create_engine("sqlite:///test_auth.db")
        Base.metadata.create_all(engine)
        engine.dispose()

        with TestClient(test_app) as c:
            yield c

        # Cleanup
        os.environ["AUTH_MODE"] = "disabled"
        from app.config import get_settings
        get_settings.cache_clear()
        try:
            os.unlink("test_auth.db")
        except FileNotFoundError:
            pass

    def test_forward_auth_creates_user(self, forward_app):
        """First request with Remote-User creates user automatically."""
        resp = forward_app.get(
            "/api/auth/me",
            headers={"Remote-User": "erik"},
        )
        assert resp.status_code == 200
        assert resp.json()["username"] == "erik"

    def test_missing_auth_header_returns_401(self, forward_app):
        """Request without Remote-User in forward mode returns 401."""
        resp = forward_app.get("/api/auth/me")
        assert resp.status_code == 401

    def test_admin_role_from_groups(self, forward_app):
        """Remote-Groups with 'admin' sets admin role."""
        resp = forward_app.get(
            "/api/auth/me",
            headers={"Remote-User": "admin_user", "Remote-Groups": "admin,users"},
        )
        assert resp.status_code == 200
        assert resp.json()["role"] == "admin"


class TestDisabledAuth:
    """Disabled auth mode: no authentication required."""

    @pytest.fixture
    def disabled_app(self):
        """App with auth disabled."""
        test_app = _create_auth_test_app("disabled")

        @test_app.get("/api/auth/me")
        async def me(user=Depends(get_current_user)):
            if user is None:
                return {"username": "anonymous"}
            return {"username": user.username}

        with TestClient(test_app) as c:
            yield c

        from app.config import get_settings
        get_settings.cache_clear()

    def test_no_auth_needed(self, disabled_app):
        """With disabled auth, endpoint returns anonymous."""
        resp = disabled_app.get("/api/auth/me")
        assert resp.status_code == 200
        assert resp.json()["username"] == "anonymous"


class TestRequireRole:
    """Role-based access control dependency."""

    @pytest.fixture
    def role_app(self):
        """App with role-protected endpoints."""
        from app.database import init_db
        init_db("sqlite:///test_role.db")

        test_app = _create_auth_test_app("forward")

        @test_app.get("/api/admin-only")
        async def admin_only(user=Depends(require_role("admin"))):
            return {"role": user.role}

        from sqlalchemy import create_engine
        from app.models.base import Base
        engine = create_engine("sqlite:///test_role.db")
        Base.metadata.create_all(engine)
        engine.dispose()

        with TestClient(test_app) as c:
            yield c

        os.environ["AUTH_MODE"] = "disabled"
        from app.config import get_settings
        get_settings.cache_clear()
        try:
            os.unlink("test_role.db")
        except FileNotFoundError:
            pass

    def test_admin_allowed(self, role_app):
        """Admin role can access admin-only endpoint."""
        resp = role_app.get(
            "/api/admin-only",
            headers={"Remote-User": "erik", "Remote-Groups": "admin"},
        )
        assert resp.status_code == 200
        assert resp.json()["role"] == "admin"

    def test_caregiver_rejected(self, role_app):
        """Caregiver role is rejected from admin-only endpoint."""
        resp = role_app.get(
            "/api/admin-only",
            headers={"Remote-User": "nurse", "Remote-Groups": "users"},
        )
        assert resp.status_code == 403
