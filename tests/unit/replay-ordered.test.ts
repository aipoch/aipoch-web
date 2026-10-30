import { afterEach, expect, test } from 'bun:test'
import { readOrderedReplay } from '../../lib/science-package/ordered'
import { parseExtractedSession, sessionRecordFrom } from '../../lib/science-package/parse'
import fixture from '../../mocks/fixtures/ordered-replay.json'

const fetchBefore = globalThis.fetch
const base = 'https://example.test/case/extracted/'
const info = {
  extractedBaseUrl: base,
  sha256: 'a'.repeat(64),
  sizeBytes: 1,
  filename: 'x.science',
  url: 'https://example.test/x.science'
}
afterEach(() => {
  globalThis.fetch = fetchBefore
})
test('publishes verified complete blocks before stream EOF with stable final grouping', async () => {
  let source!: ReadableStreamDefaultController<Uint8Array>
  globalThis.fetch = (async (input: string | URL) =>
    String(input).endsWith('index.json')
      ? Response.json(fixture.index)
      : new Response(
          new ReadableStream({
            start(c) {
              source = c
            }
          })
        )) as unknown as typeof fetch
  const events: unknown[] = []
  let ended = false
  const pending = readOrderedReplay(info, 'case', (event) => events.push(event)).then((result) => {
    ended = true
    return result
  })
  while (!source) await new Promise((resolve) => setTimeout(resolve, 0))
  const lines = fixture.stream.split('\n')
  source.enqueue(new TextEncoder().encode(`${lines[0]}\n${lines[1]}\n`))
  while (events.length < 2) await new Promise((resolve) => setTimeout(resolve, 0))
  expect(ended).toBe(false)
  expect(events[1]).toMatchObject({ type: 'block', item: { id: 'question' } })
  const first = JSON.stringify(events[1])
  source.enqueue(new TextEncoder().encode(lines.slice(2).join('\n')))
  source.close()
  const result = await pending
  expect(JSON.stringify(events[1])).toBe(first)
  expect(result?.session.items).toEqual(
    parseExtractedSession(sessionRecordFrom(JSON.parse(fixture.source)), 'case', base).session.items
  )
  expect(JSON.stringify(events)).not.toContain('COMPACTION_INTERNAL_SECRET')
  expect(result?.session.rowMetadata?.answer.turnFinal).toBe(false)
  expect(result?.session.rowMetadata?.continuation.turnFinal).toBe(true)
})

const fetchStream = (text: string, step = 0) => {
  let canceled = false
  globalThis.fetch = (async (input: string | URL) => {
    if (String(input).endsWith('index.json')) return Response.json(fixture.index)
    const bytes = new TextEncoder().encode(text)
    let offset = 0
    return new Response(
      new ReadableStream({
        pull(c) {
          if (offset === bytes.length) {
            c.close()
            return
          }
          const end = Math.min(bytes.length, offset + (step || bytes.length))
          c.enqueue(bytes.slice(offset, end))
          offset = end
        },
        cancel() {
          canceled = true
        }
      })
    )
  }) as unknown as typeof fetch
  return () => canceled
}
for (const step of [1, 7, 4096])
  test(`ordered records survive ${step}-byte boundaries`, async () => {
    fetchStream(fixture.stream, step)
    const result = await readOrderedReplay(info, 'case')
    expect(result?.session.items.map((item) => item.id)).toEqual([
      'question',
      'tool-a',
      'compact',
      'answer',
      'plan',
      'continuation'
    ])
  })
for (const mode of ['truncated', 'corrupt', 'reordered', 'extra', 'partial-markdown'] as const) {
  test(`ordered ${mode} never exposes content after the first invalid slot`, async () => {
    const lines = fixture.stream.trimEnd().split('\n')
    let text = fixture.stream
    if (mode === 'truncated') text = `${lines.slice(0, 2).join('\n')}\n`
    if (mode === 'corrupt')
      text = text.replace('Ordered complete answer.', 'Altered complete answer.')
    if (mode === 'reordered')
      text = `${[lines[0], lines[1], lines[3], lines[2], ...lines.slice(4)].join('\n')}\n`
    if (mode === 'extra') text += `${lines[1]}\n`
    if (mode === 'partial-markdown') text = text.slice(0, text.indexOf('const complete'))
    fetchStream(text, 7)
    const events: import('../../lib/science-package/ordered').OrderedEvent[] = []
    await expect(readOrderedReplay(info, 'case', (event) => events.push(event))).rejects.toThrow()
    const ids = events.flatMap((event) => (event.type === 'block' ? [event.item.id] : []))
    expect(ids[0]).toBe('question')
    if (mode !== 'extra') expect(ids).not.toContain('continuation')
    if (mode === 'partial-markdown' || mode === 'corrupt') expect(ids).not.toContain('answer')
    if (mode === 'reordered') expect(ids).toEqual(['question'])
  })
}
test('only absent optional indices fall back; unsupported or mismatched contracts fail closed', async () => {
  globalThis.fetch = (async () => new Response(null, { status: 404 })) as unknown as typeof fetch
  expect(await readOrderedReplay(info, 'case')).toBeUndefined()
  globalThis.fetch = (async () =>
    Response.json({ ...fixture.index, archiveSha256: 'b'.repeat(64) })) as unknown as typeof fetch
  await expect(readOrderedReplay(info, 'case')).rejects.toThrow()
})

test('later blocks retain complete cross-message upload dependencies', async () => {
  fetchStream(fixture.stream)
  const result = await readOrderedReplay(info, 'case')
  const answer = result?.session.items.find((item) => item.id === 'answer')
  expect(answer?.type === 'message' && answer.uploads?.[0].url).toBe(
    `${base}uploads/ordered-project/ordered-session/file/versions/version/content#notes.txt`
  )
})

test('slow original session never blocks ordered body, and review source failure can retry', async () => {
  const { prepareReplayPackage } = await import('../../lib/science-package/extracted')
  let raw!: ReadableStreamDefaultController<Uint8Array>
  let requests = 0
  globalThis.fetch = (async (input: string | URL) => {
    const url = String(input)
    if (url.endsWith('index.json')) return Response.json(fixture.index)
    if (url.endsWith('blocks.ndjson')) return new Response(fixture.stream)
    if (url.endsWith('records.json')) return Response.json({ tables: {} })
    if (++requests > 1) return new Response(fixture.source)
    return new Response(
      new ReadableStream({
        start(c) {
          raw = c
        }
      })
    )
  }) as unknown as typeof fetch
  const events: unknown[] = []
  const result = await prepareReplayPackage(
    info,
    'case',
    () => {},
    undefined,
    (event) => events.push(event)
  )
  expect(events).toHaveLength(7)
  expect(result.session.items).toHaveLength(6)
  const before = JSON.stringify(result.session)
  const reviews = result.loadReviews()
  raw.error(new Error('Source interrupted'))
  await expect(reviews).rejects.toThrow('Source interrupted')
  expect(await result.loadReviews()).toEqual([])
  expect(requests).toBe(2)
  expect(JSON.stringify(result.session)).toBe(before)
})
