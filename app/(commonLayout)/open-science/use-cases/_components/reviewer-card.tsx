'use client'

import { AlertTriangle, ChevronDown, ChevronRight, CircleMinus, Loader } from 'lucide-react'
import { useState } from 'react'
import type { ReplayReview } from '@/lib/use-case-types'
import { cn } from '@/lib/utils'

// Read-only counterpart of Open-Science's ReviewerCard: historical assessments stay expandable.
export const ReviewerCard = ({ review }: { review: ReplayReview }) => {
  const [expanded, setExpanded] = useState(false)
  const findings = review.checks.filter((check) => check.status !== 'pass').length
  const flagged = review.outcome === 'flagged'
  const complete = review.lifecycle === 'complete'
  // Replay verdicts use the desktop's outdated styling as historical assessments.
  // Keep content-change detection separate: an archived verdict does not prove an edit occurred.
  const outdated =
    complete &&
    !review.verificationUnavailable &&
    (review.stale || flagged || review.checks.length > 0)
  const label =
    review.lifecycle === 'error'
      ? 'Review error'
      : review.verificationUnavailable
        ? 'Current evidence could not be verified'
        : !complete
          ? 'Review pending'
          : flagged
            ? findings
              ? `${findings} ${findings === 1 ? 'finding' : 'findings'}`
              : 'Issues found'
            : review.checks.length
              ? 'No issues found'
              : 'No checkable claims'
  const Icon =
    (complete && flagged) ||
    outdated ||
    review.verificationUnavailable ||
    review.lifecycle === 'error'
      ? AlertTriangle
      : complete
        ? CircleMinus
        : Loader
  const Chevron = expanded ? ChevronDown : ChevronRight
  const canExpand =
    (complete && review.checks.length > 0) ||
    (review.lifecycle === 'error' && Boolean(review.errorMessage))
  return (
    <div className="px-4 pb-1 md:px-6" data-review-anchor-message-id={review.anchorMessageId}>
      <div
        className="mt-2 rounded-lg bg-bg-200 px-3 py-2 text-xs"
        data-testid="reviewer-card"
        data-review-id={review.id}
      >
        <button
          type="button"
          disabled={!canExpand}
          aria-expanded={canExpand ? expanded : undefined}
          onClick={() => setExpanded((value) => !value)}
          className="flex w-full items-center gap-1.5 text-left disabled:cursor-default"
        >
          <Icon
            className={cn(
              'size-3 shrink-0',
              review.lifecycle === 'error'
                ? 'text-yellow-500'
                : outdated || review.verificationUnavailable
                  ? 'text-status-warning-foreground'
                  : complete && flagged
                    ? 'text-red-500'
                    : 'text-text-400'
            )}
            aria-hidden="true"
          />
          <span className="font-medium text-text-200">Reviewer</span>
          <span className="mx-1 text-text-400">·</span>
          <span className={cn('text-text-300', flagged && 'text-red-600')}>
            {`${label}${outdated ? ' (outdated)' : ''}`}
          </span>
          {complete && review.checks.length > 0 && (
            <>
              <span className="mx-1 text-text-400">·</span>
              <span className="text-text-400">{`${review.checks.length} ${review.checks.length === 1 ? 'check' : 'checks'}`}</span>
            </>
          )}
          {canExpand && (
            <Chevron className="ml-auto size-3 shrink-0 text-text-400" aria-hidden="true" />
          )}
        </button>
        {review.stale && (
          <div className="mt-2 rounded bg-bg-300/50 px-2 py-1 text-[11px] text-amber-600">
            Turn changed after this review ran.
          </div>
        )}
        {expanded && (
          <div className="mt-3 space-y-2">
            {review.errorMessage && (
              <p className="break-words text-text-300">{review.errorMessage}</p>
            )}
            {review.checks.map((check) => (
              <div
                key={`${check.kind}:${check.id}`}
                className="rounded-lg bg-bg-000 p-3"
                data-testid="reviewer-check"
              >
                <div className="mb-2 text-[10px] font-medium uppercase tracking-wide text-text-300">
                  {check.kind === 'tracked' ? 'Tracked' : 'New'}
                </div>
                <div className="flex items-start gap-2">
                  <span
                    className={cn(
                      'mt-0.5 shrink-0 rounded bg-bg-200 px-1 py-0.5 text-[11px] font-semibold uppercase',
                      check.status === 'pass'
                        ? 'text-green-700'
                        : check.status === 'fail'
                          ? 'text-red-700'
                          : 'text-amber-700'
                    )}
                  >
                    {check.status}
                  </span>
                  <span className="min-w-0 flex-1 break-words font-semibold leading-snug text-text-000 [overflow-wrap:anywhere]">
                    {check.claim}
                  </span>
                </div>
                <p className="mt-2 break-words leading-relaxed text-text-300 [overflow-wrap:anywhere]">
                  {check.evidence}
                </p>
                {check.legacyAssessment && (
                  <p className="mt-2 text-[11px] text-text-300">
                    Assessment details unavailable for this legacy review
                  </p>
                )}
                {check.disposition && (
                  <p className="mt-1 text-[11px] text-text-300">Disposition: {check.disposition}</p>
                )}
                {review.model && (
                  <span className="mt-3 inline-block rounded bg-bg-200 px-1.5 py-0.5 text-[11px] text-text-400">
                    {review.model}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
