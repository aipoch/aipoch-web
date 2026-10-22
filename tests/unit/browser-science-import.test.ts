import { expect, mock, test } from 'bun:test'
import { isMobileDevice } from '../../lib/browser-device'
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
      onPhase?: (phase: 'waiting-for-receiver' | 'transferring') => void
      onProgress?: (p: { sentBytes: number; totalBytes: number }) => void
    }) => {
      events.push('send')
      return receipt.promise
    }
  )
  const cancel = mock(async () => {})
  const prepare = mock((_blob: Blob) => ({ url: 'open-science://test-secret', send, cancel }))
  const download = mock(async () => blob)
  const launch = mock(() => {
    events.push('launch')
  })
  const launchApp = mock(() => {})
  const mobile = mock(() => false)
  const session = createScienceImport(info, (state) => states.push(state), {
    download,
    prepare,
    launch,
    launchApp,
    mobile,
    supported: () => true
  })
  return {
    session,
    cancel,
    states,
    receipt,
    blob,
    events,
    send,
    prepare,
    download,
    launch,
    launchApp,
    mobile
  }
}

test('mobile clicks show desktop guidance before any discovery, download or launch', async () => {
  const s = setup()
  s.mobile.mockReturnValue(true)
  await s.session.prepareAndOpen()
  await s.session.prepareAndOpen()
  expect(s.states.at(-1)).toEqual({
    phase: 'unsupported',
    action: 'prepare',
    message: 'Please continue on a desktop computer.'
  })
  for (const operation of [s.download, s.prepare, s.send, s.launch, s.launchApp])
    expect(operation).not.toHaveBeenCalled()
})

test('mobile detection covers phones and desktop-mode iPads without rejecting desktop touch PCs', () => {
  for (const userAgent of ['Android', 'iPhone', 'iPad', 'iPod', 'Windows Phone'])
    expect(isMobileDevice(userAgent)).toBe(true)
  expect(isMobileDevice('Macintosh; Intel Mac OS X', 5)).toBe(true)
  expect(isMobileDevice('Macintosh; Intel Mac OS X', 0)).toBe(false)
  expect(isMobileDevice('Windows NT 10.0', 10)).toBe(false)
  expect(isMobileDevice('X11; Linux x86_64', 0)).toBe(false)
})

test('explicit retry after receipt reuses the Blob with a fresh transfer and guards disposal', async () => {
  const s = setup()
  await s.session.retryImport()
  expect(s.download).not.toHaveBeenCalled()
  const pending = s.session.prepareAndOpen()
  s.receipt.resolve({ received: true })
  await pending
  await Promise.all([s.session.retryImport(), s.session.retryImport()])
  expect(s.download).toHaveBeenCalledTimes(1)
  expect(s.prepare).toHaveBeenCalledTimes(2)
  expect(s.prepare.mock.calls[0][0]).toBe(s.blob)
  expect(s.prepare.mock.calls[1][0]).toBe(s.blob)
  expect(s.launch).toHaveBeenCalledTimes(2)
  expect(s.send).toHaveBeenCalledTimes(2)
  expect(s.launchApp).not.toHaveBeenCalled()
  expect(s.states.at(-1)?.phase).toBe('received')
  s.session.dispose()
  await s.session.retryImport()
  expect(s.download).toHaveBeenCalledTimes(1)
  expect(s.prepare).toHaveBeenCalledTimes(2)
  expect(s.send).toHaveBeenCalledTimes(2)
})

test('received files offer standalone launch without another download or transfer', async () => {
  const s = setup()
  s.session.openApp()
  expect(s.launchApp).not.toHaveBeenCalled()
  const pending = s.session.prepareAndOpen()
  s.receipt.resolve({ received: true })
  await pending
  expect(s.states.at(-1)).toMatchObject({ phase: 'received', action: 'launch' })
  s.session.openApp()
  s.session.openApp()
  expect(s.launchApp).toHaveBeenCalledTimes(2)
  expect(s.download).toHaveBeenCalledTimes(1)
  expect(s.prepare).toHaveBeenCalledTimes(1)
  expect(s.send).toHaveBeenCalledTimes(1)
  expect(s.launch).toHaveBeenCalledTimes(1)
  s.launchApp.mockImplementationOnce(() => {
    throw new Error('Untrusted launch error')
  })
  s.session.openApp()
  expect(s.states.at(-1)).toMatchObject({
    phase: 'received',
    action: 'launch',
    message: 'File sent to Open-Science. Please confirm the import in the app.',
    launchError: expect.stringContaining('Could not request opening Open-Science')
  })
  s.session.openApp()
  expect(s.states.at(-1)?.launchError).toBeUndefined()
  s.session.dispose()
  s.session.openApp()
  expect(s.launchApp).toHaveBeenCalledTimes(4)
})

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
  expect(s.states.at(-1)).toMatchObject({ phase: 'error', action: 'resume' })
  s.send.mockImplementationOnce(async () => ({ received: true }))
  await s.session.open()
  expect(s.prepare).toHaveBeenCalledTimes(1)
  expect(s.download).toHaveBeenCalledTimes(1)
  expect(s.states.at(-1)?.phase).toBe('received')
})

