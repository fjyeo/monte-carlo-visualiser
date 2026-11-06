/**
 * ConvergencePlot.tsx — D3 line chart for the streamed integral estimate.
 *
 * Each SSE chunk becomes one point whose x-coordinate is the number of
 * processed samples and whose y-coordinate is the running estimate.
 */

import { useEffect, useRef } from 'react'
import * as d3 from 'd3'
import type { SimulationChunk } from '../types/simulation'

interface ConvergencePlotProps {
  /** Ordered simulation chunks received from the backend. */
  chunks: SimulationChunk[]
  /** Total number of samples requested for the current run. */
  requestedSamples: number | null
  /** Exact definite integral of the selected preset function. */
  analyticalValue: number | null
}

interface ConvergencePoint {
  sampleNumber: number
  runningEstimate: number
}

interface ChartScales {
  x: d3.ScaleLinear<number, number>
  y: d3.ScaleLinear<number, number>
}

type SvgSelection = d3.Selection<SVGSVGElement, unknown, null, undefined>

const CHART_WIDTH = 900
const CHART_HEIGHT = 420
const MARGIN = { top: 45, right: 35, bottom: 65, left: 75 }

/** Convert backend chunks into the smaller data shape required by the chart. */
function buildPlotData(chunks: SimulationChunk[]): ConvergencePoint[] {
  return chunks.map((chunk) => ({
    sampleNumber: chunk.sample_number,
    runningEstimate: chunk.running_estimate,
  }))
}

/** Calculate a padded y-axis domain containing estimates and the reference. */
function calculateYDomain(
  points: ConvergencePoint[],
  analyticalValue: number,
): [number, number] {
  const values = points.map((point) => point.runningEstimate)
  values.push(analyticalValue)

  const minimum = d3.min(values) ?? analyticalValue
  const maximum = d3.max(values) ?? analyticalValue
  const range = maximum - minimum
  const padding =
    range > 0 ? range * 0.15 : Math.max(Math.abs(analyticalValue) * 0.05, 0.05)

  return [minimum - padding, maximum + padding]
}

/** Create stable linear scales for the current simulation and chart size. */
function createScales(
  points: ConvergencePoint[],
  requestedSamples: number,
  analyticalValue: number,
): ChartScales {
  return {
    x: d3
      .scaleLinear()
      .domain([0, requestedSamples])
      .range([MARGIN.left, CHART_WIDTH - MARGIN.right]),
    y: d3
      .scaleLinear()
      .domain(calculateYDomain(points, analyticalValue))
      .nice()
      .range([CHART_HEIGHT - MARGIN.bottom, MARGIN.top]),
  }
}

/** Draw both labelled axes onto the supplied SVG element. */
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
    .attr('y', 20)
    .attr('text-anchor', 'middle')
    .attr('fill', 'var(--color-text)')
    .attr('font-size', 13)
    .text('Integral estimate')
}

/** Draw the solid estimate line and a marker for every streamed point. */
function drawEstimate(
  svg: SvgSelection,
  points: ConvergencePoint[],
  scales: ChartScales,
): void {
  const lineGenerator = d3
    .line<ConvergencePoint>()
    .x((point) => scales.x(point.sampleNumber))
    .y((point) => scales.y(point.runningEstimate))

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
    .attr('cy', (point) => scales.y(point.runningEstimate))
    .attr('r', 2.5)
    .attr('fill', 'var(--color-accent)')
}

/** Draw and label the dashed analytical reference line. */
function drawReferenceLine(
  svg: SvgSelection,
  analyticalValue: number,
  scales: ChartScales,
): void {
  const referenceY = scales.y(analyticalValue)

  svg
    .append('line')
    .attr('x1', MARGIN.left)
    .attr('x2', CHART_WIDTH - MARGIN.right)
    .attr('y1', referenceY)
    .attr('y2', referenceY)
    .attr('stroke', '#ea580c')
    .attr('stroke-width', 2)
    .attr('stroke-dasharray', '7 5')

  svg
    .append('text')
    .attr('x', CHART_WIDTH - MARGIN.right - 4)
    .attr('y', referenceY - 8)
    .attr('text-anchor', 'end')
    .attr('fill', 'var(--color-text)')
    .attr('font-size', 12)
    .attr('font-weight', 600)
    .text(`Analytical value: ${analyticalValue.toFixed(4)}`)
}

/** Render a responsive convergence chart from streamed simulation chunks. */
export default function ConvergencePlot({
  chunks,
  requestedSamples,
  analyticalValue,
}: ConvergencePlotProps) {
  const svgRef = useRef<SVGSVGElement>(null)

  useEffect(() => {
    if (svgRef.current === null || requestedSamples === null || analyticalValue === null) {
      return
    }

    const points = buildPlotData(chunks)
    if (points.length === 0) {
      return
    }

    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()

    const scales = createScales(points, requestedSamples, analyticalValue)
    drawAxes(svg, scales)
    drawReferenceLine(svg, analyticalValue, scales)
    drawEstimate(svg, points, scales)
  }, [chunks, requestedSamples, analyticalValue])

  return (
    <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
        Convergence plot
      </h2>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
        The running estimate should approach the analytical integral as more samples are processed.
      </p>

      {chunks.length === 0 ? (
        <div className="mt-6 rounded-lg border border-dashed border-slate-300 p-10 text-center dark:border-slate-600">
          <p className="font-medium text-slate-700 dark:text-slate-200">
            No convergence data yet
          </p>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Run a simulation to plot the streamed integral estimate.
          </p>
        </div>
      ) : (
        <figure className="mt-6">
          <svg
            ref={svgRef}
            className="h-auto w-full"
            viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
            role="img"
            aria-label="Convergence plot of integral estimate against number of samples"
          />
          <figcaption className="mt-3 text-center text-xs text-slate-500 dark:text-slate-400">
            The solid line and circular markers show the running estimate. The dashed line shows
            the analytical value of the selected integral.
          </figcaption>
        </figure>
      )}
    </section>
  )
}
