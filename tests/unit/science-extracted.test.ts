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
  files.delete('manifest.json')
  files.delete('records.json')
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

test('renders without an extracted manifest or records and leaves artifact bytes on the CDN', async () => {
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
  expect(requests).toHaveLength(2) // Session and optional notebook run only.
  expect(requests.some((url) => /\/(manifest|records)\.json$/.test(url))).toBe(false)
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
  await expect(loadReplayPackage(info, 'sample', () => {})).rejects.toThrow('session.json')
  expect(requests).not.toContain(info.url)
})

test('does not fall back on transient storage failures', async () => {
  const { requests } = await setup(() => new Response(null, { status: 503 }))
  await expect(loadReplayPackage(info, 'sample', () => {})).rejects.toThrow('503')
  expect(requests).toHaveLength(1)
})

test('only requests session metadata when the session has no notebook or artifacts', async () => {
  const { requests } = await setup((path) =>
    path === 'session.json'
      ? Response.json({ version: 2, session: { title: 'Empty session', messages: [] } })
      : undefined
  )
  const result = await loadReplayPackage(info, 'sample', () => {})
  expect(result.session.title).toBe('Empty session')
  expect(result.session.items).toEqual([])
  expect(requests).toEqual([`${base}session.json`])
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

test('uses the exported storage-key hash rather than an artifact content checksum', async () => {
  const { requests } = await setup((path) =>
    path === 'session.json'
      ? Response.json({
          version: 2,
          session: {
            title: 'Published Wordle artifact',
            messages: [
              {
                id: 'answer',
                role: 'assistant',
                content: '[Results](wordle-results.csv)',
                artifactIds: ['result']
              }
            ],
            artifacts: [
              {
                id: 'result',
                path: '$DATA/artifacts/cmuchpzre0000rxicgzmt5my5/01a0c89a-3411-7040-a549-6f01a2551e02/.provenance/20f824df-908d-46f0-a1b7-07e4258037e5/versions/bbe7d541-de9f-4b70-a1d6-966911fe045b/content',
                name: 'wordle-results.csv',
                sha256: 'b91b7dca3fa11e91744ee7fed46fccbb8f1aedc92d7473c15d9ca9cfee05322b',
                size: 962
              }
            ]
          }
        })
      : undefined
  )
  const { session } = await loadReplayPackage(info, 'sample', () => {})
  const message = session.items[0]
  expect(message.type === 'message' && message.artifacts?.[0].url).toBe(
    `${base}objects/460445e5c69a21ca8b602898676f69b25738e8b0a243222cf7de3bf00e724f56#wordle-results.csv`
  )
  expect(requests).toEqual([`${base}session.json`])
})

for (const status of [403, 404]) {
  test(`keeps the transcript and artifacts when optional notebook metadata returns ${status}`, async () => {
    const { requests } = await setup((path) =>
      path.startsWith('objects/') ? new Response(null, { status }) : undefined
    )
    const result = await loadReplayPackage(info, 'sample', () => {})
    expect(result.session.title).toBe('Extracted sample')
    expect(Object.keys(result.session.assets)).toHaveLength(8)
    expect(requests).not.toContain(info.url)
  })
}

test('rejects a JSON null session rather than falling back to the archive', async () => {
  const { requests } = await setup((path) =>
    path === 'session.json' ? Response.json(null) : undefined
  )
  await expect(loadReplayPackage(info, 'sample', () => {})).rejects.toThrow('invalid session.json')
  expect(requests).toEqual([`${base}session.json`])
})
