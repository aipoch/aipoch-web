import type { Metadata } from 'next'
import { SITE_DOMAIN } from '@/lib/config'
import { createPageMetadata } from '@/lib/page-metadata'
import { staticImage } from '@/lib/staticAsset'

// Keep the requested page SEO copy aligned across metadata and visible heading surfaces.
export const openScienceSeo = {
  title: 'AIPOCH Open-Science AI Research Workbench',
  description:
    'AIPOCH Open-Science brings agents, research tools, and traceable outputs into one workspace. Share selected evidence with a .science package and present completed work as a Research Film.'
} as const

const openSciencePageUrl = `${SITE_DOMAIN}/open-science`
export const OPEN_SCIENCE_PAGE_LAST_MODIFIED = '2026-11-13'
const openScienceSocialAsset = staticImage('og-science-open-to-all-ab128c94.png')
export const openScienceSocialImage = {
  url: openScienceSocialAsset.src,
  width: openScienceSocialAsset.width,
  height: openScienceSocialAsset.height,
  alt: 'Science, Open to All — AIPOCH Open-Science'
} as const

export const openScienceMetadata: Metadata = createPageMetadata({
  title: openScienceSeo.title,
  description: openScienceSeo.description,
  canonical: openSciencePageUrl,
  image: openScienceSocialImage
})
