import { describe, expect, test } from 'bun:test'
import { renderToStaticMarkup } from 'react-dom/server'
import { AutoplayYoutubeEmbed } from '../../components/youtube/autoplay-youtube-embed'
import { extractVideosFromContent } from '../../lib/blog'
import { extractYouTubeVideoIds, youtubeVideoId } from '../../lib/youtube-video'

describe('article YouTube videos', () => {
  const id = 'ijpmwTPK8pU'

  test('supports watch, shared, mobile, Shorts, live and privacy-enhanced embeds', () => {
    for (const url of [
      `https://www.youtube.com/watch?feature=shared&v=${id}&t=30`,
      `https://m.youtube.com/watch?feature=shared&amp;v=${id}`,
      `https://youtu.be/${id}?si=share`,
      `https://youtube.com/shorts/${id}`,
      `https://youtube.com/live/${id}`,
      `https://www.youtube-nocookie.com/embed/${id}`
    ])
      expect(youtubeVideoId(url)).toBe(id)
  })

  test('rejects lookalike hosts, credentials, playlists and malformed video IDs', () => {
    for (const url of [
      `https://notyoutube.com/watch?v=${id}`,
      `https://youtube.com.example.com/watch?v=${id}`,
      `https://youtube.com@evil.test/watch?v=${id}`,
      `https://user@youtube.com/watch?v=${id}`,
      `https://youtube.com/watch?v=${id}extra`,
      'https://youtube.com/watch?v=short',
      'https://youtube.com/playlist?list=PL123',
      'javascript:alert(1)'
    ])
      expect(youtubeVideoId(url)).toBeNull()
  })

  test('deduplicates Markdown, bare URLs, reference links and HTML in content order', () => {
    const content = `[Watch](https://youtu.be/${id}).
<iframe src="https://www.youtube.com/embed/M7lc1UVf-VE"></iframe>
<https://www.youtube.com/watch?v=${id}>
[reference]: https://youtube.com/shorts/M7lc1UVf-VE
https://youtube.com/live/aqz-KE-bpKQ.`
    expect(extractYouTubeVideoIds(content)).toEqual([id, 'M7lc1UVf-VE', 'aqz-KE-bpKQ'])
    expect(extractVideosFromContent(content).map((video) => video.embedUrl)).toEqual([
      `https://www.youtube.com/embed/${id}`,
      'https://www.youtube.com/embed/M7lc1UVf-VE',
      'https://www.youtube.com/embed/aqz-KE-bpKQ'
    ])
    expect(extractYouTubeVideoIds('An article without videos.')).toEqual([])
  })

  test('server-renders muted, inline autoplay with a single-video loop and player controls', () => {
    const html = renderToStaticMarkup(<AutoplayYoutubeEmbed videoId={id} title="Overview" />)
    const src = html.match(/src="([^"]+)"/)?.[1]?.replaceAll('&amp;', '&')
    const url = new URL(src ?? '')
    expect(url.origin).toBe('https://www.youtube-nocookie.com')
    expect(Object.fromEntries(url.searchParams)).toMatchObject({
      autoplay: '1',
      mute: '1',
      loop: '1',
      playlist: id,
      playsinline: '1'
    })
    expect(html).toContain('allowFullScreen')
    expect(html).toContain('autoplay;')
    expect(html).toContain('title="Overview"')
  })
})
