"""
Tests for the backend health endpoint.
"""

from fastapi.testclient import TestClient

from main import app


def test_health_check_returns_ok() -> None:
    """
    The health endpoint should confirm that the API is running.
    """
    client = TestClient(app)

    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {
        "status": "ok",
        "message": "Monte Carlo API is running",
    }
