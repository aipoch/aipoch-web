import { expect, mock, test } from 'bun:test'
import {
  createScienceImport,
  downloadSciencePackage,
  type ImportState,
  scienceImportFilename
} from '../../lib/science-package/browser-import'

const info = { url: 'https://assets.test/study.science', filename: 'study.science' }
const deferred = <T>() => {
  let resolve!: (value: T) => void
  let reject!: (error: unknown) => void
  const promise = new Promise<T>((yes, no) => {
    resolve = yes
    reject = no
  })
  return { promise, resolve, reject }
}
const setup = () => {
  const states: ImportState[] = []
  const receipt = deferred<{ received: true }>()
  const blob = new Blob(['science'])
  const events: string[] = []
  const send = mock(
    (_options: {
      signal?: AbortSignal
      onProgress?: (p: { sentBytes: number; totalBytes: number }) => void
    }) => {
      events.push('send')
      return receipt.promise
    }
  )
  const prepare = mock((_blob: Blob) => ({ url: 'open-science://test-secret', send }))
  const download = mock(async () => blob)
  const launch = mock(() => {
    events.push('launch')
  })
  let time = 0
  const session = createScienceImport(info, (state) => states.push(state), {
    download,
    prepare,
    launch,
    now: () => time,
    supported: () => true
  })
  return {
    session,
    states,
    receipt,
    blob,
    events,
    send,
    prepare,
    download,
    launch,
    advance: () => {
      time += 121_000
    }
  }
}

test('explicit preparation and manual launch remain available for retries', async () => {
  const s = setup()
  const preparing = s.session.prepare()
  await s.session.prepare()
  await preparing
  expect(s.download).toHaveBeenCalledTimes(1)
  expect(s.prepare.mock.calls[0]?.[0]).toBe(s.blob)
  expect(s.states.at(-1)?.phase).toBe('ready')
  expect(s.launch).not.toHaveBeenCalled()
  const sending = s.session.open()
  expect(s.events).toEqual(['launch', 'send'])
  await s.session.open()
  expect(s.send).toHaveBeenCalledTimes(1)
  s.send.mock.calls[0][0].onProgress?.({ sentBytes: 3, totalBytes: 7 })
  expect(s.states.at(-1)).toMatchObject({ phase: 'sending', loaded: 3, total: 7 })
  s.receipt.resolve({ received: true })
  await sending
  expect(s.states.at(-1)?.phase).toBe('received')
  expect(s.states.at(-1)?.message).toBe(
    'File sent to Open-Science. Please confirm the import in the app.'
  )
  await s.session.open()
  expect(s.send).toHaveBeenCalledTimes(1)
})

test('one click downloads the whole Blob then automatically launches and sends once', async () => {
  const s = setup()
  const downloaded = deferred<Blob>()
  s.download.mockImplementationOnce(() => downloaded.promise)
  const sending = s.session.prepareAndOpen()
  await s.session.prepareAndOpen()
  expect(s.launch).not.toHaveBeenCalled()
  downloaded.resolve(s.blob)
  await Promise.resolve()
  await Promise.resolve()
  await Promise.resolve()
  expect(s.events).toEqual(['launch', 'send'])
  expect(s.download).toHaveBeenCalledTimes(1)
  s.receipt.resolve({ received: true })
  await sending
  expect(s.states.at(-1)?.phase).toBe('received')
})

test('a blocked automatic launch leaves the prepared Blob available for a direct-click retry', async () => {
  const s = setup()
  s.launch.mockImplementationOnce(() => {
    throw new Error('Browser blocked protocol navigation')
  })
  await s.session.prepareAndOpen()
  expect(s.send).not.toHaveBeenCalled()
  expect(s.states.at(-1)).toMatchObject({ phase: 'error', action: 'open' })
  s.send.mockImplementationOnce(async () => ({ received: true }))
  await s.session.open()
  expect(s.download).toHaveBeenCalledTimes(1)
  expect(s.prepare).toHaveBeenCalledTimes(1)
  expect(s.states.at(-1)?.phase).toBe('received')
})

