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
import { parseExtractedSession, parsePackage } from '../../lib/science-package/parse'
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

test('links user message uploads to bundled blobs through UploadVersion records', async () => {
  const png = new TextEncoder().encode('png-bytes')
  const xlsx = new TextEncoder().encode('xlsx-bytes')
  const sheetMime = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  const sample = buildSciencePackage(
    'Uploads',
    {
      messages: [
        {
          id: 'u1',
          role: 'user',
          content: 'Check these files',
          createdAt: 1,
          uploads: [
            {
              id: 'up1',
              name: 'figure9-check.png',
              originalName: 'figure9-check.png',
              mimeType: 'image/png',
              size: png.length,
              versionId: 'v1'
            },
            {
              id: 'up2',
              name: 'safe-name.xlsx',
              originalName: 'xiao figure1 source.xlsx',
              mimeType: sheetMime,
              size: xlsx.length,
              versionId: 'v2'
            },
            // No matching UploadVersion row: display-only, no url.
            { id: 'up3', name: 'missing.txt', versionId: 'v-absent' }
          ]
        },
        { id: 'a1', role: 'assistant', content: 'Done.', createdAt: 2 }
      ]
    },
    {
      [`objects/${digest(png)}`]: { bytes: png, storageKey: 'uploads/s1/figure9-check.png' },
      [`objects/${digest(xlsx)}`]: { bytes: xlsx, storageKey: 'uploads/s1/safe-name.xlsx' }
    },
    {
      tables: {
        UploadVersion: [
          { id: 'v1', contentStorageKey: 'uploads/s1/figure9-check.png' },
          {
            id: 'v2',
            contentStorageKey: 'uploads/s1/safe-name.xlsx',
            originalFilename: 'xiao figure1 source.xlsx'
          }
        ]
      }
    }
  )
  const result = await parsePackage(new Blob([sample.bytes as BlobPart]), 'uploads')
  const message = result.session.items[0]
  expect(message.type === 'message' && message.uploads).toEqual([
    {
      name: 'figure9-check.png',
      mimeType: 'image/png',
      size: png.length,
      url: 'science-asset:0',
      versionId: 'v1'
    },
    // Display name prefers originalName over the stored safe filename.
    {
      name: 'xiao figure1 source.xlsx',
      mimeType: sheetMime,
      size: xlsx.length,
      url: 'science-asset:1',
      versionId: 'v2'
    },
    {
      name: 'missing.txt',
      mimeType: undefined,
      size: undefined,
      url: undefined,
      versionId: 'v-absent'
    }
  ])
  const assistant = result.session.items[1]
  expect(assistant.type === 'message' && assistant.uploads).toBeUndefined()
})

test('derives upload URLs from session identifiers in extracted mode', async () => {
  // No records.json in extracted mode: the publisher keeps the original
  // package layout, so uploads/proj/sess/file/versions/ver/content resolves.
  const session = {
    title: 'Uploads',
    createdAt: 1,
    projectId: 'proj-1',
    id: 'sess-1',
    messages: [
      {
        id: 'u1',
        role: 'user',
        content: 'Check this file',
        createdAt: 1,
        uploads: [
          {
            id: 'file-1',
            name: 'figure9-check.png',
            originalName: 'figure9 check.png',
            mimeType: 'image/png',
            versionId: 'ver-1'
          },
          // Missing versionId: display-only, no url.
          { id: 'file-2', name: 'no-version.txt' }
        ]
      }
    ]
  }
  const result = parseExtractedSession(session as never, 'uploads', 'https://cdn.example.test/pkg/')
  const message = result.session.items[0]
  expect(message.type === 'message' && message.uploads).toEqual([
    {
      name: 'figure9 check.png',
      mimeType: 'image/png',
      size: undefined,
      url: 'https://cdn.example.test/pkg/uploads/proj-1/sess-1/file-1/versions/ver-1/content#figure9%20check.png',
      versionId: 'ver-1'
    },
    {
      name: 'no-version.txt',
      mimeType: undefined,
      size: undefined,
      url: undefined,
      versionId: undefined
    }
  ])
})

