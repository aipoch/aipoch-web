import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { createServer } from 'node:net'
import { chromium, devices } from '@playwright/test'

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
    expect(sitemap).toContain('<lastmod>2026-09-01T00:00:00.000Z</lastmod>')
    expect(sitemap).not.toContain('/claim/')
    expect(sitemap).not.toContain('/open-science/overview</loc>')
  }, 120000)

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
