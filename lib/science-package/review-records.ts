import type { ReplayReview, ReplayReviewCheck } from '../use-case-types'
import { jsonRecord, record, reviewScopeState, rows } from './review-scope'

type Row = Record<string, unknown>
export interface ReviewRecords {
  tables: Record<string, Row[]>
}

export const reviewRecordsFrom = (value: unknown): ReviewRecords => {
  const tables = record(record(value)?.tables)
  if (
    !tables ||
    Object.values(tables).some(
      (table) => !Array.isArray(table) || table.some((row) => !record(row))
    )
  )
    throw new Error('Invalid review records metadata.')
  return { tables: tables as Record<string, Row[]> }
}
const text = (value: unknown) => (typeof value === 'string' ? value : '')
const status = (value: unknown): ReplayReviewCheck['status'] =>
  value === 'pass' || value === 'fail' ? value : 'warn'

// Preserve each assessment's own findings, including tracked reassessments from later fix rounds.
export const normalizeReviews = (
  session: Row,
  records: ReviewRecords | undefined,
  sanitize: (text: string) => string
): ReplayReview[] => {
  if (!records) return []
  const {
    Review = [],
    Finding = [],
    ReviewFindingDisposition = [],
    ArtifactVersion = []
  } = records.tables
  const visibleIds = new Set(rows(session.messages).map((message) => message.id))
  return Review.flatMap((review): ReplayReview[] => {
    if (review.sessionId !== session.id || review.projectId !== session.projectId) return []
    const scope = jsonRecord(review.scope) ?? {}
    const anchorMessageId = visibleIds.has(scope.turnMessageId)
      ? text(scope.turnMessageId)
      : text(review.turnMessageId)
    if (!anchorMessageId || !visibleIds.has(anchorMessageId) || !text(review.id)) return []
    const own = Finding.filter((f) => f.reviewId === review.id).map(
      (f): ReplayReviewCheck => ({
        id: text(f.id),
        kind: 'new',
        status: status(f.status),
        claim: sanitize(text(f.claim)),
        evidence: sanitize(text(f.evidence)),
        sortIndex: Number(f.sortIndex ?? 0)
      })
    )
    const tracked = ReviewFindingDisposition.filter(
      (d) => d.causeReviewId === review.id && d.trigger === 'review_submission'
    ).flatMap((d): ReplayReviewCheck[] => {
      const source = Finding.find((f) => f.id === d.sourceFindingId)
      if (!source) return []
      const parsed = jsonRecord(d.assessmentSnapshot)
      const assessment =
        parsed?.schemaVersion === 1 &&
        ['pass', 'warn', 'fail'].includes(text(parsed.status)) &&
        typeof parsed.claim === 'string' &&
        typeof parsed.evidence === 'string' &&
        typeof parsed.sortIndex === 'number'
          ? parsed
          : undefined
      const content = assessment ?? source
      return [
        {
          id: text(d.id),
          kind: 'tracked',
          status: status(content.status),
          claim: sanitize(text(content.claim)),
          evidence: sanitize(text(content.evidence)),
          sortIndex: assessment ? Number(assessment.sortIndex) : null,
          disposition: ['resolved', 'still_open', 'unaddressed'].includes(text(d.outcome))
            ? text(d.outcome).replaceAll('_', ' ')
            : undefined,
          legacyAssessment: !assessment
        }
      ]
    })
    const scopeState = reviewScopeState(session, scope, ArtifactVersion)
    return [
      {
        id: text(review.id),
        anchorMessageId,
        lifecycle:
          review.lifecycle === 'complete' || review.lifecycle === 'error'
            ? review.lifecycle
            : 'running',
        outcome:
          review.outcome === 'flagged' ? 'flagged' : review.outcome === 'pass' ? 'pass' : undefined,
        model: sanitize(text(review.model)),
        errorMessage: sanitize(text(review.errorMessage)),
        createdAt:
          typeof review.createdAt === 'number'
            ? review.createdAt
            : Date.parse(text(review.createdAt)) || 0,
        stale: review.lifecycle === 'complete' && scopeState === 'outdated',
        verificationUnavailable: review.lifecycle === 'complete' && scopeState === 'unverified',
        checks: [...own, ...tracked].sort(
          (a, b) =>
            (a.sortIndex ?? Infinity) - (b.sortIndex ?? Infinity) ||
            (a.kind === b.kind ? a.id.localeCompare(b.id) : a.kind === 'tracked' ? -1 : 1)
        )
      }
    ]
  }).sort((a, b) => a.createdAt - b.createdAt || a.id.localeCompare(b.id))
}
