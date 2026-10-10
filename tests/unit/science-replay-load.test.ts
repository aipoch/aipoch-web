import { afterEach, expect, mock, test } from 'bun:test'
import type { WorkerReply } from '../../lib/science-package/protocol'

const waitForMock = mock(async () => {})
mock.module('../../mocks/ready', () => ({ waitForBrowserMock: waitForMock }))
const info = {
  url: 'https://cdn.test/a.science',
  filename: 'a.science',
  sizeBytes: 10,
  sha256: 'a'.repeat(64)
}
const { loadReplay } = await import('../../lib/science-package/load')
const original = {
  fetch: globalThis.fetch,
  worker: globalThis.Worker,
  create: URL.createObjectURL,
  revoke: URL.revokeObjectURL
}
class TestWorker {
  static instances: TestWorker[] = []
  onmessage?: (event: { data: WorkerReply }) => void
  onerror?: (event: { message: string }) => void
  terminate = mock(() => {})
  postMessage = mock((_message: unknown) => {})
  constructor() {
    TestWorker.instances.push(this)
  }
  emit(data: WorkerReply) {
    this.onmessage?.({ data })
  }
}
const prepare = () => {
  TestWorker.instances = []
  waitForMock.mockReset().mockResolvedValue(undefined)
  globalThis.Worker = TestWorker as unknown as typeof Worker
  globalThis.fetch = mock(async () =>
    Response.json({
      url: 'https://cdn.test/a.science',
      filename: 'a.science',
      sizeBytes: 10,
      sha256: 'a'.repeat(64)
    })
  ) as unknown as typeof fetch
  URL.createObjectURL = mock(() => 'blob:test')
  URL.revokeObjectURL = mock(() => {})
}
afterEach(() => {
  globalThis.fetch = original.fetch
  globalThis.Worker = original.worker
  URL.createObjectURL = original.create
  URL.revokeObjectURL = original.revoke
})
const tick = () => new Promise((resolve) => setTimeout(resolve, 0))
test('unmount terminates the worker, revokes assets and ignores late messages', async () => {
  prepare()
  const update = mock(() => {})
  const cancel = loadReplay('case', info, update)
  await tick()
  expect(globalThis.fetch).not.toHaveBeenCalled()
  const worker = TestWorker.instances[0]
  expect(worker.postMessage).toHaveBeenCalledWith({ type: 'load', slug: 'case', info })
  worker.emit({ type: 'resources', resources: [{ id: 'science-asset:0', blob: new Blob(['a']) }] })
  expect(worker.postMessage).toHaveBeenLastCalledWith({
    type: 'urls',
    urls: { 'science-asset:0': 'blob:test' }
  })
  cancel()
  expect(worker.terminate).toHaveBeenCalledTimes(1)
  expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:test')
  const count = update.mock.calls.length
  worker.emit({ type: 'error', message: 'Too late' })
  expect(update.mock.calls.length).toBe(count)
})
test('worker failures release assets and retry creates a fresh task', async () => {
  prepare()
  const update = mock(() => {})
  const cancel = loadReplay('case', info, update)
  await tick()
  const worker = TestWorker.instances[0]
  worker.emit({ type: 'resources', resources: [{ id: 'science-asset:0', blob: new Blob(['a']) }] })
  worker.emit({ type: 'error', message: 'Invalid gzip' })
  expect(update).toHaveBeenLastCalledWith({ status: 'error', message: 'Invalid gzip' })
  expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:test')
  const count = update.mock.calls.length
  worker.emit({ type: 'progress', progress: { stage: 'parsing' } })
  expect(update.mock.calls.length).toBe(count)
  cancel()
  const cancelRetry = loadReplay('case', info, update)
  await tick()
  expect(TestWorker.instances).toHaveLength(2)
  cancelRetry()
})
test('leaving before mock readiness never starts a worker or performs a fetch', async () => {
  prepare()
  let ready: () => void = () => {}
  waitForMock.mockImplementationOnce(
    () =>
      new Promise<void>((resolve) => {
        ready = resolve
      })
  )
  const update = mock(() => {})
  const cancel = loadReplay('case', info, update)
  cancel()
  ready()
  await tick()
  expect(TestWorker.instances).toHaveLength(0)
  expect(globalThis.fetch).not.toHaveBeenCalled()
  expect(update).toHaveBeenCalledTimes(1)
})
