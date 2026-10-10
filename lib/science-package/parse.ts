import type {
  MessageArtifact,
  NormalizedActivity,
  NormalizedOutput,
  NormalizedRun,
  TranscriptItem,
  UseCaseAsset,
  UseCaseSession
} from '../use-case-types'
import { type ArchiveEntry, readArchive, readJson } from './archive'

interface ManifestInventoryEntry {
  path: string
  sizeBytes: number
  checksum: string
  storageKey?: string
  kind: string
}

export interface Manifest {
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

// MIME types for package resources; previews also use the original filename.
const MIME_BY_EXT: Record<string, string> = {
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

// Notebook image outputs accepted as base64 payloads (image/svg+xml is not:
// it would need sanitization before becoming a same-origin blob).
const NOTEBOOK_IMAGE_EXTENSIONS: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg'
}

// Strict base64 shape check before atob so malformed values degrade instead
// of throwing. Whitespace is tolerated, matching atob's own line handling.
const decodeBase64 = (value: string) => {
  const compact = value.replace(/\s+/g, '')
  if (compact.length === 0 || compact.length % 4 !== 0 || !/^[A-Za-z0-9+/]*={0,2}$/.test(compact))
    return undefined
  try {
    return Uint8Array.from(atob(compact), (char) => char.charCodeAt(0))
  } catch {
    return undefined
  }
}

// Encode Markdown destination delimiters as well as URL characters.
const encodeAssetFilename = (filename: string) =>
  encodeURIComponent(filename).replace(/\(/g, '%28').replace(/\)/g, '%29')

const validateManifest = (manifest: Manifest) => {
  if (manifest.format !== 'open-science-session' || manifest.schemaVersion !== 1)
    throw new Error('Unsupported .science manifest format or schema version.')
  if (
    !Array.isArray(manifest.inventory) ||
    !manifest.source ||
    typeof manifest.source.title !== 'string'
  )
    throw new Error('Invalid package manifest.')
  for (const feature of manifest.requiredFeatures ?? []) {
    if (!['literature', 'ro-crate'].includes(feature))
      throw new Error(`Unsupported required feature: ${feature}`)
  }
  const paths = new Set<string>()
  for (const entry of manifest.inventory) {
    if (
      !entry ||
      typeof entry.path !== 'string' ||
      !/^(session\.json|records\.json|ro-crate-metadata\.json|README\.md|objects\/[a-f0-9]{64})$/.test(
        entry.path
      ) ||
      paths.has(entry.path) ||
      !Number.isSafeInteger(entry.sizeBytes) ||
      entry.sizeBytes < 0 ||
      typeof entry.checksum !== 'string' ||
      !/^[a-f0-9]{64}$/.test(entry.checksum) ||
      (entry.storageKey !== undefined && typeof entry.storageKey !== 'string')
    )
      throw new Error('Invalid package inventory entry.')
    paths.add(entry.path)
  }
  if (!paths.has('session.json')) throw new Error('Package inventory is missing session.json.')
}

/** Preserve restored directories while keeping every URL inside the extracted root. */
export const storagePathFor = (storageKey: string) => {
  const segments = storageKey.split('/')
  if (
    /[\\\p{Cc}]/u.test(storageKey) ||
    /^[a-z][a-z0-9+.-]*:/i.test(storageKey) ||
    segments.some((segment) => !segment || segment === '.' || segment === '..')
  )
    throw new Error('Invalid extracted storage key.')
  return segments.map(encodeAssetFilename).join('/')
}

export const sessionRecordFrom = (value: unknown): SessionRecord => {
  const file = value as { version?: number; session?: SessionRecord } | null
  if (
    !file ||
    file.version !== 2 ||
    !file.session ||
    typeof file.session.title !== 'string' ||
    !Array.isArray(file.session.messages) ||
    (file.session.artifacts !== undefined && !Array.isArray(file.session.artifacts))
  )
    throw new Error('Unsupported or invalid session.json.')
  return file.session
}

export async function parsePackage(archive: Blob, slug: string) {
  const objects = await readArchive(archive)
  const manifest = await readJson<Manifest>(objects.get('manifest.json'), 'manifest.json')
  validateManifest(manifest)
  const inventoried = new Set<string>()
  for (const entry of manifest.inventory) {
    inventoried.add(entry.path)
    const file = objects.get(entry.path)
    if (!file || file.blob.size !== entry.sizeBytes || file.checksum !== entry.checksum)
      throw new Error(`Package inventory verification failed: ${entry.path}`)
  }
  for (const path of objects.keys()) {
    if (path !== 'manifest.json' && !inventoried.has(path))
      throw new Error(`Unverified archive entry: ${path}`)
  }
  const session = sessionRecordFrom(
    await readJson<unknown>(objects.get('session.json'), 'session.json')
  )
  const records = objects.has('records.json')
    ? await readJson<RecordsFile>(objects.get('records.json'), 'records.json')
    : undefined
  const runEntry = manifest.inventory.find((entry) => entry.storageKey?.endsWith('/run.json'))
  const runDocument = runEntry
    ? await readJson<JsonObject>(objects.get(runEntry.path), runEntry.path)
    : undefined
  return normalizeSession(session, slug, { archive: { manifest, objects, records }, runDocument })
}

/** Normalize session JSON directly; the extracted endpoint has no archive manifest. */
export const parseExtractedSession = (
  session: SessionRecord,
  slug: string,
  assetBaseUrl: string,
  runDocument?: JsonObject
) => normalizeSession(session, slug, { assetBaseUrl, runDocument })

function normalizeSession(
  session: SessionRecord,
  slug: string,
  {
    archive,
    assetBaseUrl,
    runDocument
  }: {
    archive?: { manifest: Manifest; objects: Map<string, ArchiveEntry>; records?: RecordsFile }
    assetBaseUrl?: string
    runDocument?: JsonObject
  }
) {
  const resources: { id: string; blob: Blob }[] = []
  const resource = (blob: Blob, filename: string) => {
    const id = `science-asset:${resources.length}`
    const extension = filename.split('.').pop()?.toLowerCase() ?? ''
    // HTML must not become an executable same-origin blob document, so it is
    // detyped to text/plain. SVG keeps image/svg+xml so <img> can render it:
    // scripts inside an SVG only run when it is loaded as a top-level document,
    // and the UI exposes SVG solely through <img> or as a download — the
    // preview dialog deliberately offers no "open in a new tab" for it.
    const type =
      extension === 'html' || extension === 'htm'
        ? 'text/plain'
        : (MIME_BY_EXT[extension] ?? 'text/plain')
    resources.push({ id, blob: blob.slice(0, blob.size, type) })
    return id
  }
  // --- assets: storageKey -> public url -----------------------------------
  // Blob names carry a real extension (resolved from records.json or the
  // storage key) so the static server returns a displayable Content-Type
  // instead of application/octet-stream for images and documents.
  const filenameByStorageKey = new Map<string, string>()
  for (const table of ['ArtifactVersion', 'UploadVersion'] as const) {
    for (const row of archive?.records?.tables[table] ?? []) {
      const key = row.contentStorageKey
      const filename = row.filename ?? row.originalFilename
      if (typeof key === 'string' && typeof filename === 'string') {
        filenameByStorageKey.set(key, filename)
      }
    }
  }
  const assets: Record<string, UseCaseAsset> = Object.create(null)
  for (const entry of archive?.manifest.inventory ?? []) {
    const storageKey = entry.storageKey
    if (!storageKey) continue
    if (SKIP_BLOB.some((pattern) => pattern.test(storageKey))) continue
    const bytes = archive?.objects.get(entry.path)
    if (!bytes) continue
    const filename =
      filenameByStorageKey.get(storageKey) ?? storageKey.split('/').pop() ?? entry.path
    assets[storageKey] = {
      url: resource(bytes.blob, filename),
      filename,
      sizeBytes: entry.sizeBytes,
      kind: entry.kind
    }
  }

  if (assetBaseUrl) {
    for (const artifact of session.artifacts ?? []) {
      if (!artifact || typeof artifact.path !== 'string' || !artifact.path) continue
      const storageKey = artifact.path.replace(/^\$DATA\//, '')
      const filename = typeof artifact.name === 'string' ? artifact.name : 'file'
      assets[storageKey] = {
        url: `${new URL(storagePathFor(storageKey), assetBaseUrl).href}#${encodeAssetFilename(filename)}`,
        filename,
        sizeBytes: typeof artifact.size === 'number' ? artifact.size : 0,
        kind: typeof artifact.kind === 'string' ? artifact.kind : 'file'
      }
    }
  }

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
      for (const [mime, extension] of Object.entries(NOTEBOOK_IMAGE_EXTENSIONS)) {
        const image = normalized.data?.[mime]
        // nbformat allows image payloads as string[] (multi-line base64); only
        // plain strings reach the decoder, anything else stays untouched.
        if (typeof image !== 'string' || !image) continue
        // Only decode values that are actually base64: absolute paths, sanitized
        // $DATA/… values, and anything malformed stay untouched. A throw from
        // atob would abort the whole package parse, so a bad figure degrades
        // instead of failing the replay. (JPEG base64 always starts with
        // "/9j/", so a startsWith('/') path check would misclassify it.)
        const bytes = decodeBase64(image)
        if (!bytes) continue
        figureIndex += 1
        const filename = `figure-${String(figureIndex).padStart(2, '0')}.${extension}`
        normalized.data = {
          ...normalized.data,
          [mime]: resource(new Blob([bytes]), filename)
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
  const graphActivities = session.conversationGraph?.activities ?? []
  const activityItems: { ts: number; item: TranscriptItem }[] = []
  for (const activity of graphActivities) {
    const ts =
      typeof activity.sortIndex === 'number' ? activity.sortIndex : Number(activity.createdAt)
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
      run: invocationId ? runsByInvocation.get(invocationId) : undefined
    }
    activityItems.push({
      ts,
      item: { type: 'activity-group', id: normalized.id, activities: [normalized] }
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
      // Append the real filename as a URL fragment: <img> and fetch ignore it,
      // and the markdown link interceptor recovers the name from it because the
      // link label often carries no extension. The worker only replaces the
      // science-asset token, so the fragment survives blob URL substitution.
      return url
        ? `[${label}](${url.includes('#') ? url : `${url}#${encodeAssetFilename(filename)}`})`
        : match
    })
  const messageItems: { ts: number; item: TranscriptItem }[] = session.messages.map((message) => {
    const artifactIds = Array.isArray(message.artifactIds)
      ? (message.artifactIds as unknown[]).filter((id): id is string => typeof id === 'string')
      : []
    const messageArtifacts = artifactIds
      .map((id) => artifactByVersionId.get(id))
      .filter((artifact): artifact is MessageArtifact => Boolean(artifact))
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
        artifacts: messageArtifacts.length > 0 ? messageArtifacts : undefined
      }
    }
  })

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
    title: sanitize(archive?.manifest.source.title || session.title),
    description: session.description ? sanitize(session.description) : undefined,
    projectName:
      archive?.manifest.source.projectName ??
      (typeof session.projectName === 'string' ? session.projectName : ''),
    exportedAt: archive?.manifest.createdAt ?? Number(session.updatedAt ?? session.createdAt ?? 0),
    sessionCreatedAt: Number(session.createdAt),
    items,
    assets,
    omissions: (archive?.manifest.omissions ?? []).map((o) => sanitize(o.description)),
    excludedFiles: archive?.manifest.excludedFiles ?? []
  }

  return { session: model, resources }
}
