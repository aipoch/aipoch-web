import { afterEach, expect, mock, test } from 'bun:test'
import manifest from '../../mocks/fixtures/use-case-manifest.json'

mock.module('server-only', () => ({}))
const afterResponse = mock((_task: () => Promise<void>) => {})
mock.module('next/server', () => ({ after: afterResponse }))
mock.module('@/lib/config', () => ({
  API_URL: 'http://127.0.0.1:3203/api',
  STATIC_ASSETS_ORIGIN: 'https://assets.example.test///'
}))
const originalFetch = globalThis.fetch
const originalMocking = process.env.NEXT_PUBLIC_API_MOCKING
const originalNodeEnv = process.env.NODE_ENV
afterEach(() => {
  afterResponse.mockClear()
  globalThis.fetch = originalFetch
  if (originalMocking === undefined) delete process.env.NEXT_PUBLIC_API_MOCKING
  else process.env.NEXT_PUBLIC_API_MOCKING = originalMocking
  if (originalNodeEnv === undefined) Reflect.deleteProperty(process.env, 'NODE_ENV')
  else Reflect.set(process.env, 'NODE_ENV', originalNodeEnv)
  Reflect.deleteProperty(globalThis, '__aipochUseCaseManifest')
})

test('production ignores the development manifest even when the mock flag is set', async () => {
  Reflect.set(process.env, 'NODE_ENV', 'production')
  process.env.NEXT_PUBLIC_API_MOCKING = 'enabled'
  const fetcher = mock(async (_input: unknown) => Response.json(manifest))
  globalThis.fetch = fetcher as unknown as typeof fetch
  const { fetchUseCaseList } = await import('../../service/open-science-use-cases.server')
  expect(await fetchUseCaseList()).toHaveLength(9)
  expect(fetcher.mock.calls[0][0]).toBe(
    'https://assets.example.test/open-science/usecases/manifest.json'
  )
})

test('uses the configured static origin for the manifest and resources outside mock development', async () => {
  delete process.env.NEXT_PUBLIC_API_MOCKING
  const fetcher = mock(async (_input: unknown) => Response.json(manifest))
  globalThis.fetch = fetcher as unknown as typeof fetch
  const { fetchUseCaseList, fetchUseCaseDetail } = await import(
    '../../service/open-science-use-cases.server'
  )
  const entries = await fetchUseCaseList()
  expect(entries).toHaveLength(9)
  // List loading fetches only the manifest, never Markdown, covers, or archives.
  expect(fetcher).toHaveBeenCalledTimes(1)
  expect(fetcher.mock.calls[0][0]).toBe(
    'https://assets.example.test/open-science/usecases/manifest.json'
  )
  expect(afterResponse).not.toHaveBeenCalled()
  const detail = await fetchUseCaseDetail(manifest[0].name)
  const base =
    'https://assets.example.test/open-science/usecases/can-a-simple-algorithm-beat-ai-at-wordle/Can%20a%20Simple%20Algorithm%20Beat%20AI%20at%20Wordle'
  expect(detail?.package?.url).toBe(`${base}.science`)
  expect(detail?.coverImage).toBe(`${base}.png`)
  expect(detail?.introductionUrl).toBe(`${base}.md`)
  const release = manifest.find((item) => item.case.release_url)
  expect(release).toBeDefined()
  expect((await fetchUseCaseDetail(release?.name ?? ''))?.package?.url).toBe(
    release?.case.release_url
  )
  // Detail metadata resolves cached URLs without downloading their bodies either.
  expect(fetcher).toHaveBeenCalledTimes(1)
})

test('maps manifest details without inventing dates or reports', async () => {
  process.env.NEXT_PUBLIC_API_MOCKING = 'enabled'
  globalThis.fetch = mock(async () =>
    Response.json(manifest, { headers: { ETag: '"v1"' } })
  ) as unknown as typeof fetch
  const { fetchUseCaseDetail, fetchUseCaseList } = await import(
    '../../service/open-science-use-cases.server'
  )
  const detail = await fetchUseCaseDetail(manifest[0].name)
  expect(detail).toEqual({
    slug: manifest[0].name,
    title: manifest[0].title,
    coverImage:
      'http://127.0.0.1:3203/use-case-manifest/can-a-simple-algorithm-beat-ai-at-wordle/Can%20a%20Simple%20Algorithm%20Beat%20AI%20at%20Wordle.png',
    package: {
      extractedBaseUrl:
        'http://127.0.0.1:3203/use-case-manifest/can-a-simple-algorithm-beat-ai-at-wordle/extracted/',
      url: 'http://127.0.0.1:3203/use-case-manifest/can-a-simple-algorithm-beat-ai-at-wordle/Can%20a%20Simple%20Algorithm%20Beat%20AI%20at%20Wordle.science',
      filename: manifest[0].case.file_name,
      sizeBytes: manifest[0].case.bytes,
      sha256: manifest[0].case.sha256
    },
    introductionUrl:
      'http://127.0.0.1:3203/use-case-manifest/can-a-simple-algorithm-beat-ai-at-wordle/Can%20a%20Simple%20Algorithm%20Beat%20AI%20at%20Wordle.md'
  })
  expect(detail?.exportedAt).toBeUndefined()
  expect(detail?.report).toBeUndefined()
  expect(detail?.coverImage).toContain('Can%20a%20Simple')
  expect(detail?.package?.filename).toBe(manifest[0].case.file_name)
  expect(await fetchUseCaseDetail('missing')).toBeNull()
  expect(await fetchUseCaseList()).toHaveLength(9)
  expect(afterResponse).toHaveBeenCalled()
})

test('reports a cold manifest failure without falling back to a different catalog', async () => {
  delete process.env.NEXT_PUBLIC_API_MOCKING
  const fetcher = mock(async (_input: unknown) => new Response(null, { status: 503 }))
  globalThis.fetch = fetcher as unknown as typeof fetch
  const { fetchUseCaseList } = await import('../../service/open-science-use-cases.server')
  expect(await fetchUseCaseList()).toBeNull()
  expect(fetcher.mock.calls).toHaveLength(1)
  expect(fetcher.mock.calls[0][0]).toBe(
    'https://assets.example.test/open-science/usecases/manifest.json'
  )
})

test('detail degrades to null on a manifest failure instead of throwing', async () => {
  delete process.env.NEXT_PUBLIC_API_MOCKING
  globalThis.fetch = mock(
    async (_input: unknown) => new Response(null, { status: 503 })
  ) as unknown as typeof fetch
  const { fetchUseCaseDetail } = await import('../../service/open-science-use-cases.server')
  expect(await fetchUseCaseDetail(manifest[0].name)).toBeNull()
})
