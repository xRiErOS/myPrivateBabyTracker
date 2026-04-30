"""Test health endpoint — verifies the app starts and responds."""

from fastapi.testclient import TestClient

from app.version import APP_VERSION


def test_health_endpoint_returns_ok(client: TestClient):
    """Health endpoint returns status ok."""
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    # Version comes from the single-source-of-truth module (app.version).
    assert data["version"] == APP_VERSION


def test_health_endpoint_contains_plugins(client: TestClient):
    """Health endpoint includes plugins list."""
    response = client.get("/api/v1/health")
    data = response.json()
    assert "plugins" in data
    assert isinstance(data["plugins"], list)


def test_health_endpoint_is_json(client: TestClient):
    """Health endpoint returns application/json."""
    response = client.get("/api/v1/health")
    assert response.headers["content-type"] == "application/json"


def test_health_no_auth_required(client: TestClient):
    """Health endpoint works without any auth headers."""
    response = client.get("/api/v1/health")
    assert response.status_code == 200
