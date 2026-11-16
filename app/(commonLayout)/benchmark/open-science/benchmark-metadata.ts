import { buildAipochOrganizationSchema } from '@/lib/aipoch-organization'
import { commonLayoutLastModified } from '@/lib/common-layout-metadata'
import { SITE_DOMAIN } from '@/lib/config'
import { createPageMetadata } from '@/lib/page-metadata'

export const OPEN_SCIENCE_BENCHMARK_LAST_MODIFIED = '2026-11-16'
const pageUrl = `${SITE_DOMAIN}/benchmark/open-science`
const title = 'Open-Science Benchmarks: AstaBench, ASI-Bench and TB-Science · AIPOCH'
const description =
  'Explore AIPOCH Open-Science’s results across twelve scientific-agent tests, from literature search to paper-scale research, with evaluation methods, configurations, complete comparison records, and supporting evidence.'
export const benchmarkMetadata = createPageMetadata({
  title,
  description,
  canonical: pageUrl,
  type: 'article'
})
export const benchmarkStructuredData = () => ({
  '@context': 'https://schema.org',
  '@graph': [
    buildAipochOrganizationSchema(),
    {
      '@type': 'Article',
      '@id': `${pageUrl}#article`,
      url: pageUrl,
      headline: title,
      description,
      datePublished: '2026-10-19',
      dateModified: commonLayoutLastModified(OPEN_SCIENCE_BENCHMARK_LAST_MODIFIED),
      author: { '@type': 'Organization', name: 'AIPOCH Research' },
      publisher: { '@id': `${SITE_DOMAIN}/#organization` }
    },
    {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'AIPOCH', item: SITE_DOMAIN },
        { '@type': 'ListItem', position: 2, name: 'Open-Science Benchmarks', item: pageUrl }
      ]
    }
  ]
})
