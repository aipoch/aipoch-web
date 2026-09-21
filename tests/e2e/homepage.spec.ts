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
    }
  }
}

const GITHUB_REPOSITORY_API_GLOB =
  'https://api.github.com/repos/aipoch/open-science?homepage_load=*'

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

test('refreshes GitHub stars once per page load without polling', async ({ page }) => {
  // Finish the initial load before counting requests from the reloads below.
  await expect(page.getByTestId('home-github-stars')).toContainText('3.6K')
  let githubRequestCount = 0
  let githubStars = 4210
  const githubRequestMethods: string[] = []

  await page.unroute(GITHUB_REPOSITORY_API_GLOB)
  await page.route(GITHUB_REPOSITORY_API_GLOB, async (route) => {
    githubRequestMethods.push(route.request().method())
    if (route.request().method() !== 'GET') {
      await route.fulfill({ status: 204 })
      return
    }
    githubRequestCount += 1
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ stargazers_count: githubStars })
    })
  })

  await page.reload()
  await expect(page.getByTestId('home-github-stars')).toContainText('4.2K')
  expect(githubRequestCount).toBe(1)
  expect(githubRequestMethods).toEqual(['GET'])

  await page.waitForTimeout(1_000)
  expect(githubRequestCount).toBe(1)

  githubStars = 4380
  await page.reload()
  await expect(page.getByTestId('home-github-stars')).toContainText('4.4K')
  expect(githubRequestCount).toBe(2)
  expect(githubRequestMethods).toEqual(['GET', 'GET'])
})

test('uses direct Windows and Linux downloads with a macOS-only architecture menu', async ({
  page
}) => {
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
  await expect(downloads.getByRole('link', { name: /Download Linux/i })).toHaveAttribute(
    'href',
    downloadManifestFixture.downloads['linux-x64-deb'].url
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
  await expect(page.getByTestId('home-hero-stat-skills')).toContainText('500+')
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
  for (const step of ['Plan', 'Execute', 'Produce', 'Review']) {
    const button = workbench.getByRole('button', { name: step, exact: true })
    await button.click()
    await expect(button).toHaveAttribute('aria-expanded', 'true')
    await expect(workbench.locator('button[aria-expanded="true"]')).toHaveCount(1)
    await expect(preview).toHaveAttribute(
      'src',
      `/figma/landing/workflow-${step.toLowerCase()}.png`
    )
    await expect(workbench.getByRole('link', { name: 'Learn more' })).toHaveCount(1)
    await expect
      .poll(() => preview.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0))
      .toBe(true)
  }
  await workbench.getByRole('button', { name: 'Review', exact: true }).press('ArrowUp')
  await expect(workbench.getByRole('button', { name: 'Produce', exact: true })).toBeFocused()
  await expect(preview).toHaveAttribute('src', '/figma/landing/workflow-produce.png')
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
