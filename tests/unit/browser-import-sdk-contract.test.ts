import { afterAll, afterEach, expect, spyOn, test } from 'bun:test'
import { createHmac } from 'node:crypto'
import { scienceImportFilename } from '../../lib/science-package/browser-import'
import {
  checkBrowserImportAvailability,
  launchOpenScience,
  prepareBrowserImport
} from '../../lib/science-package/sdk'

// Exercise the actual pinned SDK through the website entry point with deterministic HTTP.
const fetchSpy = spyOn(
  globalThis as { fetch: (url: RequestInfo | URL, init?: RequestInit) => Promise<Response> },
  'fetch'
)
afterEach(() => fetchSpy.mockReset())
afterAll(() => fetchSpy.mockRestore())
const origin = 'https://research.example'
test('official standalone launch only requests navigation and makes no HTTP requests', () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'location')
  const destinations: string[] = []
  Object.defineProperty(globalThis, 'location', {
    configurable: true,
    value: { assign: (url: string) => destinations.push(url) }
  })
  try {
    launchOpenScience()
    expect(destinations).toEqual(['open-science://open'])
    expect(fetchSpy).not.toHaveBeenCalled()
  } finally {
    if (original) Object.defineProperty(globalThis, 'location', original)
    else Reflect.deleteProperty(globalThis, 'location')
  }
})
const prepare = () =>
  prepareBrowserImport(new Blob(['hello']), { filename: 'study.science', origin })
const stall = (signal?: AbortSignal | null) =>
  new Promise<never>((_resolve, reject) => {
    if (!signal) throw new Error('Missing SDK request signal')
    signal.throwIfAborted()
    signal.addEventListener('abort', () => reject(signal.reason), { once: true })
  })

for (const [name, response, status] of [
  [
    'compatible',
    () => Response.json({ service: 'open-science-browser-import', version: 1 }),
    'available'
  ],
  [
    'wrong version',
    () => Response.json({ service: 'open-science-browser-import', version: 2 }),
    'incompatible'
  ],
  ['HTTP failure', () => Response.json({}, { status: 503 }), 'incompatible'],
  ['invalid JSON', () => new Response('{'), 'incompatible'],
  [
    'unreachable',
    () => {
      throw new TypeError('Network or CORS')
    },
    'unavailable'
  ],
  [
    'permission denied',
    () => {
      throw new DOMException('Denied', 'NotAllowedError')
    },
    'unavailable'
  ]
] as const) {
  test(`official discovery: ${name}`, async () => {
    fetchSpy.mockImplementation(async () => response())
    expect(await checkBrowserImportAvailability({ origin })).toEqual({ status })
    expect(fetchSpy).toHaveBeenCalledTimes(1)
    expect(String(fetchSpy.mock.calls[0][0])).toBe(
      'http://127.0.0.1:49151/v1/browser-import/capabilities'
    )
    expect(fetchSpy.mock.calls[0][1]).toMatchObject({
      method: 'GET',
      credentials: 'omit',
      redirect: 'error'
    })
  })
}

test('official discovery bounds body reads, supports cancellation and detects missing browser APIs', async () => {
  fetchSpy.mockImplementation(async (_url, init) =>
    Object.assign(new Response(), { json: () => stall(init?.signal) })
  )
  expect(await checkBrowserImportAvailability({ origin, timeoutMs: 20 })).toEqual({
    status: 'timeout'
  })
  const controller = new AbortController()
  const pending = checkBrowserImportAvailability({ origin, signal: controller.signal })
  controller.abort()
  expect(await pending).toEqual({ status: 'aborted' })
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'crypto')
  try {
    Reflect.deleteProperty(globalThis, 'crypto')
    expect(await checkBrowserImportAvailability({ origin })).toEqual({
      status: 'unsupported-browser'
    })
  } finally {
    if (descriptor) Object.defineProperty(globalThis, 'crypto', descriptor)
  }
})

test('official readiness stops at five two-second attempts with one-second gaps', async () => {
  const starts: number[] = []
  const ends: number[] = []
  fetchSpy.mockImplementation(async (_url, init) => {
    starts.push(performance.now())
    try {
      return await stall(init?.signal)
    } finally {
      ends.push(performance.now())
    }
  })
  await expect(
    prepare().send({ readinessAttempts: 5, attemptTimeoutMs: 2000, readyTimeoutMs: 15000 })
  ).rejects.toMatchObject({ code: 'readiness-exhausted' })
  expect(starts).toHaveLength(5)
  for (let i = 0; i < 5; i++) {
    expect(ends[i] - starts[i]).toBeGreaterThanOrEqual(1950)
    expect(ends[i] - starts[i]).toBeLessThan(2600)
    if (i) {
      expect(starts[i] - ends[i - 1]).toBeGreaterThanOrEqual(950)
      expect(starts[i] - ends[i - 1]).toBeLessThan(1600)
    }
  }
  expect(ends[4] - starts[0]).toBeLessThan(15000)
}, 20000)

