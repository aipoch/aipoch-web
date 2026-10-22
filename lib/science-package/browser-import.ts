import { isMobileDevice } from '@/lib/browser-device'
import { waitForBrowserMock } from '@/mocks/ready'
import {
  type BrowserImportTransfer,
  launchOpenScience,
  prepareBrowserImport
} from '@/lib/science-package/sdk'

const MAX_BYTES = 2 * 1024 ** 3
type PackageSource = { url: string; filename: string }
type DownloadProgress = { loaded: number; total?: number }
export type ImportState = {
  phase:
    | 'idle'
    | 'opening'
    | 'downloading'
    | 'ready'
    | 'sending'
    | 'canceling'
    | 'received'
    | 'error'
    | 'unsupported'
  message: string
  action?: 'prepare' | 'open' | 'resume' | 'launch'
  launchError?: string
  loaded?: number
  total?: number
  needsApp?: boolean
}
export const INITIAL_IMPORT_STATE: ImportState = {
  phase: 'idle',
  message: '',
  action: 'prepare'
}
const RECEIVED_IMPORT_STATE: ImportState = {
  phase: 'received',
  action: 'launch',
  message: 'File sent to Open-Science. Please confirm the import in the app.'
}

class DownloadError extends Error {}

export function scienceImportFilename(filename: string): string {
  if (!/\.science$/i.test(filename)) throw new DownloadError('Choose a .science research package.')
  // Normalize before downloading; reserve room for the suffix in both SDK limits.
  let stem =
    filename
      .slice(0, -8)
      // biome-ignore lint/suspicious/noControlCharactersInRegex: Match the upstream safe-filename contract.
      .replace(/[\x00-\x1f\x7f/\\:*?"<>|\u202a-\u202e\u2066-\u2069]/gu, '_')
      .trim()
      .replace(/^[.\s]+/, '') || 'research-package'
  if (/^(?:con|prn|aux|nul|com[1-9¹²³]|lpt[1-9¹²³])(?:\.|$)/iu.test(stem)) stem = `_${stem}`
  const encoder = new TextEncoder()
  let safe = ''
  let bytes = 0
  for (const character of stem) {
    const size = encoder.encode(character).byteLength
    if (safe.length + character.length > 152 || bytes + size > 247) break
    safe += character
    bytes += size
  }
  return `${safe}.science`
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
  prepare: typeof prepareBrowserImport
  launch: (url: string) => void
  launchApp: () => void
  listenForBlur: (callback: () => void) => () => void
  supported: () => boolean
  mobile: () => boolean
}

/** Owns bytes and credentials outside React state. Never publishes a transfer URL or raw error. */
export function createScienceImport(
  source: PackageSource,
  update: (state: ImportState) => void,
  dependencies: Partial<Dependencies> = {}
) {
  // MSW intercepts HTTP only; mock development must never request an OS protocol launch.
  const mockLaunch =
    process.env.NODE_ENV !== 'production' && process.env.NEXT_PUBLIC_API_MOCKING === 'enabled'
  const deps: Dependencies = {
    download: downloadSciencePackage,
    prepare: prepareBrowserImport,
    launch: (url) => {
      if (!mockLaunch) window.location.href = url
    },
    launchApp: () => {
      if (!mockLaunch) launchOpenScience()
    },
    listenForBlur: (callback) => {
      if (typeof window === 'undefined') return () => {}
      window.addEventListener('blur', callback, { once: true })
      return () => window.removeEventListener('blur', callback)
    },
    supported: supportsImport,
    mobile: () =>
      typeof navigator !== 'undefined' &&
      isMobileDevice(navigator.userAgent, navigator.maxTouchPoints),
    ...dependencies
  }
  let filename: string
  let blob: Blob | undefined
  let transfer: BrowserImportTransfer | undefined
  let controller: AbortController | undefined
  let busy = false
  let disposed = false
  let received = false
  let launchTimer: ReturnType<typeof setTimeout> | undefined
  let stopListeningForBlur: (() => void) | undefined
  let showInstallHint = false
  let handshakeVerified = false
  const clearLaunchWatch = () => {
    clearTimeout(launchTimer)
    launchTimer = undefined
    stopListeningForBlur?.()
    stopListeningForBlur = undefined
  }
  const waiting = () =>
    emit({
      phase: 'opening',
      message: 'Waiting for Open-Science…',
      needsApp: showInstallHint
    })
  const launchTransfer = () => {
    if (!transfer) return
    clearLaunchWatch()
    showInstallHint = false
    let blurred = false
    // Blur is only a heuristic; only the SDK handshake can authorize sending bytes.
    stopListeningForBlur = deps.listenForBlur(() => {
      blurred = true
    })
    launchTimer = setTimeout(() => {
      clearLaunchWatch()
      if (!blurred && !handshakeVerified && !controller?.signal.aborted) {
        showInstallHint = true
        waiting()
      }
    }, 3000)
    deps.launch(transfer.url)
  }
  const emit = (state: ImportState) => {
    if (!disposed) update(state)
  }
  const clear = () => {
    blob = undefined
    transfer = undefined
  }
  const freshTransfer = () => {
    if (!blob) throw new Error('No prepared package')
    transfer = deps.prepare(blob, { filename })
  }
  const session = {
    async retryImport() {
      // Reuse page-held bytes, but never reuse a transfer that already received them.
      if (!received || busy || disposed || !blob) return
      received = false
      transfer = undefined
      await session.open()
    },
    openApp() {
      // Receipt is final for this file; a later click only requests the standalone app launch.
      if (!received || busy || disposed) return
      try {
        deps.launchApp()
        emit(RECEIVED_IMPORT_STATE)
      } catch {
        emit({
          ...RECEIVED_IMPORT_STATE,
          launchError:
            'Could not request opening Open-Science. Allow external apps in your browser, then try again.'
        })
      }
    },
    async prepareAndOpen(): Promise<void> {
      if (busy || disposed || received || blob) return
      // Only the operation that prepared this Blob may automatically launch it.
      if (await session.prepare()) await session.open()
    },
    async prepare(): Promise<boolean> {
      if (busy || disposed || received || blob) return false
      if (deps.mobile()) {
        emit({
          phase: 'unsupported',
          action: 'prepare',
          message: 'Please continue on a desktop computer.'
        })
        return false
      }
      if (!deps.supported()) {
        emit({
          phase: 'unsupported',
          action: 'prepare',
          needsApp: true,
          message:
            'Browser import requires HTTPS and a supported browser. Download the package and open it in Open-Science instead.'
        })
        return false
      }
      try {
        filename = scienceImportFilename(source.filename)
      } catch {
        emit({ phase: 'error', action: 'prepare', message: 'Choose a .science research package.' })
        return false
      }
      busy = true
      controller = new AbortController()
      const operation = controller
      let stage: 'downloading' | 'preparing' = 'downloading'
      const timeout = setTimeout(
        () => operation.abort(new DOMException('Download timed out', 'TimeoutError')),
        120_000
      )
      const signal = operation.signal
      try {
        await waitForBrowserMock()
        signal.throwIfAborted()
        emit({ phase: 'downloading', message: 'Downloading .science package…', loaded: 0 })
        const downloaded = await deps.download(
          { ...source, filename },
          {
            signal,
            onProgress: (progress) => {
              if (!signal.aborted)
                emit({
                  phase: 'downloading',
                  message: 'Downloading .science package…',
                  ...progress
                })
            }
          }
        )
        signal.throwIfAborted()
        if (disposed) return false
        blob = downloaded
        // Parameter/SDK failures retain the downloaded bytes and never trigger another download.
        stage = 'preparing'
        freshTransfer()
        emit({
          phase: 'ready',
          message: 'Package ready. Open Open-Science to continue.',
          action: 'open'
        })
        return true
      } catch (error) {
        const canceled =
          operation.signal.aborted && operation.signal.reason?.name !== 'TimeoutError'
        emit({
          phase: canceled ? 'idle' : 'error',
          action: blob ? 'open' : 'prepare',
          message: canceled
            ? 'Download canceled. Prepare the package to try again.'
            : stage === 'preparing'
              ? 'Could not prepare the transfer. Try opening Open-Science again, or use the regular download.'
              : error instanceof DownloadError
                ? error.message
                : signal.aborted
                  ? 'The download timed out. Try again or use the regular download.'
                  : 'Could not download the package. Check your connection and try again, or use the regular download.'
        })
        return false
      } finally {
        clearTimeout(timeout)
        busy = false
        controller = undefined
      }
    },
    async resume() {
      // Reconnect the same authenticated transfer without another protocol navigation.
      if (!transfer) return
      await session.open(false)
    },
    async open(requestLaunch = true) {
      if (busy || disposed || received || !blob) return
      busy = true
      controller = new AbortController()
      const signal = controller.signal
      let launched = !requestLaunch
      showInstallHint = false
      handshakeVerified = false
      waiting()
      try {
        if (!transfer) freshTransfer()
        if (!transfer) throw new Error('No transfer')
        // Launch before send; a direct-click retry restores activation if auto-launch was blocked.
        if (requestLaunch) launchTransfer()
        launched = true
        const receipt = await transfer.send({
          signal,
          readinessMode: 'attempts',
          readinessAttempts: 30,
          readinessIntervalMs: 3000,
          attemptTimeoutMs: 3000,
          // Preserve remaining attempts when the browser suspends this page.
          readyTimeoutMs: null,
          onPhase: (phase) => {
            if (signal.aborted) return
            if (phase === 'transferring') {
              handshakeVerified = true
              clearLaunchWatch()
              showInstallHint = false
              emit({ phase: 'sending', message: 'Sending package to Open-Science…' })
            } else waiting()
          },
          onProgress: ({ sentBytes, totalBytes }) => {
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
        transfer = undefined
        emit(RECEIVED_IMPORT_STATE)
      } catch (error) {
        // Readiness failures are structured; other transport failures remain retryable.
        const code = error && typeof error === 'object' && 'code' in error ? error.code : undefined
        const waitingEnded = code === 'timeout' || code === 'readiness-exhausted'
        // A readiness timeout does not invalidate the secret or prove that the app is absent.
        // Cancellation and identity mismatch require a fresh transfer on an explicit launch.
        const canceled = signal.aborted || code === 'cancelled'
        if (canceled || code === 'incompatible') transfer = undefined
        emit({
          phase: canceled || waitingEnded ? 'ready' : 'error',
          action: transfer && launched ? 'resume' : 'open',
          needsApp: !canceled,
          message: signal.aborted
            ? 'Transfer canceled. Open Open-Science again to retry with the prepared package.'
            : code === 'cancelled'
              ? 'Transfer canceled in Open-Science. Open Open-Science again to retry with the prepared package.'
              : waitingEnded
                ? 'Open-Science has not connected yet. Open the app, allow any browser prompts, then continue.'
                : code === 'incompatible'
                  ? 'Could not verify Open-Science. Open the app again to start a new transfer.'
                  : code === 'unsupported-browser'
                    ? 'This browser cannot connect to Open-Science. Use the regular download.'
                    : !launched
                      ? 'Could not request opening Open-Science. Allow external apps in your browser, then try again.'
                      : 'The file was not acknowledged by Open-Science. Check the app and browser permissions, then retry. If needed, start a new transfer or use the regular download.'
        })
      } finally {
        clearLaunchWatch()
        busy = false
        controller = undefined
      }
    },
    reopen() {
      // Called synchronously by a click; reuse the active poller and transfer.
      if (!busy || disposed || !transfer || handshakeVerified || controller?.signal.aborted) return
      try {
        launchTransfer()
        waiting()
      } catch {
        showInstallHint = true
        waiting()
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
      clearLaunchWatch()
      controller.abort()
      void transfer?.cancel()
      emit({ phase: 'canceling', message: 'Canceling…' })
    },
    dispose() {
      disposed = true
      clearLaunchWatch()
      controller?.abort()
      void transfer?.cancel()
      clear()
    }
  }
  return session
}
