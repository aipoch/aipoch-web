import type { UseCasePackage } from '../use-case-types'
import { downloadPackage, type PackageProgress } from './archive'
import { fetchReplayResponse } from './idle-response'
import { readJsonStream } from './json-stream'
import { type OrderedEvent, readOrderedReplay } from './ordered'
import {
  buildSanitizer,
  parseExtractedSession,
  parsePackage,
  readVerifiedPackage,
  sessionRecordFrom,
  storagePathFor
} from './parse'
import { normalizeReviews, reviewRecordsFrom } from './review-records'
import { isReviewerCorrectionAttribution } from './reviewer'
import { Sha256 } from './sha256'

const MAX_METADATA_BYTES = 128 * 1024 ** 2

// Bound streamed JSON reads before allocating the full body, just like archive JSON entries.
const fetchMetadata = async (
  base: string,
  path: string,
  optional = false,
  signal?: AbortSignal,
  onDigest?: (hash: string) => void
): Promise<unknown> => {
  const response = await fetchReplayResponse(new URL(path, base), signal)
  // S3 can return 403 for a missing object when bucket listing is disabled.
  if (optional && [403, 404].includes(response.status)) return undefined
  if (!response.ok || !response.body)
    throw new Error(`Session metadata download failed (HTTP ${response.status}).`)
  let size = 0
  const digest = new Sha256()
  const stream = response.body.pipeThrough(
    new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, controller) {
        digest.update(chunk)
        size += chunk.byteLength
        if (size > MAX_METADATA_BYTES)
          throw new Error('Session metadata exceeds the browser limit.')
        controller.enqueue(chunk)
      }
    })
  )
  const value = await readJsonStream(stream)
  onDigest?.(digest.hex())
  return value
}

/** Read only the documents required for a transcript; artifact bytes load through their URLs. */
export const prepareReplayPackage = async (
  info: UseCasePackage,
  slug: string,
  progress: (value: PackageProgress) => void,
  signal?: AbortSignal,
  onOrdered?: (event: OrderedEvent) => void
) => {
  if (info.extractedBaseUrl) {
    progress({ stage: 'metadata' })
    const base = new URL(info.extractedBaseUrl)
    if (
      !['https:', 'http:'].includes(base.protocol) ||
      base.username ||
      base.password ||
      !base.pathname.endsWith('/') ||
      base.search ||
      base.hash
    )
      throw new Error('Invalid extracted package URL.')
    const recordsController = new AbortController()
    const recordsSignal = signal
      ? AbortSignal.any([signal, recordsController.signal])
      : recordsController.signal
    // Start independent documents together. Capture rejection immediately while the body loads.
    let sessionDigest: string | undefined
    const requestSession = () =>
      fetchMetadata(base.href, 'session.json', true, recordsSignal, (hash) => {
        sessionDigest = hash
      }).then(
        (value) => ({ value }),
        (error) => ({ error })
      )
    let sessionRequest: ReturnType<typeof requestSession> | undefined = requestSession()
    const sessionFile = async () => {
      sessionRequest ??= requestSession()
      const settled = await sessionRequest
      if ('error' in settled) {
        sessionRequest = undefined
        throw settled.error
      }
      return settled.value
    }
    const settleRecords = () =>
      fetchMetadata(base.href, 'records.json', true, recordsSignal).then(
        (value) => ({ value }),
        (error) => ({ error })
      )
    let initialRecords: ReturnType<typeof settleRecords> | undefined = settleRecords()
    const reviewLoader = (
      session: ReturnType<typeof sessionRecordFrom>,
      runDocument?: Record<string, unknown>
    ) => {
      const { sanitize } = buildSanitizer(session, runDocument)
      // Reviews cannot alter the finalized body. Each attempt waits for the entire records
      // document, including findings/dispositions/version associations arriving after reviews.
      return async () => {
        const request = initialRecords ?? settleRecords()
        initialRecords = undefined
        const settled = await request
        if ('error' in settled) throw settled.error
        let records = settled.value
        const hasReviews =
          session.autoReviewEnabled === true ||
          session.messages.some((message) => isReviewerCorrectionAttribution(message.attribution))
        if (records === undefined && hasReviews) {
          const archive = await readVerifiedPackage(await downloadPackage(info, () => {}, signal))
          if (
            archive.session.id !== session.id ||
            archive.session.revision !== session.revision ||
            JSON.stringify(archive.session.messages) !== JSON.stringify(session.messages)
          )
            throw new Error('Review history does not match the published session.')
          records = archive.records
        }
        return normalizeReviews(
          session,
          records === undefined ? undefined : reviewRecordsFrom(records),
          sanitize
        )
      }
    }
    try {
      const ordered = await readOrderedReplay(info, slug, onOrdered, signal)
      if (ordered) {
        const { sessionSha256, runRoots } = ordered
        return {
          ...ordered,
          ordered: true as const,
          loadReviews: async () => {
            const file = await sessionFile()
            if (!file || sessionDigest !== sessionSha256) {
              sessionRequest = undefined
              throw new Error('Review source does not match ordered replay.')
            }
            return reviewLoader(sessionRecordFrom(file), runRoots)()
          }
        }
      }
      const file = await sessionFile()
      if (file !== undefined) {
        const session = sessionRecordFrom(file)
        // Notebook exports store runs under the session's project/id storage key.
        // This optional document enriches the transcript; it is not an inventory.
        let runDocument: Record<string, unknown> | undefined
        if (
          typeof session.projectId === 'string' &&
          session.projectId &&
          typeof session.id === 'string' &&
          session.id &&
          session.conversationGraph?.activities?.some((activity) => activity.executionInvocationId)
        ) {
          const path = storagePathFor(`notebooks/${session.projectId}/${session.id}/run.json`)
          const run = await fetchMetadata(base.href, path, true, signal)
          if (run !== undefined) {
            if (!run || typeof run !== 'object' || !Array.isArray((run as { runs?: unknown }).runs))
              throw new Error('Invalid notebook run metadata.')
            runDocument = run as Record<string, unknown>
          }
        }
        progress({ stage: 'parsing' })
        const result = parseExtractedSession(session, slug, base.href, runDocument)
        return { ...result, loadReviews: reviewLoader(session, runDocument) }
      }
      recordsController.abort()
    } catch (error) {
      recordsController.abort()
      throw error
    }
  }

  // Old publications remain readable, with their original size and SHA-256 checks.
  const archive = await downloadPackage(info, progress, signal)
  progress({ stage: 'parsing' })
  // Archive records also supply attachment filenames and upload mappings, so they remain
  // body dependencies behind the full integrity barrier. Do not guess those associations.
  const result = await parsePackage(archive, slug)
  const reviews = result.session.reviews ?? []
  result.session.reviews = []
  return { ...result, loadReviews: async () => reviews }
}

/** Complete-model API for consumers that explicitly need both the transcript and its reviews. */
export const loadReplayPackage = async (
  info: UseCasePackage,
  slug: string,
  progress: (value: PackageProgress) => void,
  signal?: AbortSignal
) => {
  const result = await prepareReplayPackage(info, slug, progress, signal)
  return {
    session: { ...result.session, reviews: await result.loadReviews() },
    resources: result.resources
  }
}
