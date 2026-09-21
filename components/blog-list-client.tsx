'use client'

import { ChevronDown, ChevronUp } from 'lucide-react'
import { useEffect, useMemo, useRef } from 'react'
import { flushSync } from 'react-dom'
import { BlogCard } from '@/components/blog-card'
import { BlogCardSkeleton } from '@/components/blog-card-skeleton'
import { useNavigationViewState } from '@/hooks/use-navigation-view-state'
import {
  BLOG_LIST_INITIAL_VISIBLE,
  type BlogPost,
  getVisibleBlogListPosts,
  mapListItemToBlogPost,
  shouldFetchMoreBlogListPages
} from '@/lib/blog'
import { staticImage } from '@/lib/staticAsset'
import { cn } from '@/lib/utils'
import { type BlogPostsListData, useInfiniteBlogPosts } from '@/service/blog'

const blogHeroBackground = staticImage('blog-hero-background-ef51ee4b.webp')

interface BlogListClientProps {
  /** First-page data prefetched on the server in useInfiniteQuery format. */
  initialData?: { pages: BlogPostsListData[]; pageParams: number[] }
}

export function BlogListClient({ initialData }: BlogListClientProps) {
  const [visibleCount, setVisibleCount, viewReady] = useNavigationViewState(
    'blog-visible-count',
    BLOG_LIST_INITIAL_VISIBLE
  )
  const listHeadingRef = useRef<HTMLHeadingElement>(null)

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, isError, refetch } =
    useInfiniteBlogPosts(BLOG_LIST_INITIAL_VISIBLE + 1, initialData)

  const posts: BlogPost[] = useMemo(
    () => data?.pages.flatMap((p) => p.items.map(mapListItemToBlogPost)) ?? [],
    [data]
  )

  const listPosts = posts.slice(1)
  const visiblePosts = getVisibleBlogListPosts(listPosts, visibleCount)

  const allPagesLoaded = !hasNextPage
  const isShowingAllLoaded = visibleCount >= listPosts.length
  const canCollapse =
    allPagesLoaded && isShowingAllLoaded && listPosts.length > BLOG_LIST_INITIAL_VISIBLE

  const showLoadControl =
    listPosts.length > BLOG_LIST_INITIAL_VISIBLE ||
    Boolean(hasNextPage) ||
    visibleCount > BLOG_LIST_INITIAL_VISIBLE

  // Refill expanded rows after a full-document Back navigation loses the query cache.
  useEffect(() => {
    if (
      viewReady &&
      shouldFetchMoreBlogListPages({
        visibleCount,
        loadedListCount: listPosts.length,
        hasNextPage: Boolean(hasNextPage),
        isFetchingNextPage
      })
    )
      void fetchNextPage()
  }, [viewReady, visibleCount, listPosts.length, hasNextPage, isFetchingNextPage, fetchNextPage])

  const handleLoadControl = async () => {
    if (canCollapse) {
      flushSync(() => {
        setVisibleCount(BLOG_LIST_INITIAL_VISIBLE)
      })
      const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      listHeadingRef.current?.scrollIntoView({
        behavior: reduceMotion ? 'instant' : 'smooth',
        block: 'start'
      })
      return
    }

    const nextVisible = visibleCount + BLOG_LIST_INITIAL_VISIBLE
    if (nextVisible > listPosts.length && hasNextPage) {
      await fetchNextPage()
    }
    setVisibleCount(nextVisible)
  }

  const featured = posts[0]

  return (
    <div
      className="relative w-full"
      data-scroll-restoration-pending={
        !viewReady ||
        (!isError && (isLoading || (visibleCount > listPosts.length && Boolean(hasNextPage))))
      }
    >
      {featured && (
        <section className="relative mb-12 pt-[calc(var(--nav-h)*2+48px)]">
          <div className="grid gap-12 lg:grid-cols-[minmax(0,480px)_minmax(0,640px)] lg:items-start lg:gap-20">
            <div className="flex w-full max-w-[480px] flex-col gap-6">
              <h1 className="font-[Georgia] text-[64px] leading-[1.02] tracking-[-0.055em] text-[#111] sm:text-[78px] sm:leading-[79.6px]">
                Blog
              </h1>
              <p className="max-w-[480px] text-base leading-[26px] text-[#61615c]">
                Explore AIPOCH Open-Science product updates, research workflows, and practical
                insights for reproducible AI-assisted scientific research.
              </p>
              {/* biome-ignore lint/performance/noImgElement: Figma hero background asset. */}
              <img
                src={blogHeroBackground.src}
                width={blogHeroBackground.width}
                height={blogHeroBackground.height}
                alt=""
                aria-hidden
                draggable={false}
                className="pointer-events-none mx-auto h-auto w-full max-w-[480px] select-none opacity-[0.42] mix-blend-darken"
              />
            </div>
            <BlogCard post={featured} variant="featured" />
          </div>
        </section>
      )}

      <section>
        <div className="mb-8 flex flex-col gap-3">
          <h2
            ref={listHeadingRef}
            className="scroll-mt-[calc(var(--nav-h)+24px)] font-[Georgia] text-[32px] leading-[44px] tracking-[-0.03em] text-[#111] sm:text-[36px]"
          >
            Latest Articles
          </h2>
          <p className="text-base leading-[26px] text-[#6b6b66]">
            Browse the latest updates, research notes, and changelogs from the AIPOCH Open-Science
            team.
          </p>
        </div>

        {isError && (
          <div className="mb-8 rounded border border-[#e5e7eb] bg-white px-4 py-3 text-sm text-[#6b6b66]">
            <p className="mb-2 text-[#111]">Unable to load blog posts.</p>
            <button
              type="button"
              onClick={() => refetch()}
              className="text-sm font-semibold text-[#111] underline underline-offset-2"
            >
              Retry
            </button>
          </div>
        )}

        {(visiblePosts.length > 0 || isFetchingNextPage) && (
          <div className="grid gap-8 md:grid-cols-2 xl:grid-cols-3">
            {visiblePosts.map((post) => (
              <BlogCard key={post.slug} post={post} variant="secondary" />
            ))}
            {isFetchingNextPage &&
              [...Array(BLOG_LIST_INITIAL_VISIBLE)].map((_, index) => (
                <BlogCardSkeleton key={`blog-card-skeleton-${index}`} />
              ))}
          </div>
        )}

        {showLoadControl && !isError && (
          <div className="mt-10 flex justify-center">
            <button
              type="button"
              onClick={handleLoadControl}
              disabled={isFetchingNextPage}
              className={cn(
                'inline-flex h-11 w-[148px] cursor-pointer items-center justify-center gap-2 bg-[#171717] px-4 py-3 text-sm font-semibold leading-5 text-white hover:opacity-80 disabled:pointer-events-none'
              )}
            >
              <span>{canCollapse ? 'Show less' : 'Show more'}</span>
              {canCollapse ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
            </button>
          </div>
        )}

        {posts.length === 0 && !isLoading && !isError && (
          <p className="py-12 text-center text-[#6b6b66]">No blog posts yet.</p>
        )}
      </section>
    </div>
  )
}
