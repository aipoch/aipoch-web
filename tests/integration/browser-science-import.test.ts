import { test, expect as unitExpect } from 'bun:test'
import { createServer } from 'node:http'
import { resolve } from 'node:path'
import { chromium, devices, expect } from '@playwright/test'
import type { ImportTestState } from '../fixtures/browser-import-sdk'

type TestWindow = Window & { importTest: ImportTestState; unmountImport: () => void }

test('composer automatically launches after download and preserves explicit retry, cancellation and receipt semantics', async () => {
  const build = await Bun.build({
    entrypoints: [resolve('tests/fixtures/browser-import-page.tsx')],
    target: 'browser',
    define: { 'process.env.NODE_ENV': '"production"' },
    plugins: [
      {
        name: 'test-only-sdk',
        setup(builder) {
          builder.onResolve({ filter: /(?:lib\/science-package\/sdk|mocks\/ready)$/ }, () => ({
            path: resolve('tests/fixtures/browser-import-sdk.ts')
          }))
        }
      }
    ]
  })
  unitExpect(build.success).toBe(true)
  const javascript = await build.outputs[0].text()
  let downloads = 0
  let includeContentLength = true
  let finishDownload = () => {}
  const server = createServer((request, response) => {
    const path = request.url
    if (path === '/app.js') {
      response.writeHead(200, { 'Content-Type': 'text/javascript' })
      response.end(javascript)
      return
    }
    if (path === '/package.science') {
      downloads++
      response.writeHead(200, {
        'Content-Type': 'application/octet-stream',
        ...(includeContentLength ? { 'Content-Length': String(64 * 1024) } : {})
      })
      response.flushHeaders()
      response.write(new Uint8Array(32 * 1024))
      finishDownload = () => {
        response.end(new Uint8Array(32 * 1024))
      }
      return
    }
    response.writeHead(200, { 'Content-Type': 'text/html' })
    response.end(
      '<!doctype html><html><body><div id="root"></div><script type="module" src="/app.js"></script></body></html>'
    )
  })
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  const address = server.address()
  if (!address || typeof address === 'string') throw new Error('Missing test server port')
  const origin = `http://127.0.0.1:${address.port}`
  const browser = await chromium.launch()
  try {
    for (const device of ['desktop', 'narrow-desktop', 'mobile', 'iphone']) {
      const page = await browser.newPage(
        device === 'mobile'
          ? devices['Pixel 5']
          : device === 'iphone'
            ? devices['iPhone 13']
            : device === 'narrow-desktop'
              ? { viewport: { width: 393, height: 851 } }
              : {}
      )
      page.setDefaultTimeout(5000)
      const errors: string[] = []
      page.on('pageerror', (error) => errors.push(error.message))
      await page.goto(origin)
      const continueButton = page.getByRole('button', {
        name: 'Continue in Open-Science',
        exact: true
      })
      const openButton = page.getByRole('button', { name: 'Open Open-Science', exact: true })
      const snapshot = () =>
        page.evaluate(() => {
          const state = (window as unknown as TestWindow).importTest
          return {
            prepares: state.prepares,
            checks: state.checks,
            sends: state.sends,
            appLaunches: state.appLaunches,
            cancels: state.cancels,
            activation: state.activation,
            launchedBeforeSend: state.launchedBeforeSend,
            blobSize: state.blobSize
          }
        })
      if (device === 'mobile' || device === 'iphone') {
        const before = downloads
        await expect(page.getByRole('alert')).toHaveCount(0)
        await continueButton.click()
        await continueButton.click()
        await expect(page.getByRole('alert')).toHaveText('Please continue on a desktop computer.')
        await expect(page.getByRole('alert')).toHaveClass(/text-status-warning-foreground/)
        unitExpect(downloads).toBe(before)
        unitExpect(await snapshot()).toMatchObject({
          checks: 0,
          prepares: 0,
          sends: 0,
          appLaunches: 0
        })
        await expect(page.getByRole('button', { name: 'Cancel', exact: true })).toHaveCount(0)
        unitExpect(errors).toEqual([])
        await page.close()
        continue
      }
      await page.evaluate(() => {
        ;(window as unknown as TestWindow).importTest.availability = 'unavailable'
      })
      await continueButton.click()
      await expect(page.getByRole('alert')).toHaveText(
        "Could not connect to Open-Science. If it's already installed, update to version 1.0.1 or later, then open the app and try again. If you haven't installed it, download it first."
      )
      const installLink = page.getByRole('alert').getByRole('link', { name: 'download it first' })
      await expect(installLink).toBeVisible()
      await expect(installLink).toHaveAttribute('href', '/open-science/download')
      await expect(
        page.getByRole('link', { name: 'Download Open-Science', exact: true })
      ).toHaveCount(0)
      await page.evaluate(() => {
        ;(window as unknown as TestWindow).importTest.availability = 'available'
      })
      const count = downloads
      await page.getByRole('button', { name: 'Try again', exact: true }).click()
      const downloading = page.getByRole('button', {
        name: /^Downloading \.science package:/
      })
      await expect(downloading).toBeDisabled()
      await expect(downloading).toContainText('50%')
      await expect(downloading.locator('small')).toHaveText('Downloading .science package')
      await expect(page.getByRole('progressbar')).toHaveCount(0)
      await expect(page.getByRole('status')).toBeVisible()
      await expect(page.getByRole('status')).not.toContainText('%')
      unitExpect((await snapshot()).prepares).toBe(0)
      // Read through CDP: Playwright page.evaluate itself grants synthetic activation.
      const cdp = await page.context().newCDPSession(page)
      await expect
        .poll(
          async () => {
            const result = await cdp.send('Runtime.evaluate', {
              expression: 'navigator.userActivation.isActive',
              returnByValue: true,
              userGesture: false
            })
            return result.result.value
          },
          { timeout: 10000 }
        )
        .toBe(false)
      await cdp.detach()
      finishDownload()
      await expect(page.getByRole('status')).toContainText('Waiting for Open-Science')
      unitExpect(downloads).toBe(count + 1)
      unitExpect(await snapshot()).toMatchObject({
        activation: false,
        launchedBeforeSend: true,
        blobSize: 64 * 1024,
        sends: 1
      })
      const opening = page.getByRole('button', { name: 'Waiting for Open-Science…', exact: true })
      await expect(opening).toBeDisabled()
      await expect(opening).not.toContainText('%')
      await opening.dispatchEvent('click')
      const busy = page.getByRole('button', { name: /^Sending to Open-Science:/ })
      unitExpect((await snapshot()).sends).toBe(1)
      await page.evaluate(() => (window as unknown as TestWindow).importTest.phase('transferring'))
      const starting = page.getByRole('button', { name: 'Sending to Open-Science…', exact: true })
      await expect(starting).toBeDisabled()
      await expect(starting).not.toContainText('%')
      await page.evaluate(() =>
        (window as unknown as TestWindow).importTest.progress({ sentBytes: 3, totalBytes: 7 })
      )
      await expect(busy).toContainText('42%')
      await expect(page.getByRole('progressbar')).toHaveCount(0)
      await expect(page.getByRole('status')).not.toContainText('%')
      await page.getByRole('button', { name: 'Cancel', exact: true }).click()
      await expect(page.getByRole('status')).toContainText('Transfer canceled')
      await expect(page.getByRole('button', { name: 'Retry the import.' })).toHaveCount(0)
      await openButton.click()
      unitExpect((await snapshot()).prepares).toBe(2)
      unitExpect((await snapshot()).activation).toBe(true)
      await page.evaluate(() => (window as unknown as TestWindow).importTest.fail())
      await expect(page.getByRole('alert')).toContainText('not acknowledged')
      await openButton.click()
      unitExpect((await snapshot()).prepares).toBe(2)
      await page.evaluate(() => (window as unknown as TestWindow).importTest.fail(true))
      await expect(page.getByRole('status')).toContainText('Open-Science has not connected yet')
      await expect(page.getByRole('textbox')).toHaveAttribute(
        'placeholder',
        'What would you explore next? Import this session to continue in Open-Science.'
      )
      await expect(
        page.getByRole('link', { name: 'Download Open-Science', exact: true })
      ).toHaveAttribute('href', '/open-science/download')
      await page.getByRole('button', { name: 'I’ve opened Open-Science', exact: true }).click()
      unitExpect((await snapshot()).prepares).toBe(2)
      await page.evaluate(() => (window as unknown as TestWindow).importTest.finish(false))
      await expect(page.getByRole('alert')).toContainText('not acknowledged')
      await page.getByRole('button', { name: 'Start a new transfer' }).click()
      await openButton.click()
      unitExpect((await snapshot()).prepares).toBe(3)
      await page.evaluate(() => (window as unknown as TestWindow).importTest.finish())
      await expect(page.getByRole('status')).toContainText(
        'File sent to Open-Science. Please confirm the import in the app.'
      )
      await expect(openButton).toBeEnabled()
      const receivedSnapshot = await snapshot()
      await openButton.click()
      await openButton.click()
      unitExpect(await snapshot()).toEqual({
        ...receivedSnapshot,
        appLaunches: receivedSnapshot.appLaunches + 2
      })
      await expect(page.getByRole('status')).toContainText(
        'File sent to Open-Science. Please confirm the import in the app.'
      )
      await expect(page.getByText(/You may need to allow your browser/)).toBeVisible()
      await expect(page.getByText('Import successful', { exact: true })).toHaveCount(0)
      unitExpect(downloads).toBe(count + 1)
      const retryImport = page
        .getByRole('status')
        .getByRole('button', { name: 'Retry the import.', exact: true })
      await expect(retryImport).toBeVisible()
      await expect(retryImport).toHaveClass(/underline/)
      const beforeRetry = await snapshot()
      await retryImport.click()
      await expect(retryImport).toHaveCount(0)
      await expect(page.getByRole('status')).toContainText('Waiting for Open-Science')
      unitExpect(downloads).toBe(count + 1)
      unitExpect((await snapshot()).checks).toBe(beforeRetry.checks)
      unitExpect((await snapshot()).prepares).toBe(beforeRetry.prepares + 1)
      unitExpect((await snapshot()).sends).toBe(beforeRetry.sends + 1)
      unitExpect((await snapshot()).appLaunches).toBe(beforeRetry.appLaunches)
      await page.evaluate(() => (window as unknown as TestWindow).importTest.finish())
      await expect(retryImport).toBeVisible()
      // Desktop cancellation is terminal: wait for a click and reuse the held bytes.
      await retryImport.click()
      const beforeDesktopCancel = await snapshot()
      await page.evaluate(() => (window as unknown as TestWindow).importTest.desktopCancel())
      await expect(page.getByRole('status')).toHaveText(
        'Transfer canceled in Open-Science. Open Open-Science again to retry with the prepared package.'
      )
      await expect(openButton).toBeEnabled()
      await expect(page.getByRole('button', { name: 'I’ve opened Open-Science' })).toHaveCount(0)
      unitExpect(await snapshot()).toEqual(beforeDesktopCancel)
      await openButton.click()
      unitExpect((await snapshot()).prepares).toBe(beforeDesktopCancel.prepares + 1)
      unitExpect((await snapshot()).sends).toBe(beforeDesktopCancel.sends + 1)
      unitExpect((await snapshot()).blobSize).toBe(beforeDesktopCancel.blobSize)
      unitExpect(downloads).toBe(count + 1)
      await page.evaluate(() => (window as unknown as TestWindow).importTest.finish())
      await expect(retryImport).toBeVisible()
      // Unmount during a new send must abort it without late React updates.
      await page.goto(origin)
      await continueButton.click()
      await expect(downloading).toContainText('50%')
      unitExpect(downloads).toBe(count + 2)
      finishDownload()
      await expect(page.getByRole('status')).toContainText('Waiting for Open-Science')
      await page.evaluate(() => (window as unknown as TestWindow).unmountImport())
      unitExpect((await snapshot()).cancels).toBe(1)
      await page.evaluate(() => (window as unknown as TestWindow).importTest.finish())
      await expect(page.getByRole('region')).toHaveCount(0)
      // Accelerated fixture clock verifies UI recovery; actual SDK timing is tested separately.
      await page.clock.install()
      await page.clock.pauseAt(new Date(Date.now() + 1000))
      await page.goto(origin)
      await continueButton.click()
      await expect(downloading).toContainText('50%')
      finishDownload()
      await expect(page.getByRole('status')).toContainText('Waiting for Open-Science')
      await page.clock.runFor(16000)
      await expect(
        page.getByRole('button', { name: 'Waiting for Open-Science…', exact: true })
      ).toBeDisabled()
      await expect(
        page.getByText(
          'If your browser asks to open Open-Science, choose Open. You may also need to allow local network access.',
          { exact: true }
        )
      ).toBeVisible()
      unitExpect((await snapshot()).prepares).toBe(1)
      unitExpect((await snapshot()).sends).toBe(1)
      await page.clock.runFor(104000)
      await expect(page.getByRole('status')).toHaveText(
        'Open-Science has not connected yet. Open the app, allow any browser prompts, then continue.'
      )
      const downloadFallback = page.getByText('If Open-Science does not open,', { exact: false })
      await expect(downloadFallback).toContainText(
        'and double-click it to open it with your installed Open-Science app.'
      )
      await expect(downloadFallback).toContainText('“Open with” and select Open-Science.')
      const packageLink = downloadFallback.getByRole('link', {
        name: 'download the .science package'
      })
      await expect(packageLink).toHaveAttribute('href', '/download.science')
      await expect(packageLink).toHaveAttribute('download', 'test.science')
      await expect(
        downloadFallback.getByRole('link', { name: 'Download Open-Science' })
      ).toHaveAttribute('href', '/open-science/download')
      await page.evaluate(() => history.replaceState(null, '', '#manual-reconnect-marker'))
      await page.getByRole('button', { name: 'I’ve opened Open-Science', exact: true }).click()
      await expect(downloadFallback).toHaveCount(0)
      unitExpect(page.url()).toContain('#manual-reconnect-marker')
      unitExpect((await snapshot()).prepares).toBe(1)
      unitExpect((await snapshot()).sends).toBe(2)
      await page.evaluate(() => (window as unknown as TestWindow).importTest.fail(true))
      await openButton.click()
      unitExpect(page.url()).toContain('#test-import-1')
      unitExpect((await snapshot()).prepares).toBe(1)
      await page.getByRole('button', { name: 'Cancel', exact: true }).click()
      await expect(page.getByRole('status')).toContainText('Transfer canceled')
      await openButton.click()
      unitExpect((await snapshot()).prepares).toBe(2)
      await page.evaluate(() => (window as unknown as TestWindow).importTest.finish())
      await expect(page.getByRole('status')).toContainText(
        'File sent to Open-Science. Please confirm the import in the app.'
      )
      // No Content-Length: use manifest size when known, otherwise do not invent a percentage.
      includeContentLength = false
      for (const [suffix, percentage] of [
        ['', '50%'],
        ['?unknownSize=1', '—%']
      ]) {
        await page.goto(`${origin}${suffix}`)
        await continueButton.click()
        await expect(downloading).toContainText(percentage)
        await expect(page.getByRole('progressbar')).toHaveCount(0)
        await page.getByRole('button', { name: 'Cancel', exact: true }).click()
        await expect(page.getByRole('status')).toContainText('Download canceled')
      }
      includeContentLength = true
      unitExpect(errors).toEqual([])
      await page.close()
    }
  } finally {
    await browser.close()
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()))
      server.closeAllConnections()
    })
  }
}, 60000)
