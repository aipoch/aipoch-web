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
