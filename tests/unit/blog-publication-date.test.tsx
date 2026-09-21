import { describe, expect, test } from 'bun:test'
import { renderToStaticMarkup } from 'react-dom/server'
import { BlogCard } from '../../components/blog-card'
import { mapListItemToBlogPost } from '../../lib/blog'
import { formatPublishedDate } from '../../lib/format-published-date'
import { blogs } from '../../mocks/fixtures'

describe('Blog publication dates', () => {
  for (const variant of ['featured', 'secondary'] as const) {
    test(`${variant} uses the API publication date instead of the reading time`, () => {
      const publishedAt = '2026-09-25T12:00:00'
      const post = mapListItemToBlogPost({ ...blogs[0], published_at: publishedAt })
      const html = renderToStaticMarkup(<BlogCard post={post} variant={variant} />)
      expect(html).toContain(`<time dateTime="${publishedAt}">Sep 25, 2026</time>`)
      expect(html).not.toContain('min read')
    })
  }

  test('does not invent a date when publication metadata is missing or invalid', () => {
    for (const value of ['', 'not-a-date', undefined, null]) {
      expect(formatPublishedDate(value)).toBe('')
    }
    const post = mapListItemToBlogPost({ ...blogs[0], published_at: '' })
    const html = renderToStaticMarkup(<BlogCard post={post} variant="secondary" />)
    expect(html).not.toContain('<time')
    expect(html).not.toContain('Invalid Date')
  })
})
