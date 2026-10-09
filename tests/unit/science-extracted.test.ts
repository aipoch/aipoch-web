import { afterEach, expect, mock, test } from 'bun:test'
import { readArchive } from '../../lib/science-package/archive'
import { loadReplayPackage } from '../../lib/science-package/extracted'
import { buildCoveragePackage } from '../../mocks/fixtures/science-coverage-package'

const originalFetch = globalThis.fetch
afterEach(() => {
  globalThis.fetch = originalFetch
})
const base = 'https://cdn.test/cases/sample/extracted/'
const sample = buildCoveragePackage('Extracted sample')
const info = {
  url: 'https://releases.test/sample.science',
  filename: 'sample.science',
  sizeBytes: sample.sizeBytes,
  sha256: sample.sha256,
  extractedBaseUrl: base
}
const setup = async (override?: (path: string, blob: Blob | undefined) => Response | undefined) => {
  const files = await readArchive(new Blob([sample.bytes as BlobPart]))
  const requests: string[] = []
  globalThis.fetch = mock(async (input: string | URL | Request) => {
    const url = String(input)
    requests.push(url)
    if (url === info.url) return new Response(sample.bytes as BodyInit)
    const path = url.slice(base.length)
    const blob = files.get(path)?.blob
    return override?.(path, blob) ?? new Response(blob, { status: blob ? 200 : 404 })
  }) as unknown as typeof fetch
  return { files, requests }
}

test('renders the complete session from metadata and leaves artifact bytes on the CDN', async () => {
  const { requests } = await setup()
  const result = await loadReplayPackage(info, 'sample', () => {})
  expect(requests[0]).toBe(`${base}session.json`)
  expect(requests).not.toContain(info.url)
  expect(result.session.title).toBe('Extracted sample')
  const report = result.session.assets['files/coverage_report.md']
  expect(report.url).toMatch(
    /^https:\/\/cdn.test\/cases\/sample\/extracted\/objects\/[a-f0-9]{64}#coverage_report.md$/
  )
  expect(requests).not.toContain(report.url.split('#')[0])
  expect(requests).toHaveLength(4) // Session, inventory, records and notebook run only.
  const message = result.session.items.find(
    (item) => item.type === 'message' && item.artifacts?.length
  )
  expect(
    message?.type === 'message' &&
      message.artifacts?.find((a) => a.name === 'coverage_report.md')?.url
  ).toBe(report.url)
  expect(message?.type === 'message' && message.content).toContain(report.url)
  expect(result.resources.every((resource) => resource.blob.type === 'image/png')).toBe(true)
})

for (const status of [403, 404]) {
  test(`falls back to the verified archive when the extracted session returns ${status}`, async () => {
    const { requests } = await setup((path) =>
      path === 'session.json' ? new Response(null, { status }) : undefined
    )
    const result = await loadReplayPackage(info, 'sample', () => {})
    expect(result.session.title).toBe('Extracted sample')
    expect(requests).toEqual([`${base}session.json`, info.url])
    expect(result.session.assets['files/coverage_report.md'].url).toStartWith('science-asset:')
  })
}

test('rejects corrupt metadata without silently downloading a large archive', async () => {
  const { requests } = await setup((path) =>
    path === 'session.json' ? Response.json({ version: 2, session: { messages: [] } }) : undefined
  )
  await expect(loadReplayPackage(info, 'sample', () => {})).rejects.toThrow(
    'inventory verification'
  )
  expect(requests).not.toContain(info.url)
})

test('does not fall back on transient storage failures', async () => {
  const { requests } = await setup(() => new Response(null, { status: 503 }))
  await expect(loadReplayPackage(info, 'sample', () => {})).rejects.toThrow('503')
  expect(requests).toHaveLength(1)
})

test('rejects unsafe inventory references before fetching them', async () => {
  const { requests } = await setup((path) => {
    if (path === 'manifest.json')
      return Response.json({
        format: 'open-science-session',
        schemaVersion: 1,
        source: { title: 'Unsafe' },
        inventory: [
          {
            path: '../outside.json',
            storageKey: 'notebook/run.json',
            sizeBytes: 2,
            checksum: 'a'.repeat(64)
          }
        ]
      })
  })
  await expect(loadReplayPackage(info, 'sample', () => {})).rejects.toThrow('inventory')
  expect(requests.every((url) => url.startsWith(base))).toBe(true)
  expect(requests).toHaveLength(2)
})

for (const extracted of [true, false]) {
  for (const [filename, fragment] of [
    ['report).md', 'report%29.md'],
    ['report(.md', 'report%28.md']
  ]) {
    test(`preserves one Markdown-safe filename fragment for ${filename} (${extracted ? 'extracted' : 'archive'})`, async () => {
      await setup((path) =>
        !extracted && path === 'session.json' ? new Response(null, { status: 404 }) : undefined
      )
      const { session } = await loadReplayPackage(info, 'sample', () => {})
      const asset = session.assets[`files/${filename}`]
      if (extracted) expect(asset.url.split('#')[1]).toBe(fragment)
      const message = session.items.find(
        (item) => item.type === 'message' && item.artifacts?.length
      )
      const url = extracted ? asset.url : `${asset.url}#${fragment}`
      expect(message?.type === 'message' && message.content).toContain(`](${url})`)
    })
  }
}
