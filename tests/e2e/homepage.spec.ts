import { expect, type Page, test } from '@playwright/test'
import {
  homepageOpenScienceConfigFixture,
  homepageReadWatchFixture,
  homepageSkillsCountFixture
} from './homepage-e2e-fixtures'

test('redirects the www host to the canonical origin with HTTP 301', async ({
  request,
  baseURL
}) => {
  if (!baseURL) throw new Error('Playwright baseURL is required for the redirect contract.')
  const response = await request.get(new URL('/geo-check?source=e2e', baseURL).toString(), {
    headers: { host: 'www.aipoch.com' },
    maxRedirects: 0
  })

  expect(response.status()).toBe(301)
  expect(response.headers().location).toBe('https://aipoch.com/geo-check?source=e2e')
})

const downloadManifestFixture = {
  version: '0.2.0',
  downloads: {
    'mac-arm64': {
      url: 'https://cdn.example.com/open-science-mac-arm64.dmg',
      size: 172885330
    },
    'mac-x64': {
      url: 'https://cdn.example.com/open-science-mac-x64.dmg',
      size: 180000000
    },
    'win-x64': {
      url: 'https://cdn.example.com/open-science-win-x64.exe',
      size: 140501246
    },
    'linux-x64-deb': {
      url: 'https://cdn.example.com/open-science-linux.deb',
      size: 145087720
    },
    'linux-x64-appimage': {
      url: 'https://cdn.example.com/open-science-linux.AppImage',
      size: 150000000
    },
    'linux-arm64-deb': {
      url: 'https://cdn.example.com/open-science-linux-arm64.deb',
      size: 140000000
    }
  }
}

const GITHUB_REPOSITORY_API_GLOB =
  'https://api.github.com/repos/aipoch/open-science?homepage_load=*'

const SKILLS_GITHUB_API_GLOB =
  'https://api.github.com/repos/aipoch/medical-research-skills?homepage_load=*'

async function mockOpenScienceDownloadManifest(page: Page) {
  // Client-side fetch; Playwright can intercept this CDN request.
  await page.route('**/open-science/app/stable/version.json', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(downloadManifestFixture)
    })
  })
}

const mockGithubStars = async (page: Page) => {
  await page.route(SKILLS_GITHUB_API_GLOB, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: '{"stargazers_count":1937}'
    })
  )
  // Client-side fetch; keep the homepage suite independent from GitHub availability and rate limits.
  await page.route(GITHUB_REPOSITORY_API_GLOB, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ stargazers_count: 3600 })
    })
  })
}

test.beforeEach(async ({ page }) => {
  // Spotlight data is mocked in-process via E2E_HOMEPAGE_MOCK on the Next server
  // (Playwright page.route cannot intercept RSC server-side fetch).
  await mockOpenScienceDownloadManifest(page)
  await mockGithubStars(page)
  await page.goto('/')
})

test('loads each repository once per page load without sharing counts or polling', async ({
  page
}) => {
  await expect(page.getByTestId('home-github-stars')).toHaveText('3.6K')
  await expect(page.getByTestId('ecosystem-github-stars')).toHaveText('1.9K')
  const counts = [0, 0]
  const stars = [4210, 2310]
  for (const [index, glob] of [GITHUB_REPOSITORY_API_GLOB, SKILLS_GITHUB_API_GLOB].entries()) {
    await page.unroute(glob)
    await page.route(glob, async (route) => {
      expect(route.request().method()).toBe('GET')
      counts[index] += 1
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ stargazers_count: stars[index] })
      })
    })
  }
  await page.reload()
  await expect(page.getByTestId('home-github-stars')).toHaveText('4.2K')
  await expect(page.getByTestId('ecosystem-github-stars')).toHaveText('2.3K')
  expect(counts).toEqual([1, 1])
  await page.waitForTimeout(1_000)
  expect(counts).toEqual([1, 1])
  stars[0] = 4380
  stars[1] = 2470
  await page.reload()
  await expect(page.getByTestId('home-github-stars')).toHaveText('4.4K')
  await expect(page.getByTestId('ecosystem-github-stars')).toHaveText('2.5K')
  expect(counts).toEqual([2, 2])
})

