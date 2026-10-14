// Static-replay port of the Open-Science app's generate-plan-activity-projection.ts
// and the PlanDocumentV1 contract (shared/session-plan/contract.ts, zod there —
// hand-validated here to the same shape). Anything missing or malformed returns
// undefined so the caller degrades to generic sections instead of throwing.

import type { NormalizedActivity } from '@/lib/use-case-types'

export type PlanConfidence = 'high' | 'medium' | 'low'

export interface PlanStepContent {
  title: string
  description: string
}

export interface PlanDocument {
  taskSummary: string
  /** Phases → delegations → steps, flattened with 1-based numbers. */
  steps: { number: number; title: string; description: string }[]
  desiredOutputs: string[]
  feasibility: { confidence: PlanConfidence; summary: string }
}

export type PlanProjection =
  | Readonly<{
      kind: 'content'
      heading: string
      taskSummary: string
      steps: { number: number; title: string; description: string }[]
      feasibility: { confidence: PlanConfidence; summary: string }
    }>
  | Readonly<{
      kind: 'approved' | 'rejected' | 'already-pending' | 'unavailable' | 'failed'
      heading: string
    }>
  | Readonly<{ kind: 'revision-conflict'; heading: string; detail: string }>

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const requireText = (value: unknown): string | undefined =>
  typeof value === 'string' && value.trim() ? value.trim() : undefined

const PLAN_CONTENT_FIELDS = ['task_summary', 'phases', 'desired_outputs', 'feasibility'] as const
const PLAN_ALREADY_AWAITING_APPROVAL = 'A Session Plan is already awaiting approval.'

// Validates the V1 plan document contract without zod: every violation
// degrades to undefined rather than throwing (the app throws PlanCommandError).
export const parsePlanDocument = (input: unknown): PlanDocument | undefined => {
  if (!isRecord(input)) return undefined
  if ('schema_version' in input && input.schema_version !== 1) return undefined

  const taskSummary = requireText(input.task_summary)
  if (!taskSummary) return undefined
  if (!Array.isArray(input.phases) || input.phases.length === 0) return undefined

  const titles = new Set<string>()
  const steps: PlanDocument['steps'] = []
  for (const phaseValue of input.phases) {
    const phase = isRecord(phaseValue) ? phaseValue : {}
    if (!requireText(phase.name)) return undefined
    if (!Array.isArray(phase.delegations) || phase.delegations.length === 0) return undefined
    for (const delegationValue of phase.delegations) {
      const delegation = isRecord(delegationValue) ? delegationValue : {}
      if (!requireText(delegation.name)) return undefined
      if (!Array.isArray(delegation.steps) || delegation.steps.length === 0) return undefined
      for (const stepValue of delegation.steps) {
        const step = isRecord(stepValue) ? stepValue : {}
        const title = requireText(step.title)
        const description = requireText(step.description)
        if (!title || !description || titles.has(title)) return undefined
        titles.add(title)
        steps.push({ number: steps.length + 1, title, description })
      }
    }
  }

  if (!Array.isArray(input.desired_outputs)) return undefined
  const desiredOutputs: string[] = []
  for (const output of input.desired_outputs) {
    const text = requireText(output)
    if (!text) return undefined
    desiredOutputs.push(text)
  }

  const feasibility = isRecord(input.feasibility) ? input.feasibility : {}
  const confidence = feasibility.confidence
  if (confidence !== 'high' && confidence !== 'medium' && confidence !== 'low') return undefined
  const rationale = requireText(feasibility.rationale)
  if (!rationale) return undefined

  return {
    taskSummary,
    steps,
    desiredOutputs,
    feasibility: { confidence, summary: rationale }
  }
}

// ACP providers either expose the MCP arguments directly or retain the protocol envelope.
const unwrapArguments = (rawInput: unknown): unknown =>
  isRecord(rawInput) && isRecord(rawInput.arguments) ? rawInput.arguments : rawInput

