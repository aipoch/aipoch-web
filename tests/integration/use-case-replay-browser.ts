import { expect, type Page } from '@playwright/test'

export async function verifyReplayDownload(page: Page, url: string) {
  await page.goto(url.replace(/\/replay$/, ''))
  const overviewDownload = page.getByRole('link', {
    name: 'Download research package',
    exact: true
  })
  await expect(overviewDownload).toHaveCount(2)
  const packageUrl = await overviewDownload.first().getAttribute('href')
  if (!packageUrl) throw new Error('Missing overview package URL')
  await expect(overviewDownload.last()).toHaveAttribute('href', packageUrl)

  const overviewSession = page.getByRole('link', { name: 'View the research session', exact: true })
  await expect(overviewSession).toHaveCount(2)
  await expect(overviewSession.last()).toHaveAttribute('href', new URL(url).pathname)
  // Both placements must retain the same styles outside the article's Markdown scope.
  const actionStyle = (element: HTMLElement | SVGElement) => {
    const style = getComputedStyle(element)
    return [
      style.color,
      style.backgroundColor,
      style.fontSize,
      style.fontWeight,
      style.border,
      style.padding
    ]
  }
  for (const links of [overviewDownload, overviewSession]) {
    expect(await links.last().evaluate(actionStyle)).toEqual(
      await links.first().evaluate(actionStyle)
    )
  }
  const [overviewFile] = await Promise.all([
    page.waitForEvent('download'),
    overviewDownload.last().click()
  ])
  expect(overviewFile.url()).toBe(packageUrl)
  expect(await overviewFile.failure()).toBeNull()
  await overviewSession.last().click()
  await expect(page).toHaveURL(url)
  const downloadLink = page.getByRole('link', { name: 'Download research package', exact: true })
  await expect(downloadLink).toBeVisible()
  await expect(downloadLink).toHaveAttribute('href', packageUrl)
  await expect(downloadLink.locator('svg[aria-hidden="true"]')).toBeVisible()
  await expect(
    page.getByText('Read-only replay of an exported Open-Science session', { exact: true })
  ).toHaveCount(0)

  const backLink = page.getByRole('link', { name: 'Back to overview' })
  await expect(backLink).toBeVisible()
  const textStyle = (element: HTMLElement | SVGElement) => {
    const style = getComputedStyle(element)
    return { color: style.color, fontSize: style.fontSize, fontWeight: style.fontWeight }
  }
  expect(await downloadLink.evaluate(textStyle)).toEqual(await backLink.evaluate(textStyle))
  const box = await downloadLink.boundingBox()
  const viewport = page.viewportSize()
  if (!box || !viewport) throw new Error('Missing visible download link or viewport')
  expect(box.x).toBeGreaterThanOrEqual(0)
  expect(box.x + box.width).toBeLessThanOrEqual(viewport.width)

  const [download] = await Promise.all([page.waitForEvent('download'), downloadLink.click()])
  expect(download.url()).toBe(packageUrl)
  expect(await download.failure()).toBeNull()
  await expect(page).toHaveURL(url)
}

