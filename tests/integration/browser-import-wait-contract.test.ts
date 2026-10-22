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

for (const stall of ['none', 'headers', 'body'] as const) {
  test(`actual SDK executes all 30 attempts with three-second timeout and gaps: ${stall}`, async () => {
    const build = await Bun.build({
      entrypoints: [resolve('tests/fixtures/browser-import-wait-contract.ts')],
      target: 'browser'
    })
    unitExpect(build.success).toBe(true)
    const script = await build.outputs[0].text()
    const server = Bun.serve({
      port: 0,
      hostname: '127.0.0.1',
      fetch: () =>
        new Response(`<!doctype html><script type="module">${script}</script>`, {
          headers: { 'Content-Type': 'text/html' }
        })
    })
    const browser = await chromium.launch()
    try {
      const page = await browser.newPage()
      await page.clock.install({ time: new Date('2026-10-21T00:00:00Z') })
      await page.clock.pauseAt(new Date('2026-10-21T00:00:01Z'))
      await page.goto(server.url.toString())
      await page.evaluate((stall) => {
        const s = (window as unknown as ContractWindow).waitContract
        s.stall = stall
        s.begin({
          readinessMode: 'attempts',
          readinessAttempts: 30,
          attemptTimeoutMs: 3000,
          readinessIntervalMs: 3000,
          readyTimeoutMs: null
        })
      }, stall)
      const snapshot = () =>
        page.evaluate(() => {
          const s = (window as unknown as ContractWindow).waitContract
          return { result: s.result, requests: s.requests, phases: s.phases }
        })
      const duration = stall === 'none' ? 87000 : 177000
      await page.clock.runFor(duration - 1)
      unitExpect((await snapshot()).result).toBe('pending')
      await page.clock.runFor(1)
      await expect.poll(async () => (await snapshot()).result).toBe('readiness-exhausted')
      const done = await snapshot()
      unitExpect(done.requests).toHaveLength(30)
      unitExpect(done.phases).toEqual(['waiting-for-receiver'])
      unitExpect(done.requests.slice(1).map((value, i) => value - done.requests[i])).toEqual(
        Array(29).fill(stall === 'none' ? 3000 : 6000)
      )
      await page.clock.runFor(300000)
      unitExpect((await snapshot()).requests).toHaveLength(30)
    } finally {
      await browser.close()
      server.stop(true)
    }
  }, 30000)
}

test('attempt-count polling resumes after suspension and stops at its terminal condition', async () => {
  const build = await Bun.build({
    entrypoints: [resolve('tests/fixtures/browser-import-wait-contract.ts')],
    target: 'browser'
  })
  unitExpect(build.success).toBe(true)
  const script = await build.outputs[0].text()
  const server = Bun.serve({
    port: 0,
    hostname: '127.0.0.1',
    fetch: () =>
      new Response(`<!doctype html><script type="module">${script}</script>`, {
        headers: { 'Content-Type': 'text/html' }
      })
  })
  const browser = await chromium.launch()
  try {
    for (const stall of ['none', 'headers', 'body'] as const) {
      for (const outcome of [
        'exhausted',
        'received',
        'identity',
        'protocol',
        'cancelled'
      ] as const) {
        const page = await browser.newPage()
        try {
          await page.clock.install({ time: new Date('2026-10-22T00:00:00Z') })
          await page.clock.pauseAt(new Date('2026-10-22T00:00:01Z'))
          await page.goto(server.url.toString())
          await page.evaluate((stall) => {
            const s = (window as unknown as ContractWindow).waitContract
            s.stall = stall
            s.begin({
              readinessMode: 'attempts',
              readinessAttempts: 30,
              attemptTimeoutMs: 3000,
              readinessIntervalMs: 3000,
              readyTimeoutMs: null
            })
          }, stall)
          const snapshot = () =>
            page.evaluate(() => {
              const s = (window as unknown as ContractWindow).waitContract
              return {
                result: s.result,
                requests: s.requests.length,
                httpRequests: s.httpRequests,
                prepares: s.prepares,
                sends: s.sends,
                phases: s.phases
              }
            })
          await page.clock.runFor(7000)
          const before = await snapshot()
          unitExpect(before.result).toBe('pending')
          unitExpect(before.requests).toBeGreaterThan(1)
          // Emulate a sleeping/suspended page: overdue timers fire once on resume,
          // rather than executing ten minutes of requests while the page is paused.
          await page.clock.fastForward(600000)
          const resumed = await snapshot()
          unitExpect(resumed.result).toBe('pending')
          unitExpect(resumed.requests).toBeGreaterThanOrEqual(before.requests)
          unitExpect(resumed.requests).toBeLessThan(30)
          unitExpect(resumed.prepares).toBe(1)
          unitExpect(resumed.sends).toBe(1)
          await page.evaluate((outcome) => {
            const s = (window as unknown as ContractWindow).waitContract
            if (outcome === 'cancelled') s.cancel()
            else if (outcome !== 'exhausted') {
              s.stall = 'none'
              s.ready = true
              if (outcome === 'identity' || outcome === 'protocol') s.incompatible = outcome
            }
          }, outcome)
          if (outcome !== 'cancelled')
            await page.clock.runFor(outcome === 'exhausted' ? 180000 : 3000)
          await expect
            .poll(async () => (await snapshot()).result)
            .toBe(
              outcome === 'exhausted'
                ? 'readiness-exhausted'
                : outcome === 'cancelled'
                  ? 'aborted'
                  : outcome === 'received'
                    ? 'received'
                    : 'incompatible'
            )
          const done = await snapshot()
          if (outcome === 'exhausted') unitExpect(done.requests).toBe(30)
          else unitExpect(done.requests).toBeLessThanOrEqual(resumed.requests + 1)
          unitExpect(done.phases).toEqual(
            outcome === 'received'
              ? ['waiting-for-receiver', 'transferring']
              : ['waiting-for-receiver']
          )
          if (outcome === 'cancelled') {
            unitExpect(
              done.httpRequests.filter((request) => request.startsWith('DELETE '))
            ).toHaveLength(1)
          }
          await page.clock.fastForward(600000)
          await page.clock.runFor(180000)
          unitExpect((await snapshot()).httpRequests).toEqual(done.httpRequests)
        } finally {
          await page.close()
        }
      }
    }
  } finally {
    await browser.close()
    server.stop(true)
  }
}, 60000)
