import { expect, test } from 'bun:test'
import { getResponse } from 'msw'
import { useCaseManifestHandlers } from '../../mocks/handlers/use-case-manifest'

test('mock object storage supports conditional GET, updates, empty data and failure', async () => {
  const origin = 'http://127.0.0.1:3203'
  const handlers = useCaseManifestHandlers(origin)
  const request = async (path: string, init?: RequestInit) => {
    const result = await getResponse(handlers, new Request(`${origin}${path}`, init))
    if (!result) throw new Error('Unmocked request')
    return result
  }
  const first = await request('/use-case-manifest/manifest.json')
  expect(first.status).toBe(200)
  const etag = first.headers.get('etag') as string
  const data = await first.json()
  expect(data).toHaveLength(9)
  const unchanged = await request('/use-case-manifest/manifest.json', {
    headers: { 'If-None-Match': etag }
  })
  expect(unchanged.status).toBe(304)
  expect(await unchanged.text()).toBe('')
  await request('/__mock/use-case-manifest', {
    method: 'PUT',
    body: JSON.stringify({ titleSuffix: ' updated' })
  })
  const updated = await request('/use-case-manifest/manifest.json', {
    headers: { 'If-None-Match': etag }
  })
  expect(updated.status).toBe(200)
  expect((await updated.json())[0].title).toEndWith(' updated')
  for (const [mode, status] of [
    ['empty', 200],
    ['error', 503],
    ['invalid', 200]
  ] as const) {
    await request('/__mock/use-case-manifest', { method: 'PUT', body: JSON.stringify({ mode }) })
    const response = await request('/use-case-manifest/manifest.json')
    expect(response.status).toBe(status)
    if (mode === 'empty') expect(await response.json()).toEqual([])
    if (mode === 'invalid') expect(await response.text()).toBe('invalid json')
  }
  const stats = await (await request('/__mock/use-case-manifest')).json()
  expect(stats.requests).toBe(6)
  expect(stats.notModified).toBe(1)
})

test('serves assets from the published case-name/file-name layout', async () => {
  const origin = 'http://127.0.0.1:3203'
  const handlers = useCaseManifestHandlers(origin)
  const prefix = `${origin}/use-case-manifest/can-a-simple-algorithm-beat-ai-at-wordle/Can%20a%20Simple%20Algorithm%20Beat%20AI%20at%20Wordle`
  for (const extension of ['png', 'md', 'science']) {
    const response = await getResponse(handlers, new Request(`${prefix}.${extension}`))
    expect(response?.status).toBe(200)
  }
  const missing = await getResponse(handlers, new Request(`${prefix}.missing`))
  expect(missing?.status).toBe(404)
})

test('serves extracted metadata and referenced objects from the same package', async () => {
  const origin = 'http://127.0.0.1:3203'
  const handlers = useCaseManifestHandlers(origin)
  const base = `${origin}/use-case-manifest/can-a-simple-algorithm-beat-ai-at-wordle/extracted/`
  const session = await getResponse(handlers, new Request(`${base}session.json`))
  expect(session?.status).toBe(200)
  if (!session) throw new Error('Missing session handler')
  expect((await session.json()).version).toBe(2)
  for (const missing of ['manifest.json', 'records.json']) {
    expect((await getResponse(handlers, new Request(`${base}${missing}`)))?.status).toBe(404)
  }
  // SHA-256 of the storage key "files/coverage_report.md", not the artifact bytes.
  const reportPath = 'objects/778154ce6ab8bf98609b24a64f35984a9df1689a6bbaa91fae12abbf52345aee'
  const asset = await getResponse(handlers, new Request(`${base}${reportPath}`))
  expect(await asset?.text()).toBe('Sample coverage_report.md')
  expect((await getResponse(handlers, new Request(`${base}objects/missing`)))?.status).toBe(404)
})
