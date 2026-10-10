import { headers } from 'next/headers'

// Server-only helper (uses next/headers) — must not be imported by client
// components; shared render types live in lib/use-case-types.ts.

// Fetch a text asset (markdown source for the intro page's report body).
// CDN URLs are used as-is; relative URLs resolve against the incoming
// request's origin (the web server serves the static files, not the API origin).
export const fetchUseCaseAssetText = async (url: string): Promise<string | null> => {
  try {
    let absolute = url
    if (!url.startsWith('http')) {
      const requestHeaders = await headers()
      const proto = requestHeaders.get('x-forwarded-proto') ?? 'http'
      absolute = `${proto}://${requestHeaders.get('host')}${url}`
    }
    // Bound both the request and body read so an optional introduction cannot stall SSR.
    const response = await fetch(absolute, {
      cache: 'no-store',
      signal: AbortSignal.timeout(15_000)
    })
    if (!response.ok) {
      // biome-ignore lint/suspicious/noConsole: Asset failures are intentionally console-only.
      console.error('[use-cases] asset fetch failed', absolute, response.status)
      return null
    }
    // Await inside the try block to catch connection failures after headers arrive.
    return await response.text()
  } catch (error) {
    // biome-ignore lint/suspicious/noConsole: Asset failures are intentionally console-only.
    console.error('[use-cases] asset fetch threw', url, error)
    return null
  }
}