test('automatic launch is skipped after download failure or cancellation', async () => {
  const failed = setup()
  failed.download.mockRejectedValueOnce(new Error('Download failed'))
  await failed.session.prepareAndOpen()
  expect(failed.launch).not.toHaveBeenCalled()
  const canceled = setup()
  const downloaded = deferred<Blob>()
  canceled.download.mockImplementationOnce(() => downloaded.promise)
  const pending = canceled.session.prepareAndOpen()
  canceled.session.cancel()
  downloaded.resolve(canceled.blob)
  await pending
  expect(canceled.launch).not.toHaveBeenCalled()
})

test('a missing receipt is not reported as received or imported', async () => {
  const s = setup()
  await s.session.prepare()
  const sending = s.session.open()
  s.receipt.resolve({ received: false } as unknown as { received: true })
  await sending
  expect(s.states.at(-1)?.phase).toBe('error')
})

test('transient failure keeps the original transfer and Blob for retry', async () => {
  const s = setup()
  await s.session.prepare()
  const sending = s.session.open()
  s.receipt.reject(new TypeError('Failed to fetch'))
  await sending
  expect(s.states.at(-1)).toMatchObject({ phase: 'error', action: 'open' })
  s.send.mockImplementationOnce(async () => ({ received: true }))
  await s.session.open()
  expect(s.prepare).toHaveBeenCalledTimes(1)
  expect(s.download).toHaveBeenCalledTimes(1)
  expect(s.states.at(-1)?.phase).toBe('received')
})

test('expired receiver creates a fresh transfer from the held Blob on the next click', async () => {
  const s = setup()
  await s.session.prepare()
  s.advance()
  const sending = s.session.open()
  expect(s.prepare).toHaveBeenCalledTimes(2)
  expect(s.download).toHaveBeenCalledTimes(1)
  s.receipt.resolve({ received: true })
  await sending
})

test('timeout explains permission and readiness uncertainty and renews the transfer', async () => {
  const s = setup()
  await s.session.prepare()
  const sending = s.session.open()
  s.receipt.reject(new DOMException('Timed out', 'TimeoutError'))
  await sending
  expect(s.states.at(-1)?.message).toContain('allow external apps and local network access')
  expect(s.states.at(-1)?.message).not.toContain('not installed')
  s.send.mockImplementationOnce(async () => ({ received: true }))
  await s.session.open()
  expect(s.prepare).toHaveBeenCalledTimes(2)
})

test('cancellation blocks overlap until send settles, then retries with a fresh transfer', async () => {
  const s = setup()
  await s.session.prepare()
  const sending = s.session.open()
  const signal = s.send.mock.calls[0][0].signal
  s.session.cancel()
  expect(signal?.aborted).toBe(true)
  expect(s.states.at(-1)?.phase).toBe('canceling')
  await s.session.open()
  expect(s.send).toHaveBeenCalledTimes(1)
  s.receipt.reject(new DOMException('Canceled', 'AbortError'))
  await sending
  s.send.mockImplementationOnce(async () => ({ received: true }))
  await s.session.open()
  expect(s.prepare).toHaveBeenCalledTimes(2)
  expect(s.download).toHaveBeenCalledTimes(1)
})

test('late receipt wins a cancellation race: do not offer to send an already received file', async () => {
  const s = setup()
  await s.session.prepare()
  const sending = s.session.open()
  s.session.cancel()
  s.receipt.resolve({ received: true })
  await sending
  expect(s.states.at(-1)?.phase).toBe('received')
})

test('dispose aborts pending work and prevents late updates or subsequent actions', async () => {
  const s = setup()
  await s.session.prepare()
  const sending = s.session.open()
  s.session.dispose()
  expect(s.send.mock.calls[0][0].signal?.aborted).toBe(true)
  const count = s.states.length
  s.receipt.resolve({ received: true })
  await sending
  await s.session.prepare()
  await s.session.open()
  expect(s.states).toHaveLength(count)
  expect(s.download).toHaveBeenCalledTimes(1)
})

test('download failures are retryable and never expose arbitrary SDK errors or secret URLs', async () => {
  const s = setup()
  s.download.mockRejectedValueOnce(new Error('secret in untrusted response'))
  await s.session.prepare()
  expect(s.states.at(-1)).toMatchObject({ phase: 'error', action: 'prepare' })
  expect(JSON.stringify(s.states)).not.toContain('secret')
  await s.session.prepare()
  expect(s.states.at(-1)?.phase).toBe('ready')
})

