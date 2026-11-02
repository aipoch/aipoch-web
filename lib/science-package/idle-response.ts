const IDLE_TIMEOUT_MS = 30_000

/** Limit time without body bytes, including the initial fetch, rather than total download time. */
export const fetchReplayResponse = async (url: string | URL, signal?: AbortSignal) => {
  const controller = new AbortController()
  let timer: ReturnType<typeof setTimeout> | undefined
  let reader: ReadableStreamDefaultReader<Uint8Array> | undefined
  let body: ReadableStreamDefaultController<Uint8Array> | undefined
  const cleanup = () => {
    clearTimeout(timer)
    timer = undefined
    signal?.removeEventListener('abort', cancel)
    controller.signal.removeEventListener('abort', aborted)
  }
  const cancel = () => controller.abort(signal?.reason)
  const aborted = () => {
    cleanup()
    body?.error(controller.signal.reason)
    void reader?.cancel(controller.signal.reason).catch(() => {})
  }
  const reset = () => {
    clearTimeout(timer)
    timer = setTimeout(
      () => controller.abort(new DOMException('Download stalled for 30 seconds.', 'TimeoutError')),
      IDLE_TIMEOUT_MS
    )
  }
  signal?.throwIfAborted()
  signal?.addEventListener('abort', cancel, { once: true })
  controller.signal.addEventListener('abort', aborted, { once: true })
  reset()
  try {
    const response = await fetch(url, {
      mode: 'cors',
      credentials: 'omit',
      signal: controller.signal
    })
    controller.signal.throwIfAborted()
    if (!response.ok || !response.body) {
      cleanup()
      await response.body?.cancel()
      return new Response(null, {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers
      })
    }
    const source = response.body.getReader()
    reader = source
    const stream = new ReadableStream<Uint8Array>({
      start(value) {
        body = value
      },
      async pull(target) {
        try {
          const next = await source.read()
          controller.signal.throwIfAborted()
          if (next.done) {
            // Clear at network EOF, before downstream parsing, hashing or rendering finishes.
            cleanup()
            target.close()
            source.releaseLock()
          } else {
            if (next.value.byteLength > 0) reset()
            target.enqueue(next.value)
          }
        } catch (error) {
          cleanup()
          target.error(error)
          await source.cancel(error).catch(() => {})
          source.releaseLock()
        }
      },
      async cancel(reason) {
        cleanup()
        controller.abort(reason)
        await source.cancel(reason).catch(() => {})
        source.releaseLock()
      }
    })
    return new Response(stream, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers
    })
  } catch (error) {
    cleanup()
    throw error
  }
}
