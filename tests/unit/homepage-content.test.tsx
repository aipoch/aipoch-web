import { describe, expect, test } from 'bun:test'
import { renderToStaticMarkup } from 'react-dom/server'
import { formatCompactGithubCount } from '../../app/(commonLayout)/home/home-data'
import { HomePage } from '../../app/(commonLayout)/home/home-page'
import type { HomepagePublicConfig, HomepageReadWatchResponse } from '../../service/homepage'

const sampleOpenScienceConfig: HomepagePublicConfig = {
  release_version: 'v0.16.0',
  latest_release_update: 'Aug 16, 2026',
  latest_release_title: 'v0.16.0',
  latest_release_desc: 'Release description',
  latest_release_features: [
    {
      title: 'Branch a conversation',
      text: 'start a new session from any message path without touching the original'
    }
  ],
  media: [
    {
      title: 'Product tour',
      url: 'https://statics.aipoch.com/public/f/video/open-science-v0-10-0-9ca70918.mp4'
    },
    {
      title: 'Workspace',
      url: 'https://statics.aipoch.com/public/f/image/figma-5fcb02c8.webp'
    }
  ],
  what_it_does: [
    { title: 'Execution, not suggestions', text: 'runs commands, Python and R with your approval' }
  ]
}

const sampleReadWatch: HomepageReadWatchResponse = {
  items: [
    {
      title: 'Release notes and changelog',
      category: 'Product',
      published_at: '2026-08-04T00:00:00.000Z',
      slug: 'release-notes'
    }
  ]
}

/** Mimic crawlers that strip tags without inserting spaces for <br>/block boundaries. */
const seoPlainFromMarkup = (markup: string) =>
  markup
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<[^>]+>/g, '')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/gi, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')

const headingOutlineFromMarkup = (html: string) =>
  Array.from(html.matchAll(/<h([1-3])\b[^>]*>([\s\S]*?)<\/h\1>/g), ([, level, content]) => ({
    level: Number(level),
    text: seoPlainFromMarkup(content ?? '')
      .replace(/\s+/g, ' ')
      .trim()
  }))

describe('Figma homepage with existing live data contracts', () => {
  const render = () =>
    renderToStaticMarkup(
      <HomePage
        openScienceConfig={sampleOpenScienceConfig}
        readWatch={sampleReadWatch}
        skillsCount={612}
      />
    )

  test('renders the design section order and removes superseded modules', () => {
    const html = render()
    const ids = [
      'home-hero',
      'product-tour',
      'ecosystem',
      'open-science-spotlight',
      'open-science',
      'skills',
      'audit'
    ]
    const positions = ids.map((id) => html.indexOf(`id="${id}"`))
    expect(positions.every((position) => position >= 0)).toBe(true)
    expect(positions).toEqual([...positions].sort((a, b) => a - b))
    for (const legacy of [
      'skills-install-terminal',
      'ecosystem-detail',
      'closing-title',
      'Claude Subscription',
      'id="close"'
    ])
      expect(html).not.toContain(legacy)
    const outline = headingOutlineFromMarkup(html)
    expect(outline.filter((heading) => heading.level === 1)).toEqual([
      { level: 1, text: 'Science, Open to All' }
    ])
    expect(outline).toContainEqual({ level: 2, text: 'Medical Research Agent Skills' })
    expect(html).not.toContain('line-clamp')
  })

  test('keeps downloads accessible before hydration and uses the approved license URL', () => {
    const hero = render().split('id="home-hero"')[1]?.split('</section>')[0] ?? ''
    expect(hero).not.toContain('inert=""')
    expect(hero).not.toContain('style="opacity:0"')
    for (const platform of ['Windows', 'Linux', 'macOS'])
      expect(hero).toContain(`aria-label="Download ${platform}"`)
    expect(hero).toContain('Apple Silicon / Intel')
    expect(hero).toContain('https://github.com/aipoch/open-science?tab=Apache-2.0-1-ov-file')
    expect(hero).toContain('>500+</strong>')
    expect(hero).toContain('>24</strong>')
  })

  test('uses API counts, release details, articles, media and overview content', () => {
    const html = render()
    for (const text of [
      '612',
      'v0.16.0',
      sampleOpenScienceConfig.latest_release_title,
      'Release description',
      'Branch a conversation',
      'start a new session from any message path without touching the original',
      'Release notes and changelog',
      'Execution, not suggestions',
      'runs commands, Python and R with your approval'
    ])
      expect(html).toContain(text)
    expect(html).toContain('href="/blog/release-notes"')
    expect(html).toContain(`src="${sampleOpenScienceConfig.media[0].url}"`)
    expect(html).toContain(`src="${sampleOpenScienceConfig.media[1].url}"`)
    expect(html).toContain('preload="metadata"')
    expect(html).toContain('poster="/figma/landing/tour-poster.png"')
    expect(html).toContain('autoPlay=""')
    expect(html).toContain('muted=""')
    expect(html).toContain('aria-label="Play product tour"')
  })

  test('preserves the static design preview when live APIs contain only a video', () => {
    const html = renderToStaticMarkup(
      <HomePage
        openScienceConfig={{
          ...sampleOpenScienceConfig,
          media: [sampleOpenScienceConfig.media[0]]
        }}
      />
    )
    expect(html).toContain('/figma/landing/spotlight-workspace.png')
    expect(html).toContain(sampleOpenScienceConfig.media[0].url)
    expect(html).not.toContain('figma.com/api/mcp/asset')
  })

  test('does not add a separate version row below the API release title', () => {
    const html = renderToStaticMarkup(
      <HomePage
        openScienceConfig={{
          ...sampleOpenScienceConfig,
          latest_release_title: 'Research workflow improvements',
          release_version: 'v9.9.9'
        }}
      />
    )
    expect(html).toContain('Research workflow improvements')
    expect(html).not.toContain('v9.9.9')
  })

  test('keeps the design readable and playback unavailable when media fails or is unknown', () => {
    for (const config of [
      null,
      {
        ...sampleOpenScienceConfig,
        media: [{ title: 'Unknown', url: 'https://statics.aipoch.com/unknown.webp1' }]
      }
    ]) {
      const html = renderToStaticMarkup(<HomePage openScienceConfig={config} readWatch={null} />)
      expect(html).toContain('The product tour is temporarily unavailable.')
      expect(html).not.toContain('<video')
      expect(html).not.toContain('src="https://statics.aipoch.com/unknown.webp1"')
      expect(html).toContain('/figma/landing/spotlight-workspace.png')
      expect(html).not.toContain('Release notes and changelog')
    }
  })

  test('includes all workflow descriptions and meaningful static image alternatives', () => {
    const html = render()
    for (const step of ['plan', 'execute', 'produce', 'review'])
      expect(html).toContain(`aria-controls="workflow-${step}-detail"`)
    expect(html).toContain('Open-Science plan workflow preview')
    expect(html).toContain('Search, assess, and synthesize research evidence.')
    expect(html).toContain(
      'Draft manuscripts, methods, and figure descriptions for researcher review.'
    )
    expect(html).toContain('any other SKILL.md-compatible agent')
    expect(html).toContain('/figma/landing/audit-flow.png')
    expect(html).toContain('Production Ready, Limited Release, Beta Only, or Rejected.')
  })

  test('formats GitHub counts consistently', () => {
    for (const [value, expected] of [
      [999, '999'],
      [1200, '1.2K'],
      [3500, '3.5K'],
      [10000, '10K'],
      [1250000, '1.3M']
    ] as const)
      expect(formatCompactGithubCount(value)).toBe(expected)
  })
})
