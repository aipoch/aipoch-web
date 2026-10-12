import type {
  BrowserImportProgress,
  BrowserImportTransfer
} from '../../vendor/open-science/browser-import'

// Browser component tests only: no custom protocol, crypto, receiver or desktop process.
const state = {
  prepares: 0,
  sends: 0,
  cancels: 0,
  blobSize: 0,
  activation: false,
  launchedBeforeSend: false,
  progress: (_value: BrowserImportProgress) => {},
  finish: (_received = true) => {},
  fail: (_timeout = false) => {}
}
Object.assign(window, { importTest: state })
export const waitForBrowserMock = async () => {}
export function prepareBrowserImport(blob: Blob): BrowserImportTransfer {
  state.prepares++
  state.blobSize = blob.size
  const url = `#test-import-${state.prepares}`
  return {
    url,
    send({ signal, onProgress } = {}) {
      state.sends++
      state.activation = navigator.userActivation.isActive
      state.launchedBeforeSend = window.location.hash === url
      return new Promise((resolve, reject) => {
        const abort = () => {
          state.cancels++
          reject(new DOMException('Canceled', 'AbortError'))
        }
        signal?.addEventListener('abort', abort, { once: true })
        const cleanup = () => signal?.removeEventListener('abort', abort)
        state.progress = (value) => onProgress?.(value)
        state.finish = (received = true) => {
          cleanup()
          resolve({ received } as { received: true })
        }
        state.fail = (timeout = false) => {
          cleanup()
          reject(
            timeout ? new DOMException('Timed out', 'TimeoutError') : new TypeError('Network error')
          )
        }
      })
    }
  }
}
export type ImportTestState = typeof state
