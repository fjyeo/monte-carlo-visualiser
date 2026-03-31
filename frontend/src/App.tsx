/**
 * App.tsx — Root component for the Monte Carlo Visualiser.
 *
 * Responsibilities:
 *   1. On first render, call the backend /health endpoint.
 *   2. Display a coloured status badge so the developer can confirm
 *      the FastAPI server is reachable before working on features.
 *
 * The Vite dev-server proxy (vite.config.ts) forwards /api/* to
 * http://localhost:8000
 */

import { useEffect, useState } from 'react'
import axios from 'axios'

// ── Types ────────────────────────────────────────────────────────────────────

/** The JSON shape returned by the backend /health endpoint. */
interface HealthResponse {
  status: string
  message: string
}

/** The three possible states while checking the API. */
type ConnectionStatus = 'checking' | 'connected' | 'disconnected'

// ── Component ────────────────────────────────────────────────────────────────

export default function App() {
  const [status, setStatus] = useState<ConnectionStatus>('checking')
  const [message, setMessage] = useState<string>('')

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

  const statusLabel = (): string => {
    switch (status) {
      case 'connected':    return 'API Connected'
      case 'disconnected': return 'API Disconnected'
      default:             return 'Checking API…'
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-6 p-8">

      {/* App title */}
      <h1 className="text-4xl font-bold tracking-tight text-slate-800">
        Monte Carlo Visualiser
      </h1>

      <p className="text-slate-500 text-base">
        A-Level Computer Science NEA — interactive simulation explorer
      </p>

      {/* API status badge */}
      <div className={badgeClasses()}>
        <span className={dotClasses()} aria-hidden="true" />
        <span>{statusLabel()}</span>
      </div>

      {/* Secondary message line (e.g. the backend's welcome message) */}
      {message && (
        <p className="text-sm text-slate-500 italic">{message}</p>
      )}
    </main>
  )
}
