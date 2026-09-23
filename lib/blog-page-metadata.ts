import { commonLayoutLastModified } from './common-layout-metadata'

/** Persistent local layout dates, separate from API publication dates. */
export const BLOG_PAGE_LAST_MODIFIED = '2026-09-21'
export const BLOG_ARTICLE_LAYOUT_LAST_MODIFIED = '2026-09-21'

export function blogArticleLastModified(contentDate?: string): string {
  const contentTime = Date.parse(contentDate ?? '')
  return commonLayoutLastModified(
    contentTime > Date.parse(BLOG_ARTICLE_LAYOUT_LAST_MODIFIED)
      ? new Date(contentTime).toISOString()
      : BLOG_ARTICLE_LAYOUT_LAST_MODIFIED
  )
}
