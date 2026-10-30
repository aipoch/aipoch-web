import { expect, type Page } from '@playwright/test'

export async function verifyOrderedReplay(
  page: Page,
  url: string,
  api: string,
  screenshot: string
) {
  const control = `${api}/__mock/use-case-manifest`
  const configure = async (settings: Record<string, unknown>) => {
    const response = await page.request.put(control, { data: settings })
    expect(response.ok()).toBe(true)
  }
  await configure({ orderedMode: 'normal', orderedChunkDelayMs: 2100, replayChunkDelayMs: 4500 })
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  const started = Date.now()
  await page.goto(url, { waitUntil: 'domcontentloaded' })
  const first = page.locator('[data-replay-block="question"]')
  await expect(first).toBeVisible({ timeout: 30000 })
  const state = await (await page.request.get(control)).json()
  expect(state.orderedFinished).toBe(false)
  expect(state.sessionFinished).toBe(false)
  await first.evaluate((node) => {
    Object.assign(window, { orderedFirst: node })
  })
  const original = await first.innerHTML()
  const consent = page.getByRole('button', { name: 'Reject non-essential', exact: true })
  if (await consent.isVisible()) await consent.click()
  await page.screenshot({ path: screenshot })
  await expect(page.locator('[data-replay-block="continuation"]')).toBeAttached({ timeout: 60000 })
  await expect
    .poll(async () => (await (await page.request.get(control)).json()).orderedFinished)
    .toBe(true)
  expect(Date.now() - started).toBeGreaterThan(30000)
  expect((await (await page.request.get(control)).json()).sessionFinished).toBe(false)
  expect(
    await first.evaluate(
      (node) => node === (window as unknown as { orderedFirst: Element }).orderedFirst
    )
  ).toBe(true)
  expect(await first.innerHTML()).toBe(original)
  await expect(page.locator('[data-replay-block="tool-a"]')).toHaveCount(1)
  await expect(page.locator('[data-replay-block="answer"] pre')).toHaveCount(1)
  await expect(page.locator('[data-replay-block="answer"] table')).toHaveCount(1)
  await expect(page.locator('[data-replay-block="answer"] .katex')).toHaveCount(1)
  await expect(page.locator('.osp-session')).not.toContainText('COMPACTION_INTERNAL_SECRET')
  expect(errors).toEqual([])
  await page.goto('about:blank')
  await configure({})
}

export async function verifyOrderedFailureAndCancel(page: Page, url: string, api: string) {
  const control = `${api}/__mock/use-case-manifest`
  const configure = async (settings: Record<string, unknown>) => {
    expect((await page.request.put(control, { data: settings })).ok()).toBe(true)
  }
  await page.addInitScript(() => {
    const NativeWorker = window.Worker
    window.Worker = class extends NativeWorker {
      terminate() {
        Object.assign(window, { orderedWorkerTerminated: true })
        super.terminate()
      }
    }
  })
  try {
    await configure({ orderedMode: 'truncated', orderedChunkDelayMs: 100 })
    await page.goto(url)
    await expect(
      page.getByText('Loading incomplete. The blocks already loaded are shown above.')
    ).toBeVisible({ timeout: 30000 })
    await expect(page.locator('[data-replay-block="question"]')).toBeVisible()
    await expect(page.locator('[data-replay-block="answer"]')).toHaveCount(0)
    await configure({ orderedMode: 'normal', recordsMode: 'error' })
    await page.getByRole('button', { name: 'Retry', exact: true }).click()
    await expect(page.locator('[data-replay-block="continuation"]')).toBeAttached({
      timeout: 30000
    })
    await expect(page.getByText('评审加载未完成')).toBeVisible()
    const first = page.locator('[data-replay-block="question"]')
    await first.evaluate((node) => Object.assign(window, { orderedFirst: node }))
    await configure({ orderedMode: 'normal' })
    await page.getByRole('button', { name: 'Retry reviews', exact: true }).click()
    await expect(page.getByText('评审加载未完成')).toHaveCount(0)
    expect(
      await first.evaluate(
        (node) => node === (window as unknown as { orderedFirst: Element }).orderedFirst
      )
    ).toBe(true)
    await page.goto('about:blank')
    await configure({ orderedMode: 'normal', orderedChunkDelayMs: 1000 })
    await page.goto(url)
    await expect(page.locator('[data-replay-block="question"]')).toBeVisible({ timeout: 30000 })
    expect((await (await page.request.get(control)).json()).orderedFinished).toBe(false)
    await page.evaluate(() => Object.assign(window, { orderedWorkerTerminated: false }))
    await page.getByRole('link', { name: 'Back to overview' }).click()
    await expect
      .poll(() =>
        page.evaluate(
          () => (window as unknown as { orderedWorkerTerminated: boolean }).orderedWorkerTerminated
        )
      )
      .toBe(true)
    await expect(page).toHaveURL(url.replace(/\/replay$/, ''))
    await expect(page.locator('[data-replay-block]')).toHaveCount(0)
  } finally {
    await configure({})
  }
}
