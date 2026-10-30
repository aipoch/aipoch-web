import type { TranscriptItem, UseCasePackage, UseCaseSession } from '../use-case-types'
import { fetchReplayResponse } from './idle-response'
import { readJsonStream } from './json-stream'
import { parseExtractedSession, sessionRecordFrom } from './parse'
import { record } from './review-scope'
import { Sha256 } from './sha256'

type Resource = { id: string; blob: Blob }
export type OrderedEvent =
  | { type: 'start'; session: UseCaseSession }
  | { type: 'block'; item: TranscriptItem; resources: Resource[] }
const hashPattern = /^[a-f0-9]{64}$/
const MAX_LINE = 128 * 1024 ** 2
function invalid(): never {
  throw new Error('Invalid or incomplete ordered replay.')
}

/** Immutable archive-addressed projection; only a verified continuous prefix may escape. */
export async function readOrderedReplay(
  info: UseCasePackage,
  slug: string,
  emit?: (event: OrderedEvent) => void,
  signal?: AbortSignal
) {
  if (!info.extractedBaseUrl) return undefined
  const extractedBaseUrl = info.extractedBaseUrl
  const base = new URL(`replay-v1/${info.sha256.toLowerCase()}/`, info.extractedBaseUrl)
  const indexResponse = await fetchReplayResponse(new URL('index.json', base), signal)
  if ([403, 404].includes(indexResponse.status)) return undefined
  if (!indexResponse.ok || !indexResponse.body) invalid()
  let size = 0
  const index = record(
    await readJsonStream(
      indexResponse.body.pipeThrough(
        new TransformStream({
          transform(chunk: Uint8Array, controller) {
            size += chunk.byteLength
            if (size > 4 * 1024 ** 2) invalid()
            controller.enqueue(chunk)
          }
        })
      )
    )
  )
  if (
    !index ||
    index.format !== 'open-science-replay' ||
    index.version !== 1 ||
    index.archiveSha256 !== info.sha256.toLowerCase() ||
    typeof index.sessionSha256 !== 'string' ||
    !hashPattern.test(index.sessionSha256) ||
    !Array.isArray(index.lines) ||
    !index.lines.length ||
    index.lines.length > 100_000
  )
    invalid()
  const expected = index.lines.map((value) => {
    const line = record(value)
    if (
      !line ||
      !Number.isSafeInteger(line.bytes) ||
      Number(line.bytes) <= 0 ||
      Number(line.bytes) > MAX_LINE ||
      typeof line.sha256 !== 'string' ||
      !hashPattern.test(line.sha256)
    )
      invalid()
    return { bytes: Number(line.bytes), sha256: line.sha256 as string }
  })
  if (expected.reduce((sum, line) => sum + line.bytes + 1, 0) > 256 * 1024 ** 2) invalid()
  const response = await fetchReplayResponse(new URL('blocks.ndjson', base), signal)
  if (!response.ok || !response.body) invalid()
  const reader = response.body.getReader()
  let ordinal = 0
  let parts: Uint8Array[] = []
  let length = 0
  let digest = new Sha256()
  let session: UseCaseSession | undefined
  let header: Record<string, unknown> | undefined
  const resources: Resource[] = []
  const ids = new Set<string>()
  const finishLine = () => {
    const spec = expected[ordinal]
    if (!spec || length !== spec.bytes || digest.hex() !== spec.sha256) invalid()
    const bytes = new Uint8Array(length)
    let offset = 0
    for (const part of parts) {
      bytes.set(part, offset)
      offset += part.length
    }
    const data = record(JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)))
    if (!data) invalid()
    if (ordinal === 0) {
      if (
        data.type !== 'header' ||
        !record(data.session) ||
        !record(data.runRoots) ||
        !record(data.rowMetadata) ||
        !Array.isArray(data.uploadMessages) ||
        data.uploadMessages.some((value) => !record(value))
      )
        invalid()
      header = data
      const source = sessionRecordFrom({
        version: 2,
        session: { ...record(data.session), messages: [] }
      })
      session = parseExtractedSession(source, slug, extractedBaseUrl, record(data.runRoots)).session
      const markers: NonNullable<UseCaseSession['rowMetadata']> = Object.create(null)
      for (const [id, value] of Object.entries(record(data.rowMetadata) ?? {})) {
        const marker = record(value)
        if (
          !marker ||
          typeof marker.turnFinal !== 'boolean' ||
          (marker.reviewerState !== undefined &&
            !['completed', 'failed'].includes(String(marker.reviewerState)))
        )
          invalid()
        markers[id] = {
          turnFinal: marker.turnFinal as boolean,
          reviewerState: marker.reviewerState as 'completed' | 'failed' | undefined
        }
      }
      session.rowMetadata = markers
      emit?.({ type: 'start', session: { ...session, items: [] } })
    } else {
      if (
        !session ||
        !header ||
        data.type !== 'block' ||
        data.seq !== ordinal - 1 ||
        !Array.isArray(data.messages) ||
        !Array.isArray(data.activities) ||
        !Array.isArray(data.runs)
      )
        invalid()
      const source = sessionRecordFrom({
        version: 2,
        session: {
          ...record(header.session),
          messages: data.messages,
          conversationGraph: { activities: data.activities }
        }
      })
      const parsed = parseExtractedSession(
        source,
        slug,
        extractedBaseUrl,
        {
          ...record(header.runRoots),
          runs: data.runs
        },
        undefined,
        header.uploadMessages as Record<string, unknown>[]
      )
      if (parsed.session.items.length !== 1) invalid()
      let item = parsed.session.items[0]
      if (item.type !== data.kind || ids.has(item.id)) invalid()
      if (item.type === 'message' && !session.rowMetadata?.[item.id]) invalid()
      ids.add(item.id)
      // Every per-block normalization starts local resource IDs at zero. Make them global
      // before handing off Blobs, without rewriting the source export or displayed text.
      const mapping = new Map(
        parsed.resources.map((resource, i) => [
          resource.id,
          `science-asset:${resources.length + i}`
        ])
      )
      const remap = (value: unknown): unknown => {
        if (typeof value === 'string')
          return value.replace(/science-asset:\d+/g, (id) => mapping.get(id) ?? id)
        if (Array.isArray(value)) return value.map(remap)
        if (value && typeof value === 'object')
          return Object.fromEntries(
            Object.entries(value).map(([key, entry]) => [key, remap(entry)])
          )
        return value
      }
      item = remap(item) as TranscriptItem
      const added = parsed.resources.map((resource) => ({
        ...resource,
        id: mapping.get(resource.id) ?? invalid()
      }))
      resources.push(...added)
      session.items.push(item)
      emit?.({ type: 'block', item, resources: added })
    }
    ordinal++
    parts = []
    length = 0
    digest = new Sha256()
  }
  try {
    for (;;) {
      const next = await reader.read()
      if (next.done) break
      let start = 0
      for (let i = 0; i <= next.value.length; i++) {
        if (i !== next.value.length && next.value[i] !== 10) continue
        const part = next.value.subarray(start, i)
        if (part.length) {
          length += part.length
          if (!expected[ordinal] || length > expected[ordinal].bytes) invalid()
          parts.push(part)
          digest.update(part)
        }
        if (i < next.value.length) finishLine()
        start = i + 1
      }
    }
    if (length || ordinal !== expected.length || !session || !header) invalid()
    return {
      session,
      resources,
      sessionSha256: index.sessionSha256,
      runRoots: record(header.runRoots)
    }
  } finally {
    await reader.cancel().catch(() => {})
    reader.releaseLock()
  }
}
