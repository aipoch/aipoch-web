import {
  type BrowserImportTransfer,
  prepareBrowserImport as prepare
} from '../../lib/science-package/sdk'

// Test-only HTTP peer. The actual SDK still verifies proofs and encrypts its chunks.
let transfer: BrowserImportTransfer
let controller: AbortController
let options: Parameters<BrowserImportTransfer['send']>[0]
let secret = ''
const state = {
  ready: false,
  stall: 'none' as 'none' | 'headers' | 'body',
  chunkDelay: 0,
  incompatible: 'none' as 'none' | 'identity' | 'protocol',
  httpRequests: [] as string[],
  requests: [] as number[],
  phases: [] as string[],
  progress: [] as number[],
  result: 'idle',
  prepares: 0,
  sends: 0,
  begin(value: Parameters<BrowserImportTransfer['send']>[0]) {
    options = value
    transfer = prepare(new Blob(['science']), { filename: 'study.science' })
    secret = new URL(transfer.url).searchParams.get('secret') ?? ''
    state.prepares++
    state.resume()
  },
  resume() {
    controller = new AbortController()
    state.result = 'pending'
    state.sends++
    void transfer
      .send({
        ...options,
        signal: controller.signal,
        onPhase: (phase) => state.phases.push(phase),
        onProgress: (value) => state.progress.push(value.sentBytes)
      })
      .then(
        (receipt) => {
          state.result = receipt.received ? 'received' : 'invalid'
        },
        (error) => {
          state.result = controller.signal.aborted ? 'aborted' : error.code
        }
      )
  },
  cancel() {
    controller.abort()
  }
}
const stalled = (signal?: AbortSignal | null) =>
  new Promise<never>((_resolve, reject) => {
    if (!signal) throw new Error('Missing signal')
    signal.throwIfAborted()
    signal.addEventListener('abort', () => reject(signal.reason), { once: true })
  })
const proof = async (text: string) => {
  const bytes = new Uint8Array(secret.match(/../g)?.map((part) => Number.parseInt(part, 16)) ?? [])
  const key = await crypto.subtle.importKey(
    'raw',
    bytes,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  return Array.from(
    new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(text))),
    (byte) => byte.toString(16).padStart(2, '0')
  ).join('')
}
globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = new URL(String(input))
  state.httpRequests.push(`${init?.method ?? 'GET'} ${url.pathname}`)
  if (url.pathname.endsWith('/ready')) {
    state.requests.push(Date.now())
    if (state.stall === 'headers') return stalled(init?.signal)
    if (state.stall === 'body')
      return Object.assign(new Response(), { json: () => stalled(init?.signal) })
    if (!state.ready) throw new TypeError('Receiver not ready')
    return Response.json({
      accepted: false,
      offset: 0,
      chunkBytes: state.incompatible === 'protocol' ? 1 : 4194304,
      proof:
        state.incompatible === 'identity'
          ? 'invalid-proof'
          : await proof(`open-science-import-v1:${url.searchParams.get('challenge')}:0:0`)
    })
  }
  if (url.pathname.endsWith('/chunk')) {
    if (state.chunkDelay) await new Promise((resolve) => setTimeout(resolve, state.chunkDelay))
    return Response.json({ offset: 7, proof: await proof('offset:7') })
  }
  if (url.pathname.endsWith('/complete'))
    return Response.json({ received: true, proof: await proof('received:7') }, { status: 202 })
  if (init?.method === 'DELETE') return new Response(null, { status: 204 })
  throw new Error('Unexpected SDK request')
}) as typeof fetch
Object.assign(window, { waitContract: state })
export type WaitContract = typeof state