test('explicitly replacing an expired receiver uses the held Blob on the next launch', async () => {
  const s = setup()
  await s.session.prepare()
  s.session.restart()
  const sending = s.session.open()
  expect(s.prepare).toHaveBeenCalledTimes(2)
  expect(s.download).toHaveBeenCalledTimes(1)
  s.receipt.resolve({ received: true })
  await sending
})

test('timeout explains uncertainty and retains the transfer', async () => {
  const s = setup()
  await s.session.prepare()
  const sending = s.session.open()
  s.receipt.reject(Object.assign(new Error('Arbitrary localized message'), { code: 'timeout' }))
  await sending
  expect(s.states.at(-1)?.message).toContain('Open-Science has not connected yet')
  expect(s.states.at(-1)?.message).not.toContain('not installed')
  s.send.mockImplementationOnce(async () => ({ received: true }))
  await s.session.open()
  expect(s.prepare).toHaveBeenCalledTimes(1)
})

test('cancellation blocks overlap until send settles, then retries with a fresh transfer', async () => {
  const s = setup()
  await s.session.prepare()
  const sending = s.session.open()
  const signal = s.send.mock.calls[0][0].signal
  s.session.cancel()
  expect(signal?.aborted).toBe(true)
  expect(s.cancel).toHaveBeenCalledTimes(1)
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

test('download preparation does not depend on app discovery', async () => {
  const s = setup()
  await s.session.prepare()
  expect(s.states[0]?.phase).toBe('downloading')
  expect(s.states.at(-1)?.phase).toBe('ready')
  expect(s.download).toHaveBeenCalledTimes(1)
})

test('opening waits for actual progress and configures the official readiness budgets', async () => {
  const s = setup()
  await s.session.prepare()
  const pending = s.session.open()
  expect(s.states.at(-1)).toMatchObject({ phase: 'opening' })
  expect(s.states.at(-1)?.loaded).toBeUndefined()
  expect(s.send.mock.calls[0][0]).toMatchObject({
    readinessMode: 'attempts',
    readinessAttempts: 30,
    readinessIntervalMs: 3000,
    attemptTimeoutMs: 3000,
    readyTimeoutMs: null
  })
  s.receipt.resolve({ received: true })
  await pending
})

test('transfer creation failure retains bytes and is not reported as a download failure', async () => {
  const s = setup()
  s.prepare.mockImplementationOnce(() => {
    throw new Error('Invalid filename or secret URL')
  })
  await s.session.prepareAndOpen()
  expect(s.launch).not.toHaveBeenCalled()
  expect(s.states.at(-1)).toMatchObject({ phase: 'error', action: 'open' })
  expect(s.states.at(-1)?.message).toContain('prepare')
  expect(s.states.at(-1)?.message).not.toContain('Could not download')
  s.send.mockImplementationOnce(async () => ({ received: true }))
  await s.session.open()
  expect(s.download).toHaveBeenCalledTimes(1)
  expect(s.states.at(-1)?.phase).toBe('received')
})

test('portable filenames bound UTF-16 and UTF-8 without splitting Unicode', () => {
  for (const input of [
    'CON.science',
    'aux.notes.science',
    'COM¹.science',
    `${'研究'.repeat(100)}.science`,
    `${'😀'.repeat(100)}.science`
  ]) {
    const name = scienceImportFilename(input)
    expect(name.endsWith('.science')).toBe(true)
    expect(name.length).toBeLessThanOrEqual(160)
    expect(new TextEncoder().encode(name).byteLength).toBeLessThanOrEqual(255)
    expect(name).not.toMatch(/^(con|aux|com¹)\./i)
    expect(new TextDecoder().decode(new TextEncoder().encode(name))).toBe(name)
  }
})

for (const [code, message] of [
  ['readiness-exhausted', 'Open-Science has not connected yet'],
  ['incompatible', 'Could not verify Open-Science'],
  ['unsupported-browser', 'This browser cannot connect']
]) {
  test(`structured ${code} provides recovery without parsing the message`, async () => {
    const s = setup()
    await s.session.prepare()
    s.send.mockRejectedValueOnce(Object.assign(new Error('Different language'), { code }))
    await s.session.open()
    expect(s.states.at(-1)?.message).toContain(message)
    s.send.mockImplementationOnce(async () => ({ received: true }))
    await s.session.open()
    expect(s.download).toHaveBeenCalledTimes(1)
    expect(s.prepare).toHaveBeenCalledTimes(code === 'incompatible' ? 2 : 1)
  })
}

test('filename validation and normalization precede download', async () => {
  const download = mock(async () => new Blob(['x']))
  const prepare = mock(() => ({
    url: '#safe',
    cancel: async () => {},
    send: async () => ({ received: true as const })
  }))
  const dependencies = { download, prepare, supported: () => true }
  await createScienceImport({ ...info, filename: 'report.pdf' }, () => {}, dependencies).prepare()
  expect(download).not.toHaveBeenCalled()
  await createScienceImport({ ...info, filename: 'CON.science' }, () => {}, dependencies).prepare()
  expect(download).toHaveBeenCalledWith(
    expect.objectContaining({ filename: '_CON.science' }),
    expect.anything()
  )
  expect(prepare).toHaveBeenCalledWith(expect.any(Blob), { filename: '_CON.science' })
})

test('readiness timeout retains the original transfer and reconnects without launching again', async () => {
  const s = setup()
  await s.session.prepare()
  s.send.mockRejectedValueOnce(Object.assign(new Error('Timeout'), { code: 'timeout' }))
  await s.session.open()
  expect(s.states.at(-1)).toMatchObject({
    phase: 'ready',
    action: 'resume',
    message:
      'Open-Science has not connected yet. Open the app, allow any browser prompts, then continue.'
  })
  s.send.mockImplementationOnce(async () => ({ received: true }))
  await s.session.resume()
  expect(s.prepare).toHaveBeenCalledTimes(1)
  expect(s.launch).toHaveBeenCalledTimes(1)
  expect(s.download).toHaveBeenCalledTimes(1)
  expect(s.states.at(-1)?.phase).toBe('received')
})

test('verified phase changes to sending without inventing a percentage', async () => {
  const s = setup()
  await s.session.prepare()
  const pending = s.session.open()
  const options = s.send.mock.calls[0][0]
  options.onPhase?.('waiting-for-receiver')
  expect(s.states.at(-1)).toMatchObject({ phase: 'opening', message: 'Waiting for Open-Science…' })
  options.onPhase?.('transferring')
  expect(s.states.at(-1)?.phase).toBe('sending')
  expect(s.states.at(-1)?.loaded).toBeUndefined()
  await s.session.resume()
  await s.session.open()
  expect(s.send).toHaveBeenCalledTimes(1)
  expect(s.launch).toHaveBeenCalledTimes(1)
  s.receipt.resolve({ received: true })
  await pending
})

test('cancel invalidates reconnect until an explicit launch creates a new transfer', async () => {
  const s = setup()
  await s.session.prepare()
  const pending = s.session.open()
  s.session.cancel()
  s.receipt.reject(new DOMException('Canceled', 'AbortError'))
  await pending
  await s.session.resume()
  expect(s.send).toHaveBeenCalledTimes(1)
  s.send.mockImplementationOnce(async () => ({ received: true }))
  await s.session.open()
  expect(s.prepare).toHaveBeenCalledTimes(2)
  expect(s.download).toHaveBeenCalledTimes(1)
})

test('desktop cancellation discards the transfer and waits for explicit retry with the same Blob', async () => {
  const s = setup()
  await s.session.prepare()
  s.send.mockRejectedValueOnce(Object.assign(new Error('Receiver stopped'), { code: 'cancelled' }))
  await s.session.open()
  expect(s.states.at(-1)).toMatchObject({
    phase: 'ready',
    action: 'open',
    needsApp: false,
    message:
      'Transfer canceled in Open-Science. Open Open-Science again to retry with the prepared package.'
  })
  await s.session.resume()
  expect(s.send).toHaveBeenCalledTimes(1)
  expect(s.prepare).toHaveBeenCalledTimes(1)
  expect(s.launch).toHaveBeenCalledTimes(1)
  s.send.mockImplementationOnce(async () => ({ received: true }))
  await Promise.all([s.session.open(), s.session.open()])
  expect(s.download).toHaveBeenCalledTimes(1)
  expect(s.prepare).toHaveBeenCalledTimes(2)
  expect(s.prepare.mock.calls[1][0]).toBe(s.blob)
  expect(s.send).toHaveBeenCalledTimes(2)
  expect(s.states.at(-1)?.phase).toBe('received')
})