test('unsupported browsers offer the regular download without fetching', async () => {
  const download = mock(async () => new Blob(['a']))
  const states: ImportState[] = []
  const session = createScienceImport(info, (state) => states.push(state), {
    download,
    supported: () => false
  })
  await session.prepare()
  expect(download).not.toHaveBeenCalled()
  expect(states.at(-1)?.phase).toBe('unsupported')
})

test('capability detection handles a browser without a crypto global', async () => {
  const cryptoDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'crypto')
  const secureDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'isSecureContext')
  const states: ImportState[] = []
  try {
    Object.defineProperty(globalThis, 'isSecureContext', { configurable: true, value: true })
    Reflect.deleteProperty(globalThis, 'crypto')
    await createScienceImport(info, (state) => states.push(state)).prepare()
    expect(states.at(-1)?.phase).toBe('unsupported')
  } finally {
    if (cryptoDescriptor) Object.defineProperty(globalThis, 'crypto', cryptoDescriptor)
    if (secureDescriptor) Object.defineProperty(globalThis, 'isSecureContext', secureDescriptor)
    else Reflect.deleteProperty(globalThis, 'isSecureContext')
  }
})

test('safe filenames preserve the extension, normalize unsupported characters and bound length', () => {
  expect(scienceImportFilename(' .study.science')).toBe('study.science')
  expect(scienceImportFilename('$10,000: NVIDIA, BITCOIN, OR BOTH?.science')).toBe(
    '$10,000_ NVIDIA, BITCOIN, OR BOTH_.science'
  )
  expect(scienceImportFilename(`${'a'.repeat(200)}.science`).length).toBeLessThanOrEqual(160)
  expect(() => scienceImportFilename('report.pdf')).toThrow('.science')
})

test('download checks HTTP status and complete nonempty size, reports byte progress', async () => {
  const options = { signal: new AbortController().signal, onProgress: mock(() => {}) }
  const fetcher = mock(async () => new Response('abc', { headers: { 'Content-Length': '3' } }))
  const blob = await downloadSciencePackage(info, options, fetcher as unknown as typeof fetch)
  expect(await blob.text()).toBe('abc')
  expect(options.onProgress).toHaveBeenLastCalledWith({ loaded: 3, total: 3 })
  for (const response of [
    new Response(null, { status: 503 }),
    new Response(''),
    new Response('x', { headers: { 'Content-Length': String(2 * 1024 ** 3 + 1) } })
  ]) {
    await expect(
      downloadSciencePackage(info, options, (async () => response) as unknown as typeof fetch)
    ).rejects.toThrow()
  }
})

test('an aborted download cannot become a prepared Blob', async () => {
  const controller = new AbortController()
  controller.abort()
  const fetcher = mock(async () => new Response('abc'))
  await expect(
    downloadSciencePackage(info, { signal: controller.signal }, fetcher as unknown as typeof fetch)
  ).rejects.toThrow()
  expect(fetcher).not.toHaveBeenCalled()
})

test('unknown-length bodies enforce the byte limit while streaming, without allocating 2 GiB', async () => {
  const body = new ReadableStream({
    start(controller) {
      controller.enqueue({ byteLength: 2 * 1024 ** 3 + 1 })
      controller.close()
    }
  })
  await expect(
    downloadSciencePackage(
      info,
      { signal: new AbortController().signal },
      (async () => new Response(body)) as unknown as typeof fetch
    )
  ).rejects.toThrow('2 GiB')
})

test('canceling a download discards late bytes and lets a new download proceed', async () => {
  const s = setup()
  const pending = deferred<Blob>()
  s.download.mockImplementationOnce(() => pending.promise)
  const preparing = s.session.prepare()
  await Promise.resolve()
  s.session.cancel()
  pending.resolve(s.blob)
  await preparing
  expect(s.prepare).not.toHaveBeenCalled()
  expect(s.states.at(-1)).toMatchObject({ phase: 'idle', action: 'prepare' })
  await s.session.prepare()
  expect(s.prepare).toHaveBeenCalledTimes(1)
})

test('dispose during a download ignores the late Blob and all later progress', async () => {
  const s = setup()
  const pending = deferred<Blob>()
  s.download.mockImplementationOnce(() => pending.promise)
  const preparing = s.session.prepare()
  await Promise.resolve()
  s.session.dispose()
  const count = s.states.length
  pending.resolve(s.blob)
  await preparing
  expect(s.states).toHaveLength(count)
  expect(s.prepare).not.toHaveBeenCalled()
})