test('uses identical GitHub star formatting in both placements', async ({ page }) => {
  await expect(page.getByTestId('home-github-stars')).toHaveText('3.6K')
  let body = '{}'
  for (const glob of [GITHUB_REPOSITORY_API_GLOB, SKILLS_GITHUB_API_GLOB]) {
    await page.unroute(glob)
    await page.route(glob, (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body })
    )
  }

  for (const [value, formatted] of [
    [0, '0'],
    [987, '987'],
    [5500, '5.5K'],
    [1250000, '1.3M']
  ] as const) {
    body = JSON.stringify({ stargazers_count: value })
    await page.reload({ waitUntil: 'domcontentloaded' })
    for (const [prefix, name] of [
      ['home-github', 'Open-Science'],
      ['ecosystem-github', 'Medical Research Skills']
    ]) {
      await expect(page.getByTestId(`${prefix}-stars`)).toHaveText(formatted)
      await expect(page.getByTestId(`${prefix}-link`)).toHaveAttribute(
        'aria-label',
        `${name} on GitHub, ${formatted} stars`
      )
    }
  }
})

test('isolates Skills GitHub failures from the hero repository', async ({ page }) => {
  await expect(page.getByTestId('home-github-stars')).toHaveText('3.6K')
  await page.unroute(SKILLS_GITHUB_API_GLOB)
  let status = 200
  let body = '{}'
  await page.route(SKILLS_GITHUB_API_GLOB, (route) =>
    route.fulfill({ status, contentType: 'application/json', body })
  )

  for (const failedResponse of [
    { status: 403, body: '{"message":"API rate limit exceeded"}' },
    { status: 200, body: '{}' },
    { status: 200, body: '{"stargazers_count":-1}' },
    { status: 200, body: '{"stargazers_count":"5500"}' },
    { status: 200, body: 'invalid JSON' }
  ]) {
    status = failedResponse.status
    body = failedResponse.body
    const response = page.waitForResponse(SKILLS_GITHUB_API_GLOB)
    await page.reload({ waitUntil: 'domcontentloaded' })
    await (await response).finished()
    await expect(page.getByTestId('home-github-stars')).toHaveText('3.6K')
    await expect(page.getByTestId('ecosystem-github-stars')).toHaveText('1.9K')
  }
})

test('isolates hero GitHub failures from the Skills repository', async ({ page }) => {
  await page.unroute(GITHUB_REPOSITORY_API_GLOB)
  await page.route(GITHUB_REPOSITORY_API_GLOB, (route) => route.fulfill({ status: 403 }))
  await page.unroute(SKILLS_GITHUB_API_GLOB)
  await page.route(SKILLS_GITHUB_API_GLOB, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: '{"stargazers_count":9876}'
    })
  )
  await page.reload()
  await expect(page.getByTestId('home-github-stars')).toHaveText('3.5K')
  await expect(page.getByTestId('ecosystem-github-stars')).toHaveText('9.9K')
})

test('keeps the ecosystem GitHub stars beside the skills count and accessible at all widths', async ({
  page
}, testInfo) => {
  const reject = page.getByRole('button', { name: 'Reject Non-Essential' })
  if (await reject.isVisible()) await reject.click()
  const link = page.getByTestId('ecosystem-github-link')
  await expect(link).toHaveAttribute('href', 'https://github.com/aipoch/medical-research-skills')
  await expect(link).toHaveAttribute('target', '_blank')
  await expect(link).toHaveAttribute('rel', 'noopener noreferrer')
  const card = page.locator('#ecosystem article').filter({
    has: page.getByRole('heading', { name: 'Medical Research Skills', exact: true })
  })
  await expect(card.getByTestId('ecosystem-github-stars')).toHaveText('1.9K')
  for (const width of [390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 })
    await link.scrollIntoViewIfNeeded()
    const bounds = await link.evaluate((element) => {
      const row = element.parentElement
      const value = row?.querySelector('p')
      if (!row || !value) throw new Error('Missing ecosystem information row')
      const box = element.getBoundingClientRect()
      const parent = row.getBoundingClientRect()
      const text = value.getBoundingClientRect()
      return {
        contained: box.left >= parent.left && box.right <= parent.right,
        rightAligned: Math.abs(box.right - parent.right) < 1,
        separate: box.left >= text.right || box.top >= text.bottom,
        sameRow: Math.abs(box.top - text.top) < 1,
        overflow: document.documentElement.scrollWidth > window.innerWidth
      }
    })
    expect(bounds.contained).toBe(true)
    expect(bounds.rightAligned).toBe(true)
    expect(bounds.separate).toBe(true)
    expect(bounds.overflow).toBe(false)
    if (width === 1440) expect(bounds.sameRow).toBe(true)
    await link.focus()
    await expect(link).toBeFocused()
    await link.press('Tab')
    if (width === 390 || width === 1440) {
      await page.locator('#ecosystem').screenshot({
        path: `.codex/homepage-ecosystem-stars/ecosystem-${width}-${testInfo.project.name}.png`
      })
    }
  }
})

