import { afterEach, expect, mock, spyOn, test } from 'bun:test'
import { renderToReadableStream } from 'react-dom/server'

const detail = {
  slug: 'sample-case',
  title: 'Sample case',
  introductionUrl: 'https://cdn.example.test/intro.md',
  package: {
    url: 'https://cdn.example.test/sample.science',
    filename: 'sample.science',
    sizeBytes: 1,
    sha256: ''
  }
}
const fetchDetail = mock(async () => detail)
mock.module('@/service/open-science-use-cases.server', () => ({
  fetchUseCaseDetail: fetchDetail,
  fetchUseCaseList: async () => [detail]
}))
const originalFetch = globalThis.fetch
afterEach(() => {
  fetchDetail.mockReset().mockResolvedValue(detail)
  globalThis.fetch = originalFetch
  mock.restore()
})

const renderIntroduction = async () => {
  const { default: Page } = await import(
    '../../app/(commonLayout)/open-science/use-cases/[id]/page'
  )
  const tree = await Page({ params: Promise.resolve({ id: 'sample-case' }) })
  return new Response(await renderToReadableStream(tree)).text()
}

test('renders introductions through the shared Markdown typography and GFM renderer', async () => {
  globalThis.fetch = mock(
    async () =>
      new Response(
        '# Findings\n\n- First result\n\n| Metric | Value |\n| --- | --- |\n| Count | 2 |\n\nLiteral {1 + 1}.'
      )
  ) as unknown as typeof fetch
  const html = await renderIntroduction()
  expect(html).toContain('class="markdown-body"')
  expect(html).toContain('<h1 id="heading-findings">Findings</h1>')
  expect(html).toContain('<li>First result</li>')
  expect(html).toContain('<td>2</td>')
  expect(html).toContain('Literal {1 + 1}.')
  expect(html.match(/>Download research package<\/a>/g)).toHaveLength(2)
  expect(html.match(/>View the research session<\/a>/g)).toHaveLength(2)
  const articleDownload = html.lastIndexOf('Download research package')
  expect(articleDownload).toBeGreaterThan(html.indexOf('Literal {1 + 1}.'))
  expect(articleDownload).toBeLessThan(html.indexOf('How this research was produced'))
})

test('keeps the case and download available when the optional introduction body fails', async () => {
  spyOn(console, 'error').mockImplementation(() => {})
  globalThis.fetch = mock(
    async () =>
      new Response(
        new ReadableStream({
          start: (controller) => controller.error(new Error('Body interrupted'))
        })
      )
  ) as unknown as typeof fetch
  const html = await renderIntroduction()
  expect(html).toContain('Sample case')
  expect(html).toContain('Download research package')
  expect(html).toContain('View the research session')
  expect(html).toContain('href="/open-science/use-cases/sample-case/replay"')
  expect(html).not.toContain('What this research found')
  expect(html.match(/>Download research package<\/a>/g)).toHaveLength(2)
})

test('describes every detail and replay page as an inspectable session', async () => {
  const { generateMetadata: detailMetadata } = await import(
    '../../app/(commonLayout)/open-science/use-cases/[id]/page'
  )
  const { generateMetadata: replayMetadata } = await import(
    '../../app/(commonLayout)/open-science/use-cases/[id]/replay/page'
  )
  const params = Promise.resolve({ id: 'sample-case' })
  globalThis.fetch = mock(
    async () => new Response(null, { status: 404 })
  ) as unknown as typeof fetch
  expect((await detailMetadata({ params })).description).toBe(
    'Read-only replay of the Open-Science session "Sample case".'
  )
  const replay = await replayMetadata({ params })
  expect(replay.title).toBe('Replay: Sample case | Open-Science Use Cases')
  expect(replay.alternates?.canonical?.toString()).toEndWith(
    '/open-science/use-cases/sample-case/replay'
  )
  // Metadata comes from the catalog without downloading the session package.
  expect(globalThis.fetch).not.toHaveBeenCalled()
})

test('a cold manifest failure in metadata does not block the independent replay client', async () => {
  fetchDetail.mockRejectedValueOnce(new Error('Manifest unavailable'))
  const { generateMetadata } = await import(
    '../../app/(commonLayout)/open-science/use-cases/[id]/replay/page'
  )
  await expect(
    generateMetadata({ params: Promise.resolve({ id: 'sample-case' }) })
  ).resolves.toEqual({})
})
