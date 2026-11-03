'use client'

import { useEffect, useRef, useState } from 'react'
import type { UseCaseVideo } from '@/lib/use-case-types'
import { loadYouTubePlayer, type YouTubePlayer } from '@/lib/youtube-player'

/** Keep the cover or placeholder visible until playback starts, including previews. */
export function UseCaseVideoPlayer({
  video,
  preview = false
}: {
  video: UseCaseVideo
  preview?: boolean
}) {
  const container = useRef<HTMLDivElement>(null)
  const [playing, setPlaying] = useState(false)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (failed) return
    let disposed = false
    let player: YouTubePlayer | undefined
    const fail = () => {
      if (!disposed) setFailed(true)
    }
    const timeout = setTimeout(fail, 15000)
    loadYouTubePlayer()
      .then((api) => {
        if (disposed || !container.current) return
        const mount = document.createElement('div')
        container.current.replaceChildren(mount)
        player = new api.Player(mount, {
          videoId: video.id,
          width: '100%',
          height: '100%',
          playerVars: {
            autoplay: 1,
            mute: 1,
            playsinline: 1,
            controls: preview ? 0 : 1,
            disablekb: preview ? 1 : 0,
            fs: preview ? 0 : 1,
            origin: window.location.origin,
            loop: preview ? 1 : 0,
            playlist: video.id
          },
          events: {
            onReady: ({ target }) => {
              if (disposed) return
              const frame = target.getIframe()
              frame.title = video.title || 'Use case video'
              frame.tabIndex = preview ? -1 : 0
              if (preview) frame.style.pointerEvents = 'none'
              target.mute()
              target.playVideo()
            },
            onStateChange: ({ data }) => {
              if (!disposed && data === 1) {
                clearTimeout(timeout)
                setPlaying(true)
              }
            },
            onError: fail,
            onAutoplayBlocked: fail
          }
        })
      })
      .catch(fail)
    return () => {
      disposed = true
      clearTimeout(timeout)
      player?.destroy()
    }
  }, [video.id, video.title, preview, failed])

  if (failed) return null
  return (
    <div
      data-testid="use-case-video"
      data-playing={playing}
      aria-hidden={preview || !playing}
      inert={preview || !playing}
      className={`absolute inset-0 h-full w-full ${playing ? 'opacity-100' : 'pointer-events-none opacity-0'} ${preview ? 'pointer-events-none' : ''}`}
    >
      <div ref={container} className="absolute inset-0 h-full w-full" />
    </div>
  )
}
