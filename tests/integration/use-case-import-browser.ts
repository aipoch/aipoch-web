import { expect, type Page } from '@playwright/test'

/** Real Next/MSW download and launch boundary. No desktop receiver is used. */
export async function verifyImportPreparation(
  page: Page,
  url: string,
  api: string,
  screenshot: string,
  mobile = false
) {
  const cdp = await page.context().newCDPSession(page)
  await cdp.send('Page.enable')
  let protocolRequests = 0
  cdp.on('Page.frameRequestedNavigation', ({ url }) => {
    // Count only; protocol URLs contain secrets and must never be retained or logged.
    if (url.startsWith('open-science:')) protocolRequests++
  })
  const controls = `${api}/__mock/use-case-manifest`
  const update = (body: object) => fetch(controls, { method: 'PUT', body: JSON.stringify(body) })
  try {
    const response = await page.goto(url)
    expect(response?.status()).toBe(200)
    const composer = page.getByRole('region', { name: 'Import to Open-Science', exact: true })
    await composer.waitFor({ timeout: 60000 })
    const cookies = page.getByRole('button', { name: 'Reject non-essential', exact: true })
    if (await cookies.isVisible()) await cookies.click()
    await composer.scrollIntoViewIfNeeded()
    await expect(composer.getByRole('textbox')).toBeDisabled()
    for (const label of ['Attach files', 'Research tools', 'Configure your research']) {
      await expect(composer.getByRole('button', { name: new RegExp(label) })).toBeDisabled()
    }
    await expect(
      page.getByRole('link', { name: 'Download research package', exact: true })
    ).toHaveCount(1)
    await page.screenshot({ path: screenshot })
    const initialPackages = (await (await fetch(controls)).json()).packageRequests
    if (mobile) {
      const discoveryRequests: string[] = []
      page.on('request', (request) => {
        if (request.url().includes('/v1/browser-import/capabilities'))
          discoveryRequests.push(request.url())
      })
      const start = composer.getByRole('button', { name: 'Continue in Open-Science', exact: true })
      await expect(composer.getByRole('alert')).toHaveCount(0)
      await start.click()
      await start.click()
      const warning = composer.getByRole('alert')
      await expect(warning).toHaveText('Please continue on a desktop computer.')
      await expect(warning).toHaveClass(/text-status-warning-foreground/)
      expect(discoveryRequests).toEqual([])
      expect((await (await fetch(controls)).json()).packageRequests).toBe(initialPackages)
      await warning.scrollIntoViewIfNeeded()
      await page.screenshot({ path: screenshot.replace('.png', '-desktop-required.png') })
      return
    }
    for (const discoveryMode of ['unavailable', 'incompatible', 'timeout']) {
      await update({ discoveryMode })
      await composer.getByRole('button', { name: /^(Continue in Open-Science|Try again)$/ }).click()
      await expect(composer.getByRole('alert')).toHaveText(
        "Could not connect to Open-Science. If it's already installed, update to version 1.0.1 or later, then open the app and try again. If you haven't installed it, download it first.",
        { timeout: 8000 }
      )
      const link = composer.getByRole('alert').getByRole('link', { name: 'download it first' })
      await expect(link).toHaveAttribute('href', '/open-science/download')
      await expect(link).toHaveAttribute('target', '_blank')
      await expect(
        composer.getByRole('link', { name: 'Download Open-Science', exact: true })
      ).toHaveCount(0)
      expect((await (await fetch(controls)).json()).packageRequests).toBe(initialPackages)
      expect(page.url()).toBe(url)
    }
    for (const [packageMode, message] of [
      ['error', 'HTTP 503'],
      ['empty', 'empty'],
      ['oversized', '2 GiB']
    ]) {
      await update({ packageMode })
      await composer.getByRole('button', { name: /^(Continue in Open-Science|Try again)$/ }).click()
      await expect(composer.getByRole('alert')).toContainText(message)
      await expect(
        composer.getByRole('button', { name: 'Continue in Open-Science', exact: true })
      ).toBeEnabled()
    }
    await update({ packageDelayMs: 1200 })
    const before = (await (await fetch(controls)).json()).packageRequests
    await composer.getByRole('button', { name: /^(Continue in Open-Science|Try again)$/ }).click()
    await expect(composer.getByRole('status')).toContainText('Downloading')
    const busyButton = composer.getByRole('button', {
      name: /^Downloading \.science package:/
    })
    await expect(busyButton).toBeDisabled()
    await expect(busyButton).toContainText('0%')
    await expect(composer.getByRole('progressbar')).toHaveCount(0)
    await expect(composer.getByRole('status')).toBeVisible()
    await expect(composer.getByRole('status')).not.toContainText('%')
    const statusBox = await composer.getByRole('status').boundingBox()
    const cancelBox = await composer
      .getByRole('button', { name: 'Cancel', exact: true })
      .boundingBox()
    expect(statusBox && cancelBox).toBeTruthy()
    if (statusBox && cancelBox) {
      expect(cancelBox.x).toBeGreaterThanOrEqual(statusBox.x + statusBox.width)
      expect(
        Math.abs(statusBox.y + statusBox.height / 2 - cancelBox.y - cancelBox.height / 2)
      ).toBeLessThan(2)
    }
    await expect(busyButton.locator('small')).toHaveText('Downloading .science package')
    await composer.scrollIntoViewIfNeeded()
    await page.screenshot({ path: screenshot.replace('.png', '-downloading.png') })
    await busyButton.dispatchEvent('click')
    await composer.getByRole('button', { name: 'Cancel', exact: true }).click()
    await expect(composer.getByRole('status')).toContainText('Download canceled')
    await expect
      .poll(async () => (await (await fetch(controls)).json()).packageRequests)
      .toBe(before + 1)
    // Complete the real download, then exercise the no-op mock launch with the official SDK.
    await update({})
    const downloadRequest = page.waitForRequest((request) => request.url().endsWith('.science'))
    await composer.getByRole('button', { name: /^(Continue in Open-Science|Try again)$/ }).click()
    expect((await downloadRequest).url()).toBe(
      `${api}/use-case-manifest/first-flight-vs-evening-flight-which-is-more-reliable/First%20Flight%20vs.%20Evening%20Flight%20-%20Which%20Is%20More%20Reliable.science`
    )
    await expect(composer.getByRole('status')).toHaveText('Waiting for Open-Science…')
    await expect(composer.getByRole('button', { name: 'Waiting for Open-Science…' })).toBeDisabled()
    expect(protocolRequests).toBe(0)
    expect(page.url()).toBe(url)
    const completedDownloads = (await (await fetch(controls)).json()).packageRequests
    await composer.getByRole('button', { name: 'Cancel', exact: true }).click()
    const openButton = composer.getByRole('button', { name: 'Open Open-Science', exact: true })
    await expect(openButton).toBeEnabled()
    await openButton.click()
    await expect(composer.getByRole('status')).toHaveText('Waiting for Open-Science…')
    expect((await (await fetch(controls)).json()).packageRequests).toBe(completedDownloads)
    expect(protocolRequests).toBe(0)
    expect(page.url()).toBe(url)
    await composer.getByRole('button', { name: 'Cancel', exact: true }).click()
    await expect(openButton).toBeEnabled()
    await expect(page.getByRole('link', { name: 'Download research package' })).toHaveAttribute(
      'href',
      `${api}/use-case-manifest/releases/first-flight-vs-evening-flight-which-is-more-reliable.science`
    )
    expect(await composer.innerHTML()).not.toContain('open-science://')
    expect(await composer.innerText()).not.toContain('Import successful')
    const viewport = page.viewportSize()
    const box = await composer.boundingBox()
    expect(box && viewport && box.x + box.width <= viewport.width).toBe(true)
  } finally {
    await cdp.detach()
    await update({})
  }
}
