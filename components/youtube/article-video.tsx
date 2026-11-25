'use client'

import { useEffect, useRef, useState } from 'react'
import { loadYouTubePlayer, type YouTubePlayer } from '@/lib/youtube-player'
import { AutoplayYoutubeEmbed } from './autoplay-youtube-embed'
import { VideoPlayIndicator } from './video-play-indicator'

/** Retain the server-rendered privacy-enhanced iframe and its native controls as a fallback. */
export function ArticleVideo({ videoId, title }: { videoId: string; title: string }) {
  const container = useRef<HTMLDivElement>(null)
  const player = useRef<YouTubePlayer | null>(null)
  const [state, setState] = useState<'loading' | 'play' | 'native'>('loading')
  useEffect(() => {
    const iframe = container.current?.querySelector('iframe')
    if (!iframe) return
    let active = true
    const settle = (next: typeof state) => {
      if (!active) return
      clearTimeout(timer)
      setState(next)
    }
    const fallback = () => setTimeout(() => settle('native'), 15000)
    let timer = fallback()
    loadYouTubePlayer()
      .then((api) => {
        if (!active) return
        player.current = new api.Player(iframe, {
          videoId,
          width: '100%',
          height: '100%',
          playerVars: {},
          events: {
            onReady: ({ target }) => {
              if (active) {
                target.mute()
                target.playVideo()
              }
            },
            onStateChange: ({ data }) => {
              if (data === 1) settle('native')
              if (data === 2 || data === 5) settle('play')
              if (data === 3 && active) {
                setState('loading')
                clearTimeout(timer)
                timer = fallback()
              }
            },
            onAutoplayBlocked: () => settle('play'),
            onError: () => settle('native')
          }
        })
      })
      .catch(() => settle('native'))
    return () => {
      active = false
      clearTimeout(timer)
      player.current?.destroy()
      player.current = null
    }
  }, [videoId])
  return (
    <div ref={container} className="relative">
      <AutoplayYoutubeEmbed videoId={videoId} title={title} enableApi />
      {state !== 'native' && (
        <button
          type="button"
          aria-label={`Play ${title}`}
          onClick={() => player.current?.playVideo()}
          className="absolute top-1/2 left-1/2 size-14 -translate-x-1/2 -translate-y-1/2 rounded-full focus-visible:outline-2 focus-visible:outline-white"
        >
          <VideoPlayIndicator loading={state === 'loading'} />
        </button>
      )}
    </div>
  )
}
