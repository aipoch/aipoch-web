import { test, expect as unitExpect } from 'bun:test'
import { resolve } from 'node:path'
import { chromium, expect } from '@playwright/test'
import type { WaitContract } from '../fixtures/browser-import-wait-contract'

type ContractWindow = Window & { waitContract: WaitContract }

test('actual SDK waits past 15 seconds, bounds 120 seconds and reconnects the same transfer', async () => {
  const build = await Bun.build({
    entrypoints: [resolve('tests/fixtures/browser-import-wait-contract.ts')],
    target: 'browser'
  })
  unitExpect(build.success).toBe(true)
  const script = await build.outputs[0].text()
  const server = Bun.serve({
    port: 0,
    hostname: '127.0.0.1',
    fetch(request) {
      return new URL(request.url).pathname === '/app.js'
        ? new Response(script, { headers: { 'Content-Type': 'text/javascript' } })
        : new Response('<!doctype html><script type="module" src="/app.js"></script>', {
            headers: { 'Content-Type': 'text/html' }
          })
    }
  })
  const browser = await chromium.launch()
  try {
    for (const scenario of [
      'late-ready',
      'timeout',
      'headers',
      'body',
      'cancel',
      'cancel-headers',
      'cancel-body'
    ]) {
      const page = await browser.newPage()
      try {
        await page.clock.install({ time: new Date('2026-10-16T00:00:00Z') })
        await page.clock.pauseAt(new Date('2026-10-16T00:00:01Z'))
        await page.goto(server.url.toString())
        await page.evaluate((scenario) => {
          const state = (window as unknown as ContractWindow).waitContract
          if (scenario.endsWith('headers')) state.stall = 'headers'
          if (scenario.endsWith('body')) state.stall = 'body'
          state.begin({
            readinessMode: 'wait-for-launch',
            readyTimeoutMs: scenario === 'late-ready' ? 20000 : 120000,
            attemptTimeoutMs: 2000
          })
        }, scenario)
        const snapshot = () =>
          page.evaluate(() => {
            const s = (window as unknown as ContractWindow).waitContract
            return {
              result: s.result,
              phases: s.phases,
              progress: s.progress,
              requests: s.requests,
              prepares: s.prepares,
              sends: s.sends
            }
          })
        await page.clock.runFor(16000)
        unitExpect((await snapshot()).result).toBe('pending')
        unitExpect((await snapshot()).phases).toEqual(['waiting-for-receiver'])
        unitExpect((await snapshot()).progress).toEqual([])
        unitExpect((await snapshot()).requests.length).toBeGreaterThan(5)
        if (scenario.startsWith('cancel')) {
          await page.evaluate(() => (window as unknown as ContractWindow).waitContract.cancel())
          await expect.poll(async () => (await snapshot()).result).toBe('aborted')
          const count = (await snapshot()).requests.length
          await page.clock.runFor(120000)
          unitExpect((await snapshot()).requests).toHaveLength(count)
          continue
        }
        if (scenario === 'late-ready') {
          await page.evaluate(() => {
            const s = (window as unknown as ContractWindow).waitContract
            s.ready = true
            s.chunkDelay = 10000
          })
          await page.clock.runFor(1000)
          await expect
            .poll(async () => (await snapshot()).phases)
            .toEqual(['waiting-for-receiver', 'transferring'])
          // Cross the readiness deadline while keeping this chunk within its own request budget.
          await page.clock.runFor(4001)
          unitExpect((await snapshot()).result).toBe('pending')
          unitExpect((await snapshot()).progress).toEqual([])
          await page.clock.runFor(10000)
          await expect.poll(async () => (await snapshot()).result).toBe('received')
          unitExpect((await snapshot()).progress).toEqual([7])
          continue
        }
        await page.clock.runFor(103999)
        unitExpect((await snapshot()).result).toBe('pending')
        await page.clock.runFor(1)
        await expect.poll(async () => (await snapshot()).result).toBe('timeout')
        const expired = await snapshot()
        const gaps = expired.requests
          .slice(1)
          .map((value, index) => value - expired.requests[index])
        unitExpect(gaps.every((gap) => gap === (scenario === 'timeout' ? 1000 : 3000))).toBe(true)
        await page.clock.runFor(5000)
        unitExpect((await snapshot()).requests).toHaveLength(expired.requests.length)
        await page.evaluate(() => {
          const s = (window as unknown as ContractWindow).waitContract
          s.ready = true
          s.stall = 'none'
          s.resume()
        })
        await expect.poll(async () => (await snapshot()).result).toBe('received')
        unitExpect((await snapshot()).prepares).toBe(1)
        unitExpect((await snapshot()).sends).toBe(2)
        unitExpect((await snapshot()).progress).toEqual([7])
      } finally {
        await page.close()
      }
    }
  } finally {
    await browser.close()
    server.stop(true)
  }
}, 60000)
