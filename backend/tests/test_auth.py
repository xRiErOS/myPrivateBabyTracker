"""Tests for authentication middleware, dependencies, and auth router."""

import os

import pytest
from fastapi import Depends, FastAPI
from fastapi.testclient import TestClient
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

os.environ.setdefault("SECRET_KEY", "a" * 32)
os.environ.setdefault("DATABASE_URL", "sqlite:///test.db")
os.environ.setdefault("ENVIRONMENT", "dev")
os.environ.setdefault("CSRF_ENABLED", "false")

from app.database import get_session  # noqa: E402
from app.middleware.auth import get_current_user, hash_password, require_role, verify_password  # noqa: E402
from app.middleware.security import HeaderStrippingMiddleware  # noqa: E402
from app.models.base import Base  # noqa: E402
from app.models.user import User  # noqa: E402


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


# --- Auth Router Tests (JWT login/logout/me/status) ---


@pytest.fixture
async def auth_engine():
    eng = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
    async with eng.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield eng
    await eng.dispose()


@pytest.fixture
async def auth_session(auth_engine) -> AsyncSession:
    factory = async_sessionmaker(auth_engine, expire_on_commit=False)
    async with factory() as s:
        yield s


async def _seed_local_user(
    session: AsyncSession,
    username="erik",
    password="Test1234!",
    role="admin",
    auth_type="local",
    is_active=True,
):
    user = User(
        username=username,
        password_hash=hash_password(password),
        display_name=username.title(),
        auth_type=auth_type,
        role=role,
        is_active=is_active,
    )
    session.add(user)
    await session.commit()
    await session.refresh(user)
    return user


async def _auth_client(auth_engine, auth_mode="local"):
    os.environ["AUTH_MODE"] = auth_mode
    from app.config import get_settings
    get_settings.cache_clear()

    from app.main import create_app
    app = create_app(testing=True)

    # Add trust_all to HeaderStrippingMiddleware for test (127.0.0.1)
    for mw in app.user_middleware:
        if hasattr(mw, 'kwargs') and 'trusted_proxies' in mw.kwargs:
            mw.kwargs['trust_all'] = True

    factory = async_sessionmaker(auth_engine, expire_on_commit=False)

    async def _override():
        async with factory() as s:
            yield s

    app.dependency_overrides[get_session] = _override
    from app.plugins import discover_plugins
    for plugin in discover_plugins():
        plugin.register_routes(app)

    transport = ASGITransport(app=app)
    return AsyncClient(transport=transport, base_url="http://test")


class TestAuthRouterLogin:
    """Auth router: login endpoint."""

    @pytest.mark.asyncio
    async def test_login_success(self, auth_engine, auth_session):
        await _seed_local_user(auth_session)
        async with await _auth_client(auth_engine) as c:
            resp = await c.post("/api/v1/auth/login", json={
                "username": "erik", "password": "Test1234!"
            })
            assert resp.status_code == 200
            assert resp.json()["username"] == "erik"
            assert "mybaby_session" in resp.cookies

    @pytest.mark.asyncio
    async def test_login_wrong_password(self, auth_engine, auth_session):
        await _seed_local_user(auth_session)
        async with await _auth_client(auth_engine) as c:
            resp = await c.post("/api/v1/auth/login", json={
                "username": "erik", "password": "wrong"
            })
            assert resp.status_code == 401

    @pytest.mark.asyncio
    async def test_login_unknown_user(self, auth_engine, auth_session):
        async with await _auth_client(auth_engine) as c:
            resp = await c.post("/api/v1/auth/login", json={
                "username": "nobody", "password": "whatever"
            })
            assert resp.status_code == 401

    @pytest.mark.asyncio
    async def test_login_disabled_mode(self, auth_engine, auth_session):
        await _seed_local_user(auth_session)
        async with await _auth_client(auth_engine, "disabled") as c:
            resp = await c.post("/api/v1/auth/login", json={
                "username": "erik", "password": "Test1234!"
            })
            assert resp.status_code == 400

    @pytest.mark.asyncio
    async def test_login_inactive_user(self, auth_engine, auth_session):
        await _seed_local_user(auth_session, is_active=False)
        async with await _auth_client(auth_engine) as c:
            resp = await c.post("/api/v1/auth/login", json={
                "username": "erik", "password": "Test1234!"
            })
            assert resp.status_code == 403


