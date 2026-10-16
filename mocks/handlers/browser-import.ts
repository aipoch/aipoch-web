import { delay, HttpResponse, http } from 'msw'
import { browserImportCapabilities } from '../fixtures'

/** Never contact a real desktop during mock development. The adapter owns scenario selection. */
export const browserImportHandlers = (origin: string) => [
  http.get('http://127.0.0.1:49151/v1/browser-import/capabilities', async ({ request }) => {
    const response = await fetch(`${origin}/__mock/use-case-manifest`, { signal: request.signal })
    const { discoveryMode } = (await response.json()) as { discoveryMode: string }
    if (discoveryMode === 'unavailable') return HttpResponse.error()
    if (discoveryMode === 'timeout') await delay(6000)
    return HttpResponse.json({
      ...browserImportCapabilities,
      version: discoveryMode === 'incompatible' ? 2 : browserImportCapabilities.version
    })
  }),
  // Mock development never launches a receiver; reject accidental transport requests locally.
  http.all(/^http:\/\/127\.0\.0\.1:\d+\/v1\/import(?:[/?]|$)/, () => HttpResponse.error())
]
