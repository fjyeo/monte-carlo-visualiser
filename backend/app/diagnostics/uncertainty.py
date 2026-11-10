"""
uncertainty.py — Statistical uncertainty calculations for Monte Carlo results.

The functions in this module convert the sample variance accumulated during a
simulation into the standard error and an approximate 95% confidence interval.
"""

import math


CONFIDENCE_Z_SCORE = 1.96


def calculate_standard_error(
    sample_variance: float,
    sample_count: int,
) -> float:
    """
    Calculate the standard error of a Monte Carlo estimate.

    Args:
        sample_variance (float): Variance of the sampled contributions.
        sample_count (int): Number of contributions included in the estimate.

    Returns:
        float: Estimated standard deviation of the Monte Carlo estimator.
               Returns 0.0 when fewer than two samples are available.
    """
    if sample_count < 2:
        return 0.0

    return math.sqrt(sample_variance / sample_count)


def calculate_confidence_interval(
    estimate: float,
    standard_error: float,
) -> tuple[float, float]:
    """
    Calculate an approximate 95% confidence interval around an estimate.

    The interval uses the normal approximation: estimate ± 1.96 standard
    errors. This approximation becomes more reliable as the sample count grows.

    Args:
        estimate (float): Current Monte Carlo estimate.
        standard_error (float): Standard error of that estimate.

    Returns:
        tuple[float, float]: Lower and upper confidence limits.
    """
    margin_of_error = CONFIDENCE_Z_SCORE * standard_error
    return estimate - margin_of_error, estimate + margin_of_error
