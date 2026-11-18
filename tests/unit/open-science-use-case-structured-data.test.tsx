import { describe, expect, test } from 'bun:test'
import { renderToStaticMarkup } from 'react-dom/server'
import { buildUseCaseStructuredData } from '@/app/(commonLayout)/open-science/use-cases/[id]/structured-data'
import { JsonLd } from '@/components/json-ld'
import type { UseCaseDetail } from '@/lib/use-case-types'

describe('Open-Science use-case structured data', () => {
  test('describes visible case details and its Use Cases navigation', () => {
    const useCase: UseCaseDetail = {
      slug: 'example-case',
      title: 'Example research case',
      description: 'A short account of the research.',
      coverImage: '/images/example-case.png',
      exportedAt: Date.parse('2026-10-01T00:00:00Z')
    }
    const html = renderToStaticMarkup(<JsonLd data={buildUseCaseStructuredData(useCase)} />)
    const json = html.match(/<script type="application\/ld\+json">(.*?)<\/script>/)?.[1]
    expect(json).toBeDefined()

    const graph = (JSON.parse(json ?? '{}') as { '@graph': Record<string, unknown>[] })['@graph']
    expect(graph[0]).toMatchObject({
      '@type': 'WebPage',
      url: 'https://aipoch.com/open-science/use-cases/example-case',
      name: useCase.title,
      description: useCase.description,
      primaryImageOfPage: 'https://aipoch.com/images/example-case.png'
    })
    expect(graph[0]).not.toHaveProperty('datePublished')
    expect(graph[1]).toMatchObject({
      '@type': 'BreadcrumbList',
      itemListElement: [
        { position: 1, name: 'Use Cases', item: 'https://aipoch.com/open-science/use-cases' },
        {
          position: 2,
          name: useCase.title,
          item: 'https://aipoch.com/open-science/use-cases/example-case'
        }
      ]
    })
  })

  test('omits absent optional content', () => {
    const schema = buildUseCaseStructuredData({ slug: 'minimal', title: 'Minimal case' })
    const page = (schema['@graph'] as Record<string, unknown>[])[0]
    expect(page).not.toHaveProperty('description')
    expect(page).not.toHaveProperty('primaryImageOfPage')
  })
})
