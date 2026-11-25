import { cache } from 'react'
import { BLOG_LIST_INITIAL_VISIBLE, getPostsForListPage } from './blog'

/** Keep API offsets stable while revealing nine more articles per public page. */
export const getBlogListPage = cache(async (value?: string | string[]) => {
  const pageSize = BLOG_LIST_INITIAL_VISIBLE + 1
  const firstPage = await getPostsForListPage(1, pageSize)
  const pageCount = Math.max(1, Math.ceil((firstPage.total - 1) / BLOG_LIST_INITIAL_VISIBLE))
  const requested = typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : 1
  const current = Number.isSafeInteger(requested) ? Math.min(Math.max(1, requested), pageCount) : 1
  const visibleCount = current * BLOG_LIST_INITIAL_VISIBLE
  const apiPageCount = Math.min(firstPage.total_pages, Math.ceil((visibleCount + 1) / pageSize))
  const remainingPages = await Promise.all(
    Array.from({ length: Math.max(0, apiPageCount - 1) }, (_, index) =>
      getPostsForListPage(index + 2, pageSize)
    )
  )

  return {
    current,
    visibleCount,
    initialData: {
      pages: [firstPage, ...remainingPages],
      pageParams: [1, ...remainingPages.map((page) => page.page)]
    }
  }
})