test('uses a direct Windows download with macOS and Linux architecture menus', async ({ page }) => {
  // Resolve the initial manifest before counting the next document's request.
  await expect(
    page.getByTestId('home-platform-downloads').getByRole('link', { name: /Download Windows/i })
  ).toHaveAttribute('href', downloadManifestFixture.downloads['win-x64'].url)
  let manifestRequestCount = 0
  await page.unroute('**/open-science/app/stable/version.json')
  await page.route('**/open-science/app/stable/version.json', async (route) => {
    manifestRequestCount += 1
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(downloadManifestFixture)
    })
  })
  await page.reload()

  const downloads = page.getByTestId('home-platform-downloads')
  await expect(downloads.getByRole('link', { name: /Download Windows/i })).toHaveAttribute(
    'href',
    downloadManifestFixture.downloads['win-x64'].url
  )
  await expect(downloads.getByText('DOWNLOAD', { exact: true })).toHaveCount(3)

  const macDownload = downloads.getByRole('button', { name: /Download macOS/i })
  await expect(macDownload).toHaveAttribute('aria-expanded', 'false')
  await macDownload.click()
  const macMenu = downloads.locator('#home-macos-downloads')
  await expect(macMenu.getByRole('link', { name: /Apple Silicon/i })).not.toHaveCSS(
    'background-color',
    'rgb(242, 242, 239)'
  )
  await expect(macMenu.getByRole('link', { name: /Apple Silicon/i })).toHaveAttribute(
    'href',
    downloadManifestFixture.downloads['mac-arm64'].url
  )
  await expect(macMenu.getByRole('link', { name: /Intel/i })).toHaveAttribute(
    'href',
    downloadManifestFixture.downloads['mac-x64'].url
  )

  const linuxDownload = downloads.getByRole('button', { name: /Download Linux/i })
  await expect(linuxDownload).toHaveAttribute('aria-expanded', 'false')
  await linuxDownload.click()
  const linuxMenu = downloads.locator('#home-linux-downloads')
  await expect(linuxMenu.getByRole('link', { name: /^x64/i })).toHaveAttribute(
    'href',
    downloadManifestFixture.downloads['linux-x64-deb'].url
  )
  await expect(linuxMenu.getByRole('link', { name: /ARM64/i })).toHaveAttribute(
    'href',
    downloadManifestFixture.downloads['linux-arm64-deb'].url
  )
  expect(manifestRequestCount).toBe(1)
})

test('opens the macOS architecture menu on hover and closes after leaving it', async ({ page }) => {
  const downloads = page.getByTestId('home-platform-downloads')
  const macDownload = downloads.getByRole('button', { name: /Download macOS/i })
  const macMenu = downloads.locator('#home-macos-downloads')

  await expect(macMenu).toHaveCount(0)
  await macDownload.hover()
  await expect(macMenu).toBeVisible()

  await page.getByRole('heading', { name: /Science, Open to All/i }).hover()
  await expect(macMenu).toHaveCount(0)
})

test('keeps the macOS menu above the provider logo strip', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 700 })
  const downloads = page.getByTestId('home-platform-downloads')
  const macDownload = downloads.getByRole('button', { name: /Download macOS/i })
  const marquee = page.getByTestId('home-model-marquee')

  await macDownload.hover()
  const macMenu = downloads.locator('#home-macos-downloads')
  await expect(macMenu).toBeVisible()

  const [menuZIndex, marqueeZIndex] = await Promise.all([
    macMenu.evaluate((element) => Number.parseInt(getComputedStyle(element).zIndex, 10)),
    marquee.evaluate((element) => Number.parseInt(getComputedStyle(element).zIndex, 10))
  ])
  expect(menuZIndex).toBeGreaterThan(marqueeZIndex)
})

