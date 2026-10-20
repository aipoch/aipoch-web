import type { ReviewerCorrectionAttribution, TranscriptItem } from '../use-case-types'

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value)

// Match Open-Science's persisted attribution contract; quoted prompt text is never identity.
export const isReviewerCorrectionAttribution = (
  value: unknown
): value is ReviewerCorrectionAttribution => {
  if (!isRecord(value)) return false
  const continuation = value.continuation
  return (
    Object.keys(value).every((key) =>
      ['kind', 'feature', 'purpose', 'causeReviewId', 'continuation'].includes(key)
    ) &&
    value.kind === 'application' &&
    value.feature === 'reviewer' &&
    value.purpose === 'correction' &&
    typeof value.causeReviewId === 'string' &&
    value.causeReviewId.length > 0 &&
    (continuation === undefined ||
      (isRecord(continuation) &&
        Object.keys(continuation).every((key) =>
          ['round', 'maxRounds', 'findingIds'].includes(key)
        ) &&
        Number.isInteger(continuation.round) &&
        Number(continuation.round) >= 0 &&
        Number.isInteger(continuation.maxRounds) &&
        Number(continuation.maxRounds) > Number(continuation.round) &&
        Array.isArray(continuation.findingIds) &&
        continuation.findingIds.length > 0 &&
        continuation.findingIds.every((id) => typeof id === 'string' && id.length > 0)))
  )
}

// Imported history has no active run. Like the desktop app, use the last owned Agent response.
export const reviewerResponseStates = (items: TranscriptItem[]) => {
  const states = new Map<string, 'completed' | 'failed'>()
  for (const item of items) {
    if (item.type === 'message' && item.role === 'assistant' && item.responseToMessageId) {
      states.set(item.responseToMessageId, item.status === 'complete' ? 'completed' : 'failed')
    }
  }
  return states
}
