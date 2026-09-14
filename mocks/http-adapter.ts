import { createServer as createHttpServer } from 'node:http'
import { createServer } from '@mswjs/http-middleware'
import { adapterHandlers } from './handlers'

/** A single state owner; all business routing is provided by MSW's HTTP adapter. */
export const startStateAdapter = async (port: number) => {
  const origin = `http://127.0.0.1:${port}`
  const app = createServer(...adapterHandlers(origin))
  const server = createHttpServer((request, response) => {
    const browserOrigin = request.headers.origin
    if (browserOrigin) {
      let local = false
      try {
        const url = new URL(browserOrigin)
        local =
          url.protocol === 'http:' && ['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname)
      } catch {
        /* Invalid origins are rejected. */
      }
      if (!local) {
        response.writeHead(403)
        response.end()
        return
      }
      response.setHeader('Access-Control-Allow-Origin', browserOrigin)
      response.setHeader('Vary', 'Origin')
    }
    response.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    response.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept')
    response.setHeader('Cache-Control', 'no-store')
    if (request.method === 'OPTIONS') {
      response.writeHead(204)
      response.end()
      return
    }
    app(request, response)
  })
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject)
    server.listen(port, '127.0.0.1', resolve)
  })
  return {
    origin,
    stop: () => {
      server.close()
      server.closeAllConnections()
    }
  }
}
