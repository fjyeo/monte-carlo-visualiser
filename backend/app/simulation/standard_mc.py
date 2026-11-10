"""
standard_mc.py — Core Standard Monte Carlo simulation engine.

Implements a generator-based simulation that streams intermediate results
so the frontend can visualise convergence in real time.

Algorithm:
  - Draw n uniform random samples from [lower_bound, upper_bound].
  - Evaluate a selected function at each sample.
  - Estimate its definite integral using the interval width and the running
    mean of the function values.
  - Track the estimate and variance with Welford's online algorithm.
  - Yield a progress snapshot every 100 samples so the client can update
    its chart without waiting for the full run to complete.

Reference for Welford's algorithm:
  Welford, B.P. (1962). "Note on a Method for Calculating Corrected Sums
  of Squares and Products." Technometrics 4(3): 419–420.

"""

import math
from typing import Generator, Literal, Optional

import numpy as np
from pydantic import BaseModel, Field, model_validator

from app.diagnostics.uncertainty import (
    calculate_confidence_interval,
    calculate_standard_error,
)


IntegrandName = Literal["x", "x_squared", "sin_x"]


# ── Configuration model ───────────────────────────────────────────────────────

class SimulationConfig(BaseModel):
    """
    All parameters needed to run a Standard Monte Carlo simulation.

    Attributes:
        n_samples (int): Total number of random samples to draw, from 100 to
                         100,000 inclusive.
        distribution (str): Name of the sampling distribution.
                            Only "uniform" is supported in this version.
        integrand (str): Preset mathematical function to integrate.
        lower_bound (float): Lower limit of the sampling interval.
        upper_bound (float): Upper limit of the sampling interval.
        random_seed (Optional[int]): Seed for NumPy's RNG.  Passing a fixed
                                     seed makes runs reproducible; None gives
                                     a different sequence each time.
    """
    n_samples: int = Field(ge=100, le=100_000)
    distribution: Literal["uniform"]
    integrand: IntegrandName
    lower_bound: float
    upper_bound: float
    random_seed: Optional[int] = None

    @model_validator(mode="after")
    def validate_sampling_bounds(self) -> "SimulationConfig":
        """
        Check that the sampling interval has a positive width.

        Returns:
            SimulationConfig: The validated configuration.

        Raises:
            ValueError: If the lower bound is not below the upper bound.
        """
        if self.lower_bound >= self.upper_bound:
            raise ValueError("lower_bound must be less than upper_bound")

        return self


# ── Integrand evaluation ─────────────────────────────────────────────────────

def evaluate_integrand(
    sample: float,
    integrand: IntegrandName,
) -> float:
    """
    Evaluate one of the supported preset functions at a sample value.

    Args:
        sample (float): Random value drawn from the sampling interval.
        integrand (str): Identifier of the selected preset function.

    Returns:
        float: Function value at the supplied sample.

    Raises:
        ValueError: If the integrand identifier is not supported.
    """
    if integrand == "x":
        return sample
    if integrand == "x_squared":
        return sample ** 2
    if integrand == "sin_x":
        return math.sin(sample)

    raise ValueError(f"Unsupported integrand '{integrand}'")


# ── Welford helpers ───────────────────────────────────────────────────────────

def _welford_update(count: int, mean: float, M2: float,
                    new_value: float) -> tuple[int, float, float]:
    """
    Perform one step of Welford's online mean/variance algorithm.

    This updates the running mean and the sum of squared deviations (M2)
    given a single new observation.  The sample variance is M2 / (count - 1)
    once count >= 2.

    Args:
        count (int): Number of samples seen so far (before this update).
        mean (float): Running mean before this update.
        M2 (float): Running sum of squared deviations before this update.
        new_value (float): The new sample to incorporate.

    Returns:
        tuple[int, float, float]: Updated (count, mean, M2).
    """
    count += 1
    delta = new_value - mean
    mean += delta / count
    delta2 = new_value - mean
    M2 += delta * delta2
    return count, mean, M2


def _sample_variance(count: int, M2: float) -> float:
    """
    Derive the sample variance from Welford's accumulators.

    Uses Bessel's correction (divides by count - 1) so the estimator is
    unbiased.  Returns 0.0 when fewer than two samples are available.

    Args:
        count (int): Total number of samples accumulated.
        M2 (float): Sum of squared deviations from Welford's algorithm.

    Returns:
        float: Unbiased sample variance, or 0.0 if count < 2.
    """
    if count < 2:
        return 0.0
    return M2 / (count - 1)


# ── Main generator ────────────────────────────────────────────────────────────

def run_standard_mc(config: SimulationConfig) -> Generator[dict, None, None]:
    """
    Run a Standard Monte Carlo simulation, yielding progress chunks.

    Draws samples uniformly from the configured bounds and evaluates the
    selected function. Each function value is multiplied by the interval
    width so the running mean estimates the definite integral. A snapshot is
    yielded every CHUNK_SIZE samples, followed by a final complete snapshot.

    Args:
        config (SimulationConfig): All parameters for this simulation run.

    Yields:
        dict: Progress snapshot containing:
            - "sample_number" (int): Index of the last sample in this chunk.
            - "running_estimate" (float): Current definite-integral estimate.
            - "running_variance" (float): Variance of scaled function values.
            - "standard_error" (float): Uncertainty of the current estimate.
            - "confidence_interval_lower" (float): Lower 95% interval limit.
            - "confidence_interval_upper" (float): Upper 95% interval limit.
            - "samples" (list[float]): The raw samples in this chunk window.
            - "complete" (bool, final only): True when the run is finished.

    """
    # Seed NumPy's RNG for reproducibility if a seed was provided.
    rng = np.random.default_rng(config.random_seed)
    interval_width = config.upper_bound - config.lower_bound

    # Welford accumulators — updated incrementally with each sample.
    welford_count: int = 0
    welford_mean: float = 0.0
    welford_M2: float = 0.0

    # How many samples to accumulate before yielding a progress snapshot.
    CHUNK_SIZE: int = 100

    # Buffer that collects raw samples for the current chunk window.
    chunk_samples: list[float] = []

    for i in range(1, config.n_samples + 1):
        # Draw one uniform sample from [lower_bound, upper_bound].
        sample: float = float(
            rng.uniform(config.lower_bound, config.upper_bound)
        )

        # Scaling f(x) by the interval width makes its mean estimate the
        # definite integral over the configured bounds.
        function_value = evaluate_integrand(sample, config.integrand)
        sample_contribution = interval_width * function_value

        # Update Welford's algorithm with the scaled function value.
        welford_count, welford_mean, welford_M2 = _welford_update(
            welford_count, welford_mean, welford_M2, sample_contribution
        )

        chunk_samples.append(sample)

        # Yield a progress snapshot at every CHUNK_SIZE boundary.
        is_chunk_boundary = (i % CHUNK_SIZE == 0)
        is_last_sample = (i == config.n_samples)

        if is_chunk_boundary or is_last_sample:
            sample_variance = _sample_variance(welford_count, welford_M2)
            standard_error = calculate_standard_error(
                sample_variance,
                welford_count,
            )
            confidence_lower, confidence_upper = calculate_confidence_interval(
                welford_mean,
                standard_error,
            )

            yield {
                "sample_number": i,
                "running_estimate": welford_mean,
                "running_variance": sample_variance,
                "standard_error": standard_error,
                "confidence_interval_lower": confidence_lower,
                "confidence_interval_upper": confidence_upper,
                "samples": chunk_samples.copy(),
                "complete": is_last_sample,
            }
            # Reset the chunk buffer for the next window.
            chunk_samples = []
