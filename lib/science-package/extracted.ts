import type { UseCasePackage } from '../use-case-types'
import { downloadPackage, type PackageProgress } from './archive'
import {
  parseExtractedSession,
  parsePackage,
  readVerifiedPackage,
  sessionRecordFrom,
  storagePathFor
} from './parse'

import { reviewRecordsFrom } from './review-records'
import { isReviewerCorrectionAttribution } from './reviewer'

const MAX_METADATA_BYTES = 128 * 1024 ** 2

// Bound streamed JSON reads before allocating the full body, just like archive JSON entries.
const fetchMetadata = async (base: string, path: string, optional = false): Promise<unknown> => {
  const response = await fetch(new URL(path, base), {
    mode: 'cors',
    credentials: 'omit',
    signal: AbortSignal.timeout(30_000)
  })
  // S3 can return 403 for a missing object when bucket listing is disabled.
  if (optional && [403, 404].includes(response.status)) return undefined
  if (!response.ok || !response.body)
    throw new Error(`Session metadata download failed (HTTP ${response.status}).`)
  let size = 0
  const stream = response.body.pipeThrough(
    new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, controller) {
        size += chunk.byteLength
        if (size > MAX_METADATA_BYTES)
          throw new Error('Session metadata exceeds the browser limit.')
        controller.enqueue(chunk)
      }
    })
  )
  return new Response(stream).json()
}

/** Read only the documents required for a transcript; artifact bytes load through their URLs. */
export const loadReplayPackage = async (
  info: UseCasePackage,
  slug: string,
  progress: (value: PackageProgress) => void
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
    const file = await fetchMetadata(base.href, 'session.json', true)
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
        const run = await fetchMetadata(base.href, path, true)
        if (run !== undefined) {
          if (!run || typeof run !== 'object' || !Array.isArray((run as { runs?: unknown }).runs))
            throw new Error('Invalid notebook run metadata.')
          runDocument = run as Record<string, unknown>
        }
      }
      // Review tables are optional for old publications. Only sessions known to have reviews
      // need an archive fallback; unreviewed sessions keep the lightweight metadata path.
      let records = session.messages.length
        ? await fetchMetadata(base.href, 'records.json', true)
        : undefined
      const hasReviews =
        session.autoReviewEnabled === true ||
        session.messages.some((message) => isReviewerCorrectionAttribution(message.attribution))
      if (records === undefined && hasReviews) {
        const archive = await readVerifiedPackage(await downloadPackage(info, progress))
        if (
          archive.session.id !== session.id ||
          archive.session.revision !== session.revision ||
          JSON.stringify(archive.session.messages) !== JSON.stringify(session.messages)
        )
          throw new Error('Review history does not match the published session.')
        records = archive.records
      }
      progress({ stage: 'parsing' })
      return parseExtractedSession(
        session,
        slug,
        base.href,
        runDocument,
        records === undefined ? undefined : reviewRecordsFrom(records)
      )
    }
  }

  // Old publications remain readable, with their original size and SHA-256 checks.
  const archive = await downloadPackage(info, progress)
  progress({ stage: 'parsing' })
  return parsePackage(archive, slug)
}