test('plan tools leave the groups: updates drop, generate_plan stands alone', async () => {
  // App parity (workspace-conversation-items.ts): update_step_status activities
  // never reach the transcript; generate_plan is a standalone plan card item.
  const act = (id: string, providerToolName: string, createdAt: number) => ({
    id,
    title: providerToolName,
    providerToolName,
    createdAt
  })
  const sample = buildSciencePackage('Plan grouping', {
    conversationGraph: {
      activities: [
        act('n1', 'mcp__open-science-notebook__notebook_execute', 1),
        act('n2', 'mcp__open-science-notebook__notebook_execute', 2),
        act('p1', 'mcp.open-science-plan.generate_plan', 3),
        act('p2', 'mcp.open-science-plan.update_step_status', 4),
        act('n3', 'mcp__acme__mystery_tool', 5),
        act('p3', 'mcp__open-science-plan__update_step_status', 6)
      ]
    }
  })
  const result = await parsePackage(new Blob([sample.bytes as BlobPart]), 'plan-grouping')
  const timeline = result.session.items
    .filter((item) => item.type !== 'message')
    .map((item) =>
      item.type === 'activity-group'
        ? { type: 'group', ids: item.activities.map((activity) => activity.id) }
        : item.type === 'plan'
          ? { type: 'plan', ids: [item.activity.id] }
          : { type: item.type, ids: [] }
    )
  // Step updates vanish; the plan card splits the surrounding groups, which
  // fold across the dropped updates exactly like the app's transcript.
  expect(timeline).toEqual([
    { type: 'group', ids: ['n1', 'n2'] },
    { type: 'plan', ids: ['p1'] },
    { type: 'group', ids: ['n3'] }
  ])
})

test('a session without plan tools groups exactly as before', async () => {
  const act = (id: string, providerToolName: string, createdAt: number) => ({
    id,
    title: providerToolName,
    providerToolName,
    createdAt
  })
  const sample = buildSciencePackage('No plan grouping', {
    conversationGraph: {
      activities: [
        act('a', 'mcp__open-science-notebook__notebook_execute', 1),
        act('b', 'mcp__acme__mystery_tool', 2),
        act('c', 'Read', 3)
      ]
    }
  })
  const result = await parsePackage(new Blob([sample.bytes as BlobPart]), 'no-plan-grouping')
  const groups = result.session.items.filter((item) => item.type === 'activity-group')
  expect(groups).toHaveLength(1)
  expect(groups[0].type === 'activity-group' && groups[0].activities.map((a) => a.id)).toEqual([
    'a',
    'b',
    'c'
  ])
})

test('essentialTruncated survives package parsing', async () => {
  const sample = buildSciencePackage('Truncated', {
    conversationGraph: {
      activities: [
        { id: 't1', title: 'Big output', createdAt: 1, essentialTruncated: true },
        { id: 't2', title: 'Small output', createdAt: 2 }
      ]
    }
  })
  const result = await parsePackage(new Blob([sample.bytes as BlobPart]), 'truncated')
  const group = result.session.items.find((item) => item.type === 'activity-group')
  expect(group?.type === 'activity-group' && group.activities[0].essentialTruncated).toBe(true)
  expect(group?.type === 'activity-group' && group.activities[1].essentialTruncated).toBeUndefined()
})

test('activities with sequence sortIndex still interleave with messages by time', async () => {
  // Some exports carry small sequence sortIndex values (107, 108, …) while
  // messages use epoch ms — trusting sortIndex would hoist every activity to
  // the top of the transcript.
  const sample = buildSciencePackage('Sequence sortIndex', {
    messages: [
      { id: 'u1', role: 'user', content: 'q', createdAt: 1000 },
      { id: 'a1', role: 'assistant', content: 'mid', createdAt: 3000 },
      { id: 'a2', role: 'assistant', content: 'end', createdAt: 5000 }
    ],
    conversationGraph: {
      activities: [
        { id: 't1', title: 'Read', providerToolName: 'Read', sortIndex: 107, createdAt: 2000 },
        { id: 't2', title: 'Read', providerToolName: 'Read', sortIndex: 108, createdAt: 4000 }
      ]
    }
  })
  const result = await parsePackage(new Blob([sample.bytes as BlobPart]), 'sortindex')
  const timeline = result.session.items.map((item) =>
    item.type === 'message'
      ? `msg:${item.id}`
      : item.type === 'activity-group'
        ? `group:${item.activities.map((activity) => activity.id).join('+')}`
        : item.type
  )
  expect(timeline).toEqual(['msg:u1', 'group:t1', 'msg:a1', 'group:t2', 'msg:a2'])
})

