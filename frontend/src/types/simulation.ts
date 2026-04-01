/**
 * simulation.ts — Shared TypeScript types for the Monte Carlo simulation.
 *
 * These interfaces mirror the Pydantic models in the Python backend so that
 * the frontend and backend always agree on the shape of request/response data.
 * Any change to the backend models should be reflected here.
 */

/**
 * Parameters sent to the backend to configure a simulation run.
 *
 * Maps to `SimulationConfig` in backend/app/simulation/standard_mc.py.
 */
export interface SimulationConfig {
  /** Total number of random samples to draw. */
  n_samples: number

  /** Name of the sampling distribution (e.g. "uniform"). */
  distribution: string

  /** Lower bound of the sampling interval. */
  lower_bound: number

  /** Upper bound of the sampling interval. */
  upper_bound: number

  /**
   * Optional seed for the random number generator.
   * Providing a seed makes the simulation reproducible.
   * Omit (or pass undefined) for a different sequence each run.
   */
  random_seed?: number
}

/**
 * One progress snapshot yielded by the backend simulation generator.
 *
 * The backend streams these as SSE events every 100 samples.
 * The final event always has `complete: true`.
 */
export interface SimulationChunk {
  /** Index of the last sample included in this snapshot (1-based). */
  sample_number: number

  /** Running mean of all samples seen up to and including this chunk. */
  running_mean: number

  /**
   * Unbiased sample variance (Bessel-corrected) of all samples so far.
   * Will be 0 for the very first sample.
   */
  running_variance: number

  /** The raw sample values generated in this chunk window. */
  samples: number[]

  /**
   * Present and true only on the final event, indicating the simulation
   * has finished and the stream is about to close.
   */
  complete?: boolean
}
