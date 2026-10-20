import { expect, test } from 'bun:test'
import { getResponse } from 'msw'
import { useCaseManifestHandlers } from '../../mocks/handlers/use-case-manifest'

test('package import mock supports HTTP failure, empty and oversized responses without changing replay', async () => {
  const origin = 'http://127.0.0.1:3203'
  const handlers = useCaseManifestHandlers(origin)
  const prefix = `${origin}/use-case-manifest/can-a-simple-algorithm-beat-ai-at-wordle/`
  const packageUrl = `${prefix}Can%20a%20Simple%20Algorithm%20Beat%20AI%20at%20Wordle.science`
  for (const packageMode of ['error', 'empty', 'oversized', 'normal']) {
    await getResponse(
      handlers,
      new Request(`${origin}/__mock/use-case-manifest`, {
        method: 'PUT',
        body: JSON.stringify({ packageMode })
      })
    )
    const response = await getResponse(handlers, new Request(packageUrl))
    expect(response?.status).toBe(packageMode === 'error' ? 503 : 200)
    if (packageMode === 'empty') expect((await response?.blob())?.size).toBe(0)
    if (packageMode === 'oversized')
      expect(Number(response?.headers.get('content-length'))).toBeGreaterThan(2 * 1024 ** 3)
    expect(
      (await getResponse(handlers, new Request(`${prefix}extracted/session.json`)))?.status
    ).toBe(200)
  }
})

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
  expect(data).toHaveLength(15)
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
  expect((await getResponse(handlers, new Request(`${base}manifest.json`)))?.status).toBe(404)
  const records = await getResponse(handlers, new Request(`${base}records.json`))
  expect(records?.status).toBe(200)
  if (!records) throw new Error('Missing review records handler')
  const tables = (await records.json()).tables
  expect(tables.Review).toHaveLength(2)
  expect(tables.Finding).toHaveLength(3)
  expect(tables.ReviewFindingDisposition).toHaveLength(1)
  // Extracted files preserve storage keys while the archive keeps its inventory.
  const reportPath = 'files/coverage_report.md'
  const asset = await getResponse(handlers, new Request(`${base}${reportPath}`))
  expect(await asset?.text()).toBe('Sample coverage_report.md')
  expect((await getResponse(handlers, new Request(`${base}objects/missing`)))?.status).toBe(404)
})

test('discovery scenarios are adapter-owned and validate control input', async () => {
  const origin = 'http://127.0.0.1:3203'
  const handlers = useCaseManifestHandlers(origin)
  const control = `${origin}/__mock/use-case-manifest`
  for (const discoveryMode of ['available', 'unavailable', 'timeout', 'incompatible']) {
    const updated = await getResponse(
      handlers,
      new Request(control, { method: 'PUT', body: JSON.stringify({ discoveryMode }) })
    )
    expect(updated?.status).toBe(200)
    expect(await (await getResponse(handlers, new Request(control)))?.json()).toMatchObject({
      discoveryMode,
      packageRequests: 0
    })
  }
  const invalid = await getResponse(
    handlers,
    new Request(control, { method: 'PUT', body: JSON.stringify({ discoveryMode: 'installed' }) })
  )
  expect(invalid?.status).toBe(400)
})

test('mock release downloads and static import URLs both serve the same archive', async () => {
  const origin = 'http://127.0.0.1:3203'
  const handlers = useCaseManifestHandlers(origin)
  const manifest = await (
    await getResponse(handlers, new Request(`${origin}/use-case-manifest/manifest.json`))
  )?.json()
  const entry = manifest.find(
    (item: { name: string }) =>
      item.name === 'first-flight-vs-evening-flight-which-is-more-reliable'
  )
  expect(entry.case.release_url).toBe(
    `${origin}/use-case-manifest/releases/first-flight-vs-evening-flight-which-is-more-reliable.science`
  )
  const release = await getResponse(handlers, new Request(entry.case.release_url))
  const asset = await getResponse(
    handlers,
    new Request(
      `${origin}/use-case-manifest/first-flight-vs-evening-flight-which-is-more-reliable/First%20Flight%20vs.%20Evening%20Flight%20-%20Which%20Is%20More%20Reliable.science`
    )
  )
  expect(release?.status).toBe(200)
  expect(asset?.status).toBe(200)
  expect(await release?.arrayBuffer()).toEqual(await asset?.arrayBuffer())
})