test('pdf annotations normalize into quote and area cards with resolvable urls', () => {
  const session = {
    title: 'Annotations',
    createdAt: 1,
    projectId: 'proj-1',
    id: 'sess-1',
    messages: [
      {
        id: 'u1',
        role: 'user',
        content: '',
        createdAt: 1,
        uploads: [
          { id: 'file-1', name: 'paper.pdf', mimeType: 'application/pdf', versionId: 'ver-1' }
        ],
        annotations: [
          {
            id: 'an1',
            kind: 'pdf',
            note: '解释这段内容。',
            source: { versionId: 'ver-1', name: 'paper.pdf' },
            selector: { kind: 'text', pageNumber: 6, exact: 'quoted sentence' }
          },
          {
            id: 'an2',
            kind: 'pdf',
            source: { versionId: 'ver-1', name: 'paper.pdf' },
            selector: {
              kind: 'region',
              pageNumber: 23,
              text: 'chart labels',
              image: { mimeType: 'image/png', data: 'QUJD' }
            }
          },
          // Non-pdf and malformed annotations are ignored.
          { id: 'an3', kind: 'image', selector: {}, source: {} },
          { id: 'an4', kind: 'pdf' }
        ]
      }
    ]
  }
  const result = parseExtractedSession(session as never, 'ann', 'https://cdn.example.test/pkg/')
  const message = result.session.items[0]
  expect(message.type === 'message' && message.annotations).toEqual([
    {
      id: 'an1',
      kind: 'quote',
      source: 'paper.pdf · Page 6',
      content: 'quoted sentence',
      note: '解释这段内容。',
      url: 'https://cdn.example.test/pkg/uploads/proj-1/sess-1/file-1/versions/ver-1/content#paper.pdf'
    },
    {
      id: 'an2',
      kind: 'area',
      source: 'paper.pdf · Page 23',
      content: 'chart labels',
      image: { mimeType: 'image/png', data: 'QUJD' },
      note: undefined,
      url: 'https://cdn.example.test/pkg/uploads/proj-1/sess-1/file-1/versions/ver-1/content#paper.pdf'
    }
  ])
})

test('@-mentioned upload parts become previewable upload chips', () => {
  const session = {
    title: 'Mentions',
    createdAt: 1,
    projectId: 'proj-1',
    id: 'sess-1',
    messages: [
      {
        id: 'u1',
        role: 'user',
        content: '@a.md@b.md compare these',
        createdAt: 1,
        parts: [
          {
            type: 'artifact',
            source: 'upload',
            name: 'a.md',
            mimeType: 'text/markdown',
            path: 'upload-version:proj-1/sess-1/file-a/ver-a',
            versionId: 'ver-a'
          },
          {
            type: 'artifact',
            source: 'upload',
            name: 'b.md',
            path: 'upload-version:proj-1/sess-1/file-b/ver-b',
            versionId: 'ver-b'
          },
          { type: 'text', text: 'compare these' }
        ]
      }
    ]
  }
  const result = parseExtractedSession(
    session as never,
    'mentions',
    'https://cdn.example.test/pkg/'
  )
  const message = result.session.items[0]
  expect(message.type === 'message' && message.uploads).toEqual([
    {
      name: 'a.md',
      mimeType: 'text/markdown',
      url: 'https://cdn.example.test/pkg/uploads/proj-1/sess-1/file-a/versions/ver-a/content#a.md',
      mention: true,
      partName: 'a.md'
    },
    {
      name: 'b.md',
      mimeType: undefined,
      url: 'https://cdn.example.test/pkg/uploads/proj-1/sess-1/file-b/versions/ver-b/content#b.md',
      mention: true,
      partName: 'b.md'
    }
  ])
})

test('text quotes, image points, and budget-dropped area images survive parsing', () => {
  const session = {
    title: 'More annotations',
    createdAt: 1,
    projectId: 'proj-1',
    id: 'sess-1',
    messages: [
      {
        id: 'u1',
        role: 'user',
        content: '',
        createdAt: 1,
        uploads: [{ id: 'file-1', name: 'photo.png', mimeType: 'image/png', versionId: 'ver-1' }],
        annotations: [
          {
            id: 'an1',
            kind: 'text',
            quote: 'quoted conversation text',
            note: 'why this?',
            source: { kind: 'agent-message', sessionId: 'sess-1', messageId: 'm0' }
          },
          {
            id: 'an2',
            kind: 'text',
            quote: 'quoted file text',
            source: {
              kind: 'project-file',
              projectId: 'proj-1',
              path: 'src/main.ts',
              name: 'main.ts'
            }
          },
          {
            id: 'an3',
            kind: 'image-point',
            note: 'what is here',
            source: { kind: 'upload-version', versionId: 'ver-1', name: 'photo.png' },
            point: { x: 0.42, y: 0.18 },
            naturalSize: { width: 800, height: 600 }
          },
          {
            id: 'an4',
            kind: 'pdf',
            source: { versionId: 'ver-1', name: 'paper.pdf' },
            selector: {
              kind: 'region',
              pageNumber: 4,
              text: 'budget area text',
              imageOmissionReason: 'session-budget'
            }
          }
        ]
      }
    ]
  }
  const result = parseExtractedSession(session as never, 'ann2', 'https://cdn.example.test/pkg/')
  const message = result.session.items[0]
  expect(message.type === 'message' && message.annotations).toEqual([
    {
      id: 'an1',
      kind: 'text',
      content: 'quoted conversation text',
      source: undefined,
      note: 'why this?',
      url: undefined
    },
    {
      id: 'an2',
      kind: 'text',
      content: 'quoted file text',
      source: 'main.ts',
      note: undefined,
      url: undefined
    },
    {
      id: 'an3',
      kind: 'image-point',
      number: 1,
      x: 0.42,
      y: 0.18,
      naturalSize: { width: 800, height: 600 },
      source: 'photo.png',
      note: 'what is here',
      url: 'https://cdn.example.test/pkg/uploads/proj-1/sess-1/file-1/versions/ver-1/content#photo.png'
    },
    {
      id: 'an4',
      kind: 'area',
      source: 'paper.pdf · Page 4',
      content: 'budget area text',
      image: undefined,
      imageOmitted: true,
      note: undefined,
      url: 'https://cdn.example.test/pkg/uploads/proj-1/sess-1/file-1/versions/ver-1/content#photo.png'
    }
  ])
})

