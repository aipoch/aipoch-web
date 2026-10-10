import type { UseCaseManifestEntry, UseCaseManifestResource } from './use-case-types'

type ScheduleAfterResponse = (task: () => Promise<void>) => unknown
type Snapshot = { entries: UseCaseManifestEntry[]; etag: string | null }
const LOG_PREFIX = '[use-case-manifest]'

const record = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Expected a manifest object')
  }
  return value as Record<string, unknown>
}

const resource = (value: unknown): UseCaseManifestResource => {
  const item = record(value)
  if (
    typeof item.file_name !== 'string' ||
    !item.file_name.trim() ||
    item.file_name === '.' ||
    item.file_name === '..' ||
    /[/\\]/.test(item.file_name) ||
    Array.from(item.file_name).some((character) => character.charCodeAt(0) < 32) ||
    !Number.isSafeInteger(item.bytes) ||
    (item.bytes as number) < 0 ||
    typeof item.sha256 !== 'string' ||
    !/^[a-f\d]{64}$/i.test(item.sha256) ||
    typeof item.path !== 'string' ||
    !item.path ||
    item.path.includes('\\') ||
    Array.from(item.path).some((character) => character.charCodeAt(0) < 32) ||
    item.path.split('/').some((part) => !part || part === '.' || part === '..') ||
    /^[a-z][a-z\d+.-]*:/i.test(item.path)
  )
    throw new Error('Invalid manifest resource')
  return item as unknown as UseCaseManifestResource
}

const httpUrl = (value: string): URL => {
  const url = new URL(value)
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) {
    throw new Error('Expected an HTTP resource URL')
  }
  return url
}

/** Published objects use the case slug and raw file name; path is source metadata. */
export const parseUseCaseManifest = (
  value: unknown,
  manifestUrl: string
): UseCaseManifestEntry[] => {
  if (!Array.isArray(value)) throw new Error('Expected a manifest array')
  const base = new URL('.', httpUrl(manifestUrl))
  const names = new Set<string>()
  return value.map((value) => {
    const item = record(value)
    if (
      typeof item.title !== 'string' ||
      !item.title.trim() ||
      typeof item.name !== 'string' ||
      !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(item.name) ||
      names.has(item.name)
    )
      throw new Error('Invalid or duplicate manifest case')
    names.add(item.name)
    const resourceUrl = (resource: UseCaseManifestResource) =>
      new URL(`${item.name}/${encodeURIComponent(resource.file_name)}`, base).href
    const cover = resource(item.cover)
    const archive = resource(item.case)
    const releaseUrl = record(item.case).release_url
    if (typeof releaseUrl !== 'string') throw new Error('Invalid release URL')

    return {
      slug: item.name,
      title: item.title,
      preview: { image: resourceUrl(cover) },
      package: {
        extractedBaseUrl: new URL(`${item.name}/extracted/`, base).href,
        url: releaseUrl ? httpUrl(releaseUrl).href : resourceUrl(archive),
        filename: archive.file_name,
        sizeBytes: archive.bytes,
        sha256: archive.sha256
      },
      ...(item.introduction === undefined
        ? {}
        : {
            introductionUrl: resourceUrl(resource(item.introduction))
          })
    }
  })
}

// Diagnostics describe cache state only; manifest entries and resource contents stay out of logs.
const snapshotSummary = (snapshot: Snapshot | undefined) => ({
  etag: snapshot?.etag ?? null,
  count: snapshot?.entries.length ?? 0
})

/** One cache per manifest source in a server runtime; no TTL or eviction timer. */
export const createUseCaseManifestCache = (url: string) => {
  httpUrl(url)
  let snapshot: Snapshot | undefined
  let inFlight: Promise<Snapshot> | undefined
  let completedChecks = 0

  const download = async (): Promise<Snapshot> => {
    const startedAt = Date.now()
    let httpStatus: number | undefined
    const headers: Record<string, string> = snapshot?.etag ? { 'If-None-Match': snapshot.etag } : {}
    // biome-ignore lint/suspicious/noConsole: Manifest diagnostics are intentionally console-only.
    console.info(
      LOG_PREFIX,
      'fetch.start',
      JSON.stringify({
        cacheStatus: snapshot ? 'hit' : 'miss',
        etag: snapshot?.etag ?? null,
        conditional: Boolean(snapshot?.etag)
      })
    )
    try {
      const response = await fetch(url, {
        cache: 'no-store',
        headers,
        signal: AbortSignal.timeout(15_000)
      })
      httpStatus = response.status
      if (response.status === 304) {
        if (!snapshot?.etag) throw new Error('Unexpected 304 without a cached validator')
        // biome-ignore lint/suspicious/noConsole: Manifest diagnostics are intentionally console-only.
        console.info(
          LOG_PREFIX,
          'cache.unchanged',
          JSON.stringify({
            cacheStatus: 'unchanged',
            ...snapshotSummary(snapshot),
            httpStatus,
            durationMs: Date.now() - startedAt
          })
        )
        return snapshot
      }
      if (response.status !== 200) throw new Error(`Manifest HTTP ${response.status}`)
      const entries = parseUseCaseManifest(await response.json(), url)
      const previous = snapshot
      // Publish only a fully validated snapshot with the validator from this GET.
      snapshot = { entries, etag: response.headers.get('etag') }
      // biome-ignore lint/suspicious/noConsole: Manifest diagnostics are intentionally console-only.
      console.info(
        LOG_PREFIX,
        'cache.updated',
        JSON.stringify({
          cacheStatus: 'updated',
          reason: previous ? 'refresh' : 'initial-load',
          previousEtag: previous?.etag ?? null,
          ...snapshotSummary(snapshot),
          httpStatus,
          durationMs: Date.now() - startedAt
        })
      )
      return snapshot
    } catch (error) {
      // Do not log source URLs, response bodies, or signed credentials.
      // biome-ignore lint/suspicious/noConsole: Manifest diagnostics are intentionally console-only.
      console.error(
        LOG_PREFIX,
        'fetch.failed',
        JSON.stringify({
          cacheStatus: snapshot ? 'retained' : 'miss',
          ...snapshotSummary(snapshot),
          httpStatus,
          retainedCache: Boolean(snapshot),
          errorType: error instanceof Error ? error.name : 'UnknownError',
          durationMs: Date.now() - startedAt
        })
      )
      throw error
    }
  }

  const refresh = (): Promise<Snapshot> => {
    if (inFlight) return inFlight
    inFlight = download().finally(() => {
      completedChecks += 1
      inFlight = undefined
    })
    return inFlight
  }

  const read = async (schedule: ScheduleAfterResponse): Promise<UseCaseManifestEntry[]> => {
    const current = snapshot
    if (!current) {
      // biome-ignore lint/suspicious/noConsole: Manifest diagnostics are intentionally console-only.
      console.info(
        LOG_PREFIX,
        'cache.miss',
        JSON.stringify({ cacheStatus: 'miss', ...snapshotSummary(undefined) })
      )
      return (await refresh()).entries
    }
    // biome-ignore lint/suspicious/noConsole: Manifest diagnostics are intentionally console-only.
    console.info(
      LOG_PREFIX,
      'cache.hit',
      JSON.stringify({ cacheStatus: 'hit', ...snapshotSummary(current) })
    )
    const observedChecks = completedChecks
    schedule(async () => {
      // Delayed callbacks from the same request wave need not check twice.
      if (completedChecks !== observedChecks) return
      try {
        await refresh()
      } catch {
        // download() logged the failure; a later request retries without a TTL.
      }
    })
    return current.entries
  }
  return { read }
}
