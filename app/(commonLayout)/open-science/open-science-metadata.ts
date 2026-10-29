import type { Metadata } from 'next'
import { SITE_DOMAIN } from '@/lib/config'
import { createPageMetadata } from '@/lib/page-metadata'
import { staticImage } from '@/lib/staticAsset'

// Keep the requested page SEO copy aligned across metadata and visible heading surfaces.
export const openScienceSeo = {
  title: 'AIPOCH Open-Science AI Research Workbench',
  description:
    'AIPOCH Open-Science is an open-source, local-first AI research workbench for macOS, Windows, and Linux, with scientific agents, code execution, and .science packages.'
} as const

const openSciencePageUrl = `${SITE_DOMAIN}/open-science`
export const OPEN_SCIENCE_PAGE_LAST_MODIFIED = '2026-10-29'
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
