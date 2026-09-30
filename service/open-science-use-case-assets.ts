import { headers } from 'next/headers'

// Server-only helper (uses next/headers) — must not be imported by client
// components; the shared API contract lives in open-science-use-cases.ts.

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
    const response = await fetch(absolute, { cache: 'no-store' })
    if (!response.ok) console.error('[use-cases] asset fetch failed', absolute, response.status)
    return response.ok ? response.text() : null
  } catch (error) {
    console.error('[use-cases] asset fetch threw', url, error)
    return null
  }
}
