import { describe, expect, mock, test } from 'bun:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import {
  detectRecommendedDownloadKey,
  formatDownloadAssetDetail,
  formatDownloadVersionLabel,
  getHomepageDownloadPrimaryLabel,
  getHomepageManifestPlatformLinks,
  getHomepageRecommendedDownloadKey,
  getOpenScienceRecommendedDownloadKeys,
  isValidDownloadManifest,
  OPEN_SCIENCE_DOWNLOAD_MANIFEST_URL
} from '../../app/(commonLayout)/open-science/open-science-download-data'
import { openScienceFaqItems } from '../../app/(commonLayout)/open-science/open-science-faq-data'
import {
  buildOpenSciencePageGraph,
  buildOpenScienceSoftwareApplicationSchema
} from '../../app/(commonLayout)/open-science/open-science-structured-data'
import OpenSciencePage from '../../app/(commonLayout)/open-science/page'
import { fetchOpenScienceDownloadManifest } from '../../service/open-science-download'

// Keep the browser-only Radix boundary out of Bun's standalone server renderer.
// Real menu rendering, downloads and keyboard behavior are covered in open-science.spec.ts.
mock.module('../../app/(commonLayout)/open-science/open-science-download', () => ({
  OpenScienceDownload: () => createElement('button', { type: 'button' }, 'Download Open-Science')
}))

const expectedSeoTitle = 'AIPOCH Open-Science | Open-Source AI Research Workbench'
const expectedSeoDescription =
  'AIPOCH Open-Science is an open-source, local-first AI research workbench with model choice, code execution, reviewer checks, and traceable artifacts.'