test('upload-version refs join by versionId in any form, and uploads+parts dedupe', () => {
  const session = {
    title: 'Ref forms',
    createdAt: 1,
    projectId: 'proj-1',
    id: 'sess-1',
    messages: [
      {
        id: 'u1',
        role: 'user',
        content: '',
        createdAt: 1,
        uploads: [
          { id: 'file-1', name: 'shared.md', versionId: 'ver-shared' },
          { id: 'file-2', name: 'by-id.md', versionId: 'ver-b' }
        ],
        parts: [
          // Same file in uploads and parts: upgraded to inline mention, no duplicate.
          {
            type: 'artifact',
            source: 'upload',
            name: 'shared.md',
            path: 'upload-version:proj-1/sess-1/file-1/ver-shared',
            versionId: 'ver-shared'
          },
          // 1-segment ref: joins by versionId alone.
          {
            type: 'artifact',
            source: 'upload',
            name: 'by-id.md',
            path: 'upload-version:ver-b',
            versionId: 'ver-b'
          },
          // 3-segment ref without fileId: also joins by versionId.
          {
            type: 'artifact',
            source: 'upload',
            name: 'by-id-too.md',
            path: 'upload-version:proj-1/sess-1/ver-b',
            versionId: 'ver-b'
          }
        ]
      }
    ]
  }
  const result = parseExtractedSession(session as never, 'refs', 'https://cdn.example.test/pkg/')
  const message = result.session.items[0]
  if (message.type !== 'message') throw new Error('expected a message')
  // shared.md was upgraded to a mention in place; the two ver-b parts dedupe to
  // one mention upload each by versionId.
  const shared = message.uploads?.filter((upload) => upload.name === 'shared.md')
  expect(shared).toHaveLength(1)
  expect(shared?.[0]).toMatchObject({ mention: true, partName: 'shared.md' })
  const byId = message.uploads?.filter((upload) => upload.name === 'by-id.md')
  expect(byId).toHaveLength(1)
  expect(byId?.[0]).toMatchObject({ mention: true, versionId: 'ver-b' })
  expect(byId?.[0].url).toContain('uploads/proj-1/sess-1/file-2/versions/ver-b/content')
  // The second ver-b part was folded into the same upload.
  expect(message.uploads?.filter((upload) => upload.name === 'by-id-too.md')).toHaveLength(0)
})

test('annotations without an id are dropped like the app sanitizer', () => {
  const session = {
    title: 'Idless',
    createdAt: 1,
    projectId: 'p1',
    id: 's1',
    messages: [
      {
        id: 'u1',
        role: 'user',
        content: 'hi',
        createdAt: 1,
        annotations: [
          { kind: 'text', quote: 'no id here', source: {} },
          { id: '', kind: 'text', quote: 'empty id', source: {} },
          { id: 'kept', kind: 'text', quote: 'has an id', source: {} },
          {
            id: 'area-no-text',
            kind: 'pdf',
            source: { name: 'paper.pdf' },
            selector: { kind: 'region', pageNumber: 2 }
          }
        ]
      }
    ]
  }
  const result = parseExtractedSession(session as never, 'idless', 'https://cdn.example.test/pkg/')
  const message = result.session.items[0]
  if (message.type !== 'message') throw new Error('expected a message')
  expect(message.annotations).toEqual([
    {
      id: 'kept',
      kind: 'text',
      content: 'has an id',
      source: undefined,
      note: undefined,
      url: undefined
    },
    {
      id: 'area-no-text',
      kind: 'area',
      source: 'paper.pdf · Page 2',
      content: 'Selected area',
      image: undefined,
      note: undefined,
      url: undefined
    }
  ])
})
