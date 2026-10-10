import { expect, test } from 'bun:test'
import { createHash } from 'node:crypto'
import { Sha256 } from '../../lib/science-package/sha256'

for (const size of [0, 3, 55, 56, 64, 65, 1000000]) {
  test(`streaming SHA-256 matches standard digest at ${size} bytes`, () => {
    const bytes = new Uint8Array(size).map((_, index) => index % 251)
    const hash = new Sha256()
    for (let offset = 0; offset < size; offset += 137)
      hash.update(bytes.subarray(offset, offset + 137))
    expect(hash.hex()).toBe(createHash('sha256').update(bytes).digest('hex'))
  })
}

import { afterEach, mock } from 'bun:test'
import { downloadPackage, readArchive } from '../../lib/science-package/archive'
import { parsePackage } from '../../lib/science-package/parse'
import { buildSciencePackage, digest, packScience } from '../../mocks/fixtures/science-package'

const originalFetch = globalThis.fetch
afterEach(() => {
  globalThis.fetch = originalFetch
})

test('parses one complete session without shortening payloads or generating alternate views', async () => {
  const sample = buildSciencePackage('Test science')
  const result = await parsePackage(new Blob([sample.bytes as BlobPart]), 'test-science')
  expect(result.session.title).toBe('Test science')
  expect(Object.keys(result).sort()).toEqual(['resources', 'session'])
  const group = result.session.items.find((item) => item.type === 'activity-group')
  expect(group?.type === 'activity-group' && group.activities[0].output).toBe(
    'sample '.repeat(5000)
  )
  expect(result.session.omissions).toEqual([])
})

for (const measurable of [true, false]) {
  test(`download reports ${measurable ? 'measured' : 'indeterminate'} progress and verifies bytes`, async () => {
    const sample = buildSciencePackage('Download')
    globalThis.fetch = mock(
      async () =>
        new Response(sample.bytes as BodyInit, {
          headers: measurable ? { 'Content-Length': String(sample.sizeBytes) } : {}
        })
    ) as unknown as typeof fetch
    const states: { stage: string; total?: number }[] = []
    const blob = await downloadPackage(
      { ...sample, url: 'https://cdn.test/a.science', filename: 'a.science' },
      (state) => states.push(state)
    )
    expect(blob.size).toBe(sample.sizeBytes)
    expect(states.at(-1)?.stage).toBe('verifying')
    expect(states.findLast((state) => state.stage === 'downloading')?.total).toBe(
      measurable ? sample.sizeBytes : undefined
    )
  })
}

test('rejects outer hash, truncated downloads, HTTP and CORS errors', async () => {
  const sample = buildSciencePackage('Corruption')
  const info = { ...sample, url: 'https://cdn.test/a.science', filename: 'a.science' }
  globalThis.fetch = mock(
    async () => new Response(sample.bytes as BodyInit)
  ) as unknown as typeof fetch
  await expect(downloadPackage({ ...info, sha256: '0'.repeat(64) }, () => {})).rejects.toThrow(
    'SHA-256'
  )
  await expect(
    downloadPackage({ ...info, sizeBytes: info.sizeBytes + 1 }, () => {})
  ).rejects.toThrow('size')
  globalThis.fetch = mock(
    async () => new Response(null, { status: 404 })
  ) as unknown as typeof fetch
  await expect(downloadPackage(info, () => {})).rejects.toThrow('404')
  globalThis.fetch = mock(async () => {
    throw new TypeError('Failed to fetch')
  }) as unknown as typeof fetch
  await expect(downloadPackage(info, () => {})).rejects.toThrow('CORS')
})

test('rejects invalid archives and corrupt internal inventory', async () => {
  await expect(readArchive(new Blob(['not gzip']))).rejects.toThrow()
  const unsafe = packScience({ '../session.json': new Uint8Array([1]) })
  await expect(readArchive(new Blob([unsafe as BlobPart]))).rejects.toThrow(
    'Unsupported archive entry'
  )
  const sample = buildSciencePackage('Internal corruption')
  const entries = await readArchive(new Blob([sample.bytes as BlobPart]))
  const files = Object.fromEntries(
    await Promise.all(
      Array.from(entries, async ([name, file]) => [
        name,
        new Uint8Array(await file.blob.arrayBuffer())
      ])
    )
  )
  files['session.json'][10] ^= 1
  const corrupted = packScience(files)
  await expect(parsePackage(new Blob([corrupted as BlobPart]), 'bad')).rejects.toThrow(
    'inventory verification'
  )
})

test('large assets are available in the default session without another download', async () => {
  const bytes = new Uint8Array(32 * 1024 ** 2).fill(97)
  const path = `objects/${digest(bytes)}`
  const sample = buildSciencePackage(
    'Large sample',
    {
      messages: [
        {
          id: 'a',
          role: 'assistant',
          content: '[file](large.txt)',
          createdAt: 1,
          artifactIds: ['file']
        }
      ],
      artifacts: [{ id: 'file', name: 'large.txt', path: '$DATA/large.txt', size: bytes.length }]
    },
    { [path]: { bytes, storageKey: 'large.txt' } }
  )
  const result = await parsePackage(new Blob([sample.bytes as BlobPart]), 'large')
  expect(result.resources[0].blob.size).toBe(bytes.length)
  const message = result.session.items[0]
  expect(message.type === 'message' && message.artifacts?.[0].url).toBe('science-asset:0')
  expect(Object.keys(result.session.assets)).toHaveLength(1)
  // The rewritten link carries the real filename as a fragment so the markdown
  // link interceptor can recover it even when the label has no extension.
  expect(result.session.items[0].type === 'message' && result.session.items[0].content).toContain(
    '[file](science-asset:0#large.txt)'
  )
})

