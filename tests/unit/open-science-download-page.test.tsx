import { afterEach, describe, expect, mock, test } from 'bun:test'
import { renderToStaticMarkup } from 'react-dom/server'
import type { DownloadManifest } from '../../app/(commonLayout)/open-science/open-science-download-data'

let manifestShouldFail = false
let requestUserAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
let manifestReleaseDate: string | undefined = '2026-09-07T01:13:01Z'
const defaultManifestDownloads: DownloadManifest['downloads'] = {
  'mac-arm64': {
    url: 'https://cdn.example.com/aipoch-open-science-1.2.3-mac-arm64.dmg',
    size: 240_543_211
  },
  'mac-x64': {
    url: 'https://cdn.example.com/aipoch-open-science-1.2.3-mac-x64.dmg',
    size: 252_182_528
  },
  'win-x64': {
    url: 'https://cdn.example.com/aipoch-open-science-1.2.3-win-x64-setup.exe',
    size: 245_891_072
  },
  'linux-x64-appimage': {
    url: 'https://cdn.example.com/aipoch-open-science-1.2.3-x86_64.AppImage',
    size: 198_200_321
  },
  'linux-x64-deb': {
    url: 'https://cdn.example.com/aipoch-open-science_1.2.3_amd64.deb',
    size: 192_099_123
  }
}
let manifestDownloads = defaultManifestDownloads

mock.module('next/headers', () => ({
  headers: async () => new Headers({ 'user-agent': requestUserAgent })
}))

mock.module('@/service/open-science-download', () => ({
  fetchOpenScienceDownloadManifest: async () => {
    if (manifestShouldFail) throw new Error('manifest unavailable')
    return {
      version: '1.2.3',
      releaseDate: manifestReleaseDate,
      downloads: manifestDownloads
    }
  }
}))

const { default: OpenScienceDownloadPage, metadata } = await import(
  '../../app/(commonLayout)/open-science/download/page'
)

afterEach(() => {
  manifestShouldFail = false
  requestUserAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
  manifestReleaseDate = '2026-09-07T01:13:01Z'
  manifestDownloads = defaultManifestDownloads
})

describe('Open-Science download page', () => {
  test('renders the current stable release and installer links from one manifest snapshot', async () => {
    const html = renderToStaticMarkup(await OpenScienceDownloadPage())

    expect(html).toContain('Stable v1.2.3')
    expect(html).toContain('Released September 7, 2026')
    expect(html).toContain('https://cdn.example.com/aipoch-open-science-1.2.3-mac-arm64.dmg')
    expect(html).toContain('https://cdn.example.com/aipoch-open-science-1.2.3-win-x64-setup.exe')
    expect(html).toContain('https://cdn.example.com/aipoch-open-science_1.2.3_amd64.deb')
  })

  test('publishes canonical download-page metadata with its supplied social image', async () => {
    const openGraphImages = metadata?.openGraph?.images
    const openGraphImage = Array.isArray(openGraphImages) ? openGraphImages[0] : openGraphImages

    expect(metadata?.title).toBe('Download Open-Science for macOS, Windows and Linux | AIPOCH')
    expect(String(metadata?.alternates?.canonical)).toBe('https://aipoch.com/open-science/download')
    expect(
      typeof openGraphImage === 'string' || openGraphImage instanceof URL
        ? String(openGraphImage)
        : openGraphImage?.url
    ).toBe('https://statics.aipoch.com/public/f/image/og-open-science-download-56121c38.png')
  })

  test('renders the hero artwork from the shared static asset origin', async () => {
    const html = renderToStaticMarkup(await OpenScienceDownloadPage())

    expect(html).toContain(
      'https://statics.aipoch.com/public/f/image/aipoch-system-map-7511f128.png'
    )
    expect(html).not.toContain('/open-science/download/aipoch-system-map.png')
  })

  test('publishes release and visible FAQ data as page-specific JSON-LD', async () => {
    const html = renderToStaticMarkup(await OpenScienceDownloadPage())
    const jsonLdMatch = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)
    expect(jsonLdMatch).not.toBeNull()
    if (!jsonLdMatch) return

    const parsed = JSON.parse(jsonLdMatch[1] ?? '[]') as Record<string, unknown>
    const schemas = (parsed['@graph'] ?? []) as Record<string, unknown>[]
    const software = schemas.find((schema) => schema['@type'] === 'SoftwareApplication')
    const faq = schemas.find((schema) => schema['@type'] === 'FAQPage')
    const webpage = schemas.find((schema) => schema['@type'] === 'WebPage')

    expect(software).toMatchObject({
      '@id': 'https://aipoch.com/#open-science',
      name: 'AIPOCH Open-Science',
      softwareVersion: 'v1.2.3',
      dateModified: '2026-09-07',
      url: 'https://aipoch.com/open-science',
      publisher: { '@id': 'https://aipoch.com/#organization' }
    })
    expect(webpage).toMatchObject({
      '@id': 'https://aipoch.com/open-science/download#webpage',
      mainEntity: { '@id': 'https://aipoch.com/#open-science' }
    })
    expect(software?.downloadUrl).toEqual([
      'https://cdn.example.com/aipoch-open-science-1.2.3-mac-x64.dmg',
      'https://cdn.example.com/aipoch-open-science-1.2.3-mac-arm64.dmg',
      'https://cdn.example.com/aipoch-open-science-1.2.3-win-x64-setup.exe',
      'https://cdn.example.com/aipoch-open-science_1.2.3_amd64.deb'
    ])
    expect((faq?.mainEntity as unknown[]).length).toBe(5)
  })

  test('keeps installation guidance available when the stable manifest cannot load', async () => {
    manifestShouldFail = true
    const html = renderToStaticMarkup(await OpenScienceDownloadPage())

    expect(html).toContain('Installers are temporarily unavailable.')
    expect(html).toContain('View latest release')
    expect(html).toContain('Know before you install.')
  })

  test('uses the request operating system for the first server-rendered installer card', async () => {
    requestUserAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    const html = renderToStaticMarkup(await OpenScienceDownloadPage())
    const renderedKeys = [...html.matchAll(/data-download-key="([^"]+)"/g)].map(([, key]) => key)

    expect(renderedKeys).toEqual(['win-x64', 'mac-arm64', 'mac-x64', 'linux-x64-deb'])
    expect(html).toContain('data-download-key="win-x64" data-recommended="true"')
  })

  test('keeps installers available when the release date is invalid', async () => {
    manifestReleaseDate = 'not-a-date'
    const html = renderToStaticMarkup(await OpenScienceDownloadPage())

    expect(html).toContain('Stable v1.2.3')
    expect(html).not.toContain('Released not-a-date')
  })

  test('shows the unavailable fallback when the manifest has no supported page installer', async () => {
    manifestDownloads = {
      'linux-x64-appimage': {
        url: 'https://cdn.example.com/aipoch-open-science-1.2.3-x86_64.AppImage',
        size: 198_200_321
      }
    }
    const html = renderToStaticMarkup(await OpenScienceDownloadPage())

    expect(html).toContain('Installers are temporarily unavailable.')
    expect(html).not.toContain('aria-label="Open-Science installers"')
  })
})
