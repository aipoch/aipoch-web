import { expect, test } from 'bun:test'
import { renderToReadableStream } from 'react-dom/server'
import { ReviewerCard } from '../../app/(commonLayout)/open-science/use-cases/_components/reviewer-card'
import { SessionTranscript } from '../../app/(commonLayout)/open-science/use-cases/_components/session-transcript'
import { parseExtractedSession, parsePackage } from '../../lib/science-package/parse'
import type { ReplayReview } from '../../lib/use-case-types'
import { buildSciencePackage, packScience } from '../../mocks/fixtures/science-package'

const attribution = {
  kind: 'application',
  feature: 'reviewer',
  purpose: 'correction',
  causeReviewId: 'review-1',
  continuation: { round: 0, maxRounds: 3, findingIds: ['finding-1'] }
}
const correction = {
  id: 'correction',
  role: 'user',
  content: '[Auditor] Correct the unsupported claim.',
  status: 'complete',
  createdAt: 2,
  attribution
}
const response = {
  id: 'response',
  role: 'agent',
  content: 'I corrected the claim.',
  status: 'complete',
  createdAt: 3,
  responseToMessageId: correction.id
}
const source = (messages: Record<string, unknown>[]) => ({
  title: 'Reviewer replay',
  createdAt: 1,
  messages
})
const parse = (messages: Record<string, unknown>[]) =>
  parseExtractedSession(source(messages), 'reviewer', 'https://cdn.test/extracted/').session
const render = async (messages: Record<string, unknown>[]) =>
  new Response(await renderToReadableStream(<SessionTranscript session={parse(messages)} />)).text()

for (const mode of ['extracted', 'archive']) {
  test(`${mode} replay preserves reviewer attribution and response ownership`, async () => {
    const session =
      mode === 'extracted'
        ? parse([correction, response])
        : (
            await parsePackage(
              new Blob([
                buildSciencePackage('Reviewer', source([correction, response])).bytes as BlobPart
              ]),
              'reviewer'
            )
          ).session
    expect(session.items[0]).toMatchObject({ attribution })
    expect(session.items[1]).toMatchObject({ responseToMessageId: correction.id })
  })
}

test('reviewer instructions render as a completed status row without a user bubble', async () => {
  const html = await render([correction, response])
  expect(html).toContain('data-testid="reviewer-correction-message"')
  expect(html).toContain('Corrections requested')
  expect(html).toContain('Response completed.')
  expect(html).not.toContain(correction.content)
  expect(html).not.toContain('Sent ·')
  expect(html).toContain(response.content)
})

for (const [scenario, messages] of Object.entries({
  missing: [correction],
  errored: [correction, { ...response, status: 'error' }],
  interrupted: [correction, { ...response, status: 'streaming' }],
  unrelated: [correction, { ...response, responseToMessageId: 'another-prompt' }],
  'final response failed': [
    correction,
    response,
    { ...response, id: 'later', status: 'error', createdAt: 4 }
  ]
})) {
  test(`historical correction shows failure when its response is ${scenario}`, async () => {
    const html = await render(messages)
    expect(html).toContain('Response failed.')
    expect(html).not.toContain('Response completed.')
    expect(html).not.toContain('animate-spin')
  })
}

test('user quotes and invalid attribution remain ordinary user messages', async () => {
  for (const value of [
    undefined,
    { ...attribution, kind: 'human' },
    { ...attribution, causeReviewId: '' },
    { ...attribution, continuation: { round: 3, maxRounds: 3, findingIds: ['f'] } }
  ]) {
    const html = await render([{ ...correction, attribution: value }])
    expect(html).toContain(correction.content)
    expect(html).toContain('Sent ·')
    expect(html).not.toContain('reviewer-correction-message')
  }
})

// Exercise the export's real Review/Finding/disposition tables, including correction-turn anchoring.
test('renders both historical review cards at their audited messages with tracked reassessments', async () => {
  const { reviewerRecords } = await import('../../mocks/fixtures/reviewer-records')
  const before = {
    id: 'before',
    role: 'agent',
    content: 'Initial response.',
    status: 'complete',
    createdAt: 1
  }
  const sample = buildSciencePackage(
    'Reviewer',
    source([before, correction, response]),
    {},
    reviewerRecords(before.id, response.id)
  )
  const { session } = await parsePackage(new Blob([sample.bytes as BlobPart]), 'reviewer')
  expect(session.reviews).toHaveLength(2)
  expect(session.reviews?.[0]).toMatchObject({
    anchorMessageId: 'before',
    stale: true,
    checks: [{ status: 'pass' }, { status: 'fail' }]
  })
  expect(session.reviews?.[1]).toMatchObject({
    anchorMessageId: response.id,
    checks: [
      {
        kind: 'tracked',
        status: 'pass',
        claim: 'Coverage missing calculations have been provided.'
      },
      { status: 'pass' }
    ]
  })
  const html = await new Response(
    await renderToReadableStream(<SessionTranscript session={session} />)
  ).text()
  expect(html.match(/data-testid="reviewer-card"/g)).toHaveLength(2)
  expect(html).toContain('1 finding (outdated)')
  expect(html).toContain('No issues found (outdated)')
  expect(html.match(/2 checks/g)).toHaveLength(2)
  expect(html.indexOf('data-review-id="cov-review-1"')).toBeLessThan(
    html.indexOf('reviewer-correction-message')
  )
  expect(html.indexOf('data-review-id="cov-review-2"')).toBeGreaterThan(
    html.indexOf(response.content)
  )
  expect(html).not.toContain('Re-run review')
})

