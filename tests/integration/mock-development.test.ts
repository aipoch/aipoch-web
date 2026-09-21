import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { mkdirSync } from 'node:fs'
import { createServer } from 'node:net'
import { join } from 'node:path'
import { expect as browserExpect, chromium, devices } from '@playwright/test'

const reviewArtifacts = join(process.cwd(), '.codex/ui-review-2026-09-21')

// Exercise the real launcher and browser/SSR consumers with ephemeral loopback ports.
const availablePort = async (): Promise<number> => {
  const server = createServer()
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  const address = server.address()
  if (!address || typeof address === 'string') throw new Error('No test port allocated')
  await new Promise<void>((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve()))
  )
  return address.port
}
let launcher: ReturnType<typeof Bun.spawn>
let web: string
let api: string
const waitFor = async (url: string) => {
  for (let attempt = 0; attempt < 120; attempt++) {
    if (launcher.exitCode !== null) throw new Error('Mock launcher exited before becoming ready')
    try {
      if ((await fetch(url, { signal: AbortSignal.timeout(1000) })).ok) return
    } catch {
      /* Retry while Next compiles. */
    }
    await Bun.sleep(500)
  }
  throw new Error(`Timed out waiting for ${url}`)
}
beforeAll(async () => {
  mkdirSync(reviewArtifacts, { recursive: true })
  const port = await availablePort()
  let mockPort = await availablePort()
  while (mockPort === port) mockPort = await availablePort()
  web = `http://127.0.0.1:${port}`
  api = `http://127.0.0.1:${mockPort}`
  launcher = Bun.spawn(
    [
      process.execPath,
      'run',
      'scripts/dev-mock.ts',
      '--port',
      String(port),
      '--mock-port',
      String(mockPort)
    ],
    { stdout: 'inherit', stderr: 'inherit' }
  )
  await waitFor(`${api}/health`)
  await waitFor(`${web}/agent-skills/list`)
}, 120000)
afterAll(async () => {
  if (launcher?.exitCode === null) {
    launcher.kill('SIGTERM')
    await launcher.exited
  }
}, 15000)

