/**
 * App.tsx — Root component for the Monte Carlo Visualiser.
 *
 * Responsibilities:
 *   1. Check whether the backend API is available.
 *   2. Display the Standard Monte Carlo controls and numerical results.
 *
 * The Vite dev-server proxy (vite.config.ts) forwards /api/* to
 * http://localhost:8000
 */

import { useEffect, useState } from 'react'
import axios from 'axios'
import SimulationControls from './components/SimulationControls'
import SimulationResults from './components/SimulationResults'
import { useSimulation } from './hooks/useSimulation'
import type { SimulationConfig } from './types/simulation'

// ── Types ────────────────────────────────────────────────────────────────────

/** The JSON shape returned by the backend /health endpoint. */
interface HealthResponse {
  status: string
  message: string
}

/** The three possible states while checking the API. */
type ConnectionStatus = 'checking' | 'connected' | 'disconnected'

// ── Component ────────────────────────────────────────────────────────────────

/** Coordinate the API health check, simulation controls, and result display. */
export default function App() {
  const [status, setStatus] = useState<ConnectionStatus>('checking')
  const [message, setMessage] = useState<string>('')
  const [requestedSamples, setRequestedSamples] = useState<number | null>(null)
  const { chunks, isRunning, error, runSimulation } = useSimulation()

  const latestChunk = chunks.length > 0 ? chunks[chunks.length - 1] : null

  /**
   * checkHealth — fires a GET request to the backend health endpoint.
   *
   * Called once on mount.  If the request succeeds and the server returns
   * status === "ok", we mark the connection as live.  Any error (network
   * error, non-2xx response, unexpected shape) marks it as disconnected.
   */
  useEffect(() => {
    const checkHealth = async () => {
      try {
        const response = await axios.get<HealthResponse>('/api/health')
        if (response.data.status === 'ok') {
          setStatus('connected')
          setMessage(response.data.message)
        } else {
          setStatus('disconnected')
          setMessage('Unexpected response from API')
        }
      } catch {
        setStatus('disconnected')
        setMessage('Could not reach the API — is the backend running?')
      }
    }

    checkHealth()
  }, []) // Empty dependency array → runs once on mount only

  /** Record the requested total and start a validated simulation run. */
  async function handleRun(config: SimulationConfig): Promise<void> {
    setRequestedSamples(config.n_samples)
    await runSimulation(config)
  }

  // ── Derived display values ─────────────────────────────────────────────────

  /**
   * badgeClasses — returns Tailwind classes for the status indicator pill.
   * Green for connected, red for disconnected, grey while checking.
   */
  const badgeClasses = (): string => {
    const base = 'inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold'
    switch (status) {
      case 'connected':
        return `${base} bg-green-100 text-green-800`
      case 'disconnected':
        return `${base} bg-red-100 text-red-800`
      default:
        return `${base} bg-slate-100 text-slate-600`
    }
  }

  /** Small coloured dot displayed inside the badge. */
  const dotClasses = (): string => {
    const base = 'h-2.5 w-2.5 rounded-full'
    switch (status) {
      case 'connected':    return `${base} bg-green-500`
      case 'disconnected': return `${base} bg-red-500`
      default:             return `${base} bg-slate-400 animate-pulse`
    }
  }

  /** Return the text label that accompanies the coloured status dot. */
  const statusLabel = (): string => {
    switch (status) {
      case 'connected':    return 'API Connected'
      case 'disconnected': return 'API Disconnected'
      default:             return 'Checking API…'
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <main className="min-h-screen px-4 py-10 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="text-center">
          <h1 className="text-4xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Monte Carlo Visualiser
          </h1>

          <p className="mt-2 text-base text-slate-600 dark:text-slate-300">
            A-Level Computer Science NEA — interactive simulation explorer
          </p>

          <div className="mt-4">
            <div className={badgeClasses()}>
              <span className={dotClasses()} aria-hidden="true" />
              <span>{statusLabel()}</span>
            </div>
          </div>

          {message && (
            <p className="mt-2 text-sm italic text-slate-500 dark:text-slate-400">{message}</p>
          )}
        </header>

        <div className="mt-10 grid items-start gap-6 lg:grid-cols-2">
          <SimulationControls
            isRunning={isRunning}
            isApiConnected={status === 'connected'}
            onRun={handleRun}
          />
          <SimulationResults
            latestChunk={latestChunk}
            requestedSamples={requestedSamples}
            isRunning={isRunning}
            error={error}
          />
        </div>
      </div>
    </main>
  )
}
