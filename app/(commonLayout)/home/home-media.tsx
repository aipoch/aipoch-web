'use client'

import { Play } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { HomeSpotlightMediaItem } from './home-spotlight-content'

export const HomeMedia = ({ media }: { media: HomeSpotlightMediaItem[] }) => {
  const item = media.find((candidate) => candidate.kind === 'video')
  const videoRef = useRef<HTMLVideoElement>(null)
  const [started, setStarted] = useState(false)
  const [error, setError] = useState(false)

  useEffect(() => {
    const video = videoRef.current
    // Autoplay (or an error) may occur before React attaches the media listeners.
    if (video) {
      setStarted(!video.paused && !video.error)
      setError(Boolean(video.error))
    }
  }, [])

  const play = async () => {
    const video = videoRef.current
    if (!video || !item) return
    video.scrollIntoView({ block: 'center', behavior: 'instant' })
    if (error) video.load()
    setError(false)
    setStarted(true)
    try {
      await video.play()
    } catch {
      setStarted(false)
      setError(Boolean(video.error))
    }
  }

  return (
    <>
      <div className="mx-auto mb-16 max-w-[720px] text-center">
        <p className="mb-6 font-mono text-[10px] uppercase tracking-[.06em] text-[#61615c]">
          Product tour / Video
        </p>
        <h2 className="font-[Georgia] text-[40px] leading-[1.05] tracking-[-.04em] sm:text-[56px]">
          See Open-Science in Action
        </h2>
        <p className="mt-6 text-base leading-[26px] text-[#6b6b66]">
          Find installation steps, project setup, workspace guides, and troubleshooting. Check the
          documented version when following instructions.
        </p>
        <button
          type="button"
          onClick={() => void play()}
          disabled={!item}
          className="mt-6 inline-flex h-12 items-center bg-[#111] px-6 text-base text-white transition-colors hover:bg-[#333] disabled:cursor-not-allowed disabled:opacity-50"
        >
          Watch the Product Tour
        </button>
      </div>
      <div
        id="tour-media"
        className="relative mx-auto aspect-video max-w-[1370px] overflow-hidden rounded-lg bg-[#eeeae1]"
      >
        {item ? (
          <video
            ref={videoRef}
            data-testid="home-tour-video"
            src={item.url}
            aria-label={item.label}
            controls={started}
            autoPlay
            muted
            playsInline
            preload="metadata"
            poster="/figma/landing/tour-poster.png"
            className={`size-full ${started ? 'object-contain' : 'object-cover'}`}
            onPlay={() => {
              setStarted(true)
              setError(false)
            }}
            onError={() => {
              setError(true)
              setStarted(false)
            }}
          >
            <track kind="captions" />
          </video>
        ) : (
          /* biome-ignore lint/performance/noImgElement: The poster is a static Figma asset, independent of API availability. */
          <img
            src="/figma/landing/tour-poster.png"
            alt="Open-Science product tour"
            width={1370}
            height={771}
            loading="lazy"
            className="size-full object-cover"
          />
        )}
        {!started && (
          <div aria-hidden className="pointer-events-none absolute inset-0 bg-black/20" />
        )}
        {!started && item ? (
          <button
            type="button"
            aria-label={error ? 'Retry product tour' : 'Play product tour'}
            onClick={() => void play()}
            className="absolute left-1/2 top-1/2 flex size-[62px] -translate-x-1/2 -translate-y-1/2 items-center justify-center bg-[#fbdd67] text-[#111] transition hover:bg-[#f1ce48] hover:shadow-lg"
          >
            <Play className="size-6 fill-current" aria-hidden />
          </button>
        ) : null}
        {error || !item ? (
          <p
            role="status"
            className="absolute inset-x-4 bottom-4 bg-[#f7f7f5]/95 p-3 text-center text-sm text-[#61615c]"
          >
            {error
              ? 'The video could not load. Try again.'
              : 'The product tour is temporarily unavailable.'}
          </p>
        ) : null}
      </div>
    </>
  )
}
