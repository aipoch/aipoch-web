import { describe, expect, mock, test } from 'bun:test'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderToStaticMarkup } from 'react-dom/server'
import type { BlogPostListItem } from '@/service/blog'

const posts: BlogPostListItem[] = Array.from({ length: 32 }, (_, index) => ({
  id: index + 1,
  title: `Article ${index + 1}`,
  slug: `article-${index + 1}`,
  description: 'Sample article',
  author: 'AIPOCH',
  tags: [],
  read_time: 2,
  category: { id: 1, name: 'Research', slug: 'research' },
  view_count: 0,
  published_at: '2026-10-01T00:00:00Z'
}))
let total = posts.length
const calls: number[] = []
const originalFetch = globalThis.fetch
// Exercise the real server pagination and client SSR query, with a deterministic API response.
globalThis.fetch = mock(async (input: RequestInfo | URL) => {
  const url = new URL(String(input), 'https://example.com')
  const page = Number(url.searchParams.get('page'))
  const size = Number(url.searchParams.get('page_size'))
  calls.push(page)
  return Response.json({
    code: 20000,
    data: {
      items: posts.slice(0, total).slice((page - 1) * size, page * size),
      page,
      page_size: size,
      total,
      total_pages: Math.ceil(total / size)
    }
  })
}) as unknown as typeof fetch
const { afterAll } = await import('bun:test')
afterAll(() => {
  globalThis.fetch = originalFetch
})
const { default: BlogPage, generateMetadata } = await import('../../app/(commonLayout)/blog/page')
const { getBlogListPage } = await import('../../lib/blog-list-pagination')
const render = async (page?: string | string[]) =>
  renderToStaticMarkup(
    <QueryClientProvider client={new QueryClient()}>
      {await BlogPage({ searchParams: Promise.resolve({ page }) })}
    </QueryClientProvider>
  )

describe('crawlable blog pagination', () => {
  test('renders every article through consecutive ordinary links without gaps', async () => {
    total = posts.length
    const seen = new Set<string>()
    for (const [page, count] of [
      ['1', 10],
      ['2', 19],
      ['3', 28],
      ['4', 32]
    ] as const) {
      const html = await render(page)
      const links = [...html.matchAll(/href="\/blog\/(article-\d+)"/g)].map((match) => match[1])
      expect(links).toHaveLength(count)
      expect(new Set(links).size).toBe(count)
      for (const slug of links) seen.add(slug)
      if (page !== '4') expect(html).toContain(`href="/blog?page=${Number(page) + 1}"`)
      else expect(html).not.toContain('Show more')
      const metadata = await generateMetadata({ searchParams: Promise.resolve({ page }) })
      expect(metadata.alternates?.canonical).toBe(
        `https://aipoch.com/blog${page === '1' ? '' : `?page=${page}`}`
      )
      expect(String(metadata.openGraph?.url)).toBe(String(metadata.alternates?.canonical))
      const schema = JSON.parse(
        html.match(/<script type="application\/ld\+json">(.*?)<\/script>/)?.[1] ?? '[]'
      )
      expect(schema[0].itemListElement).toHaveLength(count)
    }
    expect([...seen]).toEqual(posts.map((post) => post.slug))
  })

  test('normalizes invalid and excessive pages before fetching cumulative batches', async () => {
    total = posts.length
    for (const page of ['0', '-1', '2junk', '1.5', 'Infinity', ['2', '3']]) {
      expect((await getBlogListPage(page)).current).toBe(1)
    }
    calls.length = 0
    expect((await getBlogListPage('999999')).current).toBe(4)
    expect(calls).toEqual([1, 2, 3, 4])
  })

  test('does not create empty next pages for empty, single or exact-boundary lists', async () => {
    for (const count of [0, 1, 10, 19]) {
      total = count
      const html = await render('999')
      expect(html).not.toContain('Show more')
      expect((html.match(/href="\/blog\/article-/g) ?? []).length).toBe(count)
    }
    total = posts.length
  })
})
