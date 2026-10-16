import { expect, type Page } from '@playwright/test'

/** Real Next/MSW download path. Never clicks a custom protocol or contacts a desktop receiver. */
export async function verifyImportPreparation(
  page: Page,
  url: string,
  api: string,
  screenshot: string
) {
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
    for (const discoveryMode of ['unavailable', 'incompatible', 'timeout']) {
      await update({ discoveryMode })
      await composer.getByRole('button', { name: /^(Continue in Open-Science|Try again)$/ }).click()
      await expect(composer.getByRole('alert')).toHaveText(
        "Could not connect to Open-Science. Open the app and try again. If you haven't installed it, download it first."
      )
      const link = composer.getByRole('link', { name: 'Download Open-Science', exact: true })
      await expect(link).toHaveAttribute('href', '/open-science/download')
      await expect(link).toHaveAttribute('target', '_blank')
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
    // Stop before completion: the SDK-substitute browser suite covers automatic launch.
    await composer.getByRole('button', { name: /^(Continue in Open-Science|Try again)$/ }).click()
    await expect(busyButton).toBeDisabled()
    await composer.getByRole('button', { name: 'Cancel', exact: true }).click()
    await expect(composer.getByRole('status')).toContainText('Download canceled')
    await expect(page.getByRole('link', { name: 'Download research package' })).toHaveAttribute(
      'href',
      /\.science$/
    )
    expect(await composer.innerHTML()).not.toContain('open-science://')
    expect(await composer.innerText()).not.toContain('Import successful')
    const viewport = page.viewportSize()
    const box = await composer.boundingBox()
    expect(box && viewport && box.x + box.width <= viewport.width).toBe(true)
  } finally {
    await update({})
  }
}
