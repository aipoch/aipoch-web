import { afterEach, expect, jest, mock, test } from 'bun:test'
import { readOrderedReplay } from '../../lib/science-package/ordered'
import fixture from '../../mocks/fixtures/ordered-replay.json'

const original = globalThis.fetch
const info = {
  extractedBaseUrl: 'https://example.test/extracted/',
  sha256: 'a'.repeat(64),
  url: 'https://example.test/a.science',
  filename: 'a.science',
  sizeBytes: 1
}
const flush = async () => {
  for (let i = 0; i < 60; i++) await Promise.resolve()
}
afterEach(() => {
  globalThis.fetch = original
  jest.clearAllTimers()
  jest.useRealTimers()
})
for (const mode of ['active', 'first-byte', 'stall', 'cancel'] as const)
  test(`ordered stream ${mode} releases idle resources`, async () => {
    jest.useFakeTimers()
    let source!: ReadableStreamDefaultController<Uint8Array>
    const canceled = mock(() => {})
    const abort = new AbortController()
    globalThis.fetch = (async (input: string | URL) =>
      String(input).endsWith('index.json')
        ? Response.json(fixture.index)
        : new Response(
            new ReadableStream({
              start(c) {
                source = c
              },
              cancel: canceled
            })
          )) as typeof fetch
    const pending = readOrderedReplay(info, 'case', undefined, abort.signal)
    void pending.catch(() => {})
    await flush()
    if (mode === 'active') {
      for (const line of fixture.stream.trimEnd().split('\n')) {
        jest.advanceTimersByTime(20_000)
        source.enqueue(new TextEncoder().encode(`${line}\n`))
        await flush()
      }
      source.close()
      expect((await pending)?.session.items.length).toBe(6)
    } else {
      if (mode === 'stall') {
        source.enqueue(new TextEncoder().encode(`${fixture.stream.split('\n')[0]}\n`))
        await flush()
      }
      if (mode === 'cancel') abort.abort()
      else {
        source.enqueue(new Uint8Array())
        jest.advanceTimersByTime(30_000)
      }
      await flush()
      await expect(pending).rejects.toThrow()
      expect(canceled).toHaveBeenCalled()
    }
    expect(jest.getTimerCount()).toBe(0)
  })
