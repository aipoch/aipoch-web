import { SITE_DOMAIN, SUPPORT_EMAIL } from '@/lib/config'
import { staticAsset } from '@/lib/staticAsset'

/** Stable AIPOCH Organization identifiers and official accounts shared by the homepage and product pages. */
export const AIPOCH_ORGANIZATION_ID = `${SITE_DOMAIN}/#organization`
export const AIPOCH_WEBSITE_ID = `${SITE_DOMAIN}/#website`

export const AIPOCH_ORGANIZATION_SAME_AS = [
  'https://github.com/aipoch',
  'https://www.linkedin.com/company/pochai/',
  'https://www.youtube.com/@AIPOCH_AI',
  'https://x.com/aipoch_ai',
  'https://huggingface.co/AIPOCH-AI'
] as const

export const AIPOCH_ORGANIZATION_DESCRIPTION =
  'AIPOCH builds the open-source harness for scientific research. Open-Science is a model-agnostic AI workbench with audited medical research agent skills.'

export const buildAipochOrganizationSchema = (): Record<string, unknown> => ({
  '@type': 'Organization',
  '@id': AIPOCH_ORGANIZATION_ID,
  name: 'AIPOCH',
  url: SITE_DOMAIN,
  logo: staticAsset('og-bfe41bdd.webp'),
  sameAs: [...AIPOCH_ORGANIZATION_SAME_AS],
  contactPoint: {
    '@type': 'ContactPoint',
    contactType: 'customer support',
    email: SUPPORT_EMAIL,
    url: `${SITE_DOMAIN}/contact-us`
  },
  description: AIPOCH_ORGANIZATION_DESCRIPTION
})
