import type { UseCasePackage } from '../use-case-types'
import { type ArchiveEntry, downloadPackage, type PackageProgress, readJson } from './archive'
import { type Manifest, parsePackage, parsePackageObjects, validateManifest } from './parse'
import { Sha256 } from './sha256'

const MAX_METADATA_BYTES = 128 * 1024 ** 2

// Bound streamed JSON reads before allocating the full body, just like archive JSON entries.
const fetchMetadata = async (
  base: string,
  path: string,
  optional = false
): Promise<ArchiveEntry | null> => {
  const response = await fetch(new URL(path, base), {
    mode: 'cors',
    credentials: 'omit',
    signal: AbortSignal.timeout(30_000)
  })
  // S3 can return 403 for a missing object when bucket listing is disabled.
  if (optional && [403, 404].includes(response.status)) return null
  if (!response.ok || !response.body)
    throw new Error(`Session metadata download failed (HTTP ${response.status}).`)
  let size = 0
  const hash = new Sha256()
  const stream = response.body.pipeThrough(
    new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, controller) {
        size += chunk.byteLength
        if (size > MAX_METADATA_BYTES)
          throw new Error('Session metadata exceeds the browser limit.')
        hash.update(chunk)
        controller.enqueue(chunk)
      }
    })
  )
  const blob = await new Response(stream).blob()
  return { blob, checksum: hash.hex() }
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
    const session = await fetchMetadata(base.href, 'session.json', true)
    if (session) {
      const manifestFile = await fetchMetadata(base.href, 'manifest.json')
      if (!manifestFile) throw new Error('Missing package manifest.')
      const manifest = await readJson<Manifest>(manifestFile, 'manifest.json')
      validateManifest(manifest)
      const objects = new Map<string, ArchiveEntry>([
        ['session.json', session],
        ['manifest.json', manifestFile]
      ])
      // Records supply original filenames; notebook metadata supplies execution outputs.
      const run = manifest.inventory.find((entry) => entry.storageKey?.endsWith('/run.json'))
      const paths = new Set([
        ...(manifest.inventory.some((entry) => entry.path === 'records.json')
          ? ['records.json']
          : []),
        ...(run ? [run.path] : [])
      ])
      await Promise.all(
        [...paths].map(async (path) => {
          const file = await fetchMetadata(base.href, path)
          if (file) objects.set(path, file)
        })
      )
      progress({ stage: 'parsing' })
      return parsePackageObjects(objects, slug, base.href)
    }
  }
  // Old publications remain readable, with their original size and SHA-256 checks.
  const archive = await downloadPackage(info, progress)
  progress({ stage: 'parsing' })
  return parsePackage(archive, slug)
}