const structuredPlanErrorCode = (rawOutput: unknown): string | undefined => {
  if (!isRecord(rawOutput)) return undefined
  const payload = isRecord(rawOutput.structuredContent) ? rawOutput.structuredContent : rawOutput
  const error = payload.error
  return isRecord(error) && typeof error.code === 'string' ? error.code : undefined
}

const contentHeading = (activity: NormalizedActivity): string =>
  activity.status === 'pending' || activity.status === 'in_progress'
    ? 'Creating execution plan'
    : 'Created execution plan'

// Parses a JSON-string output envelope, since normalized activities may carry
// the MCP result as text rather than a record.
const outputRecord = (activity: NormalizedActivity): unknown => {
  if (isRecord(activity.output)) return activity.output
  if (typeof activity.output === 'string') {
    try {
      return JSON.parse(activity.output)
    } catch {
      return undefined
    }
  }
  if (Array.isArray(activity.output)) {
    const text = activity.output
      .filter(
        (part): part is { type: string; text: string } =>
          isRecord(part) && typeof part.text === 'string'
      )
      .map((part) => part.text)
      .join('\n')
    if (text) {
      try {
        return JSON.parse(text)
      } catch {
        return undefined
      }
    }
  }
  return undefined
}

export const projectGeneratePlanActivity = (activity: NormalizedActivity): PlanProjection => {
  const planErrorCode = structuredPlanErrorCode(outputRecord(activity))
  if (planErrorCode === 'approval-already-pending') {
    return { kind: 'already-pending', heading: 'Execution plan already awaiting approval' }
  }
  if (planErrorCode === 'plan-review-pending') {
    return {
      kind: 'revision-conflict',
      heading: 'Plan revision not submitted',
      detail: 'Review or dismiss the current execution plan before submitting a revision.'
    }
  }

  if (
    typeof activity.output === 'string' &&
    activity.output.trim() === PLAN_ALREADY_AWAITING_APPROVAL
  ) {
    return { kind: 'already-pending', heading: 'Execution plan already awaiting approval' }
  }

  if (activity.status === 'failed') {
    return { kind: 'failed', heading: 'Failed to create execution plan' }
  }

  const input = unwrapArguments(activity.input)
  if (isRecord(input)) {
    const hasPlanContent = PLAN_CONTENT_FIELDS.some((field) => input[field] !== undefined)
    const hasDecisionInput = input.decision !== undefined || 'approve' in input
    // A decision mixed with plan content is ambiguous; show as unavailable.
    if (hasDecisionInput && hasPlanContent) {
      return { kind: 'unavailable', heading: contentHeading(activity) }
    }
    if (input.decision === 'approved' || input.approve === true) {
      return { kind: 'approved', heading: 'Approved execution plan' }
    }
    if (input.decision === 'rejected') {
      return { kind: 'rejected', heading: 'Dismissed execution plan' }
    }
  }

  const document = parsePlanDocument(input)
  if (document) {
    return {
      kind: 'content',
      heading: contentHeading(activity),
      taskSummary: document.taskSummary,
      steps: document.steps,
      feasibility: document.feasibility
    }
  }

  return { kind: 'unavailable', heading: contentHeading(activity) }
}

export type PlanStepUpdate = Readonly<{
  title: string
  status?: string
  notes?: string
}>

// update_step_status input: { title, status, notes? } (plan-mcp-server.ts).
// Missing or malformed input degrades to undefined fields, never a throw.
export const parsePlanStepUpdate = (activity: NormalizedActivity): PlanStepUpdate | undefined => {
  const input = unwrapArguments(activity.input)
  if (!isRecord(input)) return undefined
  const title = requireText(input.title)
  if (!title) return undefined
  return { title, status: requireText(input.status), notes: requireText(input.notes) }
}

export const PLAN_STEP_STATUS_LABELS: Record<string, string> = {
  in_progress: 'In progress',
  completed: 'Completed',
  blocked: 'Blocked',
  skipped: 'Skipped'
}

export const PLAN_CONFIDENCE_LABELS: Record<PlanConfidence, string> = {
  high: 'High confidence',
  medium: 'Medium confidence',
  low: 'Low confidence'
}
