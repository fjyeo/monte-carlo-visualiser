"""
standard_mc.py — Core Standard Monte Carlo simulation engine.

Implements a generator-based simulation that streams intermediate results
so the frontend can visualise convergence in real time.

Algorithm:
  - Draw n uniform random samples from [lower_bound, upper_bound].
  - Track the running mean and variance with Welford's online algorithm,
    which avoids catastrophic cancellation and requires only O(1) memory.
  - Yield a progress snapshot every 100 samples so the client can update
    its chart without waiting for the full run to complete.

Reference for Welford's algorithm:
  Welford, B.P. (1962). "Note on a Method for Calculating Corrected Sums
  of Squares and Products." Technometrics 4(3): 419–420.

"""

from typing import Generator, Optional
import numpy as np
from pydantic import BaseModel


# ── Configuration model ───────────────────────────────────────────────────────

class SimulationConfig(BaseModel):
    """
    All parameters needed to run a Standard Monte Carlo simulation.

    Attributes:
        n_samples (int): Total number of random samples to draw.
        distribution (str): Name of the sampling distribution.
                            Only "uniform" is supported in this version.
        lower_bound (float): Lower limit of the sampling interval.
        upper_bound (float): Upper limit of the sampling interval.
        random_seed (Optional[int]): Seed for NumPy's RNG.  Passing a fixed
                                     seed makes runs reproducible; None gives
                                     a different sequence each time.
    """
    n_samples: int
    distribution: str
    lower_bound: float
    upper_bound: float
    random_seed: Optional[int] = None


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

    Draws samples one at a time, updates running statistics with Welford's
    algorithm, and yields a snapshot dict every CHUNK_SIZE samples.  A final
    dict with "complete": True is always yielded at the end.

    Args:
        config (SimulationConfig): All parameters for this simulation run.

    Yields:
        dict: Progress snapshot containing:
            - "sample_number" (int): Index of the last sample in this chunk.
            - "running_mean" (float): Mean of all samples seen so far.
            - "running_variance" (float): Unbiased variance of samples so far.
            - "samples" (list[float]): The raw samples in this chunk window.
            - "complete" (bool, final only): True when the run is finished.

    Raises:
        ValueError: If config.distribution is not "uniform".
    """
    if config.distribution != "uniform":
        raise ValueError(
            f"Unsupported distribution '{config.distribution}'. "
            "Only 'uniform' is implemented in this version."
        )

    # Seed NumPy's RNG for reproducibility if a seed was provided.
    rng = np.random.default_rng(config.random_seed)

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

        # Update Welford's online algorithm with the new sample.
        welford_count, welford_mean, welford_M2 = _welford_update(
            welford_count, welford_mean, welford_M2, sample
        )

        chunk_samples.append(sample)

        # Yield a progress snapshot at every CHUNK_SIZE boundary.
        is_chunk_boundary = (i % CHUNK_SIZE == 0)
        is_last_sample = (i == config.n_samples)

        if is_chunk_boundary or is_last_sample:
            yield {
                "sample_number": i,
                "running_mean": welford_mean,
                "running_variance": _sample_variance(welford_count, welford_M2),
                "samples": chunk_samples.copy(),
                "complete": is_last_sample,
            }
            # Reset the chunk buffer for the next window.
            chunk_samples = []
