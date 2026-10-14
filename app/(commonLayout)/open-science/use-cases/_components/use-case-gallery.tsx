'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import type { UseCaseIndexEntry } from '@/lib/use-case-types'

import { USE_CASE_BATCH_SIZE } from './use-case-gallery-data'

type GalleryEntry = Pick<UseCaseIndexEntry, 'slug' | 'title' | 'preview'>

const GalleryCard = ({ useCase }: { useCase: GalleryEntry }) => (
  <Link
    href={`/open-science/use-cases/${useCase.slug}`}
    className="group flex min-w-0 flex-col overflow-hidden border border-[#e5e7eb] bg-white transition-colors hover:border-[#999a93] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#171717]"
  >
    <div className={`bg-[#e8e8e4] ${useCase.preview?.image ? '' : 'aspect-[406/190]'}`}>
      {useCase.preview?.image ? (
        // biome-ignore lint/performance/noImgElement: manifest images retain their published URLs.
        <img
          src={useCase.preview.image}
          alt=""
          aria-hidden="true"
          className="block h-auto w-full"
          loading="lazy"
          decoding="async"
        />
      ) : null}
    </div>
    <div className="h-24 px-6 py-4">
      <h2
        title={useCase.title}
        className="line-clamp-2 break-words font-[Georgia,serif] text-[22px] font-normal leading-[30px] text-[#171717]"
      >
        {useCase.title}
      </h2>
    </div>
  </Link>
)

export function UseCaseGallery({
  items,
  category,
  initialCount = USE_CASE_BATCH_SIZE
}: {
  items: GalleryEntry[]
  /** Active catalog filter; kept on the pagination links so they stay filtered. */
  category?: string
  initialCount?: number
}) {
  const [visibleCount, setVisibleCount] = useState(initialCount)
  const sentinel = useRef<HTMLDivElement>(null)
  const hasMore = visibleCount < items.length

  useEffect(() => {
    const target = sentinel.current
    if (!hasMore || !target || typeof IntersectionObserver === 'undefined') return

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return
        // One batch per observation; reconnect after the new cards move the sentinel.
        observer.disconnect()
        setVisibleCount(Math.min(visibleCount + USE_CASE_BATCH_SIZE, items.length))
      },
      { rootMargin: '0px 0px 160px 0px' }
    )
    observer.observe(target)
    return () => observer.disconnect()
  }, [hasMore, items.length, visibleCount])

  return (
    <>
      <div
        id="use-case-grid"
        data-testid="use-case-grid"
        className="grid grid-cols-1 gap-x-7 gap-y-8 sm:grid-cols-2 lg:grid-cols-3"
      >
        {items.slice(0, visibleCount).map((useCase) => (
          <GalleryCard key={useCase.slug} useCase={useCase} />
        ))}
      </div>
      <div ref={sentinel} className="mt-10 flex min-h-11 items-center justify-center">
        {hasMore ? (
          <Link
            href={`/open-science/use-cases?page=${Math.floor(visibleCount / USE_CASE_BATCH_SIZE) + 1}${category ? `&category=${encodeURIComponent(category)}` : ''}#use-case-grid`}
            prefetch={false}
            aria-controls="use-case-grid"
            onClick={(event) => {
              if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
              event.preventDefault()
              setVisibleCount((count) => Math.min(count + USE_CASE_BATCH_SIZE, items.length))
            }}
            className="min-h-11 border border-[#e7e5de] px-5 py-2.5 text-sm text-[#171717] transition-colors hover:border-[#171717] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#171717]"
          >
            Load more use cases
          </Link>
        ) : (
          <p className="text-sm text-[#6b6b66]">All use cases loaded</p>
        )}
      </div>
      <p role="status" className="sr-only">
        Showing {Math.min(visibleCount, items.length)} of {items.length} use cases
      </p>
    </>
  )
}
