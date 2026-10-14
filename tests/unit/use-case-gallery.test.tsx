import { expect, mock, test } from 'bun:test'
import { renderToStaticMarkup } from 'react-dom/server'
import type { UseCaseIndexEntry } from '../../lib/use-case-types'

const entries: UseCaseIndexEntry[] = Array.from({ length: 15 }, (_, index) => ({
  slug: `research-${index + 1}`,
  title: `Research case ${index + 1}`,
  preview: { image: `/case-${index + 1}.png` }
}))
let result: UseCaseIndexEntry[] | null = entries
mock.module('@/service/open-science-use-cases.server', () => ({
  fetchUseCaseList: async () => result
}))
const { default: UseCasesPage } = await import(
  '../../app/(commonLayout)/open-science/use-cases/page'
)
const render = async (page?: string, category?: string) =>
  renderToStaticMarkup(await UseCasesPage({ searchParams: Promise.resolve({ page, category }) }))

test('server-renders the first batch with real case links and a progressive loading fallback', async () => {
  result = entries
  const html = await render()
  expect(html).toContain('href="/open-science/use-cases/research-6"')
  expect(html).not.toContain('href="/open-science/use-cases/research-7"')
  expect(html).toContain('href="/open-science/use-cases?page=2#use-case-grid"')
  expect(html).toContain('Showing 6 of 15 use cases')
  expect(html).not.toContain('Use case pages')
  expect(html).not.toContain('View use case in AIPOCH Lab')
})

test('old page links reveal cumulative batches and clamp invalid or excessive page numbers', async () => {
  result = entries
  expect(await render('2')).toContain('Showing 12 of 15 use cases')
  expect(await render('999')).toContain('Showing 15 of 15 use cases')
  for (const page of ['-2', 'invalid', '0']) {
    expect(await render(page)).toContain('Showing 6 of 15 use cases')
  }
  const last = await render('3')
  expect(last).toContain('All use cases loaded')
  expect(last).not.toContain('Load more use cases')
  expect(last).toContain('href="/open-science/use-cases/research-1"')
  expect(last).toContain('href="/open-science/use-cases/research-15"')
})

test('keeps full long titles in accessible links even when their visible text is clamped', async () => {
  const title =
    'A long research title about scientific evidence, reproducible analysis, and sharing research records across projects and computers'
  result = [{ slug: 'long-title', title }]
  const html = await render()
  expect(html).toContain(`title="${title}"`)
  expect(html).toContain(title)
  expect(html).toContain('line-clamp-2')
})

test('keeps empty and failed catalog states distinct without a loading control', async () => {
  result = []
  const empty = await render()
  expect(empty).toContain('No published use cases yet.')
  expect(empty).not.toContain('Load more use cases')
  result = null
  const failed = await render()
  expect(failed).toContain('Use cases could not be loaded right now.')
  expect(failed).not.toContain('No published use cases yet.')
  expect(failed).not.toContain('Load more use cases')
})

test('derives the category strip from catalog fields and filters by URL param', async () => {
  result = [
    { slug: 'a', title: 'Alpha', catalog: 'Science', catalogKey: 'science' },
    { slug: 'b', title: 'Beta', catalog: 'Science', catalogKey: 'science' },
    { slug: 'c', title: 'Gamma', catalog: 'Health & Climate', catalogKey: 'health-climate' },
    { slug: 'd', title: 'Delta' }
  ]
  const html = await render()
  expect(html).toContain('aria-label="Use case categories"')
  // Counts come from the manifest catalog fields; All areas is the live total.
  expect(html).toContain('All areas')
  expect(html).toContain('>4</span>')
  expect(html).toContain('>2</span>')
  expect(html).toContain('Health &amp; Climate')
  // Category pills are filter links; the active one carries aria-current.
  expect(html).toContain('href="/open-science/use-cases?category=science"')
  expect(html).toContain('aria-current="true"')
  expect(html.match(/aria-current="true"/g)?.length).toBe(1)
  // V4 pills are rectangular — no rounding utility anywhere in the strip.
  const strip = html.slice(html.indexOf('Use case categories'))
  expect(strip.slice(0, 3000)).not.toContain('rounded')

  // The URL param filters the grid; unknown values fall back to everything.
  const filtered = await render(undefined, 'science')
  expect(filtered).toContain('href="/open-science/use-cases/a"')
  expect(filtered).toContain('href="/open-science/use-cases/b"')
  expect(filtered).not.toContain('href="/open-science/use-cases/c"')
  expect(filtered).not.toContain('href="/open-science/use-cases/d"')
  // The gallery counter describes the filtered view.
  expect(filtered).toContain('Showing 2 of 2 use cases')
  expect(await render(undefined, 'unknown-catalog')).toContain('href="/open-science/use-cases/d"')
})

test('keeps the category filter on pagination links', async () => {
  result = Array.from({ length: 8 }, (_, index) => ({
    slug: `sci-${index + 1}`,
    title: `Science case ${index + 1}`,
    catalog: 'Science',
    catalogKey: 'science'
  }))
  const filtered = await render(undefined, 'science')
  expect(filtered).toContain('Showing 6 of 8 use cases')
  expect(filtered).toContain('page=2&amp;category=science#use-case-grid')
})
