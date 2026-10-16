/**
 * Import an open-science session package (`.science`, gzip tar) into static site data.
 *
 * Usage:
 *   bun run scripts/import-session-package.ts
 *     Import every `.science` file in `session-packages/`; the file name
 *     (minus extension) becomes the case slug and its URL segment.
 *   bun run scripts/import-session-package.ts <path-to.science> <slug>
 *     Import a single package from an arbitrary path.
 *
 * Outputs:
 *   public/use-cases/index.json            list-page metadata (upserted in place)
 *   public/use-cases/<slug>/detail.json    detail-page metadata: cover, figure count, report
 *                                          (markdown content + original file)
 *   public/use-cases/<slug>/essential.json SSR tier: full conversation, shortened payloads,
 *                                          small assets only
 *   public/use-cases/<slug>/full.json      on-demand tier: everything (replay page only)
 *   public/use-cases/<slug>/objects/<sha>  referenced file blobs (both tiers share these)
 *   public/use-cases/<slug>/figures/*.png  notebook figure outputs
 *
 * The importer verifies the manifest checksums, refuses unknown schema
 * versions, sanitizes local absolute paths, and resolves file references so
 * the renderer never needs to understand the package layout.
 */
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { basename, join } from 'node:path'
import { gunzipSync } from 'node:zlib'
import { Parser as TarParser } from 'tar'
import { matchToolName } from '../app/(commonLayout)/open-science/use-cases/_components/notebook-tool-names'
import { encodeAssetFilename } from '../lib/science-package/parse'
import type {
  MessageAnnotation,
  MessageArtifact,
  MessageUpload,
  NormalizedActivity,
  NormalizedOutput,
  NormalizedRun,
  TranscriptItem,
  UseCaseAsset,
  UseCaseDetail,
  UseCaseIndexEntry,
  UseCaseSession
} from '../lib/use-case-types'

// ---------------------------------------------------------------------------
// Package reading + verification
// ---------------------------------------------------------------------------

const ENTRY_PATH =
  /^(manifest\.json|session\.json|records\.json|ro-crate-metadata\.json|README\.md|objects\/[a-f0-9]{64})$/

interface PackageFiles {
  manifest: Manifest
  sessionFile: { version: number; session: SessionRecord }
  records?: RecordsFile
  objects: Map<string, Buffer> // objects/<sha> name -> bytes
}

interface ManifestInventoryEntry {
  path: string
  sizeBytes: number
  checksum: string
  storageKey?: string
  kind: string
}

interface Manifest {
  format: string
  schemaVersion: number
  requiredFeatures?: string[]
  createdAt: number
  source: { projectId: string; sessionId: string; projectName: string; title: string }
  inventory: ManifestInventoryEntry[]
  excludedFiles: { storageKey: string; filename: string; sizeBytes: number }[]
  omissions: { kind: string; description: string }[]
}

type JsonObject = Record<string, unknown>

interface SessionRecord extends JsonObject {
  title: string
  description?: string
  createdAt: number
  messages: JsonObject[]
  conversationGraph?: { activities?: JsonObject[] }
  artifacts?: JsonObject[]
}

interface RecordsFile extends JsonObject {
  tables: Record<string, JsonObject[]>
}

const sha256hex = (input: Buffer | string): string =>
  createHash('sha256').update(input).digest('hex')

function fail(message: string): never {
  console.error(`import-session-package: ${message}`)
  process.exit(1)
}

const readPackage = (archivePath: string): PackageFiles => {
  const tarBytes = gunzipSync(readFileSync(archivePath))
  const entries = new Map<string, Buffer>()
  const parser = new TarParser({
    onReadEntry: (entry) => {
      const chunks: Buffer[] = []
      entry.on('data', (chunk: Buffer) => chunks.push(chunk))
      entry.on('end', () => {
        entries.set(entry.path, Buffer.concat(chunks))
      })
    }
  })
  parser.end(tarBytes)

  for (const name of entries.keys()) {
    if (!ENTRY_PATH.test(name)) fail(`unexpected archive entry: ${name}`)
  }

  const manifestRaw = entries.get('manifest.json')
  const sessionRaw = entries.get('session.json')
  if (!manifestRaw || !sessionRaw) fail('archive is missing manifest.json or session.json')

  const manifest = JSON.parse(manifestRaw.toString('utf8')) as Manifest
  if (manifest.format !== 'open-science-session')
    fail(`unsupported package format: ${String(manifest.format)}`)
  if (manifest.schemaVersion !== 1)
    fail(`unsupported manifest schemaVersion: ${String(manifest.schemaVersion)}`)
  const supportedFeatures = new Set(['literature', 'ro-crate'])
  for (const feature of manifest.requiredFeatures ?? []) {
    if (!supportedFeatures.has(feature)) fail(`unsupported required feature: ${feature}`)
  }

  const objects = new Map<string, Buffer>()
  for (const entry of manifest.inventory) {
    if (entry.path.startsWith('objects/')) {
      const bytes = entries.get(entry.path)
      if (!bytes) fail(`inventory entry missing from archive: ${entry.path}`)
      objects.set(entry.path, bytes)
    }
  }

  // Verify every inventory entry against the archived bytes.
  for (const entry of manifest.inventory) {
    const bytes = entries.get(entry.path)
    if (!bytes) fail(`inventory entry missing from archive: ${entry.path}`)
    if (bytes.byteLength !== entry.sizeBytes)
      fail(`size mismatch for ${entry.path}: ${bytes.byteLength} != ${entry.sizeBytes}`)
    if (sha256hex(bytes) !== entry.checksum) fail(`checksum mismatch for ${entry.path}`)
  }

  const sessionFile = JSON.parse(sessionRaw.toString('utf8')) as PackageFiles['sessionFile']
  if (sessionFile.version !== 2) fail(`unsupported session.json version: ${sessionFile.version}`)

  const recordsRaw = entries.get('records.json')
  return {
    manifest,
    sessionFile,
    records: recordsRaw ? (JSON.parse(recordsRaw.toString('utf8')) as RecordsFile) : undefined,
    objects
  }
}

