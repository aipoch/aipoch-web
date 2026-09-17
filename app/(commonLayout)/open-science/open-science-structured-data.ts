import {
  AIPOCH_ORGANIZATION_ID,
  AIPOCH_WEBSITE_ID,
  buildAipochOrganizationSchema
} from '@/lib/aipoch-organization'
import { commonLayoutLastModified } from '@/lib/common-layout-metadata'
import { SITE_DOMAIN } from '@/lib/config'
import { openScienceScreenshotUrls } from '@/lib/open-science-media-assets'
import {
  type DownloadManifest,
  formatDownloadVersionLabel,
  OPEN_SCIENCE_DOWNLOAD_KEYS,
  OPEN_SCIENCE_RELEASES_URL
} from './open-science-download-data'
import { openScienceFaqItems } from './open-science-faq-data'
import { openScienceSeo } from './open-science-metadata'

export const OPEN_SCIENCE_CURRENT_VERSION = 'v0.16.0'
export const OPEN_SCIENCE_CURRENT_RELEASE_DATE = '2026-08-16'
export const OPEN_SCIENCE_CURRENT_RELEASE_LABEL = 'Aug 16, 2026'
export const OPEN_SCIENCE_GITHUB_URL = 'https://github.com/aipoch/open-science'
export const OPEN_SCIENCE_WEBPAGE_ID = `${SITE_DOMAIN}/open-science#webpage`
export const OPEN_SCIENCE_PRODUCT_ID = `${SITE_DOMAIN}/#open-science`
export const OPEN_SCIENCE_BREADCRUMB_ID = `${SITE_DOMAIN}/open-science#breadcrumb`
export const OPEN_SCIENCE_FAQ_ID = `${SITE_DOMAIN}/open-science#faq`

const MONTH_TO_NUMBER: Record<string, string> = {
  Jan: '01',
  Feb: '02',
  Mar: '03',
  Apr: '04',
  May: '05',
  Jun: '06',
  Jul: '07',
  Aug: '08',
  Sep: '09',
  Oct: '10',
  Nov: '11',
  Dec: '12'
}

/** Normalize Schema.org dates to YYYY-MM-DD instead of mixing them with display formats. */
export const toSchemaDate = (
  value?: string | null,
  fallback = OPEN_SCIENCE_CURRENT_RELEASE_DATE
): string => {
  const raw = value?.trim()
  if (!raw) return fallback
  const isoDate = raw.match(/^(\d{4}-\d{2}-\d{2})(?:T.*)?$/)
  if (isoDate) return isoDate[1]

  const monthDayYear = raw.match(
    /^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2}),\s+(\d{4})$/
  )
  if (monthDayYear) {
    const [, month, day, year] = monthDayYear
    return `${year}-${MONTH_TO_NUMBER[month]}-${day.padStart(2, '0')}`
  }

  return fallback
}

export const buildOpenScienceSoftwareApplicationSchema = ({
  releaseVersion = OPEN_SCIENCE_CURRENT_VERSION,
  dateModified = OPEN_SCIENCE_CURRENT_RELEASE_DATE,
  downloadUrl = OPEN_SCIENCE_RELEASES_URL,
  mainEntityOfPage = { '@id': OPEN_SCIENCE_WEBPAGE_ID }
}: {
  releaseVersion?: string | null
  dateModified?: string | null
  downloadUrl?: string | string[] | null
  mainEntityOfPage?: string | { '@id': string }
} = {}): Record<string, unknown> => ({
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  '@id': OPEN_SCIENCE_PRODUCT_ID,
  name: 'Open-Science',
  description:
    'An open-source, local-first, model-agnostic AI research workbench for reproducible scientific discovery.',
  url: `${SITE_DOMAIN}/open-science`,
  image: openScienceScreenshotUrls.figma,
  applicationCategory: 'ScienceApplication',
  operatingSystem: 'macOS, Windows, Linux',
  ...(releaseVersion ? { softwareVersion: releaseVersion } : {}),
  ...(downloadUrl && (typeof downloadUrl === 'string' || downloadUrl.length > 0)
    ? { downloadUrl }
    : {}),
  license: 'https://www.apache.org/licenses/LICENSE-2.0',
  publisher: { '@id': AIPOCH_ORGANIZATION_ID },
  ...(dateModified ? { dateModified: toSchemaDate(dateModified) } : {}),
  sameAs: [OPEN_SCIENCE_GITHUB_URL],
  mainEntityOfPage
})

/** FAQPage questions and answers must match the visible FAQ content. */
export const buildOpenScienceFaqPageSchema = (): Record<string, unknown> => ({
  '@type': 'FAQPage',
  '@id': OPEN_SCIENCE_FAQ_ID,
  mainEntity: openScienceFaqItems.map((item) => ({
    '@type': 'Question',
    name: item.question,
    acceptedAnswer: {
      '@type': 'Answer',
      text: item.answer
    }
  }))
})

/** Write manifest installer URLs to Schema in a stable platform order. */
const resolveManifestDownloadUrls = (manifest: DownloadManifest): string[] =>
  OPEN_SCIENCE_DOWNLOAD_KEYS.flatMap((key) => {
    const url = manifest.downloads[key]?.url
    if (!url) return []
    try {
      return new URL(url).protocol === 'https:' ? [url] : []
    } catch {
      return []
    }
  })

/** Use a single product-page JSON-LD @graph with stable IDs and shared data sources instead of separate schemas. */
export const buildOpenSciencePageGraph = ({
  releaseManifest
}: {
  releaseManifest?: DownloadManifest | null
} = {}): Record<string, unknown> => {
  const schemaDate = releaseManifest?.releaseDate
    ? toSchemaDate(releaseManifest.releaseDate, '')
    : undefined
  const downloadUrls = releaseManifest ? resolveManifestDownloadUrls(releaseManifest) : []
  const { '@context': _ignoredContext, ...softwareApplication } =
    buildOpenScienceSoftwareApplicationSchema({
      releaseVersion: releaseManifest ? formatDownloadVersionLabel(releaseManifest) : null,
      dateModified: schemaDate || null,
      downloadUrl: downloadUrls.length > 0 ? downloadUrls : null
    })

  return {
    '@context': 'https://schema.org',
    '@graph': [
      buildAipochOrganizationSchema(),
      {
        '@type': 'WebSite',
        '@id': AIPOCH_WEBSITE_ID,
        url: SITE_DOMAIN,
        name: 'AIPOCH',
        publisher: { '@id': AIPOCH_ORGANIZATION_ID }
      },
      {
        '@type': 'WebPage',
        '@id': OPEN_SCIENCE_WEBPAGE_ID,
        url: `${SITE_DOMAIN}/open-science`,
        name: openScienceSeo.title,
        description: openScienceSeo.description,
        isPartOf: { '@id': AIPOCH_WEBSITE_ID },
        mainEntity: { '@id': OPEN_SCIENCE_PRODUCT_ID },
        breadcrumb: { '@id': OPEN_SCIENCE_BREADCRUMB_ID },
        dateModified: commonLayoutLastModified(schemaDate)
      },
      softwareApplication,
      {
        '@type': 'BreadcrumbList',
        '@id': OPEN_SCIENCE_BREADCRUMB_ID,
        itemListElement: [
          {
            '@type': 'ListItem',
            position: 1,
            name: 'AIPOCH',
            item: SITE_DOMAIN
          },
          {
            '@type': 'ListItem',
            position: 2,
            name: 'Open-Science',
            item: `${SITE_DOMAIN}/open-science`
          }
        ]
      },
      buildOpenScienceFaqPageSchema()
    ]
  }
}
