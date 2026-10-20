import { expect, test } from 'bun:test'
import { createHash } from 'node:crypto'
import { normalizeReviews } from '../../lib/science-package/review-records'
import { reviewScopeState } from '../../lib/science-package/review-scope'
import { reviewerRecords } from '../../mocks/fixtures/reviewer-records'

const prompt = { id: 'prompt', role: 'user', content: 'Question', createdAt: 1 }
const answer = { id: 'answer', role: 'agent', content: 'Answer', createdAt: 2 }
const session = { id: 'mock-session', projectId: 'mock-project', messages: [prompt, answer] }
// Literal sorted-key payloads independently pin the desktop hash contract.
const digest = (value: string) => createHash('sha256').update(value).digest('hex')
const scope = {
  turnMessageId: 'answer',
  blocks: [
    {
      sourceId: 'prompt',
      kind: 'message',
      contentHash: digest('{"artifactIds":[],"content":"Question","role":"user"}')
    },
    {
      sourceId: 'answer',
      kind: 'message',
      contentHash: digest('{"artifactIds":[],"content":"Answer","role":"agent"}')
    }
  ],
  artifactVersionIds: []
}

test('unchanged exported evidence is current; edited or added blocks are outdated', () => {
  expect(reviewScopeState(session, scope, [])).toBe('current')
  expect(
    reviewScopeState(
      { ...session, messages: [prompt, { ...answer, content: 'Edited' }] },
      scope,
      []
    )
  ).toBe('outdated')
  expect(
    reviewScopeState(
      { ...session, messages: [...session.messages, { ...answer, id: 'more', createdAt: 3 }] },
      scope,
      []
    )
  ).toBe('outdated')
  expect(reviewScopeState(session, { ...scope, blocks: [] }, [])).toBe('outdated')
})

test('missing artifact evidence is unverified, not a fabricated stale or current verdict', () => {
  expect(
    reviewScopeState(
      { ...session, messages: [prompt, { ...answer, artifactIds: ['file'] }] },
      scope,
      []
    )
  ).toBe('unverified')
  expect(reviewScopeState(session, {}, [])).toBe('unverified')
})

test('graph scope follows its pinned branch and rejects invalid or cyclic ancestry', () => {
  const messages = [
    { ...prompt, agentFrameId: 'frame' },
    { ...answer, agentFrameId: 'frame', parentMessageId: prompt.id }
  ]
  const graph = {
    frames: [{ id: 'frame', activeBranchId: 'branch' }],
    branches: [{ id: 'branch', agentFrameId: 'frame', headMessageId: 'answer' }],
    messages,
    activities: []
  }
  const pinned = { ...scope, messageBranchId: 'branch' }
  expect(reviewScopeState({ ...session, messages: [], conversationGraph: graph }, pinned, [])).toBe(
    'current'
  )
  expect(
    reviewScopeState(
      { ...session, conversationGraph: graph },
      { ...pinned, messageBranchId: 'missing' },
      []
    )
  ).toBe('unverified')
  expect(
    reviewScopeState(
      {
        ...session,
        conversationGraph: {
          ...graph,
          messages: [{ ...messages[0], parentMessageId: 'answer' }, messages[1]]
        }
      },
      pinned,
      []
    )
  ).toBe('unverified')
})

test('review cards exclude other sessions and use visible audited anchors before legacy grouping', () => {
  const records = reviewerRecords('prompt', 'answer')
  const reviews = normalizeReviews(session, records, (value) => value)
  expect(reviews.map((r) => r.anchorMessageId)).toEqual(['prompt', 'answer'])
  expect(normalizeReviews({ ...session, id: 'other-session' }, records, (value) => value)).toEqual(
    []
  )
  expect(normalizeReviews({ ...session, messages: [] }, records, (value) => value)).toEqual([])
})

test('legacy tracked assessments retain a visible missing-assessment note and never invent a pass', () => {
  const records = reviewerRecords('prompt', 'answer')
  records.tables.ReviewFindingDisposition[0].assessmentSnapshot = '{}'
  const review = normalizeReviews(session, records, (value) => value)[1]
  expect(review.checks.find((c) => c.kind === 'tracked')).toMatchObject({
    status: 'fail',
    legacyAssessment: true
  })
})
