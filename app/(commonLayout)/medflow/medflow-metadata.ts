import type { Metadata } from 'next'

export const MEDFLOW_PAGE_LAST_MODIFIED = '2026-09-21'

export const medFlowSeo = {
  title: 'MedFlow by AIPOCH | Biomedical Research Workflows',
  description:
    'Explore MedFlow, AIPOCH’s upcoming tool for biomedical research workflows. Join the waitlist to hear when private beta access becomes available.',
  url: 'https://aipoch.com/medflow'
} as const

export const medFlowMetadata: Metadata = {
  title: medFlowSeo.title,
  description: medFlowSeo.description,
  alternates: {
    canonical: medFlowSeo.url
  },
  openGraph: {
    title: medFlowSeo.title,
    description: medFlowSeo.description,
    url: medFlowSeo.url,
    siteName: 'AIPOCH',
    type: 'website'
  },
  twitter: {
    card: 'summary_large_image',
    title: medFlowSeo.title,
    description: medFlowSeo.description
  }
}
