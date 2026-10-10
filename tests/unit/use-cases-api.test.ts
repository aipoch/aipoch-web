import { expect, test } from 'bun:test'
import { getResponse } from 'msw'
import { parsePackage } from '../../lib/science-package/parse'
import { digest } from '../../mocks/fixtures/science-package'
import { adapterHandlers } from '../../mocks/handlers/adapter'

const origin = 'http://127.0.0.1:3203'
const handlers = adapterHandlers(origin)
const handle = async (path: string) =>
  (await getResponse(handlers, new Request(`${origin}${path}`))) ??
  new Response(null, { status: 404 })

test('every manifest sample downloads a real package with matching size and SHA-256', async () => {
  const manifest = await (await handle('/use-case-manifest/manifest.json')).json()
  for (const item of manifest) {
    const response = await handle(
      `/use-case-manifest/${item.name}/${encodeURIComponent(item.case.file_name)}`
    )
    const bytes = new Uint8Array(await response.arrayBuffer())
    expect(response.status).toBe(200)
    expect(bytes.length).toBe(item.case.bytes)
    expect(digest(bytes)).toBe(item.case.sha256)
    const parsed = await parsePackage(new Blob([bytes]), item.name)
    expect(parsed.session.title).toBe(item.title)
  }
})

test('obsolete transcript APIs and missing packages are not mocked as successful', async () => {
  for (const path of [
    '/api/v1/open-science/use-cases',
    '/api/v1/open-science/use-cases/sample/transcript',
    '/api/v1/open-science/use-cases/sample/transcript/full',
    '/use-case-manifest/missing.science'
  ]) {
    expect((await handle(path)).status).toBe(404)
  }
})