for (const stage of ['headers', 'body', 'gap']) {
  test(`official total readiness deadline interrupts ${stage}`, async () => {
    fetchSpy.mockImplementation(async (_url, init) => {
      if (stage === 'gap') throw new TypeError('Unavailable')
      if (stage === 'headers') return stall(init?.signal)
      return Object.assign(new Response(), { json: () => stall(init?.signal) })
    })
    const start = performance.now()
    await expect(
      prepare().send({ readyTimeoutMs: 50, attemptTimeoutMs: 2000, readinessAttempts: 5 })
    ).rejects.toMatchObject({ code: 'timeout' })
    expect(performance.now() - start).toBeLessThan(500)
    expect(fetchSpy).toHaveBeenCalledTimes(1)
  })
}

test('official cancellation interrupts the retry gap with no subsequent attempts', async () => {
  const controller = new AbortController()
  fetchSpy.mockRejectedValue(new TypeError('Unavailable'))
  const pending = prepare().send({ signal: controller.signal })
  const timer = setTimeout(() => controller.abort(), 20)
  try {
    await expect(pending).rejects.toMatchObject({ name: 'AbortError' })
  } finally {
    clearTimeout(timer)
  }
  expect(fetchSpy.mock.calls.filter(([, init]) => init?.method !== 'DELETE')).toHaveLength(1)
  expect(fetchSpy.mock.calls.filter(([, init]) => init?.method === 'DELETE')).toHaveLength(1)
})

test('official identity errors stop immediately without sending any bytes', async () => {
  fetchSpy.mockResolvedValue(
    Response.json({ offset: 0, accepted: false, chunkBytes: 4194304, proof: 'forged' })
  )
  await expect(prepare().send()).rejects.toMatchObject({ code: 'incompatible' })
  expect(fetchSpy).toHaveBeenCalledTimes(1)
  expect(fetchSpy.mock.calls[0][1]?.body).toBeUndefined()
  expect(new Headers(fetchSpy.mock.calls[0][1]?.headers).has('Authorization')).toBe(false)
})

test('official readiness budget ends before transfer; progress and received are separate from import', async () => {
  const transfer = prepare()
  const secret = new URL(transfer.url).searchParams.get('secret') ?? ''
  const proof = (text: string) =>
    createHmac('sha256', Buffer.from(secret, 'hex')).update(text).digest('hex')
  const progress: object[] = []
  const phases: string[] = []
  fetchSpy.mockImplementation(async (input) => {
    const url = new URL(String(input))
    if (url.pathname.endsWith('/ready')) {
      expect(progress).toHaveLength(0)
      expect(phases).toEqual(['waiting-for-receiver'])
      return Response.json({
        offset: 0,
        accepted: false,
        chunkBytes: 4194304,
        proof: proof(`open-science-import-v1:${url.searchParams.get('challenge')}:0:0`)
      })
    }
    if (url.pathname.endsWith('/chunk')) {
      expect(phases).toEqual(['waiting-for-receiver', 'transferring'])
      // This exceeds readiness's 50ms budget. Its timers must already have been disposed.
      await Bun.sleep(100)
      expect(progress).toHaveLength(0)
      return Response.json({ offset: 5, proof: proof('offset:5') })
    }
    expect(progress).toEqual([{ sentBytes: 5, totalBytes: 5 }])
    return Response.json({ received: true, proof: proof('received:5') }, { status: 202 })
  })
  const receipt = await transfer.send({
    readyTimeoutMs: 50,
    onPhase: (phase) => phases.push(phase),
    onProgress: (value: object) => progress.push(value)
  })
  expect(receipt).toEqual({ received: true })
  expect(receipt).not.toHaveProperty('imported')
  expect(fetchSpy).toHaveBeenCalledTimes(3)
})

for (const input of [
  'CON.science',
  'aux.notes.science',
  'COM¹.science',
  `${'研'.repeat(100)}.science`,
  `${'😀'.repeat(100)}.science`
]) {
  test(`normalized filename satisfies the official validator: ${input.slice(0, 15)}`, () => {
    const filename = scienceImportFilename(input)
    const transfer = prepareBrowserImport(new Blob(['hello']), { filename, origin })
    expect(new URL(transfer.url).searchParams.get('name')).toBe(filename)
  })
}

