import { setupWorker } from 'msw/browser'
import { interceptionHandlers } from './handlers'

const runtime = globalThis as typeof globalThis & {
  __aipochMswReady?: Promise<void>
  __aipochMswWorker?: ReturnType<typeof setupWorker>
}

const origin = new URL(process.env.NEXT_PUBLIC_API_URL ?? '').origin
// Refresh existing handlers only when this module reloads, not before every API request.
runtime.__aipochMswWorker?.resetHandlers(...interceptionHandlers(origin))

/** Requests await this promise; SSR HTML is never hidden behind a mock-loading screen. */
export const startBrowserMocking = (): Promise<void> => {
  if (!runtime.__aipochMswReady) {
    const worker = setupWorker(...interceptionHandlers(origin))
    runtime.__aipochMswWorker = worker
    runtime.__aipochMswReady = worker
      .start({ onUnhandledRequest: 'bypass', quiet: true })
      .then(() => undefined)
  }
  return runtime.__aipochMswReady
}