// ---------------------------------------------------------------------------
// Path sanitization — the package keeps local absolute paths in tool payloads
// ---------------------------------------------------------------------------

const buildSanitizer = (session: SessionRecord, runDocument: JsonObject | undefined) => {
  const prefixes: string[] = []
  const cwd = typeof session.cwd === 'string' ? session.cwd : ''
  if (cwd.startsWith('/')) prefixes.push(cwd)
  for (const key of ['notebookSessionRoot', 'dataRoot', 'workspaceCwd']) {
    const value = runDocument?.[key]
    if (typeof value === 'string' && value.startsWith('/')) prefixes.push(value)
  }
  const sanitize = (text: string): string => {
    let out = text
    for (const prefix of prefixes.sort((a, b) => b.length - a.length)) {
      out = out.split(prefix).join('$DATA')
    }
    // Scrub any remaining home-directory paths.
    return out.replace(/\/Users\/[^/"]+\//g, '/Users/***/')
  }
  const deep = (value: unknown): unknown => {
    if (typeof value === 'string') return sanitize(value)
    if (Array.isArray(value)) return value.map(deep)
    if (value && typeof value === 'object') {
      return Object.fromEntries(Object.entries(value as JsonObject).map(([k, v]) => [k, deep(v)]))
    }
    return value
  }
  return { sanitize, deep }
}

// ---------------------------------------------------------------------------
// Blob selection — only copy what the renderer can reference
// ---------------------------------------------------------------------------

// MIME types for bundled extra files (drives the table's Type column and the
// preview dialog's sniffing; preview itself falls back to the extension).
const EXTRA_MIME_BY_EXT: Record<string, string> = {
  pdf: 'application/pdf',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  svg: 'image/svg+xml',
  webp: 'image/webp',
  md: 'text/markdown',
  csv: 'text/csv',
  json: 'application/json',
  txt: 'text/plain',
  zip: 'application/zip',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
}

const SKIP_BLOB = [
  /\/\.provenance\/message-snapshots\//,
  /\/\.provenance\/[^/]+\/versions\/[^/]+\/(evidence|execution)\.json$/,
  /\/cache\//,
  /\/run\.json$/,
  /^execution-file-evidence\//
]

// Extensions the static server can serve with a displayable Content-Type.
const SAFE_OBJECT_EXTENSIONS = new Set([
  'png',
  'jpg',
  'jpeg',
  'gif',
  'svg',
  'webp',
  'pdf',
  'md',
  'markdown',
  'csv',
  'json',
  'txt',
  'log',
  'py',
  'js',
  'ts',
  'tsx',
  'r',
  'sh',
  'yaml',
  'yml',
  'toml',
  'xml',
  'html'
])

// Essential-tier limits: blobs larger than this ship only in the full tier, and
// any single string longer than this is shortened with a visible marker.
const ESSENTIAL_ASSET_MAX_BYTES = 2 * 1024 ** 2
const ESSENTIAL_TEXT_MAX_CHARS = 24 * 1024
const ESSENTIAL_TRUNCATION_MARK =
  '\n… [shortened in the essential view — load the full version for the complete payload]'

const hasOversizedString = (value: unknown): boolean => {
  if (typeof value === 'string') return value.length > ESSENTIAL_TEXT_MAX_CHARS
  if (Array.isArray(value)) return value.some(hasOversizedString)
  if (value && typeof value === 'object') {
    return Object.values(value as JsonObject).some(hasOversizedString)
  }
  return false
}

const truncateOversizedStrings = (value: unknown): unknown => {
  if (typeof value === 'string') {
    return value.length > ESSENTIAL_TEXT_MAX_CHARS
      ? value.slice(0, ESSENTIAL_TEXT_MAX_CHARS) + ESSENTIAL_TRUNCATION_MARK
      : value
  }
  if (Array.isArray(value)) return value.map(truncateOversizedStrings)
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as JsonObject).map(([key, entry]) => [
        key,
        truncateOversizedStrings(entry)
      ])
    )
  }
  return value
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const importOne = (archivePath: string, slug: string): void => {
  const pkg = readPackage(archivePath)
  const { manifest } = pkg
  const session = pkg.sessionFile.session

  const outPublicDir = join('public', 'use-cases', slug)
  const outObjectsDir = join(outPublicDir, 'objects')
  const outFiguresDir = join(outPublicDir, 'figures')
  rmSync(outPublicDir, { recursive: true, force: true })
  mkdirSync(outObjectsDir, { recursive: true })
  mkdirSync(outFiguresDir, { recursive: true })

  // --- assets: storageKey -> public url -----------------------------------
  // Blob names carry a real extension (resolved from records.json or the
  // storage key) so the static server returns a displayable Content-Type
  // instead of application/octet-stream for images and documents.
  const filenameByStorageKey = new Map<string, string>()
  for (const table of ['ArtifactVersion', 'UploadVersion'] as const) {
    for (const row of pkg.records?.tables[table] ?? []) {
      const key = row.contentStorageKey
      const filename = row.filename ?? row.originalFilename
      if (typeof key === 'string' && typeof filename === 'string') {
        filenameByStorageKey.set(key, filename)
      }
    }
  }
  const objectNameFor = (storageKey: string, objectPath: string): string => {
    const sha = basename(objectPath)
    const filename = filenameByStorageKey.get(storageKey) ?? storageKey.split('/').pop() ?? ''
    const ext = filename.includes('.') ? filename.split('.').pop()?.toLowerCase() : undefined
    return ext && SAFE_OBJECT_EXTENSIONS.has(ext) ? `${sha}.${ext}` : sha
  }
  const assets: Record<string, UseCaseAsset> = {}
  for (const entry of manifest.inventory) {
    const storageKey = entry.storageKey
    if (!storageKey) continue
    if (SKIP_BLOB.some((pattern) => pattern.test(storageKey))) continue
    const bytes = pkg.objects.get(entry.path)
    if (!bytes) continue
    const objectName = objectNameFor(storageKey, entry.path)
    writeFileSync(join(outObjectsDir, objectName), bytes)
    assets[storageKey] = {
      url: `/use-cases/${slug}/objects/${objectName}`,
      filename: filenameByStorageKey.get(storageKey) ?? storageKey.split('/').pop() ?? objectName,
      sizeBytes: entry.sizeBytes,
      kind: entry.kind
    }
  }

  // --- notebook run document ----------------------------------------------
  const runEntry = manifest.inventory.find((e) => e.storageKey?.endsWith('/run.json'))
  const runDocument = runEntry
    ? (JSON.parse((pkg.objects.get(runEntry.path) as Buffer).toString('utf8')) as JsonObject)
    : undefined
  const { sanitize, deep } = buildSanitizer(session, runDocument)

  // Correlate notebook runs by executionInvocationId; extract base64 figures.
  const runsByInvocation = new Map<string, NormalizedRun>()
  let figureIndex = 0
  for (const run of (runDocument?.runs as JsonObject[] | undefined) ?? []) {
    const invocationId = run.executionInvocationId
    if (typeof invocationId !== 'string') continue
    const outputs: NormalizedOutput[] = []
    for (const output of (run.outputs as JsonObject[] | undefined) ?? []) {
      const normalized = { ...(deep(output) as NormalizedOutput) }
      const image = normalized.data?.['image/png']
      if (image && !image.startsWith('/')) {
        figureIndex += 1
        const filename = `figure-${String(figureIndex).padStart(2, '0')}.png`
        writeFileSync(join(outFiguresDir, filename), Buffer.from(image, 'base64'))
        normalized.data = {
          ...normalized.data,
          'image/png': `/use-cases/${slug}/figures/${filename}`
        }
      }
      outputs.push(normalized)
    }
    runsByInvocation.set(invocationId, {
      runId: String(run.runId ?? ''),
      status: String(run.status ?? ''),
      script: typeof run.script === 'string' ? sanitize(run.script) : undefined,
      text: typeof run.text === 'string' ? sanitize(run.text) : undefined,
      cellId: typeof run.cellId === 'string' ? run.cellId : undefined,
      startedAt: typeof run.startedAt === 'number' ? run.startedAt : undefined,
      endedAt: typeof run.endedAt === 'number' ? run.endedAt : undefined,
      outputs
    })
  }

  // --- activities ------------------------------------------------------------
  const graphActivities = pkg.sessionFile.session.conversationGraph?.activities ?? []
  const activityItems: { ts: number; item: TranscriptItem }[] = []
  for (const activity of graphActivities) {
    // sortIndex is trustworthy only on an epoch scale (see parse.ts): small
    // sequence numbers would sort every activity ahead of all messages.
    const ts =
      typeof activity.sortIndex === 'number' && activity.sortIndex > 1_000_000_000_000
        ? activity.sortIndex
        : Number(activity.createdAt)
    // Keep in sync with lib/science-package/parse.ts: step updates never render
    // (their state lives in the plan card), generate_plan is a standalone item.
    const activityNames = [activity.providerToolName, activity.title]
    if (
      activityNames.some(
        (name) =>
          typeof name === 'string' && matchToolName(name, 'open-science-plan', 'update_step_status')
      )
    ) {
      continue
    }
    const elicitation = activity.elicitation as JsonObject | undefined
    if (elicitation) {
      activityItems.push({
        ts,
        item: {
          type: 'elicitation',
          id: String(activity.id),
          message: sanitize(String(elicitation.message ?? '')),
          fields: (deep(elicitation.fields) as unknown[]) ?? [],
          status: String(activity.status ?? 'completed'),
          createdAt: Number(activity.createdAt),
          state: typeof elicitation.state === 'string' ? elicitation.state : undefined,
          answers: deep(elicitation.answers) as { fieldId: string; value: unknown }[] | undefined,
          respondedAt:
            typeof elicitation.respondedAt === 'number' ? elicitation.respondedAt : undefined
        }
      })
      continue
    }
    const invocationId =
      typeof activity.executionInvocationId === 'string'
        ? activity.executionInvocationId
        : undefined
    const normalized: NormalizedActivity = {
      id: String(activity.id),
      title: sanitize(String(activity.title ?? '')),
      providerToolName:
        typeof activity.providerToolName === 'string' ? activity.providerToolName : undefined,
      toolKind: typeof activity.toolKind === 'string' ? activity.toolKind : undefined,
      status: String(activity.status ?? 'completed'),
      toolDisposition:
        typeof activity.toolDisposition === 'string' ? activity.toolDisposition : undefined,
      createdAt: Number(activity.createdAt),
      updatedAt: Number(activity.updatedAt),
      input: deep(activity.rawInput),
      output: deep(activity.rawOutput),
      contentBlocks: deep(activity.toolContent) as unknown[] | undefined,
      locations: deep(activity.toolLocations) as NormalizedActivity['locations'],
      run: invocationId ? runsByInvocation.get(invocationId) : undefined,
      executionInvocationId: invocationId
    }
    const isGeneratePlan = activityNames.some(
      (name) =>
        typeof name === 'string' && matchToolName(name, 'open-science-plan', 'generate_plan')
    )
    activityItems.push({
      ts,
      item: isGeneratePlan
        ? { type: 'plan', id: normalized.id, activity: normalized }
        : { type: 'activity-group', id: normalized.id, activities: [normalized] }
    })
  }

  // --- session-level artifacts (cards below messages) ------------------------
  // Each assistant message lists the artifact version ids it produced; the app
  // pins the cards to that message, so resolve per-message instead of lumping
  // everything onto the final one.
  const sessionArtifacts: MessageArtifact[] = []
  const artifactByVersionId = new Map<string, MessageArtifact>()
  for (const artifact of session.artifacts ?? []) {
    const storageKey =
      typeof artifact.path === 'string' ? artifact.path.replace(/^\$DATA\//, '') : undefined
    const asset = storageKey ? assets[storageKey] : undefined
    const normalized: MessageArtifact = {
      name: String(artifact.name ?? 'file'),
      mimeType: typeof artifact.mimeType === 'string' ? artifact.mimeType : undefined,
      size: typeof artifact.size === 'number' ? artifact.size : undefined,
      url: asset?.url
    }
    sessionArtifacts.push(normalized)
    if (typeof artifact.id === 'string') artifactByVersionId.set(artifact.id, normalized)
  }

  // --- messages ---------------------------------------------------------------
  // Relative markdown links in message content point at workspace files; rewrite
  // them to the exported asset URLs so the web renderer can serve the bytes.
  const assetUrlByFilename = new Map<string, string>()
  for (const [storageKey, asset] of Object.entries(assets)) {
    const filename = storageKey.split('/').pop()
    if (filename && !assetUrlByFilename.has(filename)) assetUrlByFilename.set(filename, asset.url)
  }
  for (const artifact of sessionArtifacts) {
    if (artifact.url) assetUrlByFilename.set(artifact.name, artifact.url)
  }
  const resolveMessageLinks = (content: string): string =>
    content.replace(/\[([^\]]*)\]\(([^)\s]+)\)/g, (match, label: string, href: string) => {
      if (/^([a-z][a-z0-9+.-]*:|\/|#)/i.test(href)) return match
      let filename = href
      try {
        filename = decodeURIComponent(href)
      } catch {
        // keep the raw href when it is not valid percent-encoding
      }
      const url = assetUrlByFilename.get(filename)
      return url ? `[${label}](${url})` : match
    })
  // Optional showcase extras: files dropped in session-packages/<slug>.extra/
  // are bundled as additional assets and pinned to the last assistant message.
  // They survive re-imports (unlike hand-patched output).
  const extraArtifacts: MessageArtifact[] = []
  const extraDir = join('session-packages', `${slug}.extra`)
  if (existsSync(extraDir)) {
    for (const filename of readdirSync(extraDir).sort()) {
      if (filename.startsWith('.')) continue
      const bytes = readFileSync(join(extraDir, filename))
      const ext = filename.includes('.') ? filename.split('.').pop()?.toLowerCase() : undefined
      const objectName =
        ext && SAFE_OBJECT_EXTENSIONS.has(ext)
          ? `${sha256hex(filename)}.${ext}`
          : sha256hex(filename)
      writeFileSync(join(outObjectsDir, objectName), bytes)
      const url = `/use-cases/${slug}/objects/${objectName}`
      assets[`extra/${filename}`] = { url, filename, sizeBytes: bytes.byteLength, kind: 'file' }
      extraArtifacts.push({
        name: filename,
        mimeType: ext ? EXTRA_MIME_BY_EXT[ext] : undefined,
        size: bytes.byteLength,
        url
      })
      assetUrlByFilename.set(filename, url)
    }
  }
  const messageItems: { ts: number; item: TranscriptItem }[] = session.messages.map((message) => {
    const artifactIds = Array.isArray(message.artifactIds)
      ? (message.artifactIds as unknown[]).filter((id): id is string => typeof id === 'string')
      : []
    const messageArtifacts = artifactIds
      .map((id) => artifactByVersionId.get(id))
      .filter((artifact): artifact is MessageArtifact => Boolean(artifact))
    // Keep in sync with lib/science-package/parse.ts: uploads, @-mention parts,
    // and annotation cards. URLs resolve through the exported objects map.
    const uploadContentUrl = (
      projectId: unknown,
      sessionId: unknown,
      fileId: unknown,
      versionId: unknown,
      name: string
    ): string | undefined => {
      if (
        typeof projectId !== 'string' ||
        typeof sessionId !== 'string' ||
        typeof fileId !== 'string' ||
        typeof versionId !== 'string'
      ) {
        return undefined
      }
      const asset =
        assets[`uploads/${projectId}/${sessionId}/${fileId}/versions/${versionId}/content`]
      return asset ? `${asset.url}#${encodeAssetFilename(name)}` : undefined
    }
    const messageUploads = (
      Array.isArray(message.uploads) ? (message.uploads as unknown[]) : []
    ).flatMap((upload): MessageUpload[] => {
      if (!upload || typeof upload !== 'object') return []
      const record = upload as JsonObject
      const name = record.originalName ?? record.name
      if (typeof name !== 'string' || !name) return []
      const versionId = typeof record.versionId === 'string' ? record.versionId : undefined
      return [
        {
          name,
          mimeType: typeof record.mimeType === 'string' ? record.mimeType : undefined,
          size: typeof record.size === 'number' ? record.size : undefined,
          url: uploadContentUrl(session.projectId, session.id, record.id, versionId, name),
          versionId
        }
      ]
    })
    const uploadUrlByVersionId = new Map(
      messageUploads
        .filter((upload) => upload.versionId && upload.url)
        .map((upload) => [upload.versionId as string, upload.url as string])
    )
    const uploadByVersionId = new Map(
      messageUploads
        .filter((upload) => upload.versionId)
        .map((upload) => [upload.versionId as string, upload])
    )
    const partUploads = (Array.isArray(message.parts) ? message.parts : []).flatMap(
      (part): MessageUpload[] => {
        if (!part || typeof part !== 'object') return []
        const record = part as JsonObject
        if (record.type !== 'artifact' || record.source !== 'upload') return []
        const name = record.originalName ?? record.name
        if (typeof name !== 'string' || !name) return []
        const versionId = typeof record.versionId === 'string' ? record.versionId : undefined
        if (versionId && uploadByVersionId.has(versionId)) {
          const existing = uploadByVersionId.get(versionId) as MessageUpload
          existing.mention = true
          existing.partName = typeof record.name === 'string' ? record.name : undefined
          return []
        }
        const path = typeof record.path === 'string' ? record.path : undefined
        const segments = path?.startsWith('upload-version:')
          ? path.slice('upload-version:'.length).split('/')
          : undefined
        let url: string | undefined
        if (segments?.length === 4) {
          try {
            const [projectId, sessionId, fileId, version] = segments.map((segment) =>
              decodeURIComponent(segment)
            )
            url = uploadContentUrl(projectId, sessionId, fileId, version, name)
          } catch {
            // display-only mention
          }
        }
        url ??= versionId ? uploadUrlByVersionId.get(versionId) : undefined
        return [
          {
            name,
            mimeType: typeof record.mimeType === 'string' ? record.mimeType : undefined,
            url,
            mention: true,
            partName: typeof record.name === 'string' ? record.name : undefined
          }
        ]
      }
    )
    const allUploads = [...messageUploads, ...partUploads]
    let imagePointCount = 0
    const messageAnnotations = (
      Array.isArray(message.annotations) ? (message.annotations as unknown[]) : []
    ).flatMap((annotation): MessageAnnotation[] => {
      if (!annotation || typeof annotation !== 'object') return []
      const record = annotation as JsonObject
      const id = typeof record.id === 'string' && record.id ? record.id : undefined
      if (!id) return []
      const note =
        typeof record.note === 'string' && record.note.trim() ? sanitize(record.note) : undefined
      const source = record.source as JsonObject | undefined
      const sourceVersionId =
        source && typeof source === 'object' && typeof source.versionId === 'string'
          ? source.versionId
          : undefined
      const sourceUrl = sourceVersionId ? uploadUrlByVersionId.get(sourceVersionId) : undefined

      if (record.kind === 'text' && typeof record.quote === 'string' && record.quote.trim()) {
        const fileName =
          source && typeof source === 'object' && source.kind === 'project-file'
            ? typeof source.name === 'string'
              ? source.name
              : typeof source.path === 'string'
                ? source.path
                : undefined
            : undefined
        return [
          {
            id,
            kind: 'text',
            content: sanitize(record.quote),
            source: fileName,
            note,
            url: sourceUrl
          }
        ]
      }
      if (record.kind === 'image-point' && source && typeof source === 'object') {
        const point = record.point as JsonObject | undefined
        if (!point || typeof point !== 'object') return []
        imagePointCount += 1
        const naturalSize = record.naturalSize as JsonObject | undefined
        return [
          {
            id,
            kind: 'image-point',
            number: imagePointCount,
            x: typeof point.x === 'number' ? point.x : 0,
            y: typeof point.y === 'number' ? point.y : 0,
            naturalSize:
              naturalSize &&
              typeof naturalSize === 'object' &&
              typeof naturalSize.width === 'number' &&
              typeof naturalSize.height === 'number'
                ? { width: naturalSize.width, height: naturalSize.height }
                : undefined,
            source: typeof source.name === 'string' ? source.name : undefined,
            note: note ?? '',
            url: sourceUrl
          }
        ]
      }
      if (record.kind !== 'pdf') return []
      const selector = record.selector as JsonObject | undefined
      if (!selector || typeof selector !== 'object' || !source || typeof source !== 'object') {
        return []
      }
      const name = typeof source.name === 'string' ? source.name : 'PDF'
      const page = typeof selector.pageNumber === 'number' ? selector.pageNumber : undefined
      const sourceLabel = `${name}${page ? ` · Page ${page}` : ''}`
      if (selector.kind === 'text' && typeof selector.exact === 'string' && selector.exact.trim()) {
        return [
          {
            id,
            kind: 'quote',
            source: sourceLabel,
            content: sanitize(selector.exact),
            note,
            url: sourceUrl
          }
        ]
      }
      if (selector.kind === 'region') {
        const selectorImage = selector.image as JsonObject | undefined
        const image =
          selectorImage &&
          typeof selectorImage === 'object' &&
          typeof selectorImage.mimeType === 'string' &&
          typeof selectorImage.data === 'string'
            ? { mimeType: selectorImage.mimeType, data: selectorImage.data }
            : undefined
        return [
          {
            id,
            kind: 'area',
            source: sourceLabel,
            content:
              typeof selector.text === 'string' && selector.text.trim()
                ? sanitize(selector.text)
                : 'Selected area',
            image,
            ...(!image && selector.imageOmissionReason === 'session-budget'
              ? { imageOmitted: true as const }
              : {}),
            note,
            url: sourceUrl
          }
        ]
      }
      return []
    })
    return {
      ts: Number(message.createdAt),
      item: {
        type: 'message',
        id: String(message.id),
        role: message.role === 'user' ? 'user' : 'assistant',
        content: resolveMessageLinks(sanitize(String(message.content ?? ''))),
        status: String(message.status ?? 'complete'),
        createdAt: Number(message.createdAt),
        completedAt: typeof message.completedAt === 'number' ? message.completedAt : undefined,
        parts: deep(message.parts) as unknown[] | undefined,
        artifacts: messageArtifacts.length > 0 ? messageArtifacts : undefined,
        uploads: allUploads.length > 0 ? allUploads : undefined,
        annotations: messageAnnotations.length > 0 ? messageAnnotations : undefined
      }
    }
  })

  if (extraArtifacts.length > 0) {
    for (let index = messageItems.length - 1; index >= 0; index--) {
      const entry = messageItems[index].item
      if (entry.type === 'message' && entry.role === 'assistant') {
        entry.artifacts = [...(entry.artifacts ?? []), ...extraArtifacts]
        break
      }
    }
  }

  // --- timeline: merge by timestamp, fold consecutive activities into groups ---
  const merged = [...messageItems, ...activityItems].sort((a, b) => a.ts - b.ts)
  const items: TranscriptItem[] = []
  for (const { item } of merged) {
    const last = items[items.length - 1]
    if (item.type === 'activity-group' && last?.type === 'activity-group') {
      last.activities.push(...item.activities)
    } else {
      items.push(item)
    }
  }

  const model: UseCaseSession = {
    schemaVersion: 1,
    slug,
    title: sanitize(manifest.source.title || session.title),
    description: session.description ? sanitize(session.description) : undefined,
    projectName: manifest.source.projectName,
    exportedAt: manifest.createdAt,
    sessionCreatedAt: Number(session.createdAt),
    items,
    assets,
    omissions: (manifest.omissions ?? []).map((o) => sanitize(o.description)),
    excludedFiles: manifest.excludedFiles ?? []
  }

  // --- two tiers: essential (SSR default) and full (loaded on demand) ---------
  // The essential tier keeps the whole conversation but shortens oversized tool
  // payloads and drops large file blobs, so the first page load stays small.
  const essentialAssetUrls = new Set(
    Object.values(assets)
      .filter((asset) => asset.sizeBytes <= ESSENTIAL_ASSET_MAX_BYTES)
      .map((asset) => asset.url)
  )
  const fullOnlyAssetBytes = Object.values(assets)
    .filter((asset) => asset.sizeBytes > ESSENTIAL_ASSET_MAX_BYTES)
    .reduce((sum, asset) => sum + asset.sizeBytes, 0)

  let truncatedActivityCount = 0
  const truncateActivity = (activity: NormalizedActivity): NormalizedActivity => {
    const truncated = hasOversizedString([
      activity.input,
      activity.output,
      activity.contentBlocks,
      activity.run
    ])
    if (!truncated) return activity
    truncatedActivityCount += 1
    return {
      ...activity,
      input: truncateOversizedStrings(activity.input) as NormalizedActivity['input'],
      output: truncateOversizedStrings(activity.output) as NormalizedActivity['output'],
      contentBlocks: truncateOversizedStrings(
        activity.contentBlocks
      ) as NormalizedActivity['contentBlocks'],
      run: truncateOversizedStrings(activity.run) as NormalizedActivity['run'],
      essentialTruncated: true
    }
  }
  const essentialItems: TranscriptItem[] = items.map((item) => {
    if (item.type === 'message') {
      if (!item.artifacts?.length) return item
      return {
        ...item,
        artifacts: item.artifacts.map((artifact) => {
          const inEssential = Boolean(
            artifact.url && essentialAssetUrls.has(artifact.url as string)
          )
          return {
            ...artifact,
            url: inEssential ? artifact.url : undefined,
            // A file that exists in the full tier but exceeds the essential
            // asset budget is "full only"; files missing from both tiers
            // (excluded at export time) get no marker.
            fullOnly: Boolean(artifact.url) && !inEssential ? true : undefined
          }
        })
      }
    }
    if (item.type === 'plan') return { ...item, activity: truncateActivity(item.activity) }
    if (item.type !== 'activity-group') return item
    return {
      ...item,
      activities: item.activities.map(truncateActivity)
    }
  })
  const essentialAssets = Object.fromEntries(
    Object.entries(assets).filter(([, asset]) => essentialAssetUrls.has(asset.url))
  )
  const hasFull = truncatedActivityCount > 0 || fullOnlyAssetBytes > 0
  const essentialModel: UseCaseSession = {
    ...model,
    items: essentialItems,
    assets: essentialAssets,
    omissions: hasFull
      ? [
          ...model.omissions,
          'Large tool payloads and files over 2 MiB are shortened in the essential view; load the full version for everything.'
        ]
      : model.omissions
  }

  const fullJson = JSON.stringify(model)
  writeFileSync(join(outPublicDir, 'full.json'), fullJson)
  writeFileSync(join(outPublicDir, 'essential.json'), JSON.stringify(essentialModel))
  const fullSizeBytes = Buffer.byteLength(fullJson) + fullOnlyAssetBytes

  // --- list-page index ---------------------------------------------------------
  const indexPath = join('public', 'use-cases', 'index.json')
  const index: UseCaseIndexEntry[] = existsSync(indexPath)
    ? (JSON.parse(readFileSync(indexPath, 'utf8')) as UseCaseIndexEntry[])
    : []
  // Curated fields (category / preview.image / report) are edited by hand in
  // index.json; re-importing a package must refresh computed fields without
  // dropping them.
  const existing = index.find((e) => e.slug === slug)
  const entry: UseCaseIndexEntry = {
    slug,
    title: model.title,
    description: model.description,
    exportedAt: model.exportedAt,
    ...(existing?.category ? { category: existing.category } : {}),
    ...(existing?.preview?.image ? { preview: { image: existing.preview.image } } : {}),
    ...(existing?.report ? { report: existing.report } : {})
  }
  // Upsert in place: the index order is curated by hand, so re-importing a
  // package must not reshuffle it; new slugs append at the end.
  const next = existing ? index.map((e) => (e.slug === slug ? entry : e)) : [...index, entry]
  mkdirSync(join('public', 'use-cases'), { recursive: true })
  writeFileSync(indexPath, `${JSON.stringify(next, null, 2)}\n`)

  // --- detail-page payload ---------------------------------------------------
  // Split at import time (the CDN pipeline does the same ahead of upload): the
  // cover image and the report — rendered markdown content plus the original
  // file — are dedicated fields, so the frontend never picks files out of the
  // artifact list itself.
  const producedArtifacts = [...sessionArtifacts, ...extraArtifacts]
  const imageCount = producedArtifacts.filter((artifact) =>
    artifact.mimeType?.startsWith('image/')
  ).length
  const largestMarkdown = producedArtifacts
    .filter((artifact) => artifact.url && artifact.name.toLowerCase().endsWith('.md'))
    .sort((a, b) => (b.size ?? 0) - (a.size ?? 0))[0]
  const coverImage =
    existing?.preview?.image ??
    (figureIndex > 0 ? `/use-cases/${slug}/figures/figure-01.png` : undefined) ??
    producedArtifacts.find((artifact) => artifact.mimeType?.startsWith('image/') && artifact.url)
      ?.url
  const reportContentUrl = existing?.report?.contentUrl ?? largestMarkdown?.url
  const reportUrl = existing?.report?.url ?? largestMarkdown?.url
  const detail: UseCaseDetail = {
    slug,
    title: model.title,
    description: model.description,
    exportedAt: model.exportedAt,
    ...(existing?.category ? { category: existing.category } : {}),
    ...(coverImage ? { coverImage } : {}),
    figureCount: imageCount,
    ...(reportContentUrl || reportUrl
      ? {
          report: {
            ...(reportContentUrl ? { contentUrl: reportContentUrl } : {}),
            ...(reportUrl ? { url: reportUrl } : {}),
            ...(existing?.report?.pageCount ? { pageCount: existing.report.pageCount } : {})
          }
        }
      : {})
  }
  writeFileSync(join(outPublicDir, 'detail.json'), JSON.stringify(detail))

  const groupCount = items.filter((i) => i.type === 'activity-group').length
  const elicitationCount = items.filter((i) => i.type === 'elicitation').length
  console.log(
    `imported "${model.title}" as ${slug}: ${messageItems.length} messages, ` +
      `${graphActivities.length} activities in ${groupCount} groups, ${elicitationCount} elicitations, ` +
      `${Object.keys(assets).length} assets, ${figureIndex} figures; ` +
      `essential tier: ${truncatedActivityCount} truncated activities, ` +
      `${Object.keys(essentialAssets).length} assets (full: ${hasFull ? `${fullSizeBytes} bytes` : 'same'})`
  )
}

const PACKAGES_DIR = join('session-packages')

const main = (): void => {
  const [, , archiveArg, slugArg] = process.argv
  if (archiveArg) {
    if (!slugArg)
      fail(
        'usage: bun run scripts/import-session-package.ts <pkg.science> <slug>\n' +
          `   or: bun run scripts/import-session-package.ts   (imports every .science in ${PACKAGES_DIR}/)`
      )
    if (!/^[a-z0-9][a-z0-9-]*$/.test(slugArg)) fail(`invalid slug: ${slugArg}`)
    if (!existsSync(archiveArg)) fail(`file not found: ${archiveArg}`)
    importOne(archiveArg, slugArg)
    return
  }
  if (!existsSync(PACKAGES_DIR)) fail(`no arguments given and ${PACKAGES_DIR}/ does not exist`)
  const files = readdirSync(PACKAGES_DIR)
    .filter((name) => name.endsWith('.science'))
    .sort()
  if (files.length === 0) fail(`no .science files found in ${PACKAGES_DIR}/`)
  for (const file of files) {
    const slug = file.slice(0, -'.science'.length)
    if (!/^[a-z0-9][a-z0-9-]*$/.test(slug)) {
      console.error(
        `skipping ${file}: rename it to <slug>.science (lowercase letters, digits, dashes)`
      )
      process.exitCode = 1
      continue
    }
    importOne(join(PACKAGES_DIR, file), slug)
  }
}

main()