test('message asset links encode special characters in the filename fragment', async () => {
  const bytes = new TextEncoder().encode('a,b\n1,2\n')
  const path = `objects/${digest(bytes)}`
  const sample = buildSciencePackage(
    'Link names',
    {
      messages: [
        {
          id: 'm',
          role: 'assistant',
          content: '[点这里看结果](data%20set.csv)',
          createdAt: 1,
          artifactIds: ['f']
        }
      ],
      artifacts: [{ id: 'f', name: 'data set.csv', path: '$DATA/data set.csv', size: bytes.length }]
    },
    { [path]: { bytes, storageKey: 'data set.csv' } }
  )
  const result = await parsePackage(new Blob([sample.bytes as BlobPart]), 'link-names')
  const message = result.session.items[0]
  expect(message.type === 'message' && message.content).toContain(
    '[点这里看结果](science-asset:0#data%20set.csv)'
  )
})

test('keeps SVG as an image for <img> previews while detyping HTML', async () => {
  const svg = new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"/>')
  const html = new TextEncoder().encode('<!doctype html><p>report</p>')
  const sample = buildSciencePackage(
    'Mime sample',
    {},
    {
      [`objects/${digest(svg)}`]: { bytes: svg, storageKey: 'files/plot.svg' },
      [`objects/${digest(html)}`]: { bytes: html, storageKey: 'files/page.html' }
    }
  )
  const result = await parsePackage(new Blob([sample.bytes as BlobPart]), 'mime')
  const blobFor = (storageKey: string) => {
    const asset = result.session.assets[storageKey]
    return result.resources[Number(asset.url.split(':')[1])].blob
  }
  expect(blobFor('files/plot.svg').type).toBe('image/svg+xml')
  // Bun normalizes text/* blob types by appending a charset; browsers keep it bare.
  expect(blobFor('files/page.html').type.split(';')[0]).toBe('text/plain')
})

const PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6ZQAAAABJRU5ErkJggg=='
const JPEG_BASE64 = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3, 4, 0xff, 0xd9]).toString('base64')

const buildRunPackage = (runs: Record<string, unknown>[], runExtra: Record<string, unknown> = {}) =>
  (() => {
    const runBytes = new TextEncoder().encode(JSON.stringify({ ...runExtra, runs }))
    return buildSciencePackage(
      'Figures',
      {
        conversationGraph: {
          activities: [
            { id: 'a1', title: 'Run cell', createdAt: 1, executionInvocationId: 'inv-1' }
          ]
        }
      },
      { [`objects/${digest(runBytes)}`]: { bytes: runBytes, storageKey: 'notebook/run.json' } }
    )
  })()

test('extracts base64 png and jpeg notebook figures as image resources', async () => {
  const sample = buildRunPackage([
    {
      executionInvocationId: 'inv-1',
      status: 'completed',
      outputs: [
        { type: 'execute_result', data: { 'image/png': PNG_BASE64 } },
        { type: 'display_data', data: { 'image/jpeg': JPEG_BASE64 } }
      ]
    }
  ])
  const result = await parsePackage(new Blob([sample.bytes as BlobPart]), 'figures')
  const group = result.session.items.find((item) => item.type === 'activity-group')
  const run = group?.type === 'activity-group' ? group.activities[0].run : undefined
  expect(run?.outputs[0].data?.['image/png']).toBe('science-asset:0')
  expect(run?.outputs[1].data?.['image/jpeg']).toBe('science-asset:1')
  expect(result.resources[0].blob.type).toBe('image/png')
  expect(result.resources[1].blob.type).toBe('image/jpeg')
})

test('degrades non-base64 notebook figure values instead of aborting the parse', async () => {
  // The sanitizer rewrites workspace paths to $DATA/…, which is not base64;
  // atob on it would throw and fail the whole package.
  const sample = buildRunPackage(
    [
      {
        executionInvocationId: 'inv-1',
        outputs: [
          {
            type: 'execute_result',
            data: { 'image/png': '/home/user/data/plot.png', 'text/plain': 'Figure 1' }
          },
          { type: 'execute_result', data: { 'image/png': PNG_BASE64 } }
        ]
      }
    ],
    { dataRoot: '/home/user/data' }
  )
  const result = await parsePackage(new Blob([sample.bytes as BlobPart]), 'sanitized-figure')
  const group = result.session.items.find((item) => item.type === 'activity-group')
  const run = group?.type === 'activity-group' ? group.activities[0].run : undefined
  // No figure resource for the path value; the rest of the output survives.
  expect(run?.outputs[0].data?.['image/png']).toBe('$DATA/plot.png')
  expect(run?.outputs[0].data?.['text/plain']).toBe('Figure 1')
  expect(run?.outputs[1].data?.['image/png']).toBe('science-asset:0')
  expect(result.resources).toHaveLength(1)
})

test('degrades multi-line array image payloads instead of throwing', async () => {
  // nbformat allows image payloads as string[]; a bare replace() on the array
  // would throw TypeError and abort the whole package parse.
  const sample = buildRunPackage([
    {
      executionInvocationId: 'inv-1',
      outputs: [
        { type: 'execute_result', data: { 'image/png': [PNG_BASE64, PNG_BASE64] } },
        { type: 'execute_result', data: { 'image/png': PNG_BASE64 } }
      ]
    }
  ])
  const result = await parsePackage(new Blob([sample.bytes as BlobPart]), 'array-figure')
  const group = result.session.items.find((item) => item.type === 'activity-group')
  const run = group?.type === 'activity-group' ? group.activities[0].run : undefined
  expect(Array.isArray(run?.outputs[0].data?.['image/png'])).toBe(true)
  expect(run?.outputs[1].data?.['image/png']).toBe('science-asset:0')
  expect(result.resources).toHaveLength(1)
})
