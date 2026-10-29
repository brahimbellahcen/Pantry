"""Tests for error handlers, set-vercel-env script existence, and mobile nav."""


def test_404_returns_json(client):
    """Unknown routes return JSON error, not HTML."""
    resp = client.get("/api/v1/nonexistent-route-xyz")
    assert resp.status_code == 404
    data = resp.json()
    assert data.get("error") is True
    assert "status_code" in data
    assert "path" in data


def test_validation_error_returns_field_details(client):
    """Pydantic validation errors include field-level detail."""
    resp = client.post("/api/v1/auth/register", json={"email": "bad-email", "password": "x", "full_name": ""})
    assert resp.status_code == 422
    data = resp.json()
    assert data.get("error") is True
    assert "errors" in data
    assert len(data["errors"]) > 0


def test_health_endpoint(client):
    resp = client.get("/health")
    assert resp.status_code == 200
    assert resp.json()["status"] == "ok"
    assert resp.json()["version"] == "1.0.0"


def test_health_db_endpoint(client):
    """DB health check returns status field."""
    resp = client.get("/health/db")
    assert resp.status_code == 200
    assert "status" in resp.json()


def test_set_vercel_env_script_exists():
    """Deployment script is present and executable."""
    import os
    path = "../scripts/set-vercel-env.sh"
    assert os.path.exists(path), f"{path} not found"
    # Check it's executable
    assert os.access(path, os.X_OK), f"{path} is not executable"
