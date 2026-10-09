import { expect, test } from 'bun:test'
import { renderToReadableStream } from 'react-dom/server'
import { ExtensionPreservingFileName } from '../../app/(commonLayout)/open-science/use-cases/_components/extension-preserving-file-name'
import { getExtensionPreservingFileNameParts } from '../../app/(commonLayout)/open-science/use-cases/_components/extension-preserving-file-name-parts'

const LONG_NAME = 'very_long_experiment_analysis_result_2025.csv'

test('splits a long name into a truncatable head, a kept tail, and the extension', () => {
  expect(getExtensionPreservingFileNameParts(LONG_NAME)).toEqual({
    head: 'very_long_experiment_analysis_result',
    tail: '_2025',
    extension: '.csv',
    isCompactAbbreviation: false
  })
})

test('keeps a short filename complete in the tail', () => {
  const parts = getExtensionPreservingFileNameParts('note.md')
  expect(parts.head).toBe('')
  expect(parts.tail).toBe('note')
  expect(parts.extension).toBe('.md')
  expect(`${parts.head}${parts.tail}${parts.extension}`).toBe('note.md')
})

test('treats names without a dot and dotfiles as extension-less', () => {
  for (const name of ['README', '.env']) {
    const parts = getExtensionPreservingFileNameParts(name, true)
    expect(parts.extension).toBe('')
    expect(parts.isCompactAbbreviation).toBe(false)
    expect(`${parts.head}${parts.tail}`).toBe(name)
  }
})

test('compact mode hard-abbreviates a basename of 24+ code points to 3…1', () => {
  expect(getExtensionPreservingFileNameParts(LONG_NAME, true)).toEqual({
    head: 'ver',
    tail: '5',
    extension: '.csv',
    isCompactAbbreviation: true
  })
  // Below the threshold, compact mode keeps the responsive head/tail split.
  const parts = getExtensionPreservingFileNameParts('short_name.md', true)
  expect(parts.isCompactAbbreviation).toBe(false)
  expect(`${parts.head}${parts.tail}${parts.extension}`).toBe('short_name.md')
})

test('splits by Unicode code point so an emoji ending never breaks', () => {
  const parts = getExtensionPreservingFileNameParts(
    'very_long_experiment_analysis_result_2025_😀.csv',
    true
  )
  expect(parts.isCompactAbbreviation).toBe(true)
  expect(parts.head).toBe('ver')
  expect(parts.tail).toBe('😀')
})

test('splits CJK names by code point as well', () => {
  // 26 code points — past the compact abbreviation threshold.
  const name = '实验数据分析结果汇总表二〇二五年十月版本最终修订稿件.csv'
  const compact = getExtensionPreservingFileNameParts(name, true)
  expect(compact.isCompactAbbreviation).toBe(true)
  expect(compact.head).toBe('实验数')
  expect(compact.tail).toBe('件')
  expect(`${compact.head}${compact.tail}${compact.extension}`).not.toBe(name)
  const full = getExtensionPreservingFileNameParts(name)
  expect(full.tail).toBe('终修订稿件')
  expect(`${full.head}${full.tail}${full.extension}`).toBe(name)
})

test('returns an unusually long extension for the component to cap', () => {
  const parts = getExtensionPreservingFileNameParts('sample.verylongcustomextension')
  expect(parts.extension).toBe('.verylongcustomextension')
  expect(`${parts.head}${parts.tail}${parts.extension}`).toBe('sample.verylongcustomextension')
})

// Component structure via SSR; width-driven compact switching is covered by
// the pure-function cases above (jsdom is not part of this test suite).
const render = async (element: React.JSX.Element) =>
  new Response(await renderToReadableStream(element)).text()

const leafSpan = (html: string, testid: string): string | null =>
  html.match(new RegExp(`<span data-testid="${testid}"[^>]*>([^<]*)</span>`))?.[1] ?? null

test('default mode renders head, tail, and extension spans without a measure span', async () => {
  const html = await render(<ExtensionPreservingFileName name={LONG_NAME} />)
  expect(leafSpan(html, 'file-name-head')).toBe('very_long_experiment_analysis_result')
  expect(leafSpan(html, 'file-name-tail')).toBe('_2025')
  expect(leafSpan(html, 'file-name-extension')).toBe('.csv')
  expect(leafSpan(html, 'file-name-ellipsis')).toBeNull()
  expect(html).not.toContain('pointer-events-none')
})

test('compact mode starts abbreviated and ships a hidden full-name measure span', async () => {
  const html = await render(<ExtensionPreservingFileName name={LONG_NAME} compact />)
  expect(leafSpan(html, 'file-name-head')).toBe('ver')
  expect(leafSpan(html, 'file-name-ellipsis')).toBe('...')
  expect(leafSpan(html, 'file-name-tail')).toBe('5')
  expect(leafSpan(html, 'file-name-extension')).toBe('.csv')
  // The hidden span carries the full name for width measurement.
  expect(html).toContain('pointer-events-none')
  expect(html).toContain(LONG_NAME)
})

test('extension span is capped at half the width for unusually long extensions', async () => {
  const html = await render(<ExtensionPreservingFileName name="sample.verylongcustomextension" />)
  const extensionClass = html.match(/<span data-testid="file-name-extension" class="([^"]*)"/)?.[1]
  expect(extensionClass).toContain('max-w-[50%]')
  expect(extensionClass).toContain('text-ellipsis')
  const headClass = html.match(/<span data-testid="file-name-head" class="([^"]*)"/)?.[1]
  expect(headClass).toContain('truncate')
})