const deduplicatedPackage = () => {
  const path = `objects/${'a'.repeat(64)}`
  const sample = buildSciencePackage(
    'Reviewer',
    {},
    {
      [path]: {
        bytes: new TextEncoder().encode('shared evidence'),
        storageKey: 'artifacts/first.txt'
      }
    }
  )
  const manifest = JSON.parse(new TextDecoder().decode(sample.files['manifest.json']))
  manifest.requiredFeatures = ['content-dedupe', 'ro-crate']
  const original = manifest.inventory.find((entry: { path: string }) => entry.path === path)
  manifest.inventory.push({ ...original, storageKey: 'notebooks/second.txt' })
  return { sample, manifest }
}
const parseDeduplicatedPackage = ({ sample, manifest }: ReturnType<typeof deduplicatedPackage>) => {
  sample.files['manifest.json'] = new TextEncoder().encode(JSON.stringify(manifest))
  return parsePackage(new Blob([packScience(sample.files) as BlobPart]), 'reviewer')
}

test('review metadata fallback accepts declared content-dedupe aliases in current exports', async () => {
  const result = await parseDeduplicatedPackage(deduplicatedPackage())
  expect(result.session.title).toBe('Reviewer')
})

for (const invalid of ['undeclared', 'same key', 'missing key', 'checksum', 'size', 'metadata']) {
  test(`review archive rejects invalid content-dedupe aliases: ${invalid}`, async () => {
    const fixture = deduplicatedPackage()
    const { manifest } = fixture
    const alias = manifest.inventory.at(-1)
    if (invalid === 'undeclared') manifest.requiredFeatures = ['ro-crate']
    if (invalid === 'same key') alias.storageKey = 'artifacts/first.txt'
    if (invalid === 'missing key') delete alias.storageKey
    if (invalid === 'checksum') alias.checksum = 'b'.repeat(64)
    if (invalid === 'size') alias.sizeBytes++
    if (invalid === 'metadata') {
      const entry = manifest.inventory[0]
      entry.storageKey = 'metadata/first'
      manifest.inventory.push({ ...entry, storageKey: 'metadata/second' })
    }
    await expect(parseDeduplicatedPackage(fixture)).rejects.toThrow('Invalid package inventory')
  })
}

const historicalReview: ReplayReview = {
  id: 'historical-pass',
  anchorMessageId: 'answer',
  lifecycle: 'complete',
  outcome: 'pass',
  model: 'Review model',
  createdAt: 1,
  stale: false,
  verificationUnavailable: false,
  checks: [
    {
      id: 'check',
      kind: 'new',
      status: 'pass',
      claim: 'Checked',
      evidence: 'Evidence',
      sortIndex: 0
    }
  ]
}
const renderReview = async (review: ReplayReview) =>
  new Response(await renderToReadableStream(<ReviewerCard review={review} />)).text()

test('historical replay verdicts use the desktop outdated presentation even for unchanged snapshots', async () => {
  const html = await renderReview(historicalReview)
  expect(html).toContain('No issues found (outdated)')
  expect(html).toContain('lucide-triangle-alert')
  expect(html).toContain('text-status-warning-foreground')
  expect(html).not.toContain('lucide-shield-check')
  expect(html).not.toContain('Turn changed after this review ran.')
  expect(historicalReview.stale).toBe(false)
  expect(await renderReview({ ...historicalReview, outcome: 'flagged' })).toContain(
    'Issues found (outdated)'
  )
})

for (const state of [
  { lifecycle: 'error' as const },
  { lifecycle: 'running' as const },
  { verificationUnavailable: true }
]) {
  test(`historical presentation preserves incomplete or unverified status: ${JSON.stringify(state)}`, async () => {
    const html = await renderReview({ ...historicalReview, ...state })
    expect(html).not.toContain('(outdated)')
  })
}

test('pending and empty assessments do not display a successful verdict icon', async () => {
  const pending = await renderReview({ ...historicalReview, lifecycle: 'running' })
  expect(pending).toContain('Review pending')
  expect(pending).toContain('lucide-loader')
  expect(pending).not.toContain('text-green-600')
  expect(pending).not.toContain('aria-expanded')
  const empty = await renderReview({ ...historicalReview, checks: [] })
  expect(empty).toContain('No checkable claims')
  expect(empty).toContain('lucide-circle-minus')
  expect(empty).not.toContain('text-green-600')
  expect(empty).not.toContain('(outdated)')
})
