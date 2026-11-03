'use client'

import { Play } from 'lucide-react'
import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigationViewState } from '@/hooks/use-navigation-view-state'
import type { UseCaseIndexEntry } from '@/lib/use-case-types'

import { USE_CASE_BATCH_SIZE } from './use-case-gallery-data'
import { UseCaseVideoPlayer } from './use-case-video'

type GalleryEntry = Pick<UseCaseIndexEntry, 'slug' | 'title' | 'preview' | 'video'>
type ImageSize = { width: number; height: number }
type GalleryView = { count: number; images: Record<string, ImageSize> }

// Published use-case covers use a shared 1097x617 canvas; reserve it before the image responds.
const FALLBACK_IMAGE_SIZE: ImageSize = { width: 1097, height: 617 }
const FALLBACK_IMAGE_RATIO = FALLBACK_IMAGE_SIZE.width / FALLBACK_IMAGE_SIZE.height

const CoverPlaceholder = ({ loading }: { loading: boolean }) => (
  <div
    data-testid="use-case-cover-placeholder"
    data-loading={loading}
    aria-hidden="true"
    className="absolute inset-0 overflow-hidden bg-[#e8e8e4]"
  >
    <span
      className={`pointer-events-none absolute inset-y-0 left-[-30%] w-[30%] bg-gradient-to-r from-transparent via-white/55 to-transparent ${loading ? 'animate-[use-case-cover-shimmer_1.8s_ease-in-out_infinite] motion-reduce:animate-none' : 'opacity-0'}`}
    />
    <svg
      className={`absolute left-1/2 top-1/2 h-[64%] w-[34%] -translate-x-1/2 -translate-y-1/2 text-[#b7b8b1] ${loading ? 'animate-[pulse_2.8s_ease-in-out_infinite] motion-reduce:animate-none' : ''}`}
      viewBox="0 0 180 130"
      fill="none"
    >
      <rect x="35" y="20" width="110" height="86" rx="3" stroke="currentColor" strokeWidth="2" />
      <path d="m52 82 22-19 19 12 19-25 20 18" stroke="currentColor" strokeWidth="2" />
      <path d="M52 92h80" stroke="currentColor" strokeWidth="2" />
      <circle cx="75" cy="43" r="7" fill="currentColor" />
    </svg>
  </div>
)

const GalleryCard = ({
  useCase,
  imageSize,
  onImageLoad
}: {
  useCase: GalleryEntry
  imageSize?: ImageSize
  onImageLoad: (image: HTMLImageElement) => void
}) => {
  const [active, setActive] = useState(false)
  const [imageState, setImageState] = useState<'loading' | 'loaded' | 'error'>(
    useCase.preview?.image ? 'loading' : 'error'
  )
  return (
    <Link
      onMouseEnter={() => setActive(true)}
      onMouseLeave={() => setActive(false)}
      onFocus={() => setActive(true)}
      onBlur={() => setActive(false)}
      href={`/open-science/use-cases/${useCase.slug}`}
      className="group flex min-w-0 flex-col overflow-hidden border border-[#e5e7eb] bg-white transition-colors hover:border-[#999a93] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#171717]"
    >
      <div
        className={`relative bg-[#e8e8e4] ${imageState === 'loaded' ? '' : 'aspect-[1097/617]'}`}
        style={imageState === 'loaded' ? undefined : { aspectRatio: FALLBACK_IMAGE_RATIO }}
      >
        {useCase.preview?.image && imageState !== 'error' ? (
          // biome-ignore lint/performance/noImgElement: manifest images retain their published URLs.
          <img
            src={useCase.preview.image}
            alt=""
            aria-hidden="true"
            className={`block h-auto w-full transition-opacity duration-300 ${imageState === 'loaded' ? 'opacity-100' : 'opacity-0'}`}
            loading="lazy"
            decoding="async"
            width={imageSize?.width ?? FALLBACK_IMAGE_SIZE.width}
            height={imageSize?.height ?? FALLBACK_IMAGE_SIZE.height}
            onLoad={(event) => {
              onImageLoad(event.currentTarget)
              setImageState('loaded')
            }}
            onError={() => setImageState('error')}
          />
        ) : null}
        {imageState !== 'loaded' ? <CoverPlaceholder loading={imageState === 'loading'} /> : null}
        {useCase.video ? (
          <>
            <span
              aria-hidden="true"
              data-testid="video-play-indicator"
              className="pointer-events-none absolute inset-0 flex items-center justify-center"
            >
              <span className="flex size-14 items-center justify-center rounded-full bg-black/65 text-white shadow-lg">
                <Play className="ml-1 size-6 fill-current" />
              </span>
            </span>
            {active ? (
              <>
                <UseCaseVideoPlayer key={useCase.video.id} video={useCase.video} preview />
                {/* Keep hover and clicks on the card, outside the cross-origin player. */}
                <span
                  aria-hidden="true"
                  className="absolute inset-0 z-10"
                  data-testid="video-preview-hit-area"
                />
              </>
            ) : null}
          </>
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
}

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
  const [view, setView, viewReady] = useNavigationViewState<GalleryView>(
    `use-case-gallery:${category ?? 'all'}`,
    { count: initialCount, images: {} }
  )
  const visibleCount = Math.max(initialCount, view.count)
  const sentinel = useRef<HTMLDivElement>(null)
  const hasMore = visibleCount < items.length

  // Save presentation state per history entry; fresh server data remains authoritative.
  const expand = useCallback(() => {
    setView((current) => ({
      ...current,
      count: Math.min(Math.max(initialCount, current.count) + USE_CASE_BATCH_SIZE, items.length)
    }))
  }, [initialCount, items.length, setView])

  // Reuse measured natural dimensions on return without cropping covers or caching content.
  const rememberImageSize = useCallback(
    (image: HTMLImageElement) => {
      const { naturalWidth: width, naturalHeight: height } = image
      if (!width || !height) return
      const src = image.getAttribute('src')
      if (!src) return
      setView((current) =>
        current.images[src]?.width === width && current.images[src]?.height === height
          ? current
          : { ...current, images: { ...current.images, [src]: { width, height } } }
      )
    },
    [setView]
  )

  useEffect(() => {
    const target = sentinel.current
    if (
      !viewReady ||
      visibleCount >= items.length ||
      !target ||
      typeof IntersectionObserver === 'undefined'
    )
      return

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return
        // One batch per observation; reconnect after the new cards move the sentinel.
        observer.disconnect()
        expand()
      },
      { rootMargin: '0px 0px 160px 0px' }
    )
    observer.observe(target)
    return () => observer.disconnect()
    // Reconnect when another batch moves the sentinel, even if more cards remain.
  }, [viewReady, items.length, visibleCount, expand])

  return (
    <>
      <div
        id="use-case-grid"
        data-testid="use-case-grid"
        data-scroll-restoration-pending={!viewReady}
        className="grid grid-cols-1 gap-x-7 gap-y-8 sm:grid-cols-2 lg:grid-cols-3"
      >
        {items.slice(0, visibleCount).map((useCase) => (
          <GalleryCard
            key={useCase.slug}
            useCase={useCase}
            imageSize={view.images[useCase.preview?.image ?? '']}
            onImageLoad={rememberImageSize}
          />
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
              expand()
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
