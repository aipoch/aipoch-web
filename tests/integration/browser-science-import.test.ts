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
          builder.onResolve(
            { filter: /(?:vendor\/open-science\/browser-import\.mjs|mocks\/ready)$/ },
            () => ({ path: resolve('tests/fixtures/browser-import-sdk.ts') })
          )
        }
      }
    ]
  })
  unitExpect(build.success).toBe(true)
  const javascript = await build.outputs[0].text()
  let downloads = 0
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
        'Content-Length': String(64 * 1024)
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
    for (const device of ['desktop', 'mobile']) {
      const page = await browser.newPage(device === 'mobile' ? devices['Pixel 5'] : {})
      page.setDefaultTimeout(5000)
      const errors: string[] = []
      page.on('pageerror', (error) => errors.push(error.message))
      await page.goto(origin)
      const continueButton = page.getByRole('button', {
        name: 'Continue in Open-Science',
        exact: true
      })
      const snapshot = () =>
        page.evaluate(() => {
          const state = (window as unknown as TestWindow).importTest
          return {
            prepares: state.prepares,
            sends: state.sends,
            cancels: state.cancels,
            activation: state.activation,
            launchedBeforeSend: state.launchedBeforeSend,
            blobSize: state.blobSize
          }
        })
      const count = downloads
      await continueButton.click()
      const downloading = page.getByRole('button', {
        name: 'Downloading .science package',
        exact: true
      })
      await expect(downloading).toBeDisabled()
      await expect(downloading.getByRole('progressbar')).toHaveAttribute('value', '50')
      await expect(downloading).toContainText('50%')
      await expect(downloading.locator('small')).toHaveText('Downloading .science package')
      await expect(page.getByRole('progressbar')).toHaveCount(1)
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
      const busy = page.getByRole('button', { name: 'Sending to Open-Science…' })
      await busy.dispatchEvent('click')
      unitExpect((await snapshot()).sends).toBe(1)
      await page.evaluate(() =>
        (window as unknown as TestWindow).importTest.progress({ sentBytes: 3, totalBytes: 7 })
      )
      await expect(page.getByRole('progressbar')).toHaveAttribute('value', '42')
      await page.getByRole('button', { name: 'Cancel', exact: true }).click()
      await expect(page.getByRole('status')).toContainText('Transfer canceled')
      await continueButton.click()
      unitExpect((await snapshot()).prepares).toBe(2)
      unitExpect((await snapshot()).activation).toBe(true)
      await page.evaluate(() => (window as unknown as TestWindow).importTest.fail())
      await expect(page.getByRole('alert')).toContainText('not acknowledged')
      await continueButton.click()
      unitExpect((await snapshot()).prepares).toBe(2)
      await page.evaluate(() => (window as unknown as TestWindow).importTest.fail(true))
      await expect(page.getByRole('alert')).toContainText('Could not open Open-Science')
      await expect(page.getByRole('textbox')).toHaveAttribute(
        'placeholder',
        /download Open-Science first/
      )
      await expect(
        page.getByRole('link', { name: 'Download Open-Science', exact: true })
      ).toHaveAttribute('href', '/open-science/download')
      await continueButton.click()
      unitExpect((await snapshot()).prepares).toBe(3)
      await page.evaluate(() => (window as unknown as TestWindow).importTest.finish(false))
      await expect(page.getByRole('alert')).toContainText('not acknowledged')
      await page.getByRole('button', { name: 'Start a new transfer' }).click()
      await continueButton.click()
      unitExpect((await snapshot()).prepares).toBe(4)
      await page.evaluate(() => (window as unknown as TestWindow).importTest.finish())
      await expect(page.getByRole('status')).toHaveText(
        'File sent to Open-Science. Please confirm the import in the app.'
      )
      await expect(page.getByRole('button', { name: 'Sent to Open-Science' })).toBeDisabled()
      await expect(page.getByText('Import successful', { exact: true })).toHaveCount(0)
      unitExpect(downloads).toBe(count + 1)
      // Unmount during a new send must abort it without late React updates.
      await page.goto(origin)
      await continueButton.click()
      await expect(downloading.getByRole('progressbar')).toHaveAttribute('value', '50')
      finishDownload()
      await expect(page.getByRole('status')).toContainText('Waiting for Open-Science')
      await page.evaluate(() => (window as unknown as TestWindow).unmountImport())
      unitExpect((await snapshot()).cancels).toBe(1)
      await page.evaluate(() => (window as unknown as TestWindow).importTest.finish())
      await expect(page.getByRole('region')).toHaveCount(0)
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
