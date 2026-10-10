import { describe, expect, mock, test } from 'bun:test'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { renderToStaticMarkup } from 'react-dom/server'

let mockPathname = '/agent-skills'

mock.module('next/navigation', () => ({
  notFound: () => {
    throw new Error('NEXT_NOT_FOUND')
  },
  redirect: (url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`)
  },
  unstable_rethrow: (error: unknown) => {
    throw error
  },
  usePathname: () => mockPathname
}))

const { Navbar } = await import('../../components/navbar')
const { navActions, navItems } = await import('../../components/navbar/navbar-data')

describe('navbar', () => {
  test('marks the current child for accessibility without retaining a selected background', () => {
    mockPathname = '/agent-skills/list'

    const html = renderToStaticMarkup(<Navbar />)

    expect(html).toContain('href="/agent-skills/list"')
    expect(html).toMatch(/<a[^>]*aria-current="page"[^>]*href="\/agent-skills\/list"/)
    expect(html).not.toMatch(/<a[^>]*aria-current="page"[^>]*href="\/agent-skills"/)
    const currentLink = html.match(/<a[^>]*aria-current="page"[^>]*href="\/agent-skills\/list"/)
    expect(currentLink?.[0]).toContain('bg-transparent')
    expect(currentLink?.[0]).not.toMatch(/\sbg-\[#f3f3f3\]/)
  })

  test('replaces Product with Use Cases and makes Benchmark a direct link', () => {
    mockPathname = '/'
    const html = renderToStaticMarkup(<Navbar />)

    expect(navItems.map((item) => item.label)).toEqual([
      'Open-Science',
      'Use Cases',
      'Agent Skills',
      'Benchmark',
      'Blog'
    ])
    expect(html).toContain('href="/open-science/use-cases"')
    expect(html).toContain('href="/medskillaudit"')
    expect(html).not.toContain('Product')
    expect(html).not.toContain('Workflow benchmark suite')
    expect(html).not.toContain('Clinical research workflows')
    expect(html).not.toContain('desktop-nav-trigger-benchmark')
    expect(html).not.toContain('desktop-nav-trigger-product')
    expect(html).not.toContain('mobile-nav-benchmark')
    expect(html).not.toContain('mobile-nav-product')
    expect(html).toContain('Browse every medical skill')
  })

  test('renders Open-Science as the first standalone navigation item', () => {
    mockPathname = '/open-science'
    const html = renderToStaticMarkup(<Navbar />)

    expect(navItems[0]).toEqual({ type: 'link', label: 'Open-Science', href: '/open-science' })
    expect(html).toMatch(/<a[^>]*aria-current="page"[^>]*href="\/open-science"/)
  })

  test('renders Docs and Download as right-side navigation actions', () => {
    const html = renderToStaticMarkup(<Navbar />)

    expect(navActions).toEqual([
      { label: 'Docs', href: 'https://aipoch.com/docs/' },
      { label: 'Download', href: '/open-science/download', emphasis: true }
    ])
    expect(html).toContain('data-testid="navbar-actions"')
    expect(html).toContain('href="https://aipoch.com/docs/"')
    expect(html).toContain('href="/open-science/download"')
  })

  test('matches the desktop navigation chrome and dropdown alignment from the design', () => {
    mockPathname = '/'

    const html = renderToStaticMarkup(<Navbar />)
    const skillsTrigger = html.match(
      /<button[^>]*data-testid="desktop-nav-trigger-agent-skills"[^>]*>[\s\S]*?<\/button>/
    )?.[0]
    const openScienceLink = html.match(/<a[^>]*href="\/open-science"[^>]*>Open-Science<\/a>/)?.[0]
    const primaryAction = html.match(
      /<a[^>]*href="\/open-science\/download"[^>]*>Download<\/a>/
    )?.[0]

    expect(skillsTrigger).toBeDefined()
    expect(skillsTrigger).not.toContain('<svg')
    expect(html).toMatch(
      /<button[^>]*aria-controls="mobile-nav-agent-skills"[^>]*>[\s\S]*?<svg[\s\S]*?<\/button>/
    )
    expect(html).toContain('data-desktop-nav-panel=""')
    expect(html).toMatch(
      /data-desktop-nav-panel="" class="[^"]*fixed[^"]*top-\[calc\(var\(--nav-h\)\+1px\)\]/
    )
    expect(html).toContain('absolute inset-x-0 mx-auto hidden w-fit')
    expect(html).not.toContain('-translate-x-1/2')
    expect(html).not.toContain('before:shadow-none')
    expect(html).not.toContain('before:border-transparent')
    expect(openScienceLink).not.toContain('uppercase')
    expect(openScienceLink).not.toContain('tracking-[0.08em]')
    expect(primaryAction).toContain('rounded-none')
    expect(primaryAction).not.toContain('uppercase')
  })

  test('uses text-only hover states for plain desktop links and Docs', () => {
    mockPathname = '/open-science'

    const html = renderToStaticMarkup(<Navbar />)
    const navbarSource = readFileSync(join(process.cwd(), 'components/navbar/index.tsx'), 'utf8')
    const plainLinks = [...html.matchAll(/<a[^>]*data-nav-plain-link=""[^>]*>/g)].map(
      ([link]) => link
    )
    const skillsTrigger = html.match(
      /<button[^>]*data-testid="desktop-nav-trigger-agent-skills"[^>]*>/
    )?.[0]
    const primaryAction = html.match(
      /<a[^>]*href="\/open-science\/download"[^>]*>Download<\/a>/
    )?.[0]

    expect(plainLinks).toHaveLength(5)
    expect(plainLinks.every((link) => !link.includes('bg-'))).toBe(true)
    expect(plainLinks.every((link) => !link.includes('hover:bg-'))).toBe(true)
    expect(navbarSource).not.toContain("[&_a[aria-current='page']]")
    expect(skillsTrigger).toContain('hover:bg-')
    expect(primaryAction).toContain('bg-black')
  })

  test('keeps MedSkillAudit and Guides on the existing project routes', () => {
    mockPathname = '/agent-skills'

    const html = renderToStaticMarkup(<Navbar />)

    expect(html).toContain('href="/medskillaudit"')
    expect(html).toContain('href="/guides"')
    expect(html).not.toContain('href="/benchmark"')
  })

  test('marks only Use Cases current on the gallery, details and replay pages', () => {
    for (const pathname of [
      '/open-science/use-cases',
      '/open-science/use-cases/can-ai-spot-the-errors-in-a-spreadsheet',
      '/open-science/use-cases/can-ai-spot-the-errors-in-a-spreadsheet/replay'
    ]) {
      mockPathname = pathname
      const html = renderToStaticMarkup(<Navbar />)
      const currentLinks = [...html.matchAll(/<a[^>]*aria-current="page"[^>]*>/g)]
      expect(currentLinks).toHaveLength(2)
      expect(currentLinks.every(([link]) => link.includes('href="/open-science/use-cases"'))).toBe(
        true
      )
      expect(html).not.toMatch(/<a[^>]*aria-current="page"[^>]*href="\/open-science"/)
    }
  })

  test('marks Benchmark current as a standalone link on MedSkillAudit', () => {
    mockPathname = '/medskillaudit'
    const html = renderToStaticMarkup(<Navbar />)
    expect(html).toMatch(
      /<a[^>]*aria-current="page"[^>]*href="\/medskillaudit"[^>]*>Benchmark<\/a>/
    )
    expect(html).not.toContain('Workflow benchmark suite')
  })

  test('adds spacing between submenu items on desktop and mobile', () => {
    mockPathname = '/agent-skills'

    const html = renderToStaticMarkup(<Navbar />)

    expect(html).toContain('flex flex-col gap-1')
    expect(html).toContain('flex flex-col gap-1.5')
  })

  test('keeps Agent Skills collapsed when a standalone route is active', () => {
    mockPathname = '/open-science/use-cases'
    const html = renderToStaticMarkup(<Navbar />)
    expect(html).toMatch(/aria-expanded="false" aria-controls="mobile-nav-agent-skills"/)
    expect(html).toMatch(
      /id="mobile-nav-agent-skills"[^>]*data-open="false"[^>]*aria-hidden="true"[^>]*grid-rows-\[0fr\]/
    )
  })

  test('keeps closed mobile surfaces out of keyboard and screen reader flow', () => {
    mockPathname = '/open-science'

    const html = renderToStaticMarkup(<Navbar />)

    expect(html).toMatch(
      /role="dialog" aria-modal="true" aria-hidden="true" inert="" aria-label="Mobile navigation"/
    )
    expect(html).toContain('id="mobile-nav-agent-skills"')
    expect(html).toMatch(/id="mobile-nav-agent-skills"[^>]*data-open="false"/)
    expect(html).toMatch(/id="mobile-nav-agent-skills"[^>]*grid-rows-\[0fr\]/)
  })

  test('renders the mobile Open-Science entry as a standalone current link', () => {
    mockPathname = '/open-science'

    const html = renderToStaticMarkup(<Navbar />)
    expect(html).toMatch(/<a aria-current="page"[^>]*href="\/open-science"[^>]*>Open-Science<\/a>/)
    expect(html).not.toContain('Open-source AI research workbench')
  })

  test('renders mobile navigation as accordion groups', () => {
    mockPathname = '/agent-skills'

    const html = renderToStaticMarkup(<Navbar />)

    expect(html).toContain('aria-controls="mobile-nav-agent-skills"')
    expect(html).toContain('Install &amp; run skills locally')
  })

  test('hides the Community entry while the route is unavailable', () => {
    mockPathname = '/blog'

    const html = renderToStaticMarkup(<Navbar />)

    expect(html).not.toContain('href="/community"')
    expect(navItems).not.toContainEqual({ type: 'link', label: 'Community', href: '/community' })
  })

  test('renders adaptive navbar data attributes for theme switching', () => {
    mockPathname = '/'

    const html = renderToStaticMarkup(<Navbar />)

    expect(html).toContain('data-nav=""')
    expect(html).toContain('data-nav-menu="closed"')
    expect(html).toContain('data-nav-theme="light"')
    expect(html).toContain('data-nav-scrolled="false"')
    expect(html).not.toContain('sticky top-0')
    expect(html).not.toContain('bg-[#e8e8e8]/90')
  })

  test('seeds the measured navbar height for mobile and desktop first paint', () => {
    const layoutSource = readFileSync(join(process.cwd(), 'app/layout.tsx'), 'utf8')

    expect(layoutSource).toContain('[--nav-h:80px]')
    expect(layoutSource).toContain('lg:[--nav-h:72px]')
  })

  test('keeps adaptive navbar visuals in Tailwind instead of a component stylesheet', () => {
    const navbarSource = readFileSync(join(process.cwd(), 'components/navbar/index.tsx'), 'utf8')
    const layoutSource = readFileSync(join(process.cwd(), 'app/(commonLayout)/layout.tsx'), 'utf8')

    expect(existsSync(join(process.cwd(), 'components/navbar/navbar-adaptive.css'))).toBe(false)
    expect(layoutSource).not.toContain("import '@/components/navbar/navbar-adaptive.css'")
    expect(navbarSource).toContain('[--nav-bg:rgba(14,15,19,0.55)]')
    expect(navbarSource).toContain('[--nav-bg:rgba(255,255,255,0.55)]')
    expect(navbarSource).toContain('before:backdrop-blur-[22px]')
    expect(navbarSource).toContain('before:backdrop-saturate-[170%]')
    // Open-Science must not force a gray underlay that darkens the bar on overscroll.
    expect(navbarSource).not.toContain('rgba(246,245,242')
    expect(navbarSource).not.toMatch(/pathname === ['"]\/open-science['"]/)
  })
})