test('keeps at least thirty pixels above the provider strip at short desktop heights', async ({
  page
}) => {
  await page.setViewportSize({ width: 1440, height: 700 })
  const githubBottom = await page
    .getByTestId('home-github-link')
    .evaluate((element) => element.getBoundingClientRect().bottom)
  const marqueeTop = await page
    .getByTestId('home-model-marquee')
    .evaluate((element) => element.getBoundingClientRect().top)

  expect(marqueeTop - githubBottom).toBeGreaterThanOrEqual(30)
})

test('does not introduce horizontal page overflow', async ({ page }) => {
  const hasHorizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
  )

  expect(hasHorizontalOverflow).toBe(false)
})

test('keeps the first-paint navbar height stable after hydration', async ({ page }) => {
  for (const viewport of [
    { width: 390, height: 844 },
    { width: 1440, height: 900 }
  ]) {
    await page.setViewportSize(viewport)
    await page.reload()

    const metrics = await page.locator('[data-nav]').evaluate((header) => {
      const root = document.documentElement
      return {
        computedHeight: Number.parseFloat(getComputedStyle(root).getPropertyValue('--nav-h')),
        headerHeight: header.getBoundingClientRect().height,
        inlineHeight: root.style.getPropertyValue('--nav-h')
      }
    })

    expect(metrics.computedHeight).toBeCloseTo(metrics.headerHeight, 0)
    expect(metrics.inlineHeight).toBe('')
  }
})

test('renders the Figma sections with existing API data and no superseded modules', async ({
  page
}) => {
  await expect(page.getByRole('banner')).toHaveCount(1)
  await expect(page.getByRole('contentinfo')).toHaveCount(1)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Science, Open to All')
  await expect(page.getByTestId('skills-count')).toHaveText(String(homepageSkillsCountFixture))
  await expect(page.getByTestId('home-hero-stats').locator('strong')).toHaveText([
    '25',
    '4',
    '597',
    '36'
  ])
  const spotlight = page.locator('#open-science-spotlight')
  await expect(
    spotlight.getByRole('heading', { name: homepageOpenScienceConfigFixture.latest_release_title })
  ).toBeVisible()
  for (const feature of homepageOpenScienceConfigFixture.latest_release_features) {
    await expect(spotlight.getByText(feature.title, { exact: true })).toBeVisible()
    await expect(spotlight.getByText(feature.text, { exact: true })).toBeVisible()
  }
  for (const post of homepageReadWatchFixture.items) {
    await expect(
      page.getByTestId('spotlight-read-watch').getByRole('link', { name: new RegExp(post.title) })
    ).toHaveAttribute('href', `/blog/${post.slug}`)
  }
  await expect(page.getByTestId('skills-install-terminal')).toHaveCount(0)
  await expect(page.getByTestId('ecosystem-detail')).toHaveCount(0)
  await expect(page.locator('#close')).toHaveCount(0)
  await expect(
    page.getByRole('contentinfo').getByText('We build insight moment for scientific research.')
  ).toBeVisible()
  await expect(page.getByRole('link', { name: 'Apache-2.0 license' })).toHaveAttribute(
    'href',
    'https://github.com/aipoch/open-science?tab=Apache-2.0-1-ov-file'
  )
})

test('switches workflow details and matching images with pointer and keyboard', async ({
  page
}) => {
  const workbench = page.locator('#open-science')
  const preview = page.getByTestId('workflow-preview').getByRole('img')
  for (const step of ['Plan', 'Execute', 'Produce', 'Review', 'Share']) {
    const button = workbench.getByRole('button', { name: step, exact: true })
    await button.click()
    await expect(button).toHaveAttribute('aria-expanded', 'true')
    await expect(workbench.locator('button[aria-expanded="true"]')).toHaveCount(1)
    await expect(preview).toHaveAttribute(
      'src',
      `/figma/landing/workflow-${step.toLowerCase()}.png`
    )
    await expect(workbench.getByRole('link', { name: 'Learn more' })).toHaveCount(1)
    await expect(workbench.getByRole('link', { name: 'Learn more' })).toHaveAttribute(
      'href',
      '/open-science'
    )
    await expect
      .poll(() => preview.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0))
      .toBe(true)
  }
  await expect(workbench.locator('#workflow-share-detail')).toContainText(
    'Export a session as a portable .science package'
  )
  await workbench.getByRole('button', { name: 'Share', exact: true }).press('ArrowUp')
  await expect(workbench.getByRole('button', { name: 'Review', exact: true })).toBeFocused()
  await expect(preview).toHaveAttribute('src', '/figma/landing/workflow-review.png')
  await page.keyboard.press('End')
  await expect(workbench.getByRole('button', { name: 'Share', exact: true })).toBeFocused()
  await expect(preview).toHaveAttribute('src', '/figma/landing/workflow-share.png')
  await page.keyboard.press('ArrowDown')
  await expect(workbench.getByRole('button', { name: 'Plan', exact: true })).toBeFocused()
  await page.keyboard.press('ArrowUp')
  await expect(workbench.getByRole('button', { name: 'Share', exact: true })).toBeFocused()
  await page.keyboard.press('Home')
  await expect(workbench.getByRole('button', { name: 'Plan', exact: true })).toHaveAttribute(
    'aria-expanded',
    'true'
  )
})