// Run against the real mock Next server: package metadata now arrives in the RSC response.
export async function verifyReplayCoverage(page: Page, url: string) {
  let downloads = 0
  const requestedUrls = new Set<string>()
  page.context().on('request', (request) => {
    requestedUrls.add(request.url())
    if (!request.serviceWorker() && new URL(request.url()).pathname.endsWith('.science'))
      downloads++
  })
  const pageErrors: string[] = []
  page.on('pageerror', (error) => pageErrors.push(error.message))

  await page.goto(url, {
    timeout: 180000,
    waitUntil: 'domcontentloaded'
  })

  // Wait for the real worker (including first-use compilation) before checking renderers.
  await page
    .getByText('Run the renderer coverage scenario.', { exact: true })
    .waitFor({ timeout: 30000 })

  // The consent banner can cover artifact cards on narrow viewports.
  const rejectCookies = page.getByRole('button', { name: 'Reject non-essential', exact: true })
  if (await rejectCookies.isVisible()) await rejectCookies.click()

  // -- user bubble -------------------------------------------------------------
  await expect(page.getByText('Run the renderer coverage scenario.')).toBeVisible()

  // -- markdown surface ---------------------------------------------------------
  await expect(page.getByRole('heading', { name: 'Coverage Markdown Heading' })).toBeVisible()
  await expect(page.getByText('bold coverage')).toBeVisible()
  await expect(page.getByText('italic coverage')).toBeVisible()
  await expect(page.getByText('inline-code-coverage')).toBeVisible()
  await expect(page.getByRole('link', { name: 'coverage-link' })).toHaveAttribute(
    'href',
    'https://example.com/coverage'
  )
  await expect(page.getByText('Blockquote coverage line.')).toBeVisible()
  await expect(page.getByText('Ordered coverage item', { exact: true })).toBeVisible()
  await expect(page.getByText('Unordered coverage item', { exact: true })).toBeVisible()
  await expect(page.getByRole('cell', { name: 'coverage-cell-1' })).toBeVisible()
  await expect(page.locator('pre').filter({ hasText: 'coverageCode' })).toBeVisible()
  await expect(
    page.locator('pre').filter({ hasText: 'plain fence coverage without a language' })
  ).toBeVisible()
  await expect(page.getByText(/🧪✅/)).toBeVisible()
  await expect(page.getByText(/覆盖渲染测试/)).toBeVisible()

  // -- elicitations --------------------------------------------------------------
  // Answered via a listed option: that option carries data-selected + a check.
  const answeredOption = page.locator('[data-selected="true"]', { hasText: 'Markdown summary' })
  await expect(answeredOption).toBeVisible()
  // Answered with free-form text.
  await expect(page.getByText('Include the appendix tables')).toBeVisible()
  // Unanswered: dashed free-form placeholder.
  await expect(page.getByText('Free-form answer')).toBeVisible()

  // -- expand both activity groups ------------------------------------------------
  for (const groupButton of await page.getByRole('button', { name: /steps ·/ }).all()) {
    await groupButton.click()
  }

  // -- per-renderer rows + detail sections -----------------------------------------
  const expandRow = async (name: string | RegExp) => {
    const row = page.getByRole('button', { name }).first()
    // Rows animate (height tween) and the dev-tools overlay can sit over the
    // click point on narrow viewports — retry until the row reports expanded.
    for (let attempt = 0; attempt < 4; attempt++) {
      await row.scrollIntoViewIfNeeded()
      if ((await row.getAttribute('aria-expanded')) === 'true') return
      // dispatchEvent bypasses hit-testing entirely: overlays and the
      // expand/collapse height animation cannot swallow the click.
      await row.dispatchEvent('click')
      await page.waitForTimeout(300)
    }
    await expect(row).toHaveAttribute('aria-expanded', 'true')
  }

  await expandRow(/^Skill\b.*mcp-literature/)
  await expect(page.getByText(/Coverage skill document body|Coverage Skill/).first()).toBeVisible()

  // The first "Notebook run" row is the repl execution; its accessible name
  // ends with the "done" meta label.
  await expandRow(/^Notebook run done$/)
  await expect(page.getByText('coverage stdout line')).toBeVisible()
  await expect(page.getByText('coverage stderr warning')).toBeVisible()
  await expect(page.locator('img[src^="blob:"]').first()).toBeVisible()

  await expandRow(/^Notebook run\b.*coverage_cell/)
  await expect(page.getByText(/coverage_auc/)).toBeVisible()

  await expandRow(/^Read\b.*coverage_notes/)
  await expect(page.getByText(/read-file body line/)).toBeVisible()

  await expandRow('Manage packages')
  await expect(page.getByText('pandas')).toBeVisible()
  await expect(page.getByText('scikit-learn')).toBeVisible()

  await expandRow('Inspect packages')
  await expect(page.getByText(/installed/)).toBeVisible()

  await expandRow(/^Write file\b.*coverage_report/)
  await expect(page.locator('section[aria-label="coverage_report.md"]')).toBeVisible()

  await expandRow(/^Save to library inbox\b.*2 refs/)
  await expect(page.getByText(/pmid:11111111/)).toBeVisible()

  await expandRow(/^Web Search\b.*GLP-1/)
  await expect(page.getByText('2 results')).toBeVisible()
  await expect(page.getByRole('link', { name: 'Coverage Result One' })).toHaveAttribute(
    'href',
    'https://example.com/result-1'
  )

  // -- generic fallback + edge states -----------------------------------------------
  await expandRow('Mystery tool')
  await expect(page.getByText(/coverage_input/)).toBeVisible()

  await expandRow('Failing tool')
  await expect(page.getByText('failed', { exact: true })).toBeVisible()

  await expandRow('Declined tool')
  await expect(page.getByRole('button', { name: 'Declined tool' })).toBeVisible()

  await expandRow('Truncated tool')
  await expect(page.getByText(/Long payloads are shortened in the essential view/)).toHaveCount(0)
  await expect(page.locator('pre').filter({ hasText: 'x'.repeat(30000) })).toBeVisible()

  // A tool with no payload renders as a one-line row with expansion disabled.
  await expect(page.getByRole('button', { name: 'Empty tool' })).toBeDisabled()

  // -- artifact gallery: 4 states -----------------------------------------------------
  // content-visibility renders offscreen rows lazily — bring the gallery into view first.
  await page.getByText('GENERATED · 8').scrollIntoViewIfNeeded()
  await expect(page.getByText('GENERATED · 8')).toBeVisible()
  await expect(page.getByTitle('Preview coverage_chart.png')).toBeVisible()
  await expect(page.getByTitle('Preview coverage_report.md')).toBeVisible()
  await expect(page.getByTitle(/Download coverage_dataset\.zip/)).toBeVisible()
  await expect(page.getByText('Full only', { exact: true })).toHaveCount(0)
  await expect(page.getByTitle(/Download coverage_huge.bin/)).toHaveAttribute(
    'href',
    /\/extracted\/files\//
  )

  // -- inline asset link in message content ---------------------------------------------
  await expect(page.getByRole('link', { name: 'coverage_report.md' }).first()).toHaveAttribute(
    'href',
    /\/extracted\/files\//
  )

  await page.getByRole('link', { name: 'coverage_report.md' }).first().click()
  const preview = page.getByRole('dialog', { name: 'coverage_report.md', exact: true })
  await expect(preview.getByText('Sample coverage_report.md', { exact: true })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(preview).not.toBeVisible()
  await expect(
    page.getByRole('button', { name: /View full version|Back to essential/ })
  ).toHaveCount(0)
  const downloadCard = page.getByTitle(/Download coverage_dataset\.zip/)
  expect(requestedUrls.has((await downloadCard.getAttribute('href'))?.split('#')[0] ?? '')).toBe(
    false
  )
  await downloadCard.scrollIntoViewIfNeeded()
  const [download] = await Promise.all([page.waitForEvent('download'), downloadCard.click()])
  expect(download.suggestedFilename()).toBe('coverage_dataset.zip')
  expect(await download.failure()).toBeNull()
  for (const [label, filename] of [
    ['ZIP archive', 'coverage_dataset.zip'],
    ['Word document', 'coverage_document.docx']
  ]) {
    const link = page.getByRole('link', { name: label, exact: true })
    const [inlineDownload] = await Promise.all([page.waitForEvent('download'), link.click()])
    expect(inlineDownload.suggestedFilename()).toBe(filename)
    expect(await inlineDownload.failure()).toBeNull()
  }
  for (const [label, filename] of [
    ['closing parenthesis', 'report).md'],
    ['opening parenthesis', 'report(.md']
  ]) {
    await page.getByRole('link', { name: label, exact: true }).click()
    const dialog = page.getByRole('dialog', { name: filename, exact: true })
    await expect(dialog.getByText(`Sample ${filename}`, { exact: true })).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(dialog).not.toBeVisible()
  }
  await page.getByTitle('Preview coverage_paper.pdf').click()
  const pdfDialog = page.getByRole('dialog', { name: 'coverage_paper.pdf', exact: true })
  const pdfFrame = pdfDialog.locator('iframe')
  await expect(pdfFrame).toHaveAttribute('src', /^blob:/)
  const pdfUrl = await pdfFrame.getAttribute('src')
  expect(
    await page.evaluate(async (url) => {
      const response = await fetch(url as string)
      return {
        type: response.headers.get('content-type'),
        prefix: (await response.text()).slice(0, 8)
      }
    }, pdfUrl)
  ).toEqual({ type: 'application/pdf', prefix: '%PDF-1.4' })
  await page.keyboard.press('Escape')
  expect(downloads).toBe(0)

  // -- global hygiene ----------------------------------------------------------------------
  const bodyText = await page.locator('body').innerText()
  expect(bodyText).not.toContain('[object Object]')
  expect(bodyText).not.toContain('Could not render')
  expect(pageErrors).toEqual([])
}

export async function verifyReplayLoading(page: Page, url: string) {
  // Control worker timing to assert short-lived states without delaying production code.
  await page.addInitScript(() => {
    const workers: { onmessage?: (event: MessageEvent) => void; terminated: boolean }[] = []
    Object.assign(window, { replayTestWorkers: workers })
    class ControlledWorker {
      onmessage?: (event: MessageEvent) => void
      terminated = false
      constructor() {
        workers.push(this)
      }
      postMessage() {}
      terminate() {
        this.terminated = true
      }
    }
    Object.assign(window, { Worker: ControlledWorker })
  })
  await page.goto(url)
  await expect(page.getByRole('status')).toHaveText('Loading research session…')
  const downloadLink = page.getByRole('link', { name: 'Download research package', exact: true })
  await expect(downloadLink).toBeVisible()
  await expect(page.getByRole('progressbar')).not.toHaveAttribute('value')
  await page.waitForFunction(
    () => (window as unknown as { replayTestWorkers: unknown[] }).replayTestWorkers.length === 1
  )
  const emit = (data: unknown) =>
    page.evaluate((data) => {
      const workers = (
        window as unknown as {
          replayTestWorkers: { onmessage: (event: { data: unknown }) => void }[]
        }
      ).replayTestWorkers
      workers.at(-1)?.onmessage({ data })
    }, data)
  await emit({ type: 'progress', progress: { stage: 'downloading', loaded: 20, total: 100 } })
  await expect(page.getByRole('status')).toHaveText('Downloading research package…')
  await expect(page.getByRole('progressbar')).toHaveAttribute('value', '20')
  await expect(page.getByText('20%', { exact: true })).toBeVisible()
  await emit({ type: 'progress', progress: { stage: 'downloading', loaded: 30 } })
  await expect(page.getByRole('progressbar')).not.toHaveAttribute('value')
  for (const [stage, label] of [
    ['verifying', 'Verifying SHA-256…'],
    ['parsing', 'Parsing research session…']
  ]) {
    await emit({ type: 'progress', progress: { stage } })
    await expect(page.getByRole('status')).toHaveText(label)
    await expect(page.getByRole('progressbar')).not.toHaveAttribute('value')
  }
  await emit({ type: 'error', message: 'Package SHA-256 verification failed.' })
  await expect(page.locator('main').getByRole('alert')).toContainText(
    'Package SHA-256 verification failed.'
  )
  await expect(downloadLink).toBeVisible()
  await page.getByRole('button', { name: 'Retry', exact: true }).click()
  await page.waitForFunction(
    () => (window as unknown as { replayTestWorkers: unknown[] }).replayTestWorkers.length === 2
  )
  expect(
    await page.evaluate(
      () =>
        (window as unknown as { replayTestWorkers: { terminated: boolean }[] }).replayTestWorkers[0]
          .terminated
    )
  ).toBe(true)
}