for (const stage of ['ready', 'chunk', 'complete']) {
  test(`authenticated desktop cancellation at ${stage} is terminal for the SDK transfer`, async () => {
    const transfer = prepare()
    const secret = new URL(transfer.url).searchParams.get('secret') ?? ''
    const proof = (text: string) =>
      createHmac('sha256', Buffer.from(secret, 'hex')).update(text).digest('hex')
    fetchSpy.mockImplementation(async (input, init) => {
      if (init?.method === 'DELETE') return new Response(null, { status: 204 })
      const url = new URL(String(input))
      if (url.pathname.endsWith(`/${stage}`))
        return Response.json({ code: 'cancelled', proof: proof('cancelled') }, { status: 410 })
      if (url.pathname.endsWith('/ready'))
        return Response.json({
          offset: 0,
          accepted: false,
          chunkBytes: 4194304,
          proof: proof(`open-science-import-v1:${url.searchParams.get('challenge')}:0:0`)
        })
      return Response.json({ offset: 5, proof: proof('offset:5') })
    })
    await expect(transfer.send({ readinessAttempts: 1 })).rejects.toMatchObject({
      code: 'cancelled'
    })
    const calls = fetchSpy.mock.calls.length
    await expect(transfer.send()).rejects.toMatchObject({ code: 'cancelled' })
    expect(fetchSpy).toHaveBeenCalledTimes(calls)
  })
}

for (const body of [
  JSON.stringify({ code: 'cancelled', proof: 'forged' }),
  JSON.stringify({ code: 'other', proof: 'forged' }),
  'invalid json'
]) {
  test(`unverified HTTP 410 is an identity error: ${body}`, async () => {
    fetchSpy.mockImplementation(async () => new Response(body, { status: 410 }))
    await expect(prepare().send({ readinessAttempts: 1 })).rejects.toMatchObject({
      code: 'incompatible'
    })
    expect(fetchSpy).toHaveBeenCalledTimes(1)
  })
}

for (const stage of ['ready', 'chunk', 'complete']) {
  test(`SDK cancel aborts ${stage}, cancels the authenticated receiver once and prevents reuse`, async () => {
    const transfer = prepare()
    const secret = new URL(transfer.url).searchParams.get('secret') ?? ''
    const proof = (text: string) =>
      createHmac('sha256', Buffer.from(secret, 'hex')).update(text).digest('hex')
    let reached!: () => void
    const atStage = new Promise<void>((resolve) => {
      reached = resolve
    })
    let requestSignal: AbortSignal | null | undefined
    fetchSpy.mockImplementation(async (input, init) => {
      if (init?.method === 'DELETE') {
        expect(new Headers(init.headers).get('Authorization')).toBe(
          `HMAC ${proof('DELETE\n/v1/import\n')}`
        )
        return new Response(null, { status: 204 })
      }
      const url = new URL(String(input))
      if (url.pathname.endsWith(`/${stage}`)) {
        requestSignal = init?.signal
        reached()
        return stall(init?.signal)
      }
      if (url.pathname.endsWith('/ready'))
        return Response.json({
          offset: 0,
          accepted: false,
          chunkBytes: 4194304,
          proof: proof(`open-science-import-v1:${url.searchParams.get('challenge')}:0:0`)
        })
      return Response.json({ offset: 5, proof: proof('offset:5') })
    })
    const sending = transfer.send()
    const rejected = sending.catch((error: unknown) => error)
    await atStage
    await Promise.all([transfer.cancel(), transfer.cancel()])
    expect(await rejected).toMatchObject({ code: 'cancelled' })
    expect(requestSignal?.aborted).toBe(true)
    expect(fetchSpy.mock.calls.filter(([, init]) => init?.method === 'DELETE')).toHaveLength(1)
    const count = fetchSpy.mock.calls.length
    await expect(transfer.send()).rejects.toMatchObject({ code: 'cancelled' })
    expect(fetchSpy).toHaveBeenCalledTimes(count)
  })
}

test('count-only readiness is opt-in and rejects unbounded wait-for-launch', async () => {
  await expect(
    prepare().send({ readinessMode: 'wait-for-launch', readyTimeoutMs: null })
  ).rejects.toThrow('Invalid receiver timeout.')
  expect(fetchSpy).not.toHaveBeenCalled()
  fetchSpy.mockRejectedValue(new TypeError('Unavailable'))
  await expect(
    prepare().send({
      readinessMode: 'attempts',
      readyTimeoutMs: null,
      readinessAttempts: 3,
      readinessIntervalMs: 0,
      attemptTimeoutMs: 10
    })
  ).rejects.toMatchObject({ code: 'readiness-exhausted' })
  expect(fetchSpy).toHaveBeenCalledTimes(3)
})
