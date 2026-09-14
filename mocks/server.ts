import { setupServer } from 'msw/node'
import { interceptionHandlers } from './handlers'

const runtime = globalThis as typeof globalThis & {
  __aipochMswServer?: ReturnType<typeof setupServer>
}

/** Keep one interceptor per Next runtime across development module reloads. */
export const startServerMocking = (origin: string) => {
  if (runtime.__aipochMswServer) {
    runtime.__aipochMswServer.resetHandlers(...interceptionHandlers(origin))
    return runtime.__aipochMswServer
  }
  const server = setupServer(...interceptionHandlers(origin))
  server.listen({ onUnhandledRequest: 'bypass' })
  runtime.__aipochMswServer = server
  return server
}