test('autoplays the production-source video muted and keeps native playback controls', async ({
  page
}) => {
  const video = page.getByTestId('home-tour-video')
  await expect(video).toHaveAttribute('src', homepageOpenScienceConfigFixture.media[0].url)
  await expect(video).toHaveAttribute('preload', 'metadata')
  await expect(video).toHaveAttribute('autoplay')
  await expect(video).toHaveJSProperty('muted', true)
  await video.scrollIntoViewIfNeeded()
  await expect
    .poll(
      () =>
        video.evaluate((element: HTMLVideoElement) => !element.paused && element.currentTime > 0),
      { timeout: 30000 }
    )
    .toBe(true)
  await expect(video).toHaveAttribute('controls', '')
  await expect(page.getByRole('button', { name: 'Play product tour', exact: true })).toHaveCount(0)
  await video.evaluate((element: HTMLVideoElement) => element.pause())
  await expect(video).toHaveJSProperty('paused', true)
  await page.getByRole('button', { name: 'Watch the Product Tour', exact: true }).click()
  await expect(video).toHaveJSProperty('paused', false)
})

test('offers a retry when the API media cannot load', async ({ page }) => {
  await page.route('**/*.mp4*', (route) => route.abort('failed'))
  await page.reload()
  await page.getByTestId('home-tour-video').scrollIntoViewIfNeeded()
  await expect(page.getByText('The video could not load. Try again.')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Retry product tour' })).toBeVisible()
})

test('loads every Figma illustration and remains usable on desktop and mobile', async ({
  page
}, testInfo) => {
  if (testInfo.project.name === 'chromium') await page.setViewportSize({ width: 1440, height: 900 })
  const rejectCookies = page.getByRole('button', { name: 'Reject Non-Essential' })
  if (await rejectCookies.isVisible()) await rejectCookies.click()
  await page.emulateMedia({ reducedMotion: 'reduce' })
  for (const section of [
    'home-hero',
    'product-tour',
    'ecosystem',
    'open-science-spotlight',
    'open-science',
    'skills',
    'audit'
  ]) {
    await page.locator(`#${section}`).scrollIntoViewIfNeeded()
    const images = page.locator(`#${section} img`)
    for (const img of await images.all()) {
      if ((await img.getAttribute('loading')) === 'lazy') await img.scrollIntoViewIfNeeded()
      await expect
        .poll(
          () =>
            img.evaluate(
              (element: HTMLImageElement) => element.complete && element.naturalWidth > 0
            ),
          { timeout: 15000 }
        )
        .toBe(true)
    }
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.getByRole('contentinfo').scrollIntoViewIfNeeded()
  await page.mouse.move(0, 0)
  await page.keyboard.press('Escape')
  await page.evaluate(() => window.scrollTo(0, 0))
  await page.screenshot({
    path: `.codex/ui-review-2026-09-20/homepage-figma-${testInfo.project.name === 'chromium' ? 'desktop' : 'mobile'}.png`,
    fullPage: true,
    animations: 'disabled'
  })
  await page.mouse.move(0, 0)
  await page.keyboard.press('Escape')
  await page.evaluate(() => window.scrollTo(0, 0))
  await page.screenshot({
    path: `.codex/ui-review-2026-09-20/homepage-hero-${testInfo.project.name === 'chromium' ? 'desktop' : 'mobile'}.png`,
    animations: 'disabled'
  })
})
