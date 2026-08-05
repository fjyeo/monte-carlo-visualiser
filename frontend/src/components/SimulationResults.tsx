/**
 * SimulationResults.tsx — Numerical progress and results for one simulation.
 */

import type { SimulationChunk } from '../types/simulation'

interface SimulationResultsProps {
  /** Most recent progress chunk received from the backend. */
  latestChunk: SimulationChunk | null
  /** Number of samples requested for the current run. */
  requestedSamples: number | null
  /** True while the SSE response is still being consumed. */
  isRunning: boolean
  /** Error reported by the simulation hook, if one occurred. */
  error: string | null
}

/** Format a statistic consistently to six decimal places. */
function formatStatistic(value: number): string {
  return value.toFixed(6)
}

/** Display the latest numerical values received from the simulation stream. */
export default function SimulationResults({
  latestChunk,
  requestedSamples,
  isRunning,
  error,
}: SimulationResultsProps) {
  const progress =
    latestChunk !== null && requestedSamples !== null
      ? Math.min(100, Math.round((latestChunk.sample_number / requestedSamples) * 100))
      : 0

  return (
    <section
      className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800"
      aria-live="polite"
    >
      <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
        Standard Monte Carlo results
      </h2>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
        Running statistics update as sample batches arrive from the backend.
      </p>

      {error !== null ? (
        <div
          className="mt-6 rounded-lg border border-red-300 bg-red-50 p-4 text-red-800"
          role="alert"
        >
          <p className="font-semibold">Simulation error</p>
          <p className="mt-1 text-sm">{error}</p>
        </div>
      ) : latestChunk === null ? (
        <div className="mt-6 rounded-lg border border-dashed border-slate-300 p-8 text-center dark:border-slate-600">
          <p className="font-medium text-slate-700 dark:text-slate-200">
            {isRunning ? 'Preparing the simulation…' : 'No simulation results yet'}
          </p>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Enter valid parameters and run the simulation to see numerical output.
          </p>
        </div>
      ) : (
        <div className="mt-6 space-y-6">
          <div>
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-slate-700 dark:text-slate-200">Progress</span>
              <span className="text-slate-600 dark:text-slate-300">{progress}%</span>
            </div>
            <progress className="mt-2 h-3 w-full accent-indigo-600" max="100" value={progress}>
              {progress}%
            </progress>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {latestChunk.sample_number.toLocaleString()} of{' '}
              {requestedSamples?.toLocaleString()} samples processed
            </p>
          </div>

          <dl className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-700">
              <dt className="text-sm text-slate-600 dark:text-slate-300">Running mean</dt>
              <dd className="mt-1 font-mono text-xl font-semibold text-slate-900 dark:text-white">
                {formatStatistic(latestChunk.running_mean)}
              </dd>
            </div>

            <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-700">
              <dt className="text-sm text-slate-600 dark:text-slate-300">Running variance</dt>
              <dd className="mt-1 font-mono text-xl font-semibold text-slate-900 dark:text-white">
                {formatStatistic(latestChunk.running_variance)}
              </dd>
            </div>
          </dl>

          <p className="rounded-lg bg-indigo-50 p-3 text-sm font-medium text-indigo-800 dark:bg-indigo-950 dark:text-indigo-200">
            Status: {latestChunk.complete ? 'Simulation complete' : 'Simulation running'}
          </p>
        </div>
      )}
    </section>
  )
}
