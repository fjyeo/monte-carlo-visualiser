/**
 * SimulationControls.tsx — Input form for a Standard Monte Carlo run.
 *
 * The form keeps editable values as strings so fields can be cleared without
 * immediately converting an empty value to zero. Values are converted to a
 * SimulationConfig only after all client-side validation checks pass.
 */

import { useState, type FormEvent } from 'react'
import type { SimulationConfig } from '../types/simulation'

interface SimulationControlsProps {
  /** True while a simulation request is in progress. */
  isRunning: boolean
  /** True when the backend health check has succeeded. */
  isApiConnected: boolean
  /** Start a simulation using the validated form values. */
  onRun: (config: SimulationConfig) => Promise<void>
}

interface SimulationFormValues {
  nSamples: string
  lowerBound: string
  upperBound: string
  randomSeed: string
}

const INITIAL_VALUES: SimulationFormValues = {
  nSamples: '1000',
  lowerBound: '0',
  upperBound: '1',
  randomSeed: '42',
}

/**
 * Check the editable form values and return a user-facing error message.
 *
 * @param values - Current values entered into the simulation form.
 * @returns The first validation error, or null when all values are valid.
 */
function validateForm(values: SimulationFormValues): string | null {
  const nSamples = Number(values.nSamples)
  const lowerBound = Number(values.lowerBound)
  const upperBound = Number(values.upperBound)

  if (!Number.isInteger(nSamples) || nSamples < 100 || nSamples > 100_000) {
    return 'Sample count must be a whole number between 100 and 100,000.'
  }

  if (
    values.lowerBound.trim() === '' ||
    values.upperBound.trim() === '' ||
    !Number.isFinite(lowerBound) ||
    !Number.isFinite(upperBound)
  ) {
    return 'Lower and upper bounds must both be valid numbers.'
  }

  if (lowerBound >= upperBound) {
    return 'Lower bound must be less than upper bound.'
  }

  if (values.randomSeed.trim() !== '') {
    const randomSeed = Number(values.randomSeed)
    if (!Number.isSafeInteger(randomSeed) || randomSeed < 0) {
      return 'Random seed must be a non-negative whole number.'
    }
  }

  return null
}

/**
 * Convert validated form strings into the shared API configuration type.
 *
 * @param values - Form values that have already passed validation.
 * @returns A configuration ready to send to the backend.
 */
function buildConfig(values: SimulationFormValues): SimulationConfig {
  const config: SimulationConfig = {
    n_samples: Number(values.nSamples),
    distribution: 'uniform',
    lower_bound: Number(values.lowerBound),
    upper_bound: Number(values.upperBound),
  }

  if (values.randomSeed.trim() !== '') {
    config.random_seed = Number(values.randomSeed)
  }

  return config
}

/** Display and validate the controls used to start a simulation. */
export default function SimulationControls({
  isRunning,
  isApiConnected,
  onRun,
}: SimulationControlsProps) {
  const [values, setValues] = useState<SimulationFormValues>(INITIAL_VALUES)
  const [validationError, setValidationError] = useState<string | null>(null)

  /** Update one form field and clear any validation message from an old value. */
  function updateValue(field: keyof SimulationFormValues, value: string): void {
    setValues((currentValues) => ({ ...currentValues, [field]: value }))
    setValidationError(null)
  }

  /** Validate the form and start the simulation when the values are valid. */
  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    const error = validateForm(values)

    if (error !== null) {
      setValidationError(error)
      return
    }

    setValidationError(null)
    await onRun(buildConfig(values))
  }

  const inputClasses =
    'mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 disabled:cursor-not-allowed disabled:bg-slate-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:disabled:bg-slate-700'

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
        Simulation parameters
      </h2>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
        Configure a Standard Monte Carlo simulation using a uniform distribution.
      </p>

      <form className="mt-6 space-y-5" onSubmit={handleSubmit} noValidate>
        <div>
          <label
            className="text-sm font-medium text-slate-700 dark:text-slate-200"
            htmlFor="n-samples"
          >
            Sample count
          </label>
          <input
            className={inputClasses}
            id="n-samples"
            inputMode="numeric"
            min="100"
            max="100000"
            step="1"
            type="number"
            value={values.nSamples}
            disabled={isRunning}
            onChange={(event) => updateValue('nSamples', event.target.value)}
          />
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Enter a whole number from 100 to 100,000.
          </p>
        </div>

        <div>
          <label
            className="text-sm font-medium text-slate-700 dark:text-slate-200"
            htmlFor="distribution"
          >
            Distribution
          </label>
          <select
            className={inputClasses}
            id="distribution"
            defaultValue="uniform"
            disabled={isRunning}
          >
            <option value="uniform">Uniform</option>
          </select>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label
              className="text-sm font-medium text-slate-700 dark:text-slate-200"
              htmlFor="lower-bound"
            >
              Lower bound
            </label>
            <input
              className={inputClasses}
              id="lower-bound"
              step="any"
              type="number"
              value={values.lowerBound}
              disabled={isRunning}
              onChange={(event) => updateValue('lowerBound', event.target.value)}
            />
          </div>

          <div>
            <label
              className="text-sm font-medium text-slate-700 dark:text-slate-200"
              htmlFor="upper-bound"
            >
              Upper bound
            </label>
            <input
              className={inputClasses}
              id="upper-bound"
              step="any"
              type="number"
              value={values.upperBound}
              disabled={isRunning}
              onChange={(event) => updateValue('upperBound', event.target.value)}
            />
          </div>
        </div>

        <div>
          <label
            className="text-sm font-medium text-slate-700 dark:text-slate-200"
            htmlFor="random-seed"
          >
            Random seed <span className="font-normal text-slate-500">(optional)</span>
          </label>
          <input
            className={inputClasses}
            id="random-seed"
            inputMode="numeric"
            min="0"
            step="1"
            type="number"
            value={values.randomSeed}
            disabled={isRunning}
            onChange={(event) => updateValue('randomSeed', event.target.value)}
          />
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Use the same seed to reproduce a simulation, or leave it blank.
          </p>
        </div>

        {validationError !== null && (
          <p
            className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm font-medium text-red-800"
            role="alert"
          >
            Validation error: {validationError}
          </p>
        )}

        <button
          className="w-full rounded-lg bg-indigo-600 px-4 py-3 font-semibold text-white transition hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-400"
          type="submit"
          disabled={isRunning || !isApiConnected}
        >
          {isRunning ? 'Running…' : 'Run Simulation'}
        </button>

        {!isApiConnected && (
          <p className="text-center text-sm text-slate-600 dark:text-slate-300">
            Connect to the API before starting a simulation.
          </p>
        )}
      </form>
    </section>
  )
}
