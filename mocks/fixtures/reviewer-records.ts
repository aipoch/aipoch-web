// The second assessment resolves a tracked finding; it is not a second copy of the original fail.
export const reviewerRecords = (before = 'cov-md-1', after = 'cov-reviewer-response') => ({
  schemaVersion: 1,
  tables: {
    Review: [
      {
        id: 'cov-review-1',
        projectId: 'mock-project',
        sessionId: 'mock-session',
        turnMessageId: before,
        scope: JSON.stringify({ turnMessageId: before, blocks: [], artifactVersionIds: [] }),
        lifecycle: 'complete',
        outcome: 'flagged',
        model: 'Review model',
        createdAt: '2026-09-23T03:11:23Z'
      },
      {
        id: 'cov-review-2',
        projectId: 'mock-project',
        sessionId: 'mock-session',
        turnMessageId: before,
        scope: JSON.stringify({ turnMessageId: after, blocks: [], artifactVersionIds: [] }),
        lifecycle: 'complete',
        outcome: 'pass',
        model: 'Review model',
        createdAt: '2026-09-23T03:11:24Z'
      }
    ],
    Finding: [
      {
        id: 'cov-pass',
        reviewId: 'cov-review-1',
        status: 'pass',
        resolution: 'open',
        claim: 'Coverage inputs match the recorded data.',
        evidence: 'The dataset was inspected.',
        sortIndex: 0
      },
      {
        id: 'cov-fail',
        reviewId: 'cov-review-1',
        status: 'fail',
        resolution: 'resolved',
        claim: 'Coverage calculations were missing.',
        evidence: 'The original response stopped before analysis.',
        sortIndex: 1
      },
      {
        id: 'cov-recheck',
        reviewId: 'cov-review-2',
        status: 'pass',
        resolution: 'open',
        claim: 'Coverage calculations match the report.',
        evidence: 'The saved report matches the output.',
        sortIndex: 1
      }
    ],
    ReviewFindingDisposition: [
      {
        id: 'cov-disposition',
        sourceFindingId: 'cov-fail',
        causeReviewId: 'cov-review-2',
        trigger: 'review_submission',
        outcome: 'resolved',
        sequence: 1,
        assessmentSnapshot: JSON.stringify({
          schemaVersion: 1,
          status: 'pass',
          sortIndex: 0,
          claim: 'Coverage missing calculations have been provided.',
          evidence: 'The correction contains rerunnable analysis.'
        })
      }
    ]
  }
})
