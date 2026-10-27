import {
  AIPOCH_ORGANIZATION_ID,
  AIPOCH_WEBSITE_ID,
  buildAipochOrganizationSchema
} from '@/lib/aipoch-organization'
import { commonLayoutLastModified } from '@/lib/common-layout-metadata'
import { SITE_DOMAIN } from '@/lib/config'
import { openScienceScreenshotUrls } from '@/lib/open-science-media-assets'
import { openScienceProductFacts } from '@/lib/open-science-product-facts'
import {
  type DownloadManifest,
  formatDownloadVersionLabel,
  OPEN_SCIENCE_DOWNLOAD_KEYS,
  OPEN_SCIENCE_RELEASES_URL
} from './open-science-download-data'
import { openScienceFaqItems } from './open-science-faq-data'
import { OPEN_SCIENCE_PAGE_LAST_MODIFIED, openScienceSeo } from './open-science-metadata'

export const OPEN_SCIENCE_CURRENT_VERSION = openScienceProductFacts.releaseVersion
export const OPEN_SCIENCE_CURRENT_RELEASE_DATE = openScienceProductFacts.releaseDate
export const OPEN_SCIENCE_CURRENT_RELEASE_LABEL = openScienceProductFacts.releaseLabel
export const OPEN_SCIENCE_GITHUB_URL = 'https://github.com/aipoch/open-science'
export const OPEN_SCIENCE_WEBPAGE_ID = `${SITE_DOMAIN}/open-science#webpage`
export const OPEN_SCIENCE_PRODUCT_ID = `${SITE_DOMAIN}/#open-science`
export const OPEN_SCIENCE_BREADCRUMB_ID = `${SITE_DOMAIN}/open-science#breadcrumb`
export const OPEN_SCIENCE_FAQ_ID = `${SITE_DOMAIN}/open-science#faq`
export const OPEN_SCIENCE_PREPRINT_URL = 'https://arxiv.org/abs/2610.17110'
export const OPEN_SCIENCE_PREPRINT_ID = `${OPEN_SCIENCE_PREPRINT_URL}#article`

/** Product-page descriptions reflect the selected-record boundary stated in the visible copy. */
const OPEN_SCIENCE_PRODUCT_DESCRIPTION =
  'AIPOCH Open-Science is an open-source, local-first AI research workbench for macOS, Windows, and Linux. It brings scientific agents, Python and R execution, scientific Connectors, and traceable artifacts into one workspace. A .science package can carry selected conversation branches, file versions, Notebook records, and verification evidence for review, handoff, and archiving.'

/** Bibliographic facts verified against the official arXiv abstract record on 2026-10-27. */
const buildOpenSciencePreprintSchema = (): Record<string, unknown> => ({
  '@type': 'ScholarlyArticle',
  '@id': OPEN_SCIENCE_PREPRINT_ID,
  name: 'AIPOCH Open-Science: An Open-Source AI Research Workbench with Reproducible .science Packages',
  url: OPEN_SCIENCE_PREPRINT_URL,
  identifier: { '@type': 'PropertyValue', propertyID: 'arXiv', value: '2610.17110' },
  datePublished: '2026-10-12',
  creativeWorkStatus: 'Preprint',
  inLanguage: 'en',
  about: { '@id': OPEN_SCIENCE_PRODUCT_ID }
})

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
  fallback: string = OPEN_SCIENCE_CURRENT_RELEASE_DATE
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
  name: 'AIPOCH Open-Science',
  alternateName: 'Open-Science',
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
  inLanguage: 'en',
  isPartOf: { '@id': OPEN_SCIENCE_WEBPAGE_ID },
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
        inLanguage: 'en',
        isPartOf: { '@id': AIPOCH_WEBSITE_ID },
        mainEntity: { '@id': OPEN_SCIENCE_PRODUCT_ID },
        breadcrumb: { '@id': OPEN_SCIENCE_BREADCRUMB_ID },
        citation: { '@id': OPEN_SCIENCE_PREPRINT_ID },
        hasPart: { '@id': OPEN_SCIENCE_FAQ_ID },
        relatedLink: [
          `${SITE_DOMAIN}/blog/aipoch-open-science-research-packages`,
          `${SITE_DOMAIN}/open-science/use-cases`,
          `${SITE_DOMAIN}/docs/guides/research-packages/`
        ],
        dateModified: toSchemaDate(
          commonLayoutLastModified(
            schemaDate && Date.parse(schemaDate) > Date.parse(OPEN_SCIENCE_PAGE_LAST_MODIFIED)
              ? schemaDate
              : OPEN_SCIENCE_PAGE_LAST_MODIFIED
          )
        )
      },
      {
        ...softwareApplication,
        description: OPEN_SCIENCE_PRODUCT_DESCRIPTION,
        featureList: [
          'Scientific agents',
          'Python and R execution',
          `${openScienceProductFacts.builtInConnectors} built-in Scientific Connectors`,
          'Traceable artifacts',
          'Selected conversation branches, file versions, Notebook records, and verification evidence in .science packages'
        ],
        subjectOf: { '@id': OPEN_SCIENCE_PREPRINT_ID }
      },
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
      buildOpenScienceFaqPageSchema(),
      buildOpenSciencePreprintSchema()
    ]
  }
}
