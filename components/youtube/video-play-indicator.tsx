import { Play } from 'lucide-react'

export function VideoPlayIndicator({ loading = false }: { loading?: boolean }) {
  return (
    <span
      aria-hidden="true"
      data-testid="video-play-indicator"
      className="pointer-events-none absolute inset-0 flex items-center justify-center"
    >
      <span className="relative grid size-14 place-items-center rounded-full bg-black/65 text-white shadow-lg">
        <span
          data-loading={loading}
          className={`absolute inset-0 rounded-full border-2 ${loading ? 'animate-spin border-white/30 border-t-white motion-reduce:animate-none' : 'border-white/80'}`}
        />
        <Play className="ml-1 size-6 fill-current" />
      </span>
    </span>
  )
}
