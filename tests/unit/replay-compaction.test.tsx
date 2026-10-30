import { expect, test } from 'bun:test'
import { renderToReadableStream } from 'react-dom/server'
import { SessionTranscript } from '../../app/(commonLayout)/open-science/use-cases/_components/session-transcript'
import { parseExtractedSession, parsePackage } from '../../lib/science-package/parse'
import {
  COMPACTION_INTERNAL_TEXT,
  compactionActivities,
  compactionSession
} from '../../mocks/fixtures/compaction'
import { buildSciencePackage } from '../../mocks/fixtures/science-package'

const parse = (source: Parameters<typeof parseExtractedSession>[0] = compactionSession) =>
  parseExtractedSession(source, 'compaction', 'https://cdn.test/extracted/').session

for (const mode of ['extracted', 'archive']) {
  test(`${mode} preserves cancelled compaction instead of reporting success`, async () => {
    const source = {
      ...compactionSession,
      conversationGraph: {
        activities: [{ ...compactionActivities[1], title: 'Context compaction cancelled' }]
      }
    }
    const sample = buildSciencePackage(source.title, source)
    const session =
      mode === 'extracted'
        ? parse(source)
        : (await parsePackage(new Blob([sample.bytes as BlobPart]), 'cancelled')).session
    expect(session.items[1]).toMatchObject({ type: 'compaction', status: 'cancelled' })
    const html = await new Response(
      await renderToReadableStream(<SessionTranscript session={session} />)
    ).text()
    expect(html).toContain('Context compaction cancelled')
    expect(html).not.toContain('Context compacted')
  })
}

for (const mode of ['extracted', 'archive']) {
  test(`${mode} projects compaction lifecycle without exposing provider payload or changing the source`, async () => {
    const source = structuredClone(compactionSession)
    const before = JSON.stringify(source)
    const sample = buildSciencePackage(source.title, source)
    const bytes = sample.bytes.slice()
    const session =
      mode === 'extracted'
        ? parse(source)
        : (await parsePackage(new Blob([sample.bytes as BlobPart]), 'compaction')).session
    expect(session.items.map((item) => item.type)).toEqual([
      'message',
      'compaction',
      'compaction',
      'compaction',
      'compaction',
      'message'
    ])
    expect(session.items.slice(1, 5)).toEqual(
      (['in_progress', 'completed', 'failed', 'unknown'] as const).map((status, index) => ({
        type: 'compaction',
        id: `context-compaction:sample-${index}`,
        status,
        createdAt: 1790133045297 + index * 0.1
      }))
    )
    expect(JSON.stringify(session)).not.toContain(COMPACTION_INTERNAL_TEXT)
    expect(JSON.stringify(session)).not.toContain('private.md')
    expect(JSON.stringify(source)).toBe(before)
    expect(sample.bytes).toEqual(bytes)
    expect(session.items.at(-1)).toMatchObject({ content: 'The analysis is complete.' })
  })
}

test('renders status-only rows without details or copy controls and keeps the answer completion', async () => {
  const html = await new Response(
    await renderToReadableStream(<SessionTranscript session={parse()} />)
  ).text()
  for (const label of [
    'Compacting context',
    'Context compacted',
    'Context compaction failed',
    'Context compaction status unavailable'
  ])
    expect(html).toContain(label)
  expect(html.match(/data-testid="context-compaction"/g)).toHaveLength(4)
  expect(html).not.toContain(COMPACTION_INTERNAL_TEXT)
  expect(html).not.toContain('aria-expanded')
  expect(html).not.toContain('Ran a tool')
  expect(html).not.toContain('1 step')
  expect(html.match(/Completed ·/g)).toHaveLength(1)
  expect(html).toContain('The analysis is complete.')
})

test('deduplicates activity snapshots using their latest update without hiding distinct compactions', () => {
  const started = { ...compactionActivities[0], updatedAt: 10 }
  const completed = { ...started, status: 'completed', updatedAt: 20 }
  const session = parse({
    ...compactionSession,
    conversationGraph: { activities: [completed, started, completed, compactionActivities[2]] }
  })
  expect(session.items.filter((item) => item.type !== 'message')).toEqual([
    { type: 'compaction', id: started.id, status: 'completed', createdAt: started.createdAt },
    {
      type: 'compaction',
      id: compactionActivities[2].id,
      status: 'failed',
      createdAt: compactionActivities[2].createdAt
    }
  ])
})

test('preserves unmarked legacy text and ordinary tool output instead of guessing from prose', () => {
  const text = 'Objective: summarize. Blocked: C:\\Users\\demo\\private.md. Next Move: retry.'
  const session = parse({
    ...compactionSession,
    messages: [{ ...compactionSession.messages[1], content: text }],
    conversationGraph: {
      activities: [
        {
          ...compactionActivities[1],
          providerToolName: 'Read',
          title: 'Context compacted',
          elicitation: undefined,
          rawOutput: text
        }
      ]
    }
  })
  expect(session.items.some((item) => item.type === 'message' && item.content === text)).toBe(true)
  expect(
    session.items.some(
      (item) => item.type === 'activity-group' && item.activities[0].output === text
    )
  ).toBe(true)
})

for (const status of [undefined, null, '', 'stop', '__proto__', 'constructor']) {
  test(`does not infer successful compaction from invalid status ${String(status)}`, () => {
    const session = parse({
      ...compactionSession,
      conversationGraph: { activities: [{ ...compactionActivities[0], status }] }
    })
    expect(session.items[1]).toMatchObject({ type: 'compaction', status: 'unknown' })
  })
}
