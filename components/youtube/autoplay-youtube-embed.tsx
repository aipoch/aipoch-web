type AutoplayYoutubeEmbedProps = {
  videoId: string
  title: string
}

/** Muted playback lets browsers start the video without a preceding user gesture. */
export function AutoplayYoutubeEmbed({ videoId, title }: AutoplayYoutubeEmbedProps) {
  const params = new URLSearchParams({
    autoplay: '1',
    mute: '1',
    loop: '1',
    playlist: videoId,
    playsinline: '1',
    rel: '0'
  })

  return (
    <iframe
      src={`https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoId)}?${params}`}
      title={title}
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
      allowFullScreen
      referrerPolicy="strict-origin-when-cross-origin"
      className="aspect-video min-h-[200px] w-full rounded-lg border-0 bg-black"
    />
  )
}
