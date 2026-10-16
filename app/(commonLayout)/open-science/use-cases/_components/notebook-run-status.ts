import type { NormalizedActivity } from '@/lib/use-case-types'

// Static port of the app's notebook execution phase (tool-execution-phase.ts)
// reduced to exported data. Execution truth comes from the notebook run record
// (run.json join) or the run summary inside the tool output; the outer ACP
// observer status is never trusted on its own — without run evidence a
// notebook execution stays fail-closed at "prepared" (code shown, never ran).

export type StaticNotebookPhase =
  | 'prepared'
  | 'completed'
  | 'failed'
  | 'limit-reached'
  | 'cancelled'
  | 'interrupted'
  | 'declined'

const RUN_STATUSES = new Set([
  'queued',
  'running',
  'completed',
  'failed',
  'timeout',
  'cancelled',
  'interrupted'
])

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

// Candidate JSON texts from every output envelope shape seen in exports:
// plain strings, content block arrays, and MCP result/structuredContent wraps.
const outputCandidateTexts = (output: unknown, depth = 0): string[] => {
  if (depth > 4 || output === undefined || output === null) return []
  if (typeof output === 'string') return [output]
  if (Array.isArray(output)) {
    return output.flatMap((part) =>
      isRecord(part) ? outputCandidateTexts(part.text, depth + 1) : []
    )
  }
  if (isRecord(output)) {
    return [
      ...outputCandidateTexts(output.structuredContent, depth + 1),
      ...outputCandidateTexts(output.result, depth + 1),
      ...outputCandidateTexts(output.content, depth + 1),
      // Some exports nest the MCP payload once more under an `output` key.
      ...outputCandidateTexts(output.output, depth + 1)
    ]
  }
  return []
}

// app: getNotebookRunStatusFromActivity — accept only a summary whose
// executionInvocationId matches this activity, so a foreign run never
// relabels it. Sources mirror the app's parseNotebookRunSummary: toolContent
// blocks and output envelopes first, a bare record output last.
const runStatusFromOutput = (activity: NormalizedActivity): string | undefined => {
  if (!activity.executionInvocationId) return undefined
  const candidates: unknown[] = [
    ...outputCandidateTexts(activity.contentBlocks),
    ...outputCandidateTexts(activity.output)
  ].map((text) => {
    try {
      return JSON.parse(text) as unknown
    } catch {
      return undefined
    }
  })
  if (isRecord(activity.output)) candidates.push(activity.output)
  for (const parsed of candidates) {
    if (!isRecord(parsed)) continue
    if (
      typeof parsed.runId === 'string' &&
      parsed.executionInvocationId === activity.executionInvocationId &&
      typeof parsed.status === 'string' &&
      RUN_STATUSES.has(parsed.status)
    ) {
      return parsed.status
    }
  }
  return undefined
}

export const staticNotebookPhase = (activity: NormalizedActivity): StaticNotebookPhase => {
  if (activity.toolDisposition === 'declined') return 'declined'
  const status = activity.run?.status ?? runStatusFromOutput(activity)
  switch (status) {
    case 'completed':
      return 'completed'
    case 'failed':
      return 'failed'
    case 'timeout':
      return 'limit-reached'
    case 'cancelled':
      return 'cancelled'
    case 'interrupted':
      return 'interrupted'
    // Static simplification: queued/running runs can never advance in a
    // read-only replay, and without a terminal run record there is no
    // execution evidence at all — show "prepared" (code shown).
    default:
      return 'prepared'
  }
}
