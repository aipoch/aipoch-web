import type { Metadata } from 'next'
import { HomePage } from '@/app/(commonLayout)/home/home-page'
import { resolveHomeSpotlightContent } from '@/app/(commonLayout)/home/home-spotlight-content'
import {
  buildHomepageStructuredData,
  HOMEPAGE_DESCRIPTION,
  HOMEPAGE_TITLE
} from '@/app/(commonLayout)/home/home-structured-data'
import { openScienceSocialImage } from '@/app/(commonLayout)/open-science/open-science-metadata'
import { JsonLd } from '@/components/json-ld'
import { SITE_DOMAIN } from '@/lib/config'
import { createPageMetadata } from '@/lib/page-metadata'
import {
  fetchHomepageConfig,
  fetchHomepageReadWatch,
  fetchHomepageSkillsCount,
  OPEN_SCIENCE_HOMEPAGE_MODULE
} from '@/service/homepage'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = createPageMetadata({
  title: HOMEPAGE_TITLE,
  description: HOMEPAGE_DESCRIPTION,
  canonical: SITE_DOMAIN,
  image: openScienceSocialImage
})

export default async function Home() {
  const [openScienceConfig, readWatch, skillsCount] = await Promise.all([
    fetchHomepageConfig(OPEN_SCIENCE_HOMEPAGE_MODULE),
    fetchHomepageReadWatch(OPEN_SCIENCE_HOMEPAGE_MODULE),
    fetchHomepageSkillsCount()
  ])
  const spotlight = resolveHomeSpotlightContent(openScienceConfig, readWatch)
  const videoItems = spotlight.media
    .filter((item) => item.kind === 'video')
    .slice(0, 1)
    .map((item) => ({ name: item.label, url: item.url }))
  const { lastUpdated, schemas } = buildHomepageStructuredData({
    releaseVersion: spotlight.releaseVersion,
    lastModified: spotlight.latestRelease.updateDate,
    videoItems,
    skillsCount
  })

  return (
    <>
      <JsonLd data={schemas} />
      <HomePage spotlightContent={spotlight} lastUpdated={lastUpdated} skillsCount={skillsCount} />
    </>
  )
}
