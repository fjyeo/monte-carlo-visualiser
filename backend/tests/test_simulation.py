"""
Tests for Standard Monte Carlo configuration validation and streaming.
"""

import json
import math
from typing import Any

import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError

from app.diagnostics.uncertainty import (
    calculate_confidence_interval,
    calculate_standard_error,
)
from app.simulation.standard_mc import (
    IntegrandName,
    SimulationConfig,
    evaluate_integrand,
    run_standard_mc,
)
from main import app


VALID_CONFIG = {
    "n_samples": 1_000,
    "distribution": "uniform",
    "integrand": "x",
    "lower_bound": 0.0,
    "upper_bound": 1.0,
    "random_seed": 42,
}


def test_standard_error_uses_variance_and_sample_count() -> None:
    """Standard error should equal the square root of variance divided by n."""
    result = calculate_standard_error(sample_variance=4.0, sample_count=100)

    assert result == pytest.approx(0.2)


@pytest.mark.parametrize("sample_count", [0, 1])
def test_standard_error_is_zero_without_enough_samples(sample_count: int) -> None:
    """Uncertainty should be zero before a sample variance can be calculated."""
    result = calculate_standard_error(
        sample_variance=0.0,
        sample_count=sample_count,
    )

    assert result == 0.0


def test_confidence_interval_uses_95_percent_margin() -> None:
    """Confidence limits should be 1.96 standard errors from the estimate."""
    lower_limit, upper_limit = calculate_confidence_interval(
        estimate=10.0,
        standard_error=0.5,
    )

    assert lower_limit == pytest.approx(9.02)
    assert upper_limit == pytest.approx(10.98)


@pytest.mark.parametrize(
    ("integrand", "sample", "expected_value"),
    [
        ("x", 3.0, 3.0),
        ("x_squared", 3.0, 9.0),
        ("sin_x", 0.0, 0.0),
    ],
)
def test_integrand_presets_return_expected_values(
    integrand: IntegrandName,
    sample: float,
    expected_value: float,
) -> None:
    """Each preset should evaluate its mathematical function correctly."""
    result = evaluate_integrand(sample, integrand)

    assert result == pytest.approx(expected_value)


@pytest.mark.parametrize("integrand", ["x", "x_squared", "sin_x"])
def test_config_accepts_supported_integrands(integrand: IntegrandName) -> None:
    """Every implemented integrand identifier should pass validation."""
    config_data = VALID_CONFIG | {"integrand": integrand}

    config = SimulationConfig(**config_data)

    assert config.integrand == integrand


def test_config_rejects_unsupported_integrand() -> None:
    """An integrand without an implementation should be rejected."""
    config_data = VALID_CONFIG | {"integrand": "log_x"}

    with pytest.raises(ValidationError):
        SimulationConfig(**config_data)


def get_final_chunk(config_data: dict[str, Any]) -> dict:
    """Run a simulation and return its final streamed result dictionary."""
    config = SimulationConfig(**config_data)
    return list(run_standard_mc(config))[-1]


@pytest.mark.parametrize(
    ("integrand", "lower_bound", "upper_bound", "analytical_value", "tolerance"),
    [
        ("x", 0.0, 1.0, 0.5, 0.005),
        ("x", 2.0, 6.0, 16.0, 0.05),
        ("x_squared", 0.0, 1.0, 1.0 / 3.0, 0.005),
        ("sin_x", 0.0, math.pi, 2.0, 0.01),
    ],
)
def test_integral_estimates_approach_analytical_values(
    integrand: IntegrandName,
    lower_bound: float,
    upper_bound: float,
    analytical_value: float,
    tolerance: float,
) -> None:
    """Large seeded runs should approach each preset's analytical integral."""
    config_data = VALID_CONFIG | {
        "n_samples": 100_000,
        "integrand": integrand,
        "lower_bound": lower_bound,
        "upper_bound": upper_bound,
    }

    final_chunk = get_final_chunk(config_data)

    assert final_chunk["running_estimate"] == pytest.approx(
        analytical_value,
        abs=tolerance,
    )


def test_fixed_seed_reproduces_integral_estimate() -> None:
    """Identical configurations with a fixed seed should match exactly."""
    first_result = get_final_chunk(VALID_CONFIG)
    second_result = get_final_chunk(VALID_CONFIG)

    assert first_result["running_estimate"] == second_result["running_estimate"]


def test_streamed_uncertainty_matches_running_statistics() -> None:
    """Every streamed diagnostic should agree with its defining formula."""
    final_chunk = get_final_chunk(VALID_CONFIG)
    expected_standard_error = math.sqrt(
        final_chunk["running_variance"] / final_chunk["sample_number"]
    )
    expected_margin = 1.96 * expected_standard_error

    assert final_chunk["standard_error"] == pytest.approx(
        expected_standard_error
    )
    assert final_chunk["confidence_interval_lower"] == pytest.approx(
        final_chunk["running_estimate"] - expected_margin
    )
    assert final_chunk["confidence_interval_upper"] == pytest.approx(
        final_chunk["running_estimate"] + expected_margin
    )


def test_standard_error_reduces_during_a_large_seeded_run() -> None:
    """A larger sample count should reduce the estimate's standard error."""
    config_data = VALID_CONFIG | {"n_samples": 100_000}
    chunks = list(run_standard_mc(SimulationConfig(**config_data)))

    assert chunks[-1]["standard_error"] < chunks[0]["standard_error"]


def test_analytical_value_is_inside_large_run_confidence_interval() -> None:
    """A large seeded run should contain the known integral in its interval."""
    config_data = VALID_CONFIG | {"n_samples": 100_000}

    final_chunk = get_final_chunk(config_data)

    assert final_chunk["confidence_interval_lower"] < 0.5
    assert final_chunk["confidence_interval_upper"] > 0.5


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
    assert event_data["standard_error"] > 0
    assert event_data["confidence_interval_lower"] < event_data["running_estimate"]
    assert event_data["confidence_interval_upper"] > event_data["running_estimate"]
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


def test_endpoint_rejects_unsupported_integrand() -> None:
    """The API should reject an integrand that has no preset implementation."""
    client = TestClient(app)
    request_data = VALID_CONFIG | {"integrand": "log_x"}

    response = client.post("/simulate/standard-mc", json=request_data)
    error = response.json()["detail"][0]

    assert response.status_code == 422
    assert error["loc"] == ["body", "integrand"]
    assert "x_squared" in error["msg"]
