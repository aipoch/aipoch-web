import { afterEach, expect, mock, spyOn, test } from 'bun:test'
import { fetchUseCaseAssetText } from '../../service/open-science-use-case-assets'

const originalFetch = globalThis.fetch
afterEach(() => {
  globalThis.fetch = originalFetch
  mock.restore()
})

test('returns null and logs when an asset body fails after successful response headers', async () => {
  const error = spyOn(console, 'error').mockImplementation(() => {})
  const failure = new Error('Connection reset while reading the body')
  globalThis.fetch = mock(
    async () =>
      new Response(new ReadableStream({ start: (controller) => controller.error(failure) }))
  ) as unknown as typeof fetch

  expect(await fetchUseCaseAssetText('https://cdn.example.test/intro.md')).toBeNull()
  expect(error).toHaveBeenCalledWith(
    '[use-cases] asset fetch threw',
    'https://cdn.example.test/intro.md',
    failure
  )
})

test('bounds the asset request and body read with the same timeout signal', async () => {
  spyOn(console, 'error').mockImplementation(() => {})
  const controller = new AbortController()
  const timeout = spyOn(AbortSignal, 'timeout').mockReturnValue(controller.signal)
  let receivedSignal: AbortSignal | null | undefined
  globalThis.fetch = mock(async (_url: unknown, options?: RequestInit) => {
    receivedSignal = options?.signal
    return new Response(
      new ReadableStream({
        start(stream) {
          options?.signal?.addEventListener('abort', () => stream.error(options.signal?.reason), {
            once: true
          })
        }
      })
    )
  }) as unknown as typeof fetch

  const result = fetchUseCaseAssetText('https://cdn.example.test/intro.md')
  expect(receivedSignal).toBe(controller.signal)
  expect(timeout).toHaveBeenCalledWith(15_000)
  controller.abort(new DOMException('Asset timed out', 'TimeoutError'))
  expect(await result).toBeNull()
})

test('returns text on success and null for unsuccessful HTTP responses', async () => {
  spyOn(console, 'error').mockImplementation(() => {})
  globalThis.fetch = mock()
    .mockResolvedValueOnce(new Response('# Introduction'))
    .mockResolvedValueOnce(new Response('Unavailable', { status: 503 })) as unknown as typeof fetch
  expect(await fetchUseCaseAssetText('https://cdn.example.test/intro.md')).toBe('# Introduction')
  expect(await fetchUseCaseAssetText('https://cdn.example.test/intro.md')).toBeNull()
})
