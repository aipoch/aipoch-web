import { expect, test } from 'bun:test'
import {
  canOpenInNewTab,
  previewKindFor
} from '../../app/(commonLayout)/open-science/use-cases/_components/file-preview'
import { resolveAssetLinkTarget } from '../../app/(commonLayout)/open-science/use-cases/_components/session-markdown-streamdown'

test('previewKindFor classifies files by extension and MIME', () => {
  expect(previewKindFor('plot.svg')).toBe('image')
  expect(previewKindFor('data.csv')).toBe('csv')
  expect(previewKindFor('notes.md')).toBe('markdown')
  expect(previewKindFor('archive.zip')).toBeNull()
  expect(previewKindFor('点这里看结果')).toBeNull()
})

test('SVG blobs render inline but never open as a top-level document', () => {
  expect(canOpenInNewTab({ name: 'plot.svg', url: 'blob:x' })).toBe(false)
  expect(canOpenInNewTab({ name: 'plot', url: 'blob:x', mimeType: 'image/svg+xml' })).toBe(false)
  expect(canOpenInNewTab({ name: 'plot.png', url: 'blob:x' })).toBe(true)
  expect(canOpenInNewTab({ name: 'report.pdf', url: 'blob:x' })).toBe(true)
})

test('markdown asset links recover the real filename from the URL fragment', () => {
  // Labels like "点这里看结果" have no extension; the parser appends the real
  // name as `#<filename>`, and the fragment must be stripped before fetching.
  expect(
    resolveAssetLinkTarget('blob:https://site.test/uuid#data%20set.csv', '点这里看结果')
  ).toEqual({
    name: 'data set.csv',
    url: 'blob:https://site.test/uuid'
  })
  expect(resolveAssetLinkTarget('blob:https://site.test/uuid#figure-01.png', 'Figure')).toEqual({
    name: 'figure-01.png',
    url: 'blob:https://site.test/uuid'
  })
})

test('markdown asset links fall back to the URL name, then to nothing', () => {
  // Locally imported packages link /use-cases/… paths whose basename is real.
  expect(
    resolveAssetLinkTarget('/use-cases/case/objects/coverage_report.md', 'See the results')
  ).toEqual({ name: 'coverage_report.md', url: '/use-cases/case/objects/coverage_report.md' })
  // A label without an extension and a blob URL without a fragment cannot be
  // previewed: return null so the click keeps the browser default behavior.
  expect(resolveAssetLinkTarget('blob:https://site.test/uuid', '点这里看结果')).toBeNull()
  expect(resolveAssetLinkTarget('blob:https://site.test/uuid#archive.zip', '下载')).toBeNull()
})
