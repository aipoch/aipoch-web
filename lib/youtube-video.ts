const YOUTUBE_HOSTS = new Set(['youtube.com', 'www.youtube.com', 'm.youtube.com'])
const EMBED_HOSTS = new Set(['youtube-nocookie.com', 'www.youtube-nocookie.com'])

/** Accept only complete video IDs on known YouTube hosts, never arbitrary iframe URLs. */
export function youtubeVideoId(value: string): string | null {
  try {
    const url = new URL(value.replaceAll('&amp;', '&'))
    if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) return null
    let id: string | null | undefined
    if (url.hostname === 'youtu.be') id = /^\/([^/]+)\/?$/.exec(url.pathname)?.[1]
    if (YOUTUBE_HOSTS.has(url.hostname)) {
      id =
        url.pathname === '/watch'
          ? url.searchParams.get('v')
          : /^\/(?:embed|shorts|live)\/([^/]+)\/?$/.exec(url.pathname)?.[1]
    }
    if (EMBED_HOSTS.has(url.hostname)) id = /^\/embed\/([^/]+)\/?$/.exec(url.pathname)?.[1]
    return id && /^[A-Za-z0-9_-]{11}$/.test(id) ? id : null
  } catch {
    return null
  }
}

/** Find Markdown links, autolinks, bare URLs and HTML embeds in their article order. */
export function extractYouTubeVideoIds(content: string): string[] {
  const ids = new Set<string>()
  for (const match of content.matchAll(/https?:\/\/[^\s<>"'`[\]()]+/gi)) {
    const id = youtubeVideoId(match[0].replace(/[.,;!?]+$/, ''))
    if (id) ids.add(id)
  }
  return [...ids]
}