describe('mock development end to end', () => {
  test('renders server data, linked details and sitemap without a business backend', async () => {
    // The state adapter intentionally cannot serve read-only business fixtures.
    expect((await fetch(`${api}/api/v1/skills`)).status).toBe(404)
    for (const [path, content] of [
      ['/', 'Local mock release'],
      ['/agent-skills/literature-review', 'Literature Review'],
      ['/blog/release-notes', 'Local research notes'],
      ['/leaderboard', 'Literature Review'],
      ['/leaderboard/daily', 'Literature Review'],
      ['/leaderboard/items/literature-review-result', 'literature-review'],
      ['/compare/literature-review-vs-clinical-trials', 'Literature Review'],
      ['/open-science/download', '1.0.0-mock']
    ]) {
      const response = await fetch(`${web}${path}`)
      expect(response.status).toBe(200)
      expect(await response.text()).toContain(content)
    }
    expect((await fetch(`${web}/community/posts/1`)).status).toBe(404)
    const sitemap = await (await fetch(`${web}/sitemap.xml`)).text()
    expect(sitemap).toContain('/agent-skills/literature-review</loc>')
    for (const [path, date] of [
      ['', '2026-09-21'],
      ['/agent-skills/list', '2026-09-20'],
      ['/blog', '2026-09-21'],
      ['/blog/release-notes', '2026-09-21']
    ]) {
      expect(sitemap).toContain(
        `<loc>https://aipoch.com${path}</loc>\n<lastmod>${date}T00:00:00.000Z</lastmod>`
      )
    }
    expect(sitemap).toContain(
      '<loc>https://aipoch.com/open-science/download</loc>\n<lastmod>2026-09-20T00:00:00.000Z</lastmod>'
    )
    expect(sitemap).not.toContain('/claim/')
    expect(sitemap).not.toContain('/open-science/overview</loc>')
  }, 120000)

  test('blog layout keeps the reading time with the heading and the desktop contents pinned', async () => {
    const browser = await chromium.launch()
    try {
      const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
      await page.goto(`${web}/blog/release-notes`)
      const toc = page.getByRole('navigation', { name: 'On this page', exact: true })
      await toc.waitFor()
      const header = page.locator('article header')
      expect(await header.innerText()).toContain('MIN READ')
      await browserExpect(header.locator('time')).toHaveText('Sep 1, 2026')
      const metadata = header.locator('time').locator('..')
      expect(await metadata.innerText()).toMatch(/Sep 1, 2026[\s\S]+3 MIN READ/)
      const contentGap = await page
        .locator('.blog-article-body .markdown-body > :first-child')
        .evaluate((element) => {
          const time = document.querySelector('article header time')
          if (!time) throw new Error('Publication date missing')
          return element.getBoundingClientRect().top - time.getBoundingClientRect().bottom
        })
      expect(contentGap).toBeGreaterThanOrEqual(24)
      expect(contentGap).toBeLessThanOrEqual(40)
      expect(await page.locator('aside').innerText()).not.toContain('AIPOCH')
      const rejectCookies = page.getByRole('button', { name: 'Reject Non-Essential' })
      if (await rejectCookies.isVisible()) await rejectCookies.click()
      await page.screenshot({ path: join(reviewArtifacts, 'blog-article.png') })
      const before = await toc.boundingBox()
      const heading = await header.boundingBox()
      if (!before || !heading) throw new Error('Blog heading or contents missing')
      expect(before.y).toBeLessThan(heading.y + 50)
      await page.evaluate(() => window.scrollTo(0, 650))
      await page.waitForTimeout(200)
      const pinned = await toc.boundingBox()
      if (!pinned) throw new Error('Sticky contents missing')
      expect(pinned.y).toBeGreaterThanOrEqual(70)
      expect(pinned.y).toBeLessThan(160)
      await page.screenshot({ path: join(reviewArtifacts, 'blog-article-scrolled.png') })
      await toc.getByRole('link', { name: 'Data validation', exact: true }).click()
      await page.waitForURL(/#heading-data-validation$/)
      expect(await page.locator('#heading-data-validation').isVisible()).toBe(true)
      await page.setViewportSize({ width: 390, height: 844 })
      await page.evaluate(() => window.scrollTo(0, 0))
      expect(await toc.isVisible()).toBe(false)
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true
      )
    } finally {
      await browser.close()
    }
  }, 60000)

  test('centers the blog artwork below the introduction', async () => {
    const browser = await chromium.launch()
    try {
      const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
      await page.goto(`${web}/blog`)
      const cards = page.locator('main a[href^="/blog/"]')
      await browserExpect(cards).toHaveCount(10)
      await browserExpect(cards.locator('time')).toHaveCount(10)
      for (const date of await cards.locator('time').allTextContents())
        expect(date).toBe('Sep 1, 2026')
      expect((await cards.allInnerTexts()).join(' ')).not.toContain('MIN READ')
      const intro = page.getByText('Explore AIPOCH Open-Science product updates', { exact: false })
      const illustration = page.locator('img[src*="blog-hero-background"]')
      await illustration.waitFor()
      const textBox = await intro.boundingBox()
      const imageBox = await illustration.boundingBox()
      if (!textBox || !imageBox) throw new Error('Blog introduction or artwork missing')
      expect(
        Math.abs(textBox.x + textBox.width / 2 - imageBox.x - imageBox.width / 2)
      ).toBeLessThan(2)
      expect(imageBox.y).toBeGreaterThanOrEqual(textBox.y + textBox.height)
      const rejectCookies = page.getByRole('button', { name: 'Reject Non-Essential' })
      if (await rejectCookies.isVisible()) await rejectCookies.click()
      await page.screenshot({ path: join(reviewArtifacts, 'blog-list.png') })
    } finally {
      await browser.close()
    }
  }, 60000)

  test('homepage preserves API downloads, autoplay, workflow controls and installer actions', async () => {
    const browser = await chromium.launch()
    try {
      const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
      await context.grantPermissions(['clipboard-read', 'clipboard-write'])
      const page = await context.newPage()
      const manifestResponse = page.waitForResponse((response) =>
        response.url().includes('/open-science/app/stable/version.json')
      )
      await page.goto(web)
      expect((await manifestResponse).fromServiceWorker()).toBe(true)
      await page.getByRole('button', { name: 'Download macOS', exact: true }).click()
      const menu = page.locator('#home-macos-downloads')
      await menu.waitFor()
      await browserExpect(menu.getByRole('link', { name: /Apple Silicon/ })).toHaveAttribute(
        'href',
        /mac-arm64/
      )
      await browserExpect(menu.getByRole('link', { name: /Intel/ })).toHaveAttribute(
        'href',
        /mac-x64/
      )
      await page.keyboard.press('Escape')
      const workbench = page.locator('#open-science')
      await workbench.getByRole('button', { name: 'Execute', exact: true }).click()
      await browserExpect(
        workbench.getByRole('button', { name: 'Execute', exact: true })
      ).toHaveAttribute('aria-expanded', 'true')
      await browserExpect(page.getByTestId('workflow-preview').getByRole('img')).toHaveAttribute(
        'src',
        '/figma/landing/workflow-execute.png'
      )
      await browserExpect(page.getByTestId('skills-count')).toHaveText('30')
      expect(await page.locator('video').getAttribute('src')).toContain('.mp4')
      expect(await page.locator('video').getAttribute('preload')).toBe('metadata')
      for (const width of [1440, 768, 390]) {
        await page.setViewportSize({ width, height: 900 })
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
          true
        )
      }
    } finally {
      await browser.close()
    }
  }, 90000)

  test('SSR content remains visible with JavaScript disabled', async () => {
    const browser = await chromium.launch()
    try {
      const context = await browser.newContext({ javaScriptEnabled: false })
      const page = await context.newPage()
      await page.goto(`${web}/agent-skills/literature-review`)
      await page.getByRole('heading', { name: 'Literature Review', exact: true }).first().waitFor()
      expect(await page.locator('body').innerText()).toContain('Local demo workflow')
    } finally {
      await browser.close()
    }
  }, 60000)

  test('client navigation stays mocked and claim state survives reload', async () => {
    const browser = await chromium.launch()
    try {
      const context = await browser.newContext()
      const page = await context.newPage()
      await page.goto(`${web}/agent-skills/list`)
      const link = page.locator('a[href="/agent-skills/literature-review"]').first()
      await link.waitFor()
      await link.click()
      await page.waitForURL(`${web}/agent-skills/literature-review`)
      await page.getByRole('heading', { name: 'Literature Review', exact: true }).first().waitFor()
      await page.goto(`${web}/claim/demo-claim`)
      await page.getByRole('button', { name: /I've posted the tweet/ }).click()
      await page
        .getByPlaceholder('https://x.com/you/status/1234567890...')
        .fill('https://x.com/demo/status/123')
      await page.getByRole('button', { name: /Verify & Claim/ }).click()
      await page.getByRole('heading', { name: 'Claimed!', exact: true }).waitFor()
      await page.reload()
      await page.getByRole('heading', { name: 'Already Claimed', exact: true }).waitFor()
      expect(
        (await (await fetch(`${api}/api/v1/agent/claim?token=demo-claim`)).json()).data.agent
          .is_claimed
      ).toBe(true)
    } finally {
      await browser.close()
    }
  }, 90000)

  for (const device of ['desktop', 'mobile']) {
    test(`${device}: searches skills and submits a waitlist entry through the mock HTTP API`, async () => {
      const browser = await chromium.launch()
      try {
        const context = await browser.newContext(
          device === 'mobile' ? devices['Pixel 5'] : { viewport: { width: 1280, height: 900 } }
        )
        const page = await context.newPage()
        const errors: string[] = []
        page.on('pageerror', (error) => errors.push(error.message))
        await page.goto(`${web}/agent-skills/list`)
        const cards = page.locator('main a[href^="/agent-skills/"]')
        await browserExpect(cards).toHaveCount(9)
        const rejectCookies = page.getByRole('button', { name: 'Reject Non-Essential' })
        if (await rejectCookies.isVisible()) await rejectCookies.click()
        await page.screenshot({ path: join(reviewArtifacts, `skills-list-${device}.png`) })
        await cards.last().scrollIntoViewIfNeeded()
        await browserExpect.poll(() => cards.count()).toBeGreaterThanOrEqual(18)
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
          true
        )
        await page.getByPlaceholder('Search skills...').fill('Clinical Trials')
        const searchResponse = await page.waitForResponse(
          (response) =>
            response.url().includes('/api/v1/skills?') &&
            response.url().includes('Clinical') &&
            response.status() === 200
        )
        expect(searchResponse.fromServiceWorker()).toBe(true)
        await page.getByText('Clinical Trials', { exact: true }).first().waitFor()
        await page.getByPlaceholder('Search skills...').fill('no-such-skill')
        await page.waitForResponse(
          (response) => response.url().includes('search=no-such-skill') && response.status() === 200
        )
        await page.goto(`${web}/medflow`)
        await page.getByLabel('Your name').fill('Mock Researcher')
        await page.getByLabel('Email address').fill(`${device}@example.test`)
        await page.getByLabel(/You hereby acknowledge and agree/).check()
        await page.locator('#mf-btn').click()
        await page.locator('#mf-success-title').waitFor({ state: 'visible' })
        expect(await page.locator('#mf-success-title').textContent()).toContain('Mock!')
        expect(errors).toEqual([])
      } finally {
        await browser.close()
      }
    }, 120000)
  }
  for (const device of ['desktop', 'mobile']) {
    test(`${device}: browser Back restores loaded skills, filters, sorting and scroll after a detail reload`, async () => {
      const browser = await chromium.launch()
      try {
        const context = await browser.newContext(
          device === 'mobile' ? devices['Pixel 5'] : { viewport: { width: 1440, height: 900 } }
        )
        const page = await context.newPage()
        await page.goto(`${web}/agent-skills/list`)
        const reject = page.getByRole('button', { name: 'Reject Non-Essential' })
        if (await reject.isVisible()) await reject.click()
        await page.getByRole('button', { name: 'Download', exact: true }).click()
        const cards = page.locator('main a[href^="/agent-skills/"]')
        await browserExpect(cards).toHaveCount(9)
        await cards.last().scrollIntoViewIfNeeded()
        await browserExpect.poll(() => cards.count()).toBeGreaterThanOrEqual(18)
        const target = cards.nth(14)
        const href = await target.getAttribute('href')
        await target.scrollIntoViewIfNeeded()
        const y = await page.evaluate(() => window.scrollY)
        const titles = await cards.allTextContents()
        await target.click()
        await browserExpect(page).toHaveURL(`${web}${href}`)
        await page.reload()
        await page.goBack()
        await browserExpect(page).toHaveURL(`${web}/agent-skills/list`)
        await browserExpect.poll(() => cards.count()).toBeGreaterThanOrEqual(18)
        await browserExpect
          .poll(async () => Math.abs((await page.evaluate(() => window.scrollY)) - y), {
            timeout: 15000
          })
          .toBeLessThan(3)
        expect((await cards.allTextContents()).slice(0, 18)).toEqual(titles.slice(0, 18))
        const filteredResponse = page.waitForResponse(
          (response) => response.url().includes('search=Review') && response.status() === 200
        )
        await page.getByPlaceholder('Search skills...').fill('Review')
        await filteredResponse
        await browserExpect.poll(() => cards.count()).toBeLessThanOrEqual(10)
        await browserExpect.poll(() => cards.count()).toBeGreaterThanOrEqual(9)
        await browserExpect(cards.first()).toContainText('Review')
        await cards.nth(3).scrollIntoViewIfNeeded()
        const filteredY = await page.evaluate(() => window.scrollY)
        const filteredHref = await cards.nth(3).getAttribute('href')
        await cards.nth(3).click()
        await browserExpect(page).toHaveURL(`${web}${filteredHref}`)
        await page.reload()
        await page.goBack()
        await browserExpect(page.getByPlaceholder('Search skills...')).toHaveValue('Review')
        await browserExpect
          .poll(async () => Math.abs((await page.evaluate(() => window.scrollY)) - filteredY), {
            timeout: 15000
          })
          .toBeLessThan(3)
      } finally {
        await browser.close()
      }
    }, 120000)

    test(`${device}: browser Back restores expanded blog rows after a detail reload`, async () => {
      const browser = await chromium.launch()
      try {
        const context = await browser.newContext(
          device === 'mobile' ? devices['Pixel 5'] : { viewport: { width: 1440, height: 900 } }
        )
        const page = await context.newPage()
        await page.goto(`${web}/blog`)
        const reject = page.getByRole('button', { name: 'Reject Non-Essential' })
        if (await reject.isVisible()) await reject.click()
        const cards = page.locator('main a[href^="/blog/"]')
        await browserExpect(cards).toHaveCount(10)
        await page.getByRole('button', { name: 'Show more' }).click()
        await browserExpect(cards).toHaveCount(19)
        await cards.nth(14).scrollIntoViewIfNeeded()
        const y = await page.evaluate(() => window.scrollY)
        const articleHref = await cards.nth(14).getAttribute('href')
        await cards.nth(14).click()
        await browserExpect(page).toHaveURL(`${web}${articleHref}`)
        await page.reload()
        await page.goBack()
        await browserExpect(page).toHaveURL(`${web}/blog`)
        await browserExpect(cards).toHaveCount(19)
        await browserExpect
          .poll(async () => Math.abs((await page.evaluate(() => window.scrollY)) - y), {
            timeout: 15000
          })
          .toBeLessThan(3)
      } finally {
        await browser.close()
      }
    }, 120000)
  }

  test('stops both ports when the foreground launcher receives SIGTERM', async () => {
    launcher.kill('SIGTERM')
    expect(await launcher.exited).toBe(0)
    for (const url of [web, `${api}/health`]) {
      // Descendant sockets may close just after the direct child emits exit.
      let closed = false
      for (let attempt = 0; attempt < 30; attempt++) {
        try {
          await fetch(url, { signal: AbortSignal.timeout(500) })
          await Bun.sleep(100)
        } catch {
          closed = true
          break
        }
      }
      expect(closed).toBe(true)
    }
  }, 15000)
})