const textFromMarkup = (markup: string) =>
  markup
    .replace(/<[^>]*>/g, ' ')
    .replace(/&#x27;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()

const renderOpenSciencePage = async () => {
  const previousMock = process.env.E2E_HOMEPAGE_MOCK
  const previousManifest = process.env.E2E_OPEN_SCIENCE_MANIFEST
  process.env.E2E_HOMEPAGE_MOCK = '1'
  process.env.E2E_OPEN_SCIENCE_MANIFEST = JSON.stringify({
    version: '0.16.0',
    releaseDate: '2026-08-16T00:00:00Z',
    downloads: {
      'mac-arm64': { url: 'https://cdn.example.com/OpenScience-arm64.dmg' }
    }
  })

  try {
    return renderToStaticMarkup(await OpenSciencePage())
  } finally {
    if (previousMock === undefined) {
      delete process.env.E2E_HOMEPAGE_MOCK
    } else {
      process.env.E2E_HOMEPAGE_MOCK = previousMock
    }
    if (previousManifest === undefined) {
      delete process.env.E2E_OPEN_SCIENCE_MANIFEST
    } else {
      process.env.E2E_OPEN_SCIENCE_MANIFEST = previousManifest
    }
  }
}

describe('Open-Science page', () => {
  test('marks the page dynamic because SoftwareApplication data reads the release manifest', async () => {
    const { dynamic } = await import('../../app/(commonLayout)/open-science/page')

    expect(dynamic).toBe('force-dynamic')
  })

  test('uses the requested SEO title and description across metadata tags', async () => {
    const { openScienceMetadata: metadata } = await import(
      '../../app/(commonLayout)/open-science/open-science-metadata'
    )

    const canonicalUrl = String(metadata.alternates?.canonical)
    const openGraphUrl = String(metadata.openGraph?.url)
    const ogImages = metadata.openGraph?.images
    const twitterImages = metadata.twitter?.images
    const ogImageUrl = Array.isArray(ogImages)
      ? typeof ogImages[0] === 'string'
        ? ogImages[0]
        : String(ogImages[0] instanceof URL ? ogImages[0] : (ogImages[0]?.url ?? ''))
      : typeof ogImages === 'string'
        ? ogImages
        : String((ogImages as { url?: string } | undefined)?.url ?? '')
    const twitterImageUrl = Array.isArray(twitterImages)
      ? String(twitterImages[0] ?? '')
      : String(twitterImages ?? '')

    expect(metadata.title).toBe(expectedSeoTitle)
    expect(metadata.description).toBe(expectedSeoDescription)
    expect(metadata.openGraph?.title).toBe(expectedSeoTitle)
    expect(metadata.openGraph?.description).toBe(expectedSeoDescription)
    expect(metadata.twitter && 'card' in metadata.twitter ? metadata.twitter.card : undefined).toBe(
      'summary_large_image'
    )
    expect(metadata.twitter?.title).toBe(expectedSeoTitle)
    expect(metadata.twitter?.description).toBe(expectedSeoDescription)
    expect(canonicalUrl).toEndWith('/open-science')
    expect(canonicalUrl).toStartWith('https://aipoch.com')
    expect(openGraphUrl).toEndWith('/open-science')
    expect(openGraphUrl).toStartWith('https://aipoch.com')
    expect(ogImageUrl).toBe(
      'https://statics.aipoch.com/public/f/image/og-science-open-to-all-ab128c94.png'
    )
    expect(twitterImageUrl).toBe(
      'https://statics.aipoch.com/public/f/image/og-science-open-to-all-ab128c94.png'
    )
  })

  test('renders one visible product heading from the Figma design', async () => {
    const html = await renderOpenSciencePage()
    const headings = [...html.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/g)]
    expect(headings).toHaveLength(1)
    expect(textFromMarkup(headings[0]?.[1] ?? '')).toBe('Open-Science AI Research Workbench')
  })

  test('builds canonical Open-Science SoftwareApplication data', () => {
    expect(
      buildOpenScienceSoftwareApplicationSchema({
        releaseVersion: 'v0.11.0',
        dateModified: 'Aug 7, 2026'
      })
    ).toMatchObject({
      '@id': 'https://aipoch.com/#open-science',
      url: 'https://aipoch.com/open-science',
      softwareVersion: 'v0.11.0',
      downloadUrl: 'https://github.com/aipoch/open-science/releases/latest',
      license: 'https://www.apache.org/licenses/LICENSE-2.0',
      dateModified: '2026-08-07',
      sameAs: ['https://github.com/aipoch/open-science'],
      publisher: { '@id': 'https://aipoch.com/#organization' },
      mainEntityOfPage: { '@id': 'https://aipoch.com/open-science#webpage' }
    })
  })

  test('builds product release facts and download URLs from one manifest snapshot', () => {
    const graph = buildOpenSciencePageGraph({
      releaseManifest: {
        version: '1.2.3',
        releaseDate: '2026-09-07T01:13:01Z',
        downloads: {
          'mac-arm64': { url: 'https://cdn.example.com/OpenScience-arm64.dmg' },
          'win-x64': { url: 'https://cdn.example.com/OpenScience-x64.exe' }
        }
      }
    })
    const schemas = graph['@graph'] as Record<string, unknown>[]
    const webpage = schemas.find((item) => item['@type'] === 'WebPage')
    const softwareApplication = schemas.find((item) => item['@type'] === 'SoftwareApplication')

    expect(webpage?.dateModified).toBe('2026-09-17')
    expect(softwareApplication).toMatchObject({
      softwareVersion: 'v1.2.3',
      dateModified: '2026-09-07',
      downloadUrl: [
        'https://cdn.example.com/OpenScience-arm64.dmg',
        'https://cdn.example.com/OpenScience-x64.exe'
      ]
    })
  })

  const extractJsonLdNodes = (html: string) =>
    [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].flatMap(
      (match) => {
        const value = JSON.parse(match[1] ?? 'null') as
          | Record<string, unknown>
          | Record<string, unknown>[]
          | null
        if (!value) return []
        if (Array.isArray(value)) return value
        if (Array.isArray(value['@graph'])) {
          return value['@graph'] as Record<string, unknown>[]
        }
        return [value]
      }
    )

  test('renders one Open-Science @graph with linked product entities', async () => {
    const html = await renderOpenSciencePage()
    const jsonLdBlocks = [
      ...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)
    ].map((match) => JSON.parse(match[1] ?? 'null') as Record<string, unknown>)

    expect(jsonLdBlocks).toHaveLength(1)
    expect(jsonLdBlocks[0]?.['@context']).toBe('https://schema.org')
    expect(Array.isArray(jsonLdBlocks[0]?.['@graph'])).toBe(true)

    const schemas = extractJsonLdNodes(html)
    const types = schemas.map((item) => item['@type'])
    expect(types).toEqual([
      'Organization',
      'WebSite',
      'WebPage',
      'SoftwareApplication',
      'BreadcrumbList',
      'FAQPage'
    ])

    expect(schemas.find((item) => item['@type'] === 'Organization')).toMatchObject({
      '@id': 'https://aipoch.com/#organization',
      sameAs: [
        'https://github.com/aipoch',
        'https://www.linkedin.com/company/pochai/',
        'https://www.youtube.com/@AIPOCH_AI',
        'https://x.com/aipoch_ai'
      ]
    })
    expect(schemas.find((item) => item['@type'] === 'WebSite')).toMatchObject({
      '@id': 'https://aipoch.com/#website',
      publisher: { '@id': 'https://aipoch.com/#organization' }
    })
    expect(schemas.find((item) => item['@type'] === 'WebPage')).toMatchObject({
      '@id': 'https://aipoch.com/open-science#webpage',
      mainEntity: { '@id': 'https://aipoch.com/#open-science' },
      isPartOf: { '@id': 'https://aipoch.com/#website' },
      breadcrumb: { '@id': 'https://aipoch.com/open-science#breadcrumb' }
    })
    expect(schemas.find((item) => item['@type'] === 'SoftwareApplication')).toMatchObject({
      '@type': 'SoftwareApplication',
      softwareVersion: 'v0.16.0',
      dateModified: '2026-08-16',
      sameAs: ['https://github.com/aipoch/open-science'],
      publisher: { '@id': 'https://aipoch.com/#organization' },
      mainEntityOfPage: { '@id': 'https://aipoch.com/open-science#webpage' }
    })
    expect(schemas.find((item) => item['@type'] === 'BreadcrumbList')).toMatchObject({
      '@id': 'https://aipoch.com/open-science#breadcrumb',
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: 'AIPOCH',
          item: 'https://aipoch.com'
        },
        {
          '@type': 'ListItem',
          position: 2,
          name: 'Open-Science',
          item: 'https://aipoch.com/open-science'
        }
      ]
    })
  })

  test('publishes FAQPage JSON-LD that matches the visible FAQ copy', async () => {
    const html = await renderOpenSciencePage()
    const faqPage = extractJsonLdNodes(html).find((item) => item['@type'] === 'FAQPage') as
      | {
          mainEntity?: Array<{ name?: string; acceptedAnswer?: { text?: string } }>
        }
      | undefined

    expect(faqPage?.mainEntity).toHaveLength(openScienceFaqItems.length)
    for (const item of openScienceFaqItems) {
      const entity = faqPage?.mainEntity?.find((entry) => entry.name === item.question)
      expect(entity?.acceptedAnswer?.text).toBe(item.answer)
      expect(html).toContain(`>${item.question}</h3>`)
    }
  })
  test('renders the complete product story and removes the previous campaign', async () => {
    const html = await renderOpenSciencePage()
    const text = textFromMarkup(html)
    for (const title of [
      'One workspace from research question to traceable artifact',
      'Research agents that can work inside the research environment',
      'Local-first research with explicit external access',
      'Can Open-Science use the latest AI models?',
      'Get to know Open-Science',
      'Start building inspectable research workflows with Open-Science.'
    ])
      expect(text).toContain(title)
    expect(text).toContain(
      'Open-Science stores project state, sessions, uploads, notebook history, and generated artifacts on the user’s computer by default.'
    )
    expect(text).toContain('Compatible models')
    expect(text).toContain('Available models vary by account')
    expect(text).not.toContain('Choose your models. Keep control of external access.')
    expect(text).not.toContain('Does Open-Science detect the latest AI models?')
    expect(text).not.toContain('Any model')
    expect(text).not.toContain('Catalog follows your account')
    expect(text).not.toContain('Science is not a privilege')
    expect(html).not.toContain('Open-Science sections')
    expect(html).not.toContain('os-particles')
  })

  test('offers documentation, GitHub, downloads and the community from the design', async () => {
    const html = await renderOpenSciencePage()
    expect(html).toContain('Read the documentation')
    expect(html).toContain('https://aipoch.com/docs/')
    expect(html).toContain('View on GitHub')
    expect(html).toContain('Download Open-Science')
    expect(html).toContain('https://discord.gg/zxQAYjReRv')
  })

  test('uses the stable Open-Science app manifest and desktop platform recommendation rules', () => {
    expect(OPEN_SCIENCE_DOWNLOAD_MANIFEST_URL).toBe(
      'https://statics.aipoch.com/open-science/app/stable/version.json'
    )
    expect(detectRecommendedDownloadKey('Mozilla/5.0 (Windows NT 10.0; Win64; x64)')).toBe(
      'win-x64'
    )
    expect(
      detectRecommendedDownloadKey('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)')
    ).toBeNull()
    expect(detectRecommendedDownloadKey('Mozilla/5.0 (X11; Linux x86_64)')).toBe('linux-x64-deb')
    expect(detectRecommendedDownloadKey('Mozilla/5.0 (Linux; Android 14)')).toBeNull()
  })

  test('resolves homepage spotlight download recommendation and primary labels', () => {
    expect(getHomepageRecommendedDownloadKey('Mozilla/5.0 (Windows NT 10.0; Win64; x64)')).toBe(
      'win-x64'
    )
    expect(getHomepageDownloadPrimaryLabel('win-x64')).toBe('Download for Windows')
    expect(
      getHomepageRecommendedDownloadKey(
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
      )
    ).toBe('mac-arm64')
    expect(
      getHomepageRecommendedDownloadKey(
        'Mozilla/5.0 (Macintosh; ARM Mac OS X 14_0) AppleWebKit/605.1.15'
      )
    ).toBe('mac-arm64')
    expect(getHomepageRecommendedDownloadKey('Mozilla/5.0 (X11; Linux x86_64)')).toBe(
      'linux-x64-deb'
    )
    expect(getHomepageDownloadPrimaryLabel('linux-x64-deb')).toBe('Download for Linux')
  })

  test('orders homepage platform downloads for the visitor operating system', () => {
    const manifest = {
      version: '0.2.0',
      downloads: {
        'mac-arm64': { url: 'https://cdn.example.com/open-science-mac-arm64.dmg' },
        'mac-x64': { url: 'https://cdn.example.com/open-science-mac-x64.dmg' },
        'win-x64': { url: 'https://cdn.example.com/open-science-win-x64.exe' },
        'linux-x64-deb': { url: 'https://cdn.example.com/open-science-linux.deb' },
        'linux-x64-appimage': { url: 'https://cdn.example.com/open-science-linux.AppImage' }
      }
    }

    expect(getHomepageManifestPlatformLinks(manifest, 'mac-x64').map(({ id }) => id)).toEqual([
      'mac-arm64',
      'mac-x64',
      'win-x64',
      'linux-x64-deb',
      'linux-x64-appimage'
    ])
    expect(getHomepageManifestPlatformLinks(manifest, 'win-x64').map(({ id }) => id)).toEqual([
      'win-x64',
      'mac-arm64',
      'mac-x64',
      'linux-x64-deb',
      'linux-x64-appimage'
    ])
    expect(getHomepageManifestPlatformLinks(manifest, 'linux-x64-deb').map(({ id }) => id)).toEqual(
      ['linux-x64-deb', 'linux-x64-appimage', 'mac-arm64', 'mac-x64', 'win-x64']
    )
  })

  test('keeps relative platform priority when a recommended asset is unavailable', () => {
    const manifest = {
      version: '0.2.0',
      downloads: {
        'mac-arm64': { url: 'https://cdn.example.com/open-science-mac-arm64.dmg' },
        'win-x64': { url: 'https://cdn.example.com/open-science-win-x64.exe' },
        'linux-x64-appimage': { url: 'https://cdn.example.com/open-science-linux.AppImage' }
      }
    }

    expect(getHomepageManifestPlatformLinks(manifest, 'linux-x64-deb').map(({ id }) => id)).toEqual(
      ['linux-x64-appimage', 'mac-arm64', 'win-x64']
    )
  })

  test('prefers AppImage for Linux and supports AppImage-only manifests', () => {
    const appImageOnly = {
      version: '0.2.0',
      downloads: {
        'linux-x64-appimage': { url: 'https://cdn.example.com/open-science.AppImage' }
      }
    }
    const bothLinuxFormats = {
      version: '0.2.0',
      downloads: {
        ...appImageOnly.downloads,
        'linux-x64-deb': { url: 'https://cdn.example.com/open-science.deb' }
      }
    }

    expect(getOpenScienceRecommendedDownloadKeys('X11; Linux x86_64', appImageOnly)).toEqual([
      'linux-x64-appimage'
    ])
    expect(getOpenScienceRecommendedDownloadKeys('X11; Linux x86_64', bothLinuxFormats)).toEqual([
      'linux-x64-appimage'
    ])
  })

  test('fetches the Open-Science download manifest through the service', async () => {
    const originalFetch = globalThis.fetch
    const calls: Array<[RequestInfo | URL, RequestInit | undefined]> = []
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      calls.push([input, init])
      return new Response(
        JSON.stringify({
          version: '0.2.0',
          releaseDate: '',
          notes: '',
          localizedNotes: { en: 'A deliberately large field that the page does not consume.' },
          downloads: {
            'win-x64': {
              url: 'https://statics.aipoch.com/open-science/app/stable/releases/0.2.0/open-science-0.2.0-win-x64-setup.exe',
              size: 140501246,
              sha256: '204f6870a5bf12121163441c72e142f1dca9cc80d0931c64c55b36876690d7c9',
              unused: 'do not serialize this into the RSC payload'
            }
          }
        }),
        { status: 200 }
      )
    }) as unknown as typeof fetch

    try {
      const manifest = await fetchOpenScienceDownloadManifest()

      expect(manifest.version).toBe('0.2.0')
      expect(manifest).toEqual({
        version: '0.2.0',
        releaseDate: '',
        downloads: {
          'win-x64': {
            url: 'https://statics.aipoch.com/open-science/app/stable/releases/0.2.0/open-science-0.2.0-win-x64-setup.exe',
            size: 140501246,
            sha256: '204f6870a5bf12121163441c72e142f1dca9cc80d0931c64c55b36876690d7c9'
          }
        }
      })
      expect(calls[0]?.[0]).toBe(OPEN_SCIENCE_DOWNLOAD_MANIFEST_URL)
      expect(calls[0]?.[1]?.cache).toBe('no-store')
      expect(calls[0]?.[1]?.signal).toBeInstanceOf(AbortSignal)
    } finally {
      globalThis.fetch = originalFetch
    }
  })

  test('ignores malformed non-production manifest fixtures and falls back to the CDN', async () => {
    const originalFetch = globalThis.fetch
    const previousManifest = process.env.E2E_OPEN_SCIENCE_MANIFEST
    process.env.E2E_OPEN_SCIENCE_MANIFEST = '{invalid json'
    let fetchCalled = false
    globalThis.fetch = (async () => {
      fetchCalled = true
      return new Response(
        JSON.stringify({
          version: '0.3.0',
          downloads: {
            'mac-arm64': { url: 'https://cdn.example.com/open-science.dmg' }
          }
        }),
        { status: 200 }
      )
    }) as unknown as typeof fetch

    try {
      await expect(fetchOpenScienceDownloadManifest()).resolves.toMatchObject({ version: '0.3.0' })
      expect(fetchCalled).toBe(true)
    } finally {
      globalThis.fetch = originalFetch
      if (previousManifest === undefined) {
        delete process.env.E2E_OPEN_SCIENCE_MANIFEST
      } else {
        process.env.E2E_OPEN_SCIENCE_MANIFEST = previousManifest
      }
    }
  })

  test('includes all FAQ answers in server HTML with only the first answer expanded', async () => {
    const html = await renderOpenSciencePage()
    expect(html.match(/<details\b/g)).toHaveLength(5)
    expect(html.match(/<details[^>]*\bopen=""/g)).toHaveLength(1)
    expect(html).toContain('Apache License 2.0')
    expect(html).toContain('Researchers remain responsible')
    expect(html).not.toContain('open-science-0.1.2')
  })

  test('validates the current manifest schema and formats download file sizes', () => {
    expect(
      isValidDownloadManifest({
        version: '0.2.0',
        releaseDate: '',
        notes: '',
        downloads: {
          'mac-arm64': {
            url: 'https://statics.aipoch.com/open-science/app/stable/releases/0.2.0/open-science-0.2.0-mac-arm64.dmg',
            size: 172885330,
            sha256: 'ed3641c914e4708750092900ea44f361b22414bc8ec13ffabc29defe0d9efaea'
          },
          'win-x64': {
            url: 'https://statics.aipoch.com/open-science/app/stable/releases/0.2.0/open-science-0.2.0-win-x64-setup.exe',
            size: 140501246,
            sha256: '204f6870a5bf12121163441c72e142f1dca9cc80d0931c64c55b36876690d7c9'
          },
          'linux-x64-deb': {
            url: 'https://statics.aipoch.com/open-science/app/stable/releases/0.2.0/open-science_0.2.0_amd64.deb',
            size: 145087720,
            sha256: 'a748f0cb69b9d0f6e6a7efa3b1587a7fd9e9b462b08a13f8f78b124771046355'
          }
        }
      })
    ).toBeTrue()
    expect(
      formatDownloadAssetDetail({
        url: 'https://statics.aipoch.com/open-science/app/stable/releases/0.2.0/open-science-0.2.0-mac-arm64.dmg',
        size: 172885330
      })
    ).toBe('.dmg · 164.9 MB')
    expect(
      formatDownloadAssetDetail({
        url: 'https://statics.aipoch.com/open-science/app/stable/releases/0.2.0/open-science_0.2.0_amd64.deb',
        size: 145087720
      })
    ).toBe('.deb · 138.4 MB')
  })

  test('formats the download menu footer with only the version', () => {
    expect(formatDownloadVersionLabel({ version: '0.2.0' })).toBe('v0.2.0')
    expect(formatDownloadVersionLabel({ version: 'v0.2.0' })).toBe('v0.2.0')
  })

  test('validates Open-Science download manifests before rendering links', () => {
    expect(
      isValidDownloadManifest({
        version: '0.1.2',
        releaseDate: '2026-07-12',
        downloads: {
          'mac-arm64': {
            url: 'https://statics.aipoch.com/open-science/app/v0.1.2/OpenScience-mac-arm64.dmg',
            size: 172632067
          }
        }
      })
    ).toBeTrue()

    expect(isValidDownloadManifest({ version: '0.1.2', downloads: true })).toBeFalse()
    expect(
      isValidDownloadManifest({
        version: '0.1.2',
        notes: false,
        downloads: {
          'mac-arm64': {
            url: 'https://statics.aipoch.com/open-science/app/v0.1.2/OpenScience-mac-arm64.dmg'
          }
        }
      })
    ).toBeFalse()
    expect(
      isValidDownloadManifest({
        version: '0.1.2',
        downloads: {
          'mac-arm64': { size: 172632067 }
        }
      })
    ).toBeFalse()
    expect(
      isValidDownloadManifest({
        version: '0.1.2',
        downloads: {
          'mac-arm64': { url: '' }
        }
      })
    ).toBeFalse()
  })

  test('renders provider options and the traceability limitations from the design', async () => {
    const text = textFromMarkup(await renderOpenSciencePage())
    expect(text).toContain('Codex subscription')
    expect(text).toContain('xAI (Grok) OAuth')
    expect(text).toContain('Apodex')
    expect(text).toContain('24 built-in Scientific Connectors')
    expect(text).toContain(
      'they do not certify scientific correctness or replace expert validation'
    )
  })
})
