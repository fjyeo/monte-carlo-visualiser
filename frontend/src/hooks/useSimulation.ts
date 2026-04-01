/**
 * useSimulation.ts — Custom React hook for running Monte Carlo simulations.
 *
 * Instead of using the browser's EventSource API (which only supports GET),
 * this hook uses fetch() with a ReadableStream to consume the SSE response
 * from a POST request.  The stream is decoded line-by-line, and each
 * "data: {...}" line is parsed into a SimulationChunk and appended to state.
 *
 * Usage:
 *   const { chunks, isRunning, error, runSimulation } = useSimulation()
 */

import { useState } from 'react'
import type { SimulationChunk, SimulationConfig } from '../types/simulation'

// The backend SSE endpoint (proxied through Vite's dev server).
const ENDPOINT = '/api/simulate/standard-mc'

// ── Types ────────────────────────────────────────────────────────────────────

interface UseSimulationReturn {
  /** All progress snapshots received so far, in arrival order. */
  chunks: SimulationChunk[]
  /** True while the stream is open and data is still arriving. */
  isRunning: boolean
  /** Human-readable error message, or null if no error has occurred. */
  error: string | null
  /** Start a new simulation run with the given configuration. */
  runSimulation: (config: SimulationConfig) => Promise<void>
}

// ── Stream parsing helper ─────────────────────────────────────────────────────

/**
 * Parse a single SSE line and return the JSON payload, or null if the
 * line is not a data event (e.g. blank lines or comment lines).
 *
 * SSE data lines have the format:  data: <JSON string>
 *
 * @param line - One raw text line from the SSE stream.
 * @returns Parsed object, or null if the line carries no data.
 */
function parseSseLine(line: string): SimulationChunk | null {
  if (!line.startsWith('data: ')) return null
  try {
    return JSON.parse(line.slice('data: '.length)) as SimulationChunk
  } catch {
    return null
  }
}

/**
 * Consume a fetch ReadableStream line-by-line and call onChunk for each
 * valid SSE data event.  Resolves when the stream closes naturally.
 *
 * @param body - The ReadableStream from a fetch response.
 * @param onChunk - Callback invoked with each successfully parsed chunk.
 */
async function consumeSseStream(
  body: ReadableStream<Uint8Array>,
  onChunk: (chunk: SimulationChunk) => void
): Promise<void> {
  const reader = body.getReader()
  const decoder = new TextDecoder()
  // Accumulate characters until we can split on newlines.
  let buffer = ''

  while (true) {
    const { value, done } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })

    // Split on newlines — SSE messages are separated by blank lines,
    // but each individual field is also newline-terminated.
    const lines = buffer.split('\n')

    // Keep the last (potentially incomplete) line in the buffer.
    buffer = lines.pop() ?? ''

    for (const line of lines) {
      const chunk = parseSseLine(line.trimEnd())
      if (chunk !== null) {
        onChunk(chunk)
      }
    }
  }
}

// ── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Custom hook that manages the lifecycle of a Monte Carlo simulation stream.
 *
 * Starts a POST fetch to the backend, reads the SSE response incrementally,
 * and exposes the accumulated chunks and status to the component tree.
 *
 * @returns State and the runSimulation action.
 */
export function useSimulation(): UseSimulationReturn {
  const [chunks, setChunks] = useState<SimulationChunk[]>([])
  const [isRunning, setIsRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /**
   * Start a simulation run.  Resets state, opens the SSE stream, and
   * populates `chunks` as data arrives.  Sets `isRunning` to false when
   * the stream closes or an error occurs.
   *
   * @param config - The simulation parameters to send to the backend.
   */
  async function runSimulation(config: SimulationConfig): Promise<void> {
    // Reset state before each new run.
    setChunks([])
    setError(null)
    setIsRunning(true)

    try {
      const response = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      })

      if (!response.ok || !response.body) {
        throw new Error(`Server responded with status ${response.status}`)
      }

      await consumeSseStream(response.body, (chunk) => {
        setChunks((prev) => [...prev, chunk])
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setIsRunning(false)
    }
  }

  return { chunks, isRunning, error, runSimulation }
}
