import { HttpResponse, http } from 'msw'
import { useCaseManifest } from '../fixtures'
import orderedFixture from '../fixtures/ordered-replay.json'
import { buildCoveragePackage } from '../fixtures/science-coverage-package'
import { buildSciencePackage, digest } from '../fixtures/science-package'

const orderedSource = JSON.parse(orderedFixture.source).session
const orderedPackage = buildSciencePackage(orderedSource.title, orderedSource)
const orderedIndex = {
  ...orderedFixture.index,
  archiveSha256: orderedPackage.sha256,
  sessionSha256: digest(orderedPackage.extractedFiles['session.json'])
}

const packages = new Map(
  useCaseManifest.map((item) => [item.name, buildCoveragePackage(item.title)])
)

/** The HTTP adapter owns mock revisions, so SSR and browsers see one object version. */
export const useCaseManifestHandlers = (origin: string) => {
  let revision = 1
  let mode = 'normal'
  let titleSuffix = ''
  let delayMs = 0
  let requests = 0
  let notModified = 0
  let lastValidator: string | null = null
  let discoveryMode = 'available'
  let packageMode = 'normal'
  let packageDelayMs = 0
  let packageRequests = 0
  let replayChunkDelayMs = 0
  let recordsChunkDelayMs = 0
  let recordsMode = 'normal'
  let orderedMode = 'off'
  let orderedChunkDelayMs = 0
  let orderedFinished = false
  let sessionFinished = false
  let resetDownloads: (() => void)[] = []
  const packageFor = (name: string) => (orderedMode === 'off' ? packages.get(name) : orderedPackage)
  return [
    http.get(`${origin}/use-case-manifest/manifest.json`, async ({ request }) => {
      requests += 1
      lastValidator = request.headers.get('if-none-match')
      const validator = lastValidator
      const responseMode = mode
      const responseSuffix = titleSuffix
      const etag = `"use-case-manifest-${revision}"`
      const headers = { ETag: etag, 'Cache-Control': 'no-store' }
      if (delayMs) await new Promise((resolve) => setTimeout(resolve, delayMs))
      if (responseMode === 'error') return new HttpResponse(null, { status: 503 })
      if (responseMode === 'invalid') return HttpResponse.text('invalid json', { headers })
      if (validator === etag) {
        notModified += 1
        return new HttpResponse(null, { status: 304, headers })
      }
      return HttpResponse.json(
        responseMode === 'empty'
          ? []
          : useCaseManifest.map((item) => ({
              ...item,
              title: `${item.title}${responseSuffix}`,
              case: {
                ...item.case,
                release_url: item.case.release_url
                  ? `${origin}/use-case-manifest/releases/${item.name}.science`
                  : '',
                bytes: packageFor(item.name)?.sizeBytes,
                sha256: packageFor(item.name)?.sha256
              }
            })),
        { headers }
      )
    }),
    // Development-only controls and counters make after-response refresh observable.
    http.get(`${origin}/__mock/use-case-manifest`, () =>
      HttpResponse.json({
        revision,
        requests,
        notModified,
        lastValidator,
        packageRequests,
        discoveryMode,
        orderedFinished,
        sessionFinished
      })
    ),
    http.put(`${origin}/__mock/use-case-manifest`, async ({ request }) => {
      const update = (await request.json()) as {
        discoveryMode?: string
        mode?: string
        titleSuffix?: string
        delayMs?: number
        packageMode?: string
        packageDelayMs?: number
        replayChunkDelayMs?: number
        recordsChunkDelayMs?: number
        recordsMode?: string
        orderedMode?: string
        orderedChunkDelayMs?: number
      }
      if (
        (update.discoveryMode !== undefined &&
          !['available', 'unavailable', 'incompatible', 'timeout'].includes(
            update.discoveryMode
          )) ||
        (update.mode !== undefined &&
          !['normal', 'empty', 'error', 'invalid'].includes(update.mode)) ||
        (update.titleSuffix !== undefined && typeof update.titleSuffix !== 'string') ||
        (update.packageMode !== undefined &&
          !['normal', 'error', 'empty', 'oversized'].includes(update.packageMode)) ||
        (update.packageDelayMs !== undefined &&
          (!Number.isInteger(update.packageDelayMs) ||
            update.packageDelayMs < 0 ||
            update.packageDelayMs > 5000)) ||
        (update.replayChunkDelayMs !== undefined &&
          (!Number.isInteger(update.replayChunkDelayMs) ||
            update.replayChunkDelayMs < 0 ||
            update.replayChunkDelayMs > 5000)) ||
        (update.recordsChunkDelayMs !== undefined &&
          (!Number.isInteger(update.recordsChunkDelayMs) ||
            update.recordsChunkDelayMs < 0 ||
            update.recordsChunkDelayMs > 5000)) ||
        (update.orderedMode !== undefined &&
          !['off', 'normal', 'truncated', 'corrupt'].includes(update.orderedMode)) ||
        (update.orderedChunkDelayMs !== undefined &&
          (!Number.isInteger(update.orderedChunkDelayMs) ||
            update.orderedChunkDelayMs < 0 ||
            update.orderedChunkDelayMs > 5000)) ||
        (update.recordsMode !== undefined &&
          !['normal', 'error', 'missing'].includes(update.recordsMode)) ||
        (update.delayMs !== undefined &&
          (!Number.isInteger(update.delayMs) || update.delayMs < 0 || update.delayMs > 5000))
      )
        return new HttpResponse(null, { status: 400 })
      discoveryMode = update.discoveryMode ?? 'available'
      mode = update.mode ?? 'normal'
      titleSuffix = update.titleSuffix ?? ''
      delayMs = update.delayMs ?? 0
      packageMode = update.packageMode ?? 'normal'
      packageDelayMs = update.packageDelayMs ?? 0
      replayChunkDelayMs = update.replayChunkDelayMs ?? 0
      recordsChunkDelayMs = update.recordsChunkDelayMs ?? 0
      recordsMode = update.recordsMode ?? 'normal'
      orderedMode = update.orderedMode ?? 'off'
      orderedChunkDelayMs = update.orderedChunkDelayMs ?? 0
      orderedFinished = false
      sessionFinished = false
      for (const stop of resetDownloads) stop()
      resetDownloads = []
      revision += 1
      return HttpResponse.json({ revision })
    }),
    http.get(`${origin}/use-case-manifest/*`, async ({ request }) => {
      const path = decodeURIComponent(
        new URL(request.url).pathname.slice('/use-case-manifest/'.length)
      )
      for (const item of useCaseManifest) {
        // Serve unchanged session JSON and objects restored to their storage-key directories.
        const prefix = `${item.name}/extracted/`
        if (path.startsWith(prefix)) {
          const file = path.slice(prefix.length)
          if (file === 'records.json' && recordsMode !== 'normal')
            return new HttpResponse(null, { status: recordsMode === 'missing' ? 404 : 503 })
          if (orderedMode !== 'off' && file === `replay-v1/${orderedPackage.sha256}/index.json`)
            return HttpResponse.json(orderedIndex)
          if (
            orderedMode !== 'off' &&
            file === `replay-v1/${orderedPackage.sha256}/blocks.ndjson`
          ) {
            let text = orderedFixture.stream
            if (orderedMode === 'truncated') text = `${text.split('\n').slice(0, 3).join('\n')}\n`
            if (orderedMode === 'corrupt')
              text = text.replace('Ordered complete answer.', 'Altered complete answer.')
            return new HttpResponse(
              delayedBody(
                new TextEncoder().encode(text),
                orderedChunkDelayMs,
                () => {
                  orderedFinished = true
                },
                undefined,
                (stop) => resetDownloads.push(stop)
              ),
              { headers: { 'Content-Type': 'application/x-ndjson' } }
            )
          }
          const bytes = packageFor(item.name)?.extractedFiles[file]
          if (!bytes) return new HttpResponse(null, { status: 404 })
          const chunkDelay =
            file === 'session.json'
              ? replayChunkDelayMs
              : file === 'records.json'
                ? recordsChunkDelayMs
                : 0
          return new HttpResponse(
            chunkDelay
              ? delayedBody(
                  bytes,
                  chunkDelay,
                  () => {
                    if (file === 'session.json') sessionFinished = true
                  },
                  undefined,
                  orderedMode === 'off' ? undefined : (stop) => resetDownloads.push(stop)
                )
              : (bytes as BodyInit),
            {
              headers: {
                'Content-Type': file.endsWith('.json')
                  ? 'application/json'
                  : 'application/octet-stream'
              }
            }
          )
        }
        if (path === `${item.name}/${item.cover.file_name}`) {
          return new HttpResponse(
            '<svg xmlns="http://www.w3.org/2000/svg" width="626" height="292"><rect width="626" height="292" fill="#e8e8e4"/><text x="30" y="150" font-size="32">Research case preview</text></svg>',
            { headers: { 'Content-Type': 'image/svg+xml' } }
          )
        }
        if (item.introduction && path === `${item.name}/${item.introduction.file_name}`)
          return HttpResponse.text(`# ${item.title}\n\nLocal sample introduction.`, {
            headers: { 'Content-Type': 'text/markdown' }
          })
        if (
          path === `${item.name}/${item.case.file_name}` ||
          (item.case.release_url && path === `releases/${item.name}.science`)
        ) {
          packageRequests += 1
          const responseMode = packageMode
          if (packageDelayMs) await new Promise((resolve) => setTimeout(resolve, packageDelayMs))
          if (responseMode === 'error') return new HttpResponse(null, { status: 503 })
          if (responseMode === 'empty') return new HttpResponse(new Uint8Array())
          if (responseMode === 'oversized')
            return new HttpResponse('too large', {
              headers: { 'Content-Length': String(2 * 1024 ** 3 + 1) }
            })
          const sample = packageFor(item.name)
          if (!sample) return new HttpResponse(null, { status: 404 })
          return new HttpResponse(
            replayChunkDelayMs
              ? delayedBody(sample.bytes, replayChunkDelayMs)
              : (sample.bytes as BodyInit),
            {
              headers: {
                'Content-Type': 'application/octet-stream',
                'Content-Length': String(sample.sizeBytes),
                'Content-Disposition': 'attachment; filename="sample.science"'
              }
            }
          )
        }
      }
      return new HttpResponse(null, { status: 404 })
    })
  ]
}

// Slow but active response bodies exercise idle deadlines through the real HTTP adapter.
const delayedBody = (
  bytes: Uint8Array,
  delayMs: number,
  finished?: () => void,
  canceled?: () => void,
  registerReset?: (stop: () => void) => void
) => {
  let timer: ReturnType<typeof setTimeout> | undefined
  let offset = 0
  let closed = false
  const size = Math.ceil(bytes.length / 18)
  return new ReadableStream<Uint8Array>({
    start(controller) {
      registerReset?.(() => {
        clearTimeout(timer)
        if (!closed) {
          closed = true
          controller.close()
        }
      })
      const send = () => {
        const end = Math.min(offset + size, bytes.length)
        controller.enqueue(bytes.slice(offset, end))
        offset = end
        if (offset === bytes.length) {
          closed = true
          finished?.()
          controller.close()
        } else timer = setTimeout(send, delayMs)
      }
      send()
    },
    cancel() {
      clearTimeout(timer)
      closed = true
      canceled?.()
    }
  })
}
