import { describe, expect, test } from 'bun:test'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { getResponse } from 'msw'
import { createHandlers } from '../../mocks/handlers'

// These contract tests exercise the MSW handlers against the generated tier
// files. public/use-cases/ is gitignored, so on a fresh checkout (CI) there
// is nothing to serve — skip there instead of failing on the missing data.
const hasGeneratedData = existsSync(join(process.cwd(), 'public', 'use-cases', 'index.json'))
const testWithData = test.skipIf(!hasGeneratedData)

const handle = async (path: string) => {
  const handlers = createHandlers('http://127.0.0.1:3203')
  return (
    (await getResponse(handlers, new Request(`http://127.0.0.1:3203${path}`))) ??
    new Response(null, { status: 404 })
  )
}

describe('open-science use-case mock contracts', () => {
  testWithData('serves the index plus essential and full transcript tiers', async () => {
    const listResponse = await handle('/api/v1/open-science/use-cases')
    expect(listResponse.status).toBe(200)
    const listBody = await listResponse.json()
    expect(listBody.code).toBe(20000)
    expect(Array.isArray(listBody.data)).toBe(true)
    expect(listBody.data.length).toBeGreaterThan(0)

    const slug = listBody.data[0].slug
    const detailResponse = await handle(`/api/v1/open-science/use-cases/${slug}`)
    expect(detailResponse.status).toBe(200)
    const detail = await detailResponse.json()
    expect(detail.data.slug).toBe(slug)
    expect(typeof detail.data.title).toBe('string')
    expect(typeof detail.data.figureCount).toBe('number')

    const essentialResponse = await handle(`/api/v1/open-science/use-cases/${slug}/transcript`)
    expect(essentialResponse.status).toBe(200)
    const essential = await essentialResponse.json()
    expect(essential.data.slug).toBe(slug)
    expect(essential.data.schemaVersion).toBe(1)

    const fullResponse = await handle(`/api/v1/open-science/use-cases/${slug}/transcript/full`)
    expect(fullResponse.status).toBe(200)
    const full = await fullResponse.json()
    expect(full.data.slug).toBe(slug)
    // The full tier carries at least as many assets as the essential tier.
    expect(Object.keys(full.data.assets).length).toBeGreaterThanOrEqual(
      Object.keys(essential.data.assets).length
    )
  })

  testWithData('returns the 404 envelope for unknown slugs', async () => {
    const response = await handle('/api/v1/open-science/use-cases/no-such-case/transcript')
    expect(response.status).toBe(404)
    const body = await response.json()
    expect(body.data).toBeNull()

    const detailResponse = await handle('/api/v1/open-science/use-cases/no-such-case')
    expect(detailResponse.status).toBe(404)
    const detailBody = await detailResponse.json()
    expect(detailBody.data).toBeNull()
  })
})
