/**
 * UncertaintyPlot.tsx — D3 chart showing Monte Carlo standard error.
 *
 * Each streamed simulation chunk contributes one point. The chart makes the
 * reduction in uncertainty visible as the number of samples increases.
 */

import { useEffect, useRef } from 'react'
import * as d3 from 'd3'
import type { SimulationChunk } from '../types/simulation'

interface UncertaintyPlotProps {
  /** Ordered simulation chunks received from the backend. */
  chunks: SimulationChunk[]
  /** Total number of samples requested for the current run. */
  requestedSamples: number | null
}

interface UncertaintyPoint {
  sampleNumber: number
  standardError: number
}

interface ChartScales {
  x: d3.ScaleLinear<number, number>
  y: d3.ScaleLinear<number, number>
}

type SvgSelection = d3.Selection<SVGSVGElement, unknown, null, undefined>

const CHART_WIDTH = 900
const CHART_HEIGHT = 360
const MARGIN = { top: 30, right: 35, bottom: 65, left: 85 }

/** Convert streamed chunks into the values required by the chart. */
function buildPlotData(chunks: SimulationChunk[]): UncertaintyPoint[] {
  return chunks.map((chunk) => ({
    sampleNumber: chunk.sample_number,
    standardError: chunk.standard_error,
  }))
}

/** Create linear scales covering the requested samples and error values. */
function createScales(
  points: UncertaintyPoint[],
  requestedSamples: number,
): ChartScales {
  const maximumError = d3.max(points, (point) => point.standardError) ?? 0
  const yMaximum = maximumError > 0 ? maximumError * 1.1 : 1

  return {
    x: d3
      .scaleLinear()
      .domain([0, requestedSamples])
      .range([MARGIN.left, CHART_WIDTH - MARGIN.right]),
    y: d3
      .scaleLinear()
      .domain([0, yMaximum])
      .nice()
      .range([CHART_HEIGHT - MARGIN.bottom, MARGIN.top]),
  }
}

/** Draw labelled sample-count and standard-error axes. */
function drawAxes(svg: SvgSelection, scales: ChartScales): void {
  const axisColour = 'var(--color-text-muted)'

  svg
    .append('g')
    .attr('transform', `translate(0, ${CHART_HEIGHT - MARGIN.bottom})`)
    .attr('color', axisColour)
    .call(d3.axisBottom(scales.x).ticks(6).tickFormat(d3.format(',d')))

  svg
    .append('g')
    .attr('transform', `translate(${MARGIN.left}, 0)`)
    .attr('color', axisColour)
    .call(d3.axisLeft(scales.y).ticks(6))

  svg
    .append('text')
    .attr('x', (MARGIN.left + CHART_WIDTH - MARGIN.right) / 2)
    .attr('y', CHART_HEIGHT - 15)
    .attr('text-anchor', 'middle')
    .attr('fill', 'var(--color-text)')
    .attr('font-size', 13)
    .text('Number of samples')

  svg
    .append('text')
    .attr('transform', 'rotate(-90)')
    .attr('x', -(MARGIN.top + CHART_HEIGHT - MARGIN.bottom) / 2)
    .attr('y', 22)
    .attr('text-anchor', 'middle')
    .attr('fill', 'var(--color-text)')
    .attr('font-size', 13)
    .text('Standard error')
}

/** Draw the solid standard-error line and its circular point markers. */
function drawStandardError(
  svg: SvgSelection,
  points: UncertaintyPoint[],
  scales: ChartScales,
): void {
  const lineGenerator = d3
    .line<UncertaintyPoint>()
    .x((point) => scales.x(point.sampleNumber))
    .y((point) => scales.y(point.standardError))

  svg
    .append('path')
    .datum(points)
    .attr('fill', 'none')
    .attr('stroke', 'var(--color-accent)')
    .attr('stroke-width', 2.5)
    .attr('d', lineGenerator)

  svg
    .append('g')
    .selectAll('circle')
    .data(points)
    .join('circle')
    .attr('cx', (point) => scales.x(point.sampleNumber))
    .attr('cy', (point) => scales.y(point.standardError))
    .attr('r', 2.5)
    .attr('fill', 'var(--color-accent)')
}

/** Render a responsive diagnostic plot from streamed standard errors. */
export default function UncertaintyPlot({
  chunks,
  requestedSamples,
}: UncertaintyPlotProps) {
  const svgRef = useRef<SVGSVGElement>(null)

  useEffect(() => {
    if (svgRef.current === null || requestedSamples === null) {
      return
    }

    const points = buildPlotData(chunks)
    if (points.length === 0) {
      return
    }

    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()

    const scales = createScales(points, requestedSamples)
    drawAxes(svg, scales)
    drawStandardError(svg, points, scales)
  }, [chunks, requestedSamples])

  return (
    <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
        Uncertainty diagnostic
      </h2>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
        Standard error estimates the uncertainty in the running integral estimate.
      </p>

      {chunks.length === 0 ? (
        <div className="mt-6 rounded-lg border border-dashed border-slate-300 p-10 text-center dark:border-slate-600">
          <p className="font-medium text-slate-700 dark:text-slate-200">
            No uncertainty data yet
          </p>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Run a simulation to see how uncertainty changes with sample count.
          </p>
        </div>
      ) : (
        <figure className="mt-6">
          <svg
            ref={svgRef}
            className="h-auto w-full"
            viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
            role="img"
            aria-label="Standard error against number of Monte Carlo samples"
          />
          <figcaption className="mt-3 text-center text-xs text-slate-500 dark:text-slate-400">
            The solid line and circular markers show the estimated standard error after each
            streamed sample batch. Lower values indicate a more precise estimate.
          </figcaption>
        </figure>
      )}
    </section>
  )
}
