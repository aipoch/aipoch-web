import { AIPOCH_WEBSITE_ID } from '@/lib/aipoch-organization'
import { SITE_DOMAIN } from '@/lib/config'
import type { UseCaseDetail } from '@/lib/use-case-types'

const useCasesUrl = `${SITE_DOMAIN}/open-science/use-cases`

export const buildUseCaseStructuredData = (useCase: UseCaseDetail): Record<string, unknown> => {
  const url = `${useCasesUrl}/${encodeURIComponent(useCase.slug)}`
  const imageUrl = useCase.coverImage?.startsWith('/')
    ? `${SITE_DOMAIN}${useCase.coverImage}`
    : useCase.coverImage

  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebPage',
        '@id': `${url}#webpage`,
        url,
        name: useCase.title,
        ...(useCase.description ? { description: useCase.description } : {}),
        ...(imageUrl && /^https?:\/\//.test(imageUrl) ? { primaryImageOfPage: imageUrl } : {}),
        inLanguage: 'en',
        isPartOf: { '@id': AIPOCH_WEBSITE_ID },
        breadcrumb: { '@id': `${url}#breadcrumb` }
      },
      {
        '@type': 'BreadcrumbList',
        '@id': `${url}#breadcrumb`,
        itemListElement: [
          {
            '@type': 'ListItem',
            position: 1,
            name: 'Use Cases',
            item: useCasesUrl
          },
          {
            '@type': 'ListItem',
            position: 2,
            name: useCase.title,
            item: url
          }
        ]
      }
    ]
  }
}
