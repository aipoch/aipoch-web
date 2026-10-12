import { waitForBrowserMock } from '@/mocks/ready'
import type {
  BrowserImportTransfer,
  prepareBrowserImport as PrepareBrowserImport
} from '@/vendor/open-science/browser-import'
import { prepareBrowserImport } from '@/vendor/open-science/browser-import.mjs'

const MAX_BYTES = 2 * 1024 ** 3
const RECEIVER_IDLE_MS = 110_000
type PackageSource = { url: string; filename: string }
type DownloadProgress = { loaded: number; total?: number }
export type ImportState = {
  phase:
    | 'idle'
    | 'downloading'
    | 'ready'
    | 'sending'
    | 'canceling'
    | 'received'
    | 'error'
    | 'unsupported'
  message: string
  action?: 'prepare' | 'open'
  loaded?: number
  total?: number
}
export const INITIAL_IMPORT_STATE: ImportState = {
  phase: 'idle',
  message: '',
  action: 'prepare'
}

class DownloadError extends Error {}

export function scienceImportFilename(filename: string): string {
  if (!/\.science$/i.test(filename)) throw new DownloadError('Choose a .science research package.')
  // CDN titles can contain punctuation that the desktop filename contract forbids.
  const stem = filename
    .slice(0, -8)
    // biome-ignore lint/suspicious/noControlCharactersInRegex: Match the upstream safe-filename contract.
    .replace(/[\x00-\x1f\x7f/\\:*?"<>|\u202a-\u202e\u2066-\u2069]/gu, '_')
    .trim()
    .replace(/^[.\s]+/, '')
    .slice(0, 152)
  return `${stem || 'research-package'}.science`
}

export async function downloadSciencePackage(
  source: PackageSource,
  {
    signal,
    onProgress
  }: { signal: AbortSignal; onProgress?: (progress: DownloadProgress) => void },
  fetcher: typeof fetch = fetch
): Promise<Blob> {
  scienceImportFilename(source.filename)
  signal.throwIfAborted()
  const response = await fetcher(source.url, { signal, credentials: 'omit' })
  if (!response.ok)
    throw new DownloadError(
      `Download failed (HTTP ${response.status}). Try again or use the regular download.`
    )
  const length = Number(response.headers.get('content-length'))
  const total = Number.isFinite(length) && length > 0 ? length : undefined
  if (total && total > MAX_BYTES) {
    await response.body?.cancel()
    throw new DownloadError(
      'This package exceeds the 2 GiB browser transfer limit. Use the regular download.'
    )
  }
  if (!response.body)
    throw new DownloadError(
      'The downloaded package is empty. Try again or use the regular download.'
    )
  const reader = response.body.getReader()
  const parts: Uint8Array<ArrayBuffer>[] = []
  let loaded = 0
  try {
    while (true) {
      signal.throwIfAborted()
      const { done, value } = await reader.read()
      signal.throwIfAborted()
      if (done) break
      loaded += value.byteLength
      if (loaded > MAX_BYTES)
        throw new DownloadError(
          'This package exceeds the 2 GiB browser transfer limit. Use the regular download.'
        )
      parts.push(value)
      onProgress?.({ loaded, total })
    }
    if (!loaded)
      throw new DownloadError(
        'The downloaded package is empty. Try again or use the regular download.'
      )
    return new Blob(parts, { type: 'application/octet-stream' })
  } finally {
    await reader.cancel().catch(() => undefined)
    reader.releaseLock()
  }
}

const supportsImport = () =>
  globalThis.isSecureContext &&
  typeof globalThis.crypto?.subtle?.importKey === 'function' &&
  typeof globalThis.crypto?.getRandomValues === 'function' &&
  typeof Blob === 'function' &&
  typeof fetch === 'function' &&
  typeof globalThis.AbortSignal?.any === 'function' &&
  typeof globalThis.AbortSignal?.timeout === 'function'

type Dependencies = {
  download: typeof downloadSciencePackage
  prepare: typeof PrepareBrowserImport
  launch: (url: string) => void
  now: () => number
  supported: () => boolean
}

/** Owns bytes and credentials outside React state. Never publishes a transfer URL or raw error. */
export function createScienceImport(
  source: PackageSource,
  update: (state: ImportState) => void,
  dependencies: Partial<Dependencies> = {}
) {
  const deps: Dependencies = {
    download: downloadSciencePackage,
    // The upstream package normally pairs these through its exports.types entry.
    prepare: prepareBrowserImport as typeof PrepareBrowserImport,
    launch: (url) => {
      window.location.href = url
    },
    now: Date.now,
    supported: supportsImport,
    ...dependencies
  }
  let blob: Blob | undefined
  let transfer: BrowserImportTransfer | undefined
  let controller: AbortController | undefined
  let busy = false
  let disposed = false
  let received = false
  let activeAt = 0
  const emit = (state: ImportState) => {
    if (!disposed) update(state)
  }
  const clear = () => {
    blob = undefined
    transfer = undefined
  }
  const freshTransfer = () => {
    if (!blob) throw new Error('No prepared package')
    transfer = deps.prepare(blob, { filename: scienceImportFilename(source.filename) })
    activeAt = deps.now()
  }
  const session = {
    async prepareAndOpen(): Promise<void> {
      await session.prepare()
      // Async downloads may exhaust browser activation; open() also remains a direct-click retry.
      await session.open()
    },
    async prepare() {
      if (busy || disposed || received || blob) return
      if (!deps.supported()) {
        emit({
          phase: 'unsupported',
          message:
            'Browser import requires HTTPS and a supported browser. Download the package and open it in Open-Science instead.'
        })
        return
      }
      busy = true
      controller = new AbortController()
      const signal = AbortSignal.any([controller.signal, AbortSignal.timeout(120_000)])
      emit({ phase: 'downloading', message: 'Downloading research package…', loaded: 0 })
      try {
        await waitForBrowserMock()
        signal.throwIfAborted()
        const downloaded = await deps.download(source, {
          signal,
          onProgress: (progress) => {
            if (!signal.aborted)
              emit({ phase: 'downloading', message: 'Downloading research package…', ...progress })
          }
        })
        signal.throwIfAborted()
        if (disposed) return
        blob = downloaded
        freshTransfer()
        emit({
          phase: 'ready',
          message: 'Package ready. Open Open-Science to continue.',
          action: 'open'
        })
      } catch (error) {
        clear()
        emit({
          phase: controller.signal.aborted ? 'idle' : 'error',
          action: 'prepare',
          message: controller.signal.aborted
            ? 'Download canceled. Prepare the package to try again.'
            : error instanceof DownloadError
              ? error.message
              : signal.aborted
                ? 'The download timed out. Try again or use the regular download.'
                : 'Could not download the package. Check your connection and try again, or use the regular download.'
        })
      } finally {
        busy = false
        controller = undefined
      }
    },
    async open() {
      if (busy || disposed || received || !blob) return
      busy = true
      controller = new AbortController()
      const signal = controller.signal
      emit({
        phase: 'sending',
        message:
          'Waiting for Open-Science. Allow the browser to open the app and access your local network.',
        loaded: 0,
        total: blob.size
      })
      try {
        if (!transfer || deps.now() - activeAt >= RECEIVER_IDLE_MS) freshTransfer()
        if (!transfer) throw new Error('No transfer')
        // Launch before send; a direct-click retry restores activation if auto-launch was blocked.
        deps.launch(transfer.url)
        activeAt = deps.now()
        const receipt = await transfer.send({
          signal,
          onProgress: ({ sentBytes, totalBytes }) => {
            activeAt = deps.now()
            if (!signal.aborted)
              emit({
                phase: 'sending',
                message: 'Sending package to Open-Science…',
                loaded: sentBytes,
                total: totalBytes
              })
          }
        })
        if (receipt.received !== true) throw new Error('Missing receipt')
        received = true
        clear()
        emit({
          phase: 'received',
          message: 'File sent to Open-Science. Please confirm the import in the app.'
        })
      } catch (error) {
        // The pinned SDK exposes Error messages rather than typed error codes.
        const timeout =
          error instanceof Error &&
          (error.name === 'TimeoutError' || error.message.includes('did not become ready'))
        const invalidReceiver =
          error instanceof Error &&
          /receiver identity|Invalid local|acknowledge/.test(error.message)
        if (signal.aborted || timeout || invalidReceiver) transfer = undefined
        emit({
          phase: signal.aborted ? 'ready' : 'error',
          action: 'open',
          message: signal.aborted
            ? 'Transfer canceled. Open Open-Science again to retry with the prepared package.'
            : timeout
              ? 'Could not open Open-Science. Open the app, allow external apps and local network access, then retry. The app may also be waiting for your confirmation.'
              : 'The file was not acknowledged by Open-Science. Check the app and browser permissions, then retry. If needed, start a new transfer or use the regular download.'
        })
      } finally {
        busy = false
        controller = undefined
      }
    },
    restart() {
      if (busy || disposed || received || !blob) return
      transfer = undefined
      emit({
        phase: 'ready',
        message: 'Ready for a new transfer. Open Open-Science again to continue.',
        action: 'open'
      })
    },
    cancel() {
      if (!busy || !controller || controller.signal.aborted) return
      controller.abort()
      emit({ phase: 'canceling', message: 'Canceling…' })
    },
    dispose() {
      disposed = true
      controller?.abort()
      clear()
    }
  }
  return session
}
