import { expect, type Page } from '@playwright/test'

/** Real Next/MSW download and launch boundary. No desktop receiver is used. */
export async function verifyImportPreparation(
  page: Page,
  url: string,
  api: string,
  screenshot: string,
  mobile = false,
  detail = false
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
    const regions = page.getByRole('region', {
      name: detail ? 'Research actions' : 'Replay import actions',
      exact: true
    })
    const composer = regions.first()
    const feedback = detail
      ? composer
      : page.locator('section[aria-label="Replay import feedback"]')
    const opposite = detail
      ? regions.last()
      : page.getByRole('region', { name: 'Import to Open-Science', exact: true })
    const idleLabel = detail ? 'Open in Open-Science' : 'Continue in Open-Science'
    const startLabel = detail
      ? /^(Open in Open-Science|Try again)$/
      : /^(Continue in Open-Science|Try again)$/
    await composer.waitFor({ timeout: 60000 })
    const cookies = page.getByRole('button', { name: 'Reject non-essential', exact: true })
    if (await cookies.isVisible()) await cookies.click()
    await composer.scrollIntoViewIfNeeded()
    await expect(regions).toHaveCount(detail ? 2 : 1)
    for (const region of [composer, opposite]) {
      await expect(
        region.getByText(/Allow app and local network|You may need to allow your browser/)
      ).toHaveCount(0)
    }
    const idleToolbarHeight = (await composer.boundingBox())?.height
    const wideViewport = (page.viewportSize()?.width ?? 0) >= 640
    if (detail) {
      for (const region of [composer, opposite]) {
        const firstAction = region.locator('button, a').first()
        await expect(firstAction).toHaveText('Open in Open-Science')
        await expect(firstAction).toHaveCSS('background-color', 'rgb(16, 17, 15)')
        await expect(firstAction).toHaveCSS('color', 'rgb(255, 255, 255)')
        await expect(
          region.getByRole('link', { name: 'View the research session', exact: true })
        ).toHaveAttribute('href', /\/replay$/)
      }
    } else {
      const open = composer.getByRole('button', { name: idleLabel, exact: true })
      await expect(open).toHaveCSS('background-color', 'rgb(16, 17, 15)')
      await expect(open).toHaveCSS('color', 'rgb(255, 255, 255)')
      await expect(open).toHaveCSS('font-size', wideViewport ? '13px' : '12px')
      // Keep ten pixels of vertical padding around the toolbar's 36px import button.
      if (wideViewport)
        expect((await composer.locator(':scope > div').boundingBox())?.height).toBe(56)
      expect((await feedback.boundingBox())?.height).toBe(0)
      await opposite.scrollIntoViewIfNeeded()
      await expect(open).toBeInViewport()
      await page.evaluate(() => window.scrollTo(0, 0))
      const downloadBox = await composer
        .getByRole('link', { name: 'Download research package', exact: true })
        .boundingBox()
      const openBox = await open.boundingBox()
      expect(downloadBox && openBox).toBeTruthy()
      if (wideViewport && downloadBox && openBox)
        expect(downloadBox.x + downloadBox.width).toBeLessThanOrEqual(openBox.x)
      await expect(opposite.getByRole('textbox')).toBeDisabled()
      for (const label of ['Attach files', 'Research tools', 'Configure your research']) {
        await expect(opposite.getByRole('button', { name: new RegExp(label) })).toBeDisabled()
      }
    }
    await expect(
      page.getByRole('link', { name: 'Download research package', exact: true })
    ).toHaveCount(detail ? 2 : 1)
    await page.screenshot({ path: screenshot })
    const initialPackages = (await (await fetch(controls)).json()).packageRequests
    if (mobile) {
      const discoveryRequests: string[] = []
      page.on('request', (request) => {
        if (request.url().includes('/v1/browser-import/capabilities'))
          discoveryRequests.push(request.url())
      })
      const start = composer.getByRole('button', { name: idleLabel, exact: true })
      await expect(feedback.getByRole('alert')).toHaveCount(0)
      await start.click()
      await composer.getByRole('button', { name: idleLabel, exact: true }).click()
      const warning = feedback.getByRole('alert')
      await expect(warning).toHaveText('Please continue on a desktop computer.')
      await expect(warning).toHaveClass(/text-status-warning-foreground/)
      await expect(opposite.getByRole('alert')).toHaveText('Please continue on a desktop computer.')
      for (const region of [composer, opposite]) {
        await expect(region.getByText(/You may need to allow your browser/)).toHaveCount(0)
      }
      if (detail) {
        for (const region of [composer, opposite]) {
          // Measure the settled layout after the first-interaction reveal finishes.
          await expect(async () => {
            const buttonBox = await region
              .getByRole('button', { name: idleLabel, exact: true })
              .boundingBox()
            const warningBox = await region.getByRole('alert').boundingBox()
            const downloadBox = await region
              .getByRole('link', { name: 'Download research package', exact: true })
              .boundingBox()
            expect(buttonBox && warningBox && downloadBox).toBeTruthy()
            if (buttonBox && warningBox && downloadBox) {
              expect(warningBox.y).toBeGreaterThanOrEqual(buttonBox.y + buttonBox.height)
              expect(warningBox.y + warningBox.height).toBeLessThanOrEqual(downloadBox.y)
            }
          }).toPass({ timeout: 2000 })
        }
      } else {
        await expect
          .poll(async () => {
            const toolbarBox = await composer.boundingBox()
            const backBox = await composer
              .getByRole('link', { name: /Back to overview/ })
              .boundingBox()
            return toolbarBox && backBox
              ? Math.abs(backBox.y + backBox.height / 2 - toolbarBox.y - toolbarBox.height / 2)
              : Infinity
          })
          .toBeLessThan(2)
      }
      expect(discoveryRequests).toEqual([])
      expect((await (await fetch(controls)).json()).packageRequests).toBe(initialPackages)
      await warning.scrollIntoViewIfNeeded()
      await page.screenshot({ path: screenshot.replace('.png', '-desktop-required.png') })
      return
    }
    await update({ packageDelayMs: 1200 })
    const before = (await (await fetch(controls)).json()).packageRequests
    await composer.getByRole('button', { name: startLabel }).click()
    await expect(feedback.getByRole('status')).toContainText('Downloading')
    const busyButton = composer.getByRole('button', {
      name: /^Downloading \.science package:/
    })
    await expect(busyButton).toBeDisabled()
    await expect(busyButton).toContainText('0%')
    await expect(opposite.getByText(/You may need to allow your browser/)).toBeVisible()
    // Inline cancellation must not add hidden padding between the two guidance lines.
    await expect(async () => {
      const hintBox = await opposite.getByText(/You may need to allow your browser/).boundingBox()
      const messageBox = await opposite.getByRole('status').boundingBox()
      expect(hintBox && messageBox).toBeTruthy()
      if (hintBox && messageBox) expect(messageBox.y - hintBox.y - hintBox.height).toBe(4)
    }).toPass({ timeout: 1000 })
    if (!detail) await expect(feedback).toHaveCSS('opacity', '1')
    const expandedToolbarHeight = (await composer.boundingBox())?.height
    if (!detail) expect(expandedToolbarHeight).toBeGreaterThan(idleToolbarHeight ?? 0)
    if (!detail && wideViewport)
      expect((await composer.locator(':scope > div').boundingBox())?.height).toBe(56)
    await expect(opposite.getByRole('button', { name: /^Downloading/ })).toBeDisabled()
    await expect(composer.getByRole('progressbar')).toHaveCount(0)
    await expect(feedback.getByRole('status')).toBeVisible()
    await expect(feedback.getByRole('status')).not.toContainText('%')
    const statusBox = await feedback.getByRole('status').boundingBox()
    const cancelBox = await feedback
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
    await opposite.getByRole('button', { name: 'Cancel', exact: true }).click()
    await expect(feedback.getByRole('status')).toContainText('Download canceled')
    if (!detail) expect((await composer.boundingBox())?.height).toBe(expandedToolbarHeight)
    await expect(opposite.getByRole('button', { name: idleLabel, exact: true })).toBeEnabled()
    await expect
      .poll(async () => (await (await fetch(controls)).json()).packageRequests)
      .toBe(before + 1)
    // Complete the real download, then exercise the no-op mock launch with the official SDK.
    await update({})
    const downloadRequest = page.waitForRequest((request) => request.url().endsWith('.science'))
    await composer.getByRole('button', { name: startLabel }).click()
    expect((await downloadRequest).url()).toBe(
      `${api}/use-case-manifest/first-flight-vs-evening-flight-which-is-more-reliable/First%20Flight%20vs.%20Evening%20Flight%20-%20Which%20Is%20More%20Reliable.science`
    )
    await expect(feedback.getByRole('status')).toContainText('Waiting for Open-Science…')
    const openingHintBox = await opposite
      .getByText(/^If your browser asks to open Open-Science/)
      .boundingBox()
    const openingMessageBox = await opposite.getByRole('status').boundingBox()
    expect(openingHintBox && openingMessageBox).toBeTruthy()
    if (openingHintBox && openingMessageBox) {
      expect(openingMessageBox.y - openingHintBox.y - openingHintBox.height).toBe(4)
    }
    if (!detail) expect((await composer.boundingBox())?.height).toBe(expandedToolbarHeight)
    await expect(composer.getByRole('button', { name: 'Waiting for Open-Science…' })).toBeDisabled()
    expect(protocolRequests).toBe(0)
    expect(page.url()).toBe(url)
    const completedDownloads = (await (await fetch(controls)).json()).packageRequests
    await expect(feedback.getByRole('button', { name: 'Open again', exact: true })).toBeVisible({
      timeout: 6000
    })
    await expect(feedback.getByText(/This check is an estimate/)).toBeVisible()
    await page.screenshot({ path: screenshot.replace('.png', '-install-hint.png') })
    await feedback.getByRole('button', { name: 'Open again', exact: true }).click()
    expect((await (await fetch(controls)).json()).packageRequests).toBe(completedDownloads)

    await opposite.getByRole('button', { name: 'Cancel', exact: true }).click()
    const openButton = composer.getByRole('button', { name: 'Open Open-Science', exact: true })
    await expect(openButton).toBeEnabled()
    await openButton.click()
    await expect(feedback.getByRole('status')).toContainText('Waiting for Open-Science…')
    expect((await (await fetch(controls)).json()).packageRequests).toBe(completedDownloads)
    expect(protocolRequests).toBe(0)
    expect(page.url()).toBe(url)
    await opposite.getByRole('button', { name: 'Cancel', exact: true }).click()
    await expect(openButton).toBeEnabled()
    await expect(
      page.getByRole('link', { name: 'Download research package' }).first()
    ).toHaveAttribute(
      'href',
      `${api}/use-case-manifest/releases/first-flight-vs-evening-flight-which-is-more-reliable.science`
    )
    if (detail) {
      await opposite.scrollIntoViewIfNeeded()
      await page.screenshot({ path: screenshot.replace('.png', '-bottom.png') })
    }
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
