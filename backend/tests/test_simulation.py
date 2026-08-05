"""
Tests for Standard Monte Carlo configuration validation and streaming.
"""

import json

import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError

from app.simulation.standard_mc import SimulationConfig
from main import app


VALID_CONFIG = {
    "n_samples": 1_000,
    "distribution": "uniform",
    "lower_bound": 0.0,
    "upper_bound": 1.0,
    "random_seed": 42,
}


@pytest.mark.parametrize("sample_count", [100, 100_000])
def test_config_accepts_sample_count_boundaries(sample_count: int) -> None:
    """The minimum and maximum permitted sample counts should be valid."""
    config_data = VALID_CONFIG | {"n_samples": sample_count}

    config = SimulationConfig(**config_data)

    assert config.n_samples == sample_count


@pytest.mark.parametrize("sample_count", [0, 99, 100_001])
def test_config_rejects_invalid_sample_counts(sample_count: int) -> None:
    """Sample counts outside the permitted range should be rejected."""
    config_data = VALID_CONFIG | {"n_samples": sample_count}

    with pytest.raises(ValidationError):
        SimulationConfig(**config_data)


def test_config_rejects_unsupported_distribution() -> None:
    """A distribution that is not implemented should be rejected."""
    config_data = VALID_CONFIG | {"distribution": "normal"}

    with pytest.raises(ValidationError):
        SimulationConfig(**config_data)


@pytest.mark.parametrize(
    ("lower_bound", "upper_bound"),
    [(1.0, 1.0), (2.0, 1.0)],
)
def test_config_rejects_invalid_sampling_bounds(
    lower_bound: float,
    upper_bound: float,
) -> None:
    """An empty or reversed sampling interval should be rejected."""
    config_data = VALID_CONFIG | {
        "lower_bound": lower_bound,
        "upper_bound": upper_bound,
    }

    with pytest.raises(ValidationError):
        SimulationConfig(**config_data)


def test_endpoint_streams_valid_simulation() -> None:
    """A valid request should return a complete SSE simulation event."""
    client = TestClient(app)
    request_data = VALID_CONFIG | {"n_samples": 100}

    response = client.post("/simulate/standard-mc", json=request_data)

    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/event-stream")

    event_data = json.loads(response.text.removeprefix("data: ").strip())
    assert event_data["sample_number"] == 100
    assert len(event_data["samples"]) == 100
    assert event_data["complete"] is True


def test_endpoint_returns_clear_validation_error() -> None:
    """An invalid request should return an HTTP validation response."""
    client = TestClient(app)
    request_data = VALID_CONFIG | {"n_samples": 0}

    response = client.post("/simulate/standard-mc", json=request_data)
    error = response.json()["detail"][0]

    assert response.status_code == 422
    assert error["loc"] == ["body", "n_samples"]
    assert "greater than or equal to 100" in error["msg"]
