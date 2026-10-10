import type { UseCasePackage } from '../use-case-types'
import { Sha256 } from './sha256'

export type PackageStage = 'metadata' | 'downloading' | 'verifying' | 'parsing'
export type PackageProgress = { stage: PackageStage; loaded?: number; total?: number }
export type ArchiveEntry = { blob: Blob; checksum: string }
const ENTRY_PATH =
  /^(manifest\.json|session\.json|records\.json|ro-crate-metadata\.json|README\.md|objects\/[a-f0-9]{64})$/
// Bound untrusted decompression and JSON allocations while allowing the 650 MiB release.
export const MAX_ARCHIVE_BYTES = 1024 ** 3
const MAX_EXPANDED_BYTES = 2 * 1024 ** 3
const MAX_JSON_BYTES = 128 * 1024 ** 2

export async function downloadPackage(
  info: UseCasePackage,
  progress: (value: PackageProgress) => void,
  signal?: AbortSignal
): Promise<Blob> {
  if (
    !Number.isSafeInteger(info.sizeBytes) ||
    info.sizeBytes <= 0 ||
    info.sizeBytes > MAX_ARCHIVE_BYTES
  )
    throw new Error('Package size is invalid or exceeds the 1 GiB browser limit.')
  if (!/^[a-f0-9]{64}$/i.test(info.sha256))
    throw new Error('Package SHA-256 is missing or invalid.')
  progress({ stage: 'downloading', loaded: 0 })
  let response: Response
  try {
    response = await fetch(info.url, { mode: 'cors', credentials: 'omit', signal })
  } catch (error) {
    if (signal?.aborted) throw error
    throw new Error(
      'Package download failed. Check your connection and the download host’s CORS permissions.'
    )
  }
  if (!response.ok || !response.body)
    throw new Error(`Package download failed (HTTP ${response.status}).`)
  const contentLength = Number(response.headers.get('content-length'))
  const total =
    Number.isSafeInteger(contentLength) &&
    contentLength > 0 &&
    !response.headers.get('content-encoding')
      ? contentLength
      : undefined
  const hash = new Sha256()
  let loaded = 0
  let lastUpdate = 0
  const stream = response.body.pipeThrough(
    new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, controller) {
        loaded += chunk.byteLength
        if (loaded > info.sizeBytes || loaded > MAX_ARCHIVE_BYTES)
          throw new Error('Downloaded package exceeds its declared size.')
        hash.update(chunk)
        controller.enqueue(chunk)
        if (performance.now() - lastUpdate > 100) {
          progress({ stage: 'downloading', loaded, total })
          lastUpdate = performance.now()
        }
      }
    })
  )
  // Blob storage avoids a concatenated archive-sized buffer and supports streaming decompression.
  const archive = await new Response(stream).blob()
  progress({ stage: 'downloading', loaded, total })
  progress({ stage: 'verifying' })
  if (loaded !== info.sizeBytes)
    throw new Error('Downloaded package size does not match the manifest.')
  if (hash.hex() !== info.sha256.toLowerCase())
    throw new Error(
      'Package SHA-256 verification failed. The downloaded file differs from the manifest.'
    )
  return archive
}

export async function readArchive(archive: Blob): Promise<Map<string, ArchiveEntry>> {
  const reader = archive.stream().pipeThrough(new DecompressionStream('gzip')).getReader()
  let pending = new Uint8Array(0)
  let offset = 0
  let expanded = 0
  const take = async (size: number): Promise<Uint8Array[]> => {
    const parts: Uint8Array[] = []
    while (size > 0) {
      if (offset === pending.length) {
        const next = await reader.read()
        if (next.done) throw new Error('The package archive is truncated.')
        pending = next.value
        offset = 0
        expanded += pending.length
        if (expanded > MAX_EXPANDED_BYTES)
          throw new Error('Expanded package exceeds the 2 GiB browser limit.')
      }
      const count = Math.min(size, pending.length - offset)
      parts.push(pending.subarray(offset, offset + count))
      offset += count
      size -= count
    }
    return parts
  }
  const text = (header: Uint8Array, start: number, length: number) =>
    new TextDecoder()
      .decode(header.subarray(start, start + length))
      .replace(/\0.*$/, '')
      .trim()
  const entries = new Map<string, ArchiveEntry>()
  try {
    for (;;) {
      const header = new Uint8Array(await new Blob((await take(512)) as BlobPart[]).arrayBuffer())
      if (header.every((byte) => byte === 0)) {
        // Drain gzip to validate its trailer and reject nonzero data after the tar terminator.
        if (pending.subarray(offset).some((byte) => byte !== 0))
          throw new Error('Unexpected data after archive end.')
        for (;;) {
          const next = await reader.read()
          if (next.done) break
          expanded += next.value.length
          if (expanded > MAX_EXPANDED_BYTES || next.value.some((byte) => byte !== 0))
            throw new Error('Invalid archive trailer.')
        }
        break
      }
      const name = text(header, 0, 100)
      if (!ENTRY_PATH.test(name) || text(header, 345, 155) || ![0, 48].includes(header[156]))
        throw new Error(`Unsupported archive entry: ${name}`)
      if (entries.has(name) || entries.size >= 20000)
        throw new Error('Duplicate entry or too many files in package.')
      const sizeText = text(header, 124, 12)
      const size = Number.parseInt(sizeText, 8)
      if (
        !/^[0-7]+$/.test(sizeText) ||
        !Number.isSafeInteger(size) ||
        size < 0 ||
        size > MAX_EXPANDED_BYTES
      )
        throw new Error(`Invalid archive size: ${name}`)
      const checksum = header.reduce(
        (sum, byte, index) => sum + (index >= 148 && index < 156 ? 32 : byte),
        0
      )
      if (checksum !== Number.parseInt(text(header, 148, 8), 8))
        throw new Error(`Invalid tar header checksum: ${name}`)
      const hash = new Sha256()
      let remaining = size
      const body = new ReadableStream<Uint8Array>({
        async pull(controller) {
          try {
            if (remaining === 0) {
              controller.close()
              return
            }
            const count = Math.min(remaining, 64 * 1024)
            for (const part of await take(count)) {
              hash.update(part)
              controller.enqueue(part)
            }
            remaining -= count
          } catch (error) {
            controller.error(error)
          }
        }
      })
      const blob = await new Response(body).blob()
      entries.set(name, { blob, checksum: hash.hex() })
      await take((512 - (size % 512)) % 512)
    }
    return entries
  } finally {
    await reader.cancel().catch(() => {})
    reader.releaseLock()
  }
}

export async function readJson<T>(entry: ArchiveEntry | undefined, name: string): Promise<T> {
  if (!entry) throw new Error(`Package is missing ${name}.`)
  if (entry.blob.size > MAX_JSON_BYTES) throw new Error(`${name} exceeds the 128 MiB JSON limit.`)
  try {
    return JSON.parse(await entry.blob.text()) as T
  } catch {
    throw new Error(`Invalid JSON in ${name}.`)
  }
}
