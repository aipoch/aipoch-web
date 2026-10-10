import { afterEach, expect, mock, test } from 'bun:test'
import { renderToReadableStream } from 'react-dom/server'

const info = {
  url: 'https://github.com/org/repo/releases/download/v1/case.science',
  filename: 'case.science',
  sizeBytes: 321,
  sha256: 'a'.repeat(64)
}
const fetchDetail = mock(
  async (_slug: string): Promise<{ package: typeof info } | null> => ({ package: info })
)
const renderReplay = mock((_props: unknown) => <div>Client replay</div>)
mock.module('@/service/open-science-use-cases.server', () => ({ fetchUseCaseDetail: fetchDetail }))
mock.module('../../app/(commonLayout)/open-science/use-cases/_components/replay-view', () => ({
  ReplayView: renderReplay,
  ReplayLoading: () => <div>Fetching package information…</div>
}))
const { default: Page } = await import(
  '../../app/(commonLayout)/open-science/use-cases/[id]/replay/page'
)
const originalFetch = globalThis.fetch
afterEach(() => {
  fetchDetail.mockReset().mockResolvedValue({ package: info })
  renderReplay.mockClear()
  globalThis.fetch = originalFetch
})
const render = async () =>
  new Response(
    await renderToReadableStream(await Page({ params: Promise.resolve({ id: 'example' }) }))
  ).text()
test('passes cached package metadata directly to the client without downloading the archive', async () => {
  globalThis.fetch = mock(() => {
    throw new Error('Server must not download packages')
  }) as unknown as typeof fetch
  await render()
  expect(renderReplay.mock.calls[0][0]).toMatchObject({ slug: 'example', packageInfo: info })
  expect(fetchDetail).toHaveBeenCalledWith('example')
  expect(globalThis.fetch).not.toHaveBeenCalled()
})
test('passes distinct missing and unavailable errors to the retry UI', async () => {
  fetchDetail.mockResolvedValueOnce(null)
  await render()
  expect(renderReplay.mock.calls[0][0]).toMatchObject({
    packageInfo: null,
    error: 'Research package not found.'
  })
  renderReplay.mockClear()
  fetchDetail.mockRejectedValueOnce(new Error('Manifest offline'))
  await render()
  expect(renderReplay.mock.calls[0][0]).toMatchObject({
    packageInfo: null,
    error: 'Package information is temporarily unavailable.'
  })
})
test('streams the package-information loading state while the manifest is pending', async () => {
  let resolveDetail: (value: { package: typeof info }) => void = () => {}
  fetchDetail.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        resolveDetail = resolve
      })
  )
  const stream = await renderToReadableStream(
    <html lang="en">
      <body>{await Page({ params: Promise.resolve({ id: 'example' }) })}</body>
    </html>
  )
  const reader = stream.getReader()
  try {
    const shell = await reader.read()
    expect(new TextDecoder().decode(shell.value)).toContain('Fetching package information…')
    expect(renderReplay).not.toHaveBeenCalled()
  } finally {
    resolveDetail({ package: info })
    while (!(await reader.read()).done) {}
    reader.releaseLock()
  }
  expect(renderReplay.mock.calls[0][0]).toMatchObject({ packageInfo: info })
})