class TestAuthRouterLogout:

    @pytest.mark.asyncio
    async def test_logout(self, auth_engine, auth_session):
        await _seed_local_user(auth_session)
        async with await _auth_client(auth_engine) as c:
            await c.post("/api/v1/auth/login", json={
                "username": "erik", "password": "Test1234!"
            })
            resp = await c.post("/api/v1/auth/logout")
            assert resp.status_code == 204


class TestAuthRouterMe:

    @pytest.mark.asyncio
    async def test_me_authenticated(self, auth_engine, auth_session):
        await _seed_local_user(auth_session)
        async with await _auth_client(auth_engine) as c:
            await c.post("/api/v1/auth/login", json={
                "username": "erik", "password": "Test1234!"
            })
            resp = await c.get("/api/v1/auth/me")
            assert resp.status_code == 200
            assert resp.json()["username"] == "erik"

    @pytest.mark.asyncio
    async def test_me_unauthenticated(self, auth_engine, auth_session):
        async with await _auth_client(auth_engine) as c:
            resp = await c.get("/api/v1/auth/me")
            assert resp.status_code == 401


class TestAuthRouterStatus:

    @pytest.mark.asyncio
    async def test_status_disabled(self, auth_engine, auth_session):
        async with await _auth_client(auth_engine, "disabled") as c:
            resp = await c.get("/api/v1/auth/status")
            assert resp.status_code == 200
            data = resp.json()
            assert data["auth_mode"] == "disabled"
            assert data["authenticated"] is False

    @pytest.mark.asyncio
    async def test_status_local_authenticated(self, auth_engine, auth_session):
        await _seed_local_user(auth_session)
        async with await _auth_client(auth_engine) as c:
            await c.post("/api/v1/auth/login", json={
                "username": "erik", "password": "Test1234!"
            })
            resp = await c.get("/api/v1/auth/status")
            assert resp.status_code == 200
            data = resp.json()
            assert data["authenticated"] is True
            assert data["user"]["username"] == "erik"

    @pytest.mark.asyncio
    async def test_status_forward_auth(self, auth_engine, auth_session):
        async with await _auth_client(auth_engine, "forward") as c:
            resp = await c.get("/api/v1/auth/status", headers={
                "Remote-User": "julia"
            })
            assert resp.status_code == 200
            data = resp.json()
            assert data["authenticated"] is True
            assert data["user"]["username"] == "julia"


class TestChangePassword:

    @pytest.mark.asyncio
    async def test_change_password_success(self, auth_engine, auth_session):
        await _seed_local_user(auth_session)
        async with await _auth_client(auth_engine) as c:
            await c.post("/api/v1/auth/login", json={
                "username": "erik", "password": "Test1234!"
            })
            resp = await c.post("/api/v1/auth/change-password", json={
                "current_password": "Test1234!",
                "new_password": "NewPass99!",
            })
            assert resp.status_code == 204

    @pytest.mark.asyncio
    async def test_change_password_wrong_current(self, auth_engine, auth_session):
        await _seed_local_user(auth_session)
        async with await _auth_client(auth_engine) as c:
            await c.post("/api/v1/auth/login", json={
                "username": "erik", "password": "Test1234!"
            })
            resp = await c.post("/api/v1/auth/change-password", json={
                "current_password": "wrong",
                "new_password": "NewPass99!",
            })
            assert resp.status_code == 401

    @pytest.mark.asyncio
    async def test_change_password_forward_auth_user(self, auth_engine, auth_session):
        await _seed_local_user(auth_session, auth_type="forward_auth")
        async with await _auth_client(auth_engine) as c:
            await c.post("/api/v1/auth/login", json={
                "username": "erik", "password": "Test1234!"
            })
            resp = await c.post("/api/v1/auth/change-password", json={
                "current_password": "Test1234!",
                "new_password": "NewPass99!",
            })
            assert resp.status_code == 400
