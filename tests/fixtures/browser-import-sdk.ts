import type {
  BrowserImportPhase,
  BrowserImportProgress,
  BrowserImportTransfer
} from '../../lib/science-package/sdk'

// Browser component tests only: no custom protocol, crypto, receiver or desktop process.
const state = {
  checks: 0,
  availability: 'available' as 'available' | 'unavailable',
  prepares: 0,
  sends: 0,
  appLaunches: 0,
  cancels: 0,
  blobSize: 0,
  activation: false,
  launchedBeforeSend: false,
  phase: (_value: BrowserImportPhase) => {},
  progress: (_value: BrowserImportProgress) => {},
  finish: (_received = true) => {},
  fail: (_timeout = false) => {},
  desktopCancel: () => {}
}
Object.assign(window, { importTest: state })
export const waitForBrowserMock = async () => {}
export const launchOpenScience = () => {
  state.appLaunches++
}
export const checkBrowserImportAvailability = async () => {
  state.checks++
  return { status: state.availability }
}
export function prepareBrowserImport(blob: Blob): BrowserImportTransfer {
  state.prepares++
  state.blobSize = blob.size
  const url = `#test-import-${state.prepares}`
  let cancelled = false
  return {
    url,
    send({ signal, onProgress, onPhase, readyTimeoutMs } = {}) {
      if (cancelled)
        return Promise.reject(Object.assign(new Error('Desktop canceled'), { code: 'cancelled' }))
      state.sends++
      onPhase?.('waiting-for-receiver')
      state.activation = navigator.userActivation.isActive
      state.launchedBeforeSend = window.location.hash === url
      return new Promise((resolve, reject) => {
        const abort = () => {
          clearTimeout(deadline)
          state.cancels++
          reject(new DOMException('Canceled', 'AbortError'))
        }
        signal?.addEventListener('abort', abort, { once: true })
        const deadline = setTimeout(() => state.fail(true), readyTimeoutMs)
        const cleanup = () => {
          clearTimeout(deadline)
          signal?.removeEventListener('abort', abort)
        }
        state.desktopCancel = () => {
          cleanup()
          cancelled = true
          reject(Object.assign(new Error('Desktop canceled'), { code: 'cancelled' }))
        }
        state.phase = (value) => onPhase?.(value)
        state.progress = (value) => onProgress?.(value)
        state.finish = (received = true) => {
          cleanup()
          resolve({ received } as { received: true })
        }
        state.fail = (timeout = false) => {
          cleanup()
          reject(
            timeout
              ? Object.assign(new Error('Readiness failed'), { code: 'timeout' })
              : new TypeError('Network error')
          )
        }
      })
    }
  }
}
export type ImportTestState = typeof state
