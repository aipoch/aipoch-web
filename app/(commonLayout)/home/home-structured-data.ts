import { buildOpenScienceSoftwareApplicationSchema } from '@/app/(commonLayout)/open-science/open-science-structured-data'
import {
  AIPOCH_ORGANIZATION_ID,
  AIPOCH_WEBSITE_ID,
  buildAipochOrganizationSchema
} from '@/lib/aipoch-organization'
import { commonLayoutLastModified } from '@/lib/common-layout-metadata'
import { SITE_DOMAIN } from '@/lib/config'
import { openScienceScreenshotUrls } from '@/lib/open-science-media-assets'
import { resolveSkillLibraryCount } from './home-data'

export const HOMEPAGE_TITLE = 'AIPOCH | The Open-Source Harness for Scientific Research'
export const HOMEPAGE_DESCRIPTION =
  'AIPOCH builds the open-source harness for scientific research: a model-agnostic Open-Science workbench and a growing library of audited medical research agent skills.'

// Keep this fallback tied to the visible product snapshot, not deployment or SEO edit dates.
export const HOMEPAGE_LAST_MODIFIED = '2026-08-18'
const HOMEPAGE_VIDEO_ASSET_HOST = 'statics.aipoch.com'
const OPEN_SCIENCE_VIDEO_DURATION = 'PT1M0.48S'
const DEFAULT_HOMEPAGE_VIDEO_NAME = 'AIPOCH Open-Science product tour'

export interface HomepageLastUpdated {
  dateTime: string
  label: string
}

export const DEFAULT_HOMEPAGE_LAST_UPDATED: HomepageLastUpdated = {
  dateTime: HOMEPAGE_LAST_MODIFIED,
  label: 'Aug 18, 2026'
}

interface HomepageVideoFacts {
  name: string
  contentUrl: string
  uploadDate: string
  duration: string
}

interface HomepageVideoInput {
  name?: string | null
  url?: string | null
}

const resolveHomepageVideoName = (value: string | null | undefined): string => {
  const name = value?.trim()
  if (!name || name.toLowerCase() === 'product tour') {
    return DEFAULT_HOMEPAGE_VIDEO_NAME
  }
  return `AIPOCH Open-Science ${name}`
}

const resolveHomepageVideoFacts = (
  item: HomepageVideoInput | string | null | undefined,
  uploadDate: string
): HomepageVideoFacts | null => {
  const value = typeof item === 'string' ? item : item?.url
  try {
    const url = new URL(value?.trim() ?? '')
    return url.protocol === 'https:' && url.hostname === HOMEPAGE_VIDEO_ASSET_HOST
      ? {
          name: resolveHomepageVideoName(typeof item === 'string' ? null : item?.name),
          contentUrl: url.href,
          uploadDate,
          duration: OPEN_SCIENCE_VIDEO_DURATION
        }
      : null
  } catch {
    return null
  }
}

const resolveHomepageVideoSchemas = ({
  videoUrl,
  videoItems,
  uploadDate,
  organizationId
}: {
  videoUrl?: string | null
  videoItems?: HomepageVideoInput[] | null
  uploadDate: string
  organizationId: string
}): Record<string, unknown>[] => {
  const candidates = [...(videoUrl ? [videoUrl] : []), ...(videoItems ?? [])]
  const seenContentUrls = new Set<string>()

  // Only trusted static-asset video candidates become VideoObject entries; image media is filtered upstream.
  return candidates.flatMap((candidate) => {
    const videoFacts = resolveHomepageVideoFacts(candidate, uploadDate)
    if (!videoFacts || seenContentUrls.has(videoFacts.contentUrl)) {
      return []
    }
    seenContentUrls.add(videoFacts.contentUrl)

    return [
      {
        '@context': 'https://schema.org',
        '@type': 'VideoObject',
        description:
          'A short walkthrough of the open-source, model-agnostic Open-Science research workbench.',
        thumbnailUrl: openScienceScreenshotUrls.figma,
        ...videoFacts,
        publisher: { '@id': organizationId }
      }
    ]
  })
}

export const buildHomepageStructuredData = ({
  releaseVersion,
  lastModified,
  videoUrl,
  videoItems,
  skillsCount
}: {
  releaseVersion?: string | null
  lastModified?: string | null
  videoUrl?: string | null
  videoItems?: HomepageVideoInput[] | null
  skillsCount?: number | null
}): {
  lastUpdated: HomepageLastUpdated
  schemas: Record<string, unknown>[]
} => {
  const lastUpdated = lastModified
    ? {
        dateTime: lastModified,
        label: lastModified
      }
    : DEFAULT_HOMEPAGE_LAST_UPDATED
  const webpageId = `${SITE_DOMAIN}/#webpage`
  const currentSkillsCount = resolveSkillLibraryCount(skillsCount)
  const entityDescription =
    `AIPOCH builds the open-source harness for scientific research. Open-Science is a ` +
    `model-agnostic AI workbench; ${currentSkillsCount}+ medical research agent skills; every ` +
    'skill audited before it ships.'

  // Share the Organization data source with product pages to keep sameAs and @id consistent.
  const organizationSchema = {
    '@context': 'https://schema.org',
    ...buildAipochOrganizationSchema()
  }

  const websiteSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': AIPOCH_WEBSITE_ID,
    url: SITE_DOMAIN,
    name: 'AIPOCH',
    description: entityDescription,
    publisher: { '@id': AIPOCH_ORGANIZATION_ID }
  }

  const webpageSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    '@id': webpageId,
    url: SITE_DOMAIN,
    name: HOMEPAGE_TITLE,
    description: entityDescription,
    isPartOf: { '@id': AIPOCH_WEBSITE_ID },
    about: { '@id': AIPOCH_ORGANIZATION_ID },
    dateModified: commonLayoutLastModified(lastUpdated.dateTime),
    speakable: {
      '@type': 'SpeakableSpecification',
      cssSelector: ['[data-testid="spotlight-title"]', '[data-homepage-summary]']
    }
  }

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'AIPOCH',
        item: SITE_DOMAIN
      }
    ]
  }

  const videoObjectSchemas = resolveHomepageVideoSchemas({
    videoUrl,
    videoItems,
    uploadDate: lastUpdated.dateTime,
    organizationId: AIPOCH_ORGANIZATION_ID
  })

  const softwareApplicationSchema = buildOpenScienceSoftwareApplicationSchema({
    releaseVersion,
    dateModified: lastUpdated.dateTime
  })

  return {
    lastUpdated,
    schemas: [
      organizationSchema,
      websiteSchema,
      webpageSchema,
      breadcrumbSchema,
      ...videoObjectSchemas,
      softwareApplicationSchema
    ]
  }
}
