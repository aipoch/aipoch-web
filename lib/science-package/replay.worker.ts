import type { UseCaseSession } from '../use-case-types'
import { loadReplayPackage } from './extracted'
import type { WorkerReply, WorkerRequest } from './protocol'

const send = (message: WorkerReply) => self.postMessage(message)
let parsed: UseCaseSession | undefined
self.onmessage = async ({ data }: MessageEvent<WorkerRequest>) => {
  try {
    if (data.type === 'load') {
      const result = await loadReplayPackage(data.info, data.slug, (progress) =>
        send({ type: 'progress', progress })
      )
      parsed = result.session
      send({ type: 'resources', resources: result.resources })
    } else if (parsed) {
      // Blob URLs are owned by the page so they survive worker termination.
      const resolve = (value: unknown): unknown => {
        if (typeof value === 'string')
          return value.replace(/science-asset:\d+/g, (id) => data.urls[id] ?? '')
        if (Array.isArray(value)) return value.map(resolve)
        if (value && typeof value === 'object')
          return Object.fromEntries(
            Object.entries(value).map(([key, entry]) => [key, resolve(entry)])
          )
        return value
      }
      send({ type: 'ready', data: resolve(parsed) as UseCaseSession })
      parsed = undefined
    }
  } catch (error) {
    send({
      type: 'error',
      message: error instanceof Error ? error.message : 'Package parsing failed.'
    })
  }
}
