'use client'

// Static-replay port of the app's WorkspacePlanActivityRecord card body,
// including its folding defaults: task summary clamps to three lines, step
// descriptions start collapsed, the step list caps at five, and one control
// expands/collapses everything. Read-only — no annotations or live status.

import { ChevronRight } from 'lucide-react'
import { useLayoutEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import type { PlanProjection } from './plan-projection'
import { PLAN_CONFIDENCE_LABELS } from './plan-projection'

const COMPACT_STEP_COUNT = 5
const TASK_SUMMARY_PREVIEW_LINES = 3

// Overflow is judged against a fixed 3-line preview height, not the clamped
// clientHeight — otherwise expanding would make scrollHeight === clientHeight
// and uninstall the toggle (app: WorkspacePlanActivityRecord measureOverflow).
export const planSummaryOverflows = (
  scrollHeight: number,
  lineHeight: number | undefined,
  clientHeight: number
): boolean => {
  const previewHeight = lineHeight ? lineHeight * TASK_SUMMARY_PREVIEW_LINES : clientHeight
  return scrollHeight > previewHeight + 1
}

export const PlanCard = ({ projection }: { projection: PlanProjection }) => {
  const [expandedSteps, setExpandedSteps] = useState<ReadonlySet<number>>(new Set())
  const [showAllSteps, setShowAllSteps] = useState(false)
  const [taskSummaryExpanded, setTaskSummaryExpanded] = useState(false)
  const [taskSummaryOverflows, setTaskSummaryOverflows] = useState(false)
  const taskSummaryRef = useRef<HTMLParagraphElement>(null)

  const taskSummary = projection.kind === 'content' ? projection.taskSummary : undefined
  // biome-ignore lint/correctness/useExhaustiveDependencies: a new summary must trigger re-measurement
  useLayoutEffect(() => {
    const element = taskSummaryRef.current
    if (!element) return
    const measureOverflow = (): void => {
      const style = window.getComputedStyle(element)
      const parsedLineHeight = Number.parseFloat(style.lineHeight)
      const parsedFontSize = Number.parseFloat(style.fontSize)
      const lineHeight =
        Number.isFinite(parsedLineHeight) && parsedLineHeight > 0
          ? parsedLineHeight < 4 && Number.isFinite(parsedFontSize)
            ? parsedLineHeight * parsedFontSize
            : parsedLineHeight
          : undefined
      const overflows = planSummaryOverflows(element.scrollHeight, lineHeight, element.clientHeight)
      setTaskSummaryOverflows(overflows)
      if (!overflows) setTaskSummaryExpanded(false)
    }
    measureOverflow()
    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(measureOverflow)
    observer.observe(element)
    return () => observer.disconnect()
  }, [taskSummary])

  if (projection.kind !== 'content') return null

  const visibleSteps = showAllSteps
    ? projection.steps
    : projection.steps.slice(0, COMPACT_STEP_COUNT)
  const remainingStepCount = projection.steps.length - visibleSteps.length
  const everythingExpanded = Boolean(
    showAllSteps &&
      projection.steps.every((step) => expandedSteps.has(step.number)) &&
      (!taskSummaryOverflows || taskSummaryExpanded)
  )

  const toggleStep = (stepNumber: number): void => {
    setExpandedSteps((current) => {
      const next = new Set(current)
      if (next.has(stepNumber)) next.delete(stepNumber)
      else next.add(stepNumber)
      return next
    })
  }

  const toggleAll = (): void => {
    if (everythingExpanded) {
      setShowAllSteps(false)
      setTaskSummaryExpanded(false)
      setExpandedSteps(new Set())
      return
    }
    setShowAllSteps(true)
    setTaskSummaryExpanded(taskSummaryOverflows)
    setExpandedSteps(new Set(projection.steps.map((step) => step.number)))
  }

  return (
    <div className="overflow-hidden rounded-md border border-border-200 bg-bg-000 px-3.5 py-3">
      <div className="mb-2 flex items-center justify-end gap-2">
        <span className="mr-auto shrink-0 text-[11px] tabular-nums text-text-300">
          {projection.steps.length} {projection.steps.length === 1 ? 'step' : 'steps'}
        </span>
        <button
          type="button"
          aria-expanded={everythingExpanded}
          className="rounded-[5px] px-1.5 py-0.5 text-[11px] text-text-100 transition-colors hover:bg-bg-200 hover:text-text-000"
          onClick={toggleAll}
        >
          {everythingExpanded ? 'Collapse all' : 'Expand all'}
        </button>
      </div>
      <div>
        <p
          ref={taskSummaryRef}
          className={cn(
            'm-0 text-[13px] font-semibold leading-[1.45] text-text-000',
            taskSummaryOverflows && !taskSummaryExpanded && 'line-clamp-3'
          )}
        >
          {projection.taskSummary}
        </p>
        {taskSummaryOverflows ? (
          <button
            type="button"
            aria-expanded={taskSummaryExpanded}
            className="mt-1 rounded p-0 text-[11px] text-text-300 transition-colors hover:text-text-000"
            onClick={() => setTaskSummaryExpanded((expanded) => !expanded)}
          >
            {taskSummaryExpanded ? 'Show less' : 'Show full task'}
          </button>
        ) : null}
      </div>
      <ol className="mt-2.5 grid list-none gap-1.5 p-0">
        {visibleSteps.map((step) => {
          const expanded = expandedSteps.has(step.number)
          return (
            <li
              key={step.number}
              className="grid grid-cols-[20px_minmax(0,1fr)] items-start text-[12px] text-text-100"
            >
              <span className="pt-0.5 text-[10px] font-semibold text-text-300 tabular-nums">
                {step.number}.
              </span>
              <div className="min-w-0">
                <button
                  type="button"
                  aria-expanded={expanded}
                  className="flex w-full min-w-0 items-center gap-2 rounded-[5px] text-left text-text-100 hover:text-text-000"
                  onClick={() => toggleStep(step.number)}
                >
                  <span className="min-w-0 flex-1 text-[12px] text-text-000">{step.title}</span>
                  <ChevronRight
                    className={cn(
                      'size-3.5 shrink-0 text-text-300 transition-transform',
                      expanded && 'rotate-90'
                    )}
                    aria-hidden="true"
                  />
                </button>
                {expanded ? (
                  <p className="mb-[3px] mt-0.5 text-[10.5px] leading-[1.5] text-text-300">
                    {step.description}
                  </p>
                ) : null}
              </div>
            </li>
          )
        })}
      </ol>
      {remainingStepCount > 0 ? (
        <div className="ml-5 mt-1.5 text-[11px] text-text-300">
          + {remainingStepCount} more {remainingStepCount === 1 ? 'step' : 'steps'}
        </div>
      ) : null}
      <div className="mt-3 flex items-start gap-2 border-t border-border-200 pt-2.5 text-[11px] text-text-300">
        <span className="shrink-0 whitespace-nowrap rounded-[5px] bg-bg-200 px-1.5 py-0.5 text-[10px] text-text-100">
          {PLAN_CONFIDENCE_LABELS[projection.feasibility.confidence]}
        </span>
        <span>{projection.feasibility.summary}</span>
      </div>
    </div>
  )
}
