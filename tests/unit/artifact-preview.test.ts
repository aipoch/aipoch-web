import { expect, test } from 'bun:test'
import {
  formatByteSize,
  getPreviewText,
  isTextPreviewArtifact
} from '../../app/(commonLayout)/open-science/use-cases/_components/artifact-preview'

test('formatByteSize covers B/KB/MB boundaries and unknown sizes', () => {
  expect(formatByteSize(undefined)).toBeUndefined()
  expect(formatByteSize(-1)).toBeUndefined()
  expect(formatByteSize(Number.NaN)).toBeUndefined()
  expect(formatByteSize(0)).toBe('0 B')
  expect(formatByteSize(512)).toBe('512 B')
  expect(formatByteSize(1023)).toBe('1023 B')
  expect(formatByteSize(1024)).toBe('1 KB')
  expect(formatByteSize(1536)).toBe('2 KB')
  expect(formatByteSize(1024 * 1024 - 1)).toBe('1024 KB')
  expect(formatByteSize(1024 * 1024)).toBe('1.0 MB')
  expect(formatByteSize(Math.trunc(2.5 * 1024 * 1024))).toBe('2.5 MB')
  expect(formatByteSize(52_428_800)).toBe('50.0 MB')
})

test('getPreviewText trims lines, drops empty ones, and caps at four', () => {
  expect(getPreviewText('  first  \n\n   \nsecond\nthird\nfourth\nfifth\n')).toBe(
    'first\nsecond\nthird\nfourth'
  )
  expect(getPreviewText('one\r\n\r\n two ')).toBe('one\ntwo')
  expect(getPreviewText('')).toBe('')
  expect(getPreviewText('   \n\n')).toBe('')
  // NUL bytes from binary-ish content are stripped before splitting.
  expect(getPreviewText('a\0b\n\n c')).toBe('ab\nc')
  // Custom cap still applies the same cleanup.
  expect(getPreviewText('1\n\n2\n3', 2)).toBe('1\n2')
})

test('isTextPreviewArtifact matches text kinds and code extensions only', () => {
  for (const [name, mimeType] of [
    ['report.md', 'text/markdown'],
    ['results.json', undefined],
    ['data.csv', 'text/csv'],
    ['analysis.py', undefined],
    ['script.r', undefined],
    ['run.log', undefined],
    ['notes.txt', undefined],
    ['script.ts', undefined]
  ] as const) {
    expect(isTextPreviewArtifact(name, mimeType)).toBe(true)
  }
  for (const [name, mimeType] of [
    ['chart.png', 'image/png'],
    ['diagram.svg', 'image/svg+xml'],
    ['archive.zip', undefined],
    ['paper.pdf', 'application/pdf'],
    ['sheet.xlsx', undefined]
  ] as const) {
    expect(isTextPreviewArtifact(name, mimeType)).toBe(false)
  }
})

test('fetchTextWithLimit flags truncation when a CDN hides Content-Range', async () => {
  const { fetchTextWithLimit } = await import(
    '../../app/(commonLayout)/open-science/use-cases/_components/artifact-preview'
  )
  const originalFetch = globalThis.fetch
  const mockFetch = (impl: () => Promise<Response>) => {
    globalThis.fetch = impl as unknown as typeof fetch
  }
  try {
    // 206 partial body of exactly `limit` bytes, Content-Range filtered out by
    // CORS header exposure — more bytes exist, so it must read as truncated.
    mockFetch(
      async () =>
        new Response(new Uint8Array(16), {
          status: 206,
          headers: { 'Content-Length': '16' }
        })
    )
    const partial = await fetchTextWithLimit('https://cdn.example.test/big.json', 16)
    expect(partial?.truncated).toBe(true)

    // 206 clamped to a smaller file: fewer bytes than requested = complete.
    mockFetch(
      async () =>
        new Response(new Uint8Array(8), {
          status: 206,
          headers: { 'Content-Length': '8' }
        })
    )
    const complete = await fetchTextWithLimit('https://cdn.example.test/small.json', 16)
    expect(complete?.truncated).toBe(false)

    // 200 with the full oversized body (server ignored Range) still truncates.
    mockFetch(async () => new Response(new Uint8Array(32), { status: 200 }))
    const ignored = await fetchTextWithLimit('https://cdn.example.test/big.json', 16)
    expect(ignored?.truncated).toBe(true)

    // 206 with an exposed Content-Range total wins over the byte count.
    mockFetch(
      async () =>
        new Response(new Uint8Array(16), {
          status: 206,
          headers: { 'Content-Range': 'bytes 0-15/16' }
        })
    )
    const exactFit = await fetchTextWithLimit('https://cdn.example.test/exact.json', 16)
    expect(exactFit?.truncated).toBe(false)
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('fetchTextWithLimit surfaces the total size when the server discloses it', async () => {
  const { fetchTextWithLimit, fetchFullText } = await import(
    '../../app/(commonLayout)/open-science/use-cases/_components/artifact-preview'
  )
  const originalFetch = globalThis.fetch
  const mockFetch = (impl: () => Promise<Response>) => {
    globalThis.fetch = impl as unknown as typeof fetch
  }
  try {
    mockFetch(
      async () =>
        new Response(new Uint8Array(16), {
          status: 206,
          headers: { 'Content-Range': 'bytes 0-15/4096' }
        })
    )
    const ranged = await fetchTextWithLimit('https://cdn.example.test/big.txt', 16)
    expect(ranged?.truncated).toBe(true)
    expect(ranged?.total).toBe(4096)

    // fetchFullText takes the whole body without a Range header.
    let sawRange = false
    mockFetch(async (_input?: unknown, init?: { headers?: Record<string, string> }) => {
      sawRange = Boolean((init as { headers?: Record<string, string> })?.headers)
      return new Response(new TextEncoder().encode('full body'), { status: 200 })
    })
    const full = await fetchFullText('https://cdn.example.test/big.txt')
    expect(full).toBe('full body')
    expect(sawRange).toBe(false)
  } finally {
    globalThis.fetch = originalFetch
  }
})
