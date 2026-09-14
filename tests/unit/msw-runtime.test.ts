import { afterEach, expect, test } from 'bun:test'
import { createServer } from 'node:net'
import { setupServer } from 'msw/node'
import { interceptionHandlers } from '../../mocks/handlers'
import { startStateAdapter } from '../../mocks/http-adapter'

let stopAdapter: (() => void) | undefined
let server: ReturnType<typeof setupServer> | undefined
afterEach(() => {
  server?.close()
  stopAdapter?.()
})

// Exercise the transport boundary: read-only requests must be intercepted, state must be shared.
test('server interception and the HTTP adapter share committed claim state', async () => {
  const probe = createServer()
  await new Promise<void>((resolve) => probe.listen(0, '127.0.0.1', resolve))
  const address = probe.address()
  if (!address || typeof address === 'string') throw new Error('No test port')
  await new Promise<void>((resolve) => probe.close(() => resolve()))
  const adapter = await startStateAdapter(address.port)
  stopAdapter = adapter.stop
  const claim = `${adapter.origin}/api/v1/agent/claim?token=demo-claim`
  const nativeFetch = globalThis.fetch
  expect((await nativeFetch(`${adapter.origin}/api/v1/skills`)).status).toBe(404)
  server = setupServer(...interceptionHandlers(adapter.origin))
  server.listen({ onUnhandledRequest: 'error' })
  expect((await (await fetch(`${adapter.origin}/api/v1/skills`)).json()).data.total).toBe(30)
  expect((await (await fetch(claim)).json()).data.agent.is_claimed).toBe(false)
  const result = await nativeFetch(`${adapter.origin}/api/v1/agent/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      claim_token: 'demo-claim',
      verification_code: 'MOCK-1234',
      tweet_url: 'https://x.com/demo/status/123'
    })
  })
  expect(result.status).toBe(200)
  expect((await (await fetch(claim)).json()).data.agent.is_claimed).toBe(true)
  // Recreating the interceptor must not reset the HTTP owner's state.
  server.close()
  server = setupServer(...interceptionHandlers(adapter.origin))
  server.listen({ onUnhandledRequest: 'error' })
  expect((await (await fetch(claim)).json()).data.agent.is_claimed).toBe(true)
  server.close()
  const preflight = await fetch(`${adapter.origin}/api/v1/members`, {
    method: 'OPTIONS',
    headers: { Origin: 'http://127.0.0.1:3202' }
  })
  expect(preflight.status).toBe(204)
  expect(preflight.headers.get('Access-Control-Allow-Origin')).toBe('http://127.0.0.1:3202')
  expect((await fetch(claim, { headers: { Origin: 'https://example.com' } })).status).toBe(403)
})