// Startup failures must not stop a service that was already listening.
test('occupied Web/API ports fail cleanly and preserve the existing service', async () => {
  for (const occupied of ['web', 'api']) {
    const existing = Bun.serve({
      hostname: '127.0.0.1',
      port: 0,
      fetch: () => new Response('existing service')
    })
    const freePort = await availablePort()
    const port = occupied === 'web' ? existing.port : freePort
    const mockPort = occupied === 'api' ? existing.port : freePort
    const child = Bun.spawn(
      [
        process.execPath,
        'run',
        'scripts/dev-mock.ts',
        '--port',
        String(port),
        '--mock-port',
        String(mockPort)
      ],
      { stdout: 'ignore', stderr: 'ignore' }
    )
    const timeout = setTimeout(() => child.kill('SIGTERM'), 10000)
    try {
      expect(await child.exited).toBe(1)
      expect(await (await fetch(`http://127.0.0.1:${existing.port}`)).text()).toBe(
        'existing service'
      )
      await expect(
        fetch(`http://127.0.0.1:${freePort}/health`, { signal: AbortSignal.timeout(1000) })
      ).rejects.toThrow()
    } finally {
      clearTimeout(timeout)
      if (child.exitCode === null) {
        child.kill('SIGTERM')
        await child.exited
      }
      existing.stop(true)
    }
  }
}, 25000)
