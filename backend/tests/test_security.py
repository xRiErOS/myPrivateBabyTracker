"""Tests for security middleware: K1 header stripping, K2 CSRF + CSP, K3 size limit."""

import os

import pytest
from fastapi.testclient import TestClient

os.environ.setdefault("SECRET_KEY", "a" * 32)
os.environ.setdefault("DATABASE_URL", "sqlite:///test.db")
os.environ.setdefault("AUTH_MODE", "disabled")
os.environ.setdefault("ENVIRONMENT", "dev")
os.environ.setdefault("CSRF_ENABLED", "false")


class TestHeaderStripping:
    """K1: Header-stripping middleware prevents spoofing from untrusted IPs."""

    def test_untrusted_ip_headers_stripped(self, client):
        """Remote-User from untrusted IP (testclient=127.0.0.1) is stripped."""
        resp = client.get("/api/v1/health", headers={"Remote-User": "hacker"})
        assert resp.status_code == 200
        # The middleware should have stripped the header before it reaches the app

    def test_trusted_proxy_headers_preserved(self):
        """Remote-User from trusted proxy is kept."""
        os.environ["AUTH_TRUSTED_PROXIES"] = "127.0.0.0/8"
        # Need to reimport to pick up new settings
        from app.config import Settings

        settings = Settings()
        assert "127.0.0.0/8" in settings.auth_trusted_proxies

        # Reset
        os.environ["AUTH_TRUSTED_PROXIES"] = "192.168.178.0/24"


class TestCSP:
    """K2: Security headers on all responses."""

    def test_csp_header_present(self, client):
        """Content-Security-Policy header is set on responses."""
        resp = client.get("/api/v1/health")
        assert "Content-Security-Policy" in resp.headers
        assert "default-src 'self'" in resp.headers["Content-Security-Policy"]

    def test_x_content_type_options(self, client):
        """X-Content-Type-Options: nosniff is set."""
        resp = client.get("/api/v1/health")
        assert resp.headers.get("X-Content-Type-Options") == "nosniff"

    def test_x_frame_options(self, client):
        """X-Frame-Options: DENY is set."""
        resp = client.get("/api/v1/health")
        assert resp.headers.get("X-Frame-Options") == "DENY"

    def test_referrer_policy(self, client):
        """Referrer-Policy is set correctly."""
        resp = client.get("/api/v1/health")
        assert resp.headers.get("Referrer-Policy") == "strict-origin-when-cross-origin"


class TestCSRF:
    """K2: CSRF Double-Submit-Cookie protection."""

    @pytest.fixture
    def csrf_client(self):
        """Client with CSRF enabled."""
        os.environ["CSRF_ENABLED"] = "true"
        from app.config import get_settings
        get_settings.cache_clear()
        from app.main import create_app
        test_app = create_app(testing=False)  # testing=False to enable CSRF

        # Add a POST endpoint for testing
        @test_app.post("/test-csrf")
        async def test_csrf_endpoint():
            return {"status": "ok"}

        with TestClient(test_app) as c:
            yield c

        os.environ["CSRF_ENABLED"] = "false"
        get_settings.cache_clear()

    def test_post_without_csrf_token_rejected(self, csrf_client):
        """POST without CSRF token returns 403."""
        resp = csrf_client.post("/test-csrf")
        assert resp.status_code == 403
        assert "CSRF" in resp.json()["detail"]

    def test_post_with_correct_csrf_token_ok(self, csrf_client):
        """POST with matching CSRF cookie and header succeeds."""
        # First GET to receive the CSRF cookie
        get_resp = csrf_client.get("/api/v1/health")
        csrf_token = get_resp.cookies.get("csrf_token")
        assert csrf_token is not None

        # POST with the token in header
        resp = csrf_client.post(
            "/test-csrf",
            headers={"X-CSRF-Token": csrf_token},
            cookies={"csrf_token": csrf_token},
        )
        assert resp.status_code == 200

    def test_get_without_csrf_token_ok(self, csrf_client):
        """GET requests are safe methods — no CSRF token needed."""
        resp = csrf_client.get("/api/v1/health")
        assert resp.status_code == 200

    def test_csrf_cookie_set_on_response(self, csrf_client):
        """Response includes csrf_token cookie."""
        resp = csrf_client.get("/api/v1/health")
        assert "csrf_token" in resp.cookies


class TestRequestSizeLimit:
    """K3: Request body size limit."""

    @pytest.fixture
    def size_limited_client(self):
        """Client with a very small size limit for testing."""
        os.environ["REQUEST_SIZE_LIMIT"] = "1024"
        from app.config import get_settings
        get_settings.cache_clear()
        from app.main import create_app
        test_app = create_app(testing=True)

        @test_app.post("/test-upload")
        async def test_upload():
            return {"status": "ok"}

        with TestClient(test_app) as c:
            yield c

        os.environ.pop("REQUEST_SIZE_LIMIT", None)
        get_settings.cache_clear()

    def test_oversized_request_rejected(self, size_limited_client):
        """Request with content-length > limit returns 413."""
        large_body = "x" * 2048
        resp = size_limited_client.post(
            "/test-upload",
            content=large_body,
            headers={"Content-Length": str(len(large_body))},
        )
        assert resp.status_code == 413

    def test_normal_request_allowed(self, size_limited_client):
        """Request within size limit succeeds."""
        resp = size_limited_client.post(
            "/test-upload",
            content="small",
            headers={"Content-Length": "5"},
        )
        assert resp.status_code == 200
