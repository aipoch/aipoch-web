import { Sha256 } from './sha256'

type Row = Record<string, unknown>
export const record = (value: unknown): Row | undefined =>
  value !== null && typeof value === 'object' && !Array.isArray(value) ? (value as Row) : undefined
export const rows = (value: unknown): Row[] =>
  Array.isArray(value) ? value.filter((v): v is Row => Boolean(record(v))) : []
export const jsonRecord = (value: unknown): Row | undefined => {
  try {
    return record(typeof value === 'string' ? JSON.parse(value) : value)
  } catch {
    return undefined
  }
}

// Open-Science scope hashes use sorted JSON keys and only durable reviewer-relevant fields.
const stableStringify = (value: unknown): string => {
  if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? 'null'
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`
  return `{${Object.entries(value)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`)
    .join(',')}}`
}
const hash = (value: unknown) =>
  new Sha256().update(new TextEncoder().encode(stableStringify(value))).hex()
const activityFields = [
  'title',
  'status',
  'providerToolName',
  'toolKind',
  'toolContent',
  'toolLocations',
  'rawInput',
  'rawOutput',
  'terminalOutput',
  'terminalExitCode'
]

// Resolve the pinned graph branch, not flat compatibility arrays that may contain another branch.
const turnProjection = (session: Row, scope: Row) => {
  const graph = record(session.conversationGraph)
  if (!graph || !Array.isArray(graph.messages))
    return {
      messages: rows(session.messages),
      activities: rows(graph?.activities ?? session.activities)
    }
  const allMessages = new Map(rows(graph.messages).map((m) => [m.id, m]))
  const target = allMessages.get(scope.turnMessageId)
  const frame = rows(graph.frames).find((f) => f.id === target?.agentFrameId)
  const branch = rows(graph.branches).find(
    (b) => b.id === (scope.messageBranchId ?? frame?.activeBranchId)
  )
  if (!target || !frame || !branch || branch.agentFrameId !== frame.id) return undefined
  const messages: Row[] = []
  const seen = new Set<unknown>()
  let id = branch.headMessageId
  while (id) {
    if (seen.has(id)) return undefined
    seen.add(id)
    const message = allMessages.get(id)
    if (!message || message.agentFrameId !== frame.id) return undefined
    messages.push(message)
    id = message.parentMessageId
  }
  if (!seen.has(target.id)) return undefined
  return {
    messages: messages.reverse(),
    activities: rows(graph.activities).filter(
      (a) => a.agentFrameId === frame.id && seen.has(a.promptMessageId)
    )
  }
}

// Compare recorded evidence to the exported turn before display sanitization rewrites paths/links.
// An unavailable artifact digest is unknown, never proof that a verdict is current or outdated.
export const reviewScopeState = (
  session: Row,
  scope: Row,
  artifactVersions: Row[]
): 'current' | 'outdated' | 'unverified' => {
  if (!Array.isArray(scope.blocks)) return 'unverified'
  const projection = turnProjection(session, scope)
  if (!projection) return 'unverified'
  const ordered = [
    ...projection.messages.map((value, index) => ({ kind: 'message', value, sortIndex: index })),
    ...projection.activities.map((value) => ({
      kind: 'activity',
      value,
      sortIndex: Number(value.sortIndex ?? 0)
    }))
  ].sort(
    (a, b) =>
      Number(a.value.createdAt) - Number(b.value.createdAt) ||
      a.sortIndex - b.sortIndex ||
      String(a.value.id).localeCompare(String(b.value.id))
  )
  const target = ordered.findIndex((item) => item.value.id === scope.turnMessageId)
  if (target < 0) return 'unverified'
  const isStart = (index: number) =>
    ordered[index].kind === 'message' &&
    ordered[index].value.role === 'user' &&
    !ordered[index].value.responseToMessageId
  let start = target
  while (start > 0 && !isStart(start)) start--
  let end = start + 1
  while (end < ordered.length && !isStart(end)) end++
  const current = ordered.slice(start, end)
  const stored = rows(scope.blocks)
  if (current.length !== stored.length) return 'outdated'
  let unverified = false
  for (let i = 0; i < current.length; i++) {
    const { kind, value } = current[i]
    if (stored[i].sourceId !== value.id || stored[i].kind !== kind) return 'outdated'
    let content: Row
    if (kind === 'activity') content = Object.fromEntries(activityFields.map((k) => [k, value[k]]))
    else {
      const ids = Array.isArray(value.artifactIds) ? [...value.artifactIds].sort() : []
      const digests = ids.map((id) => {
        const checksum =
          artifactVersions.find((a) => a.id === id)?.checksum ??
          rows(session.artifacts).find((a) => a.id === id || a.versionId === id)?.sha256
        return typeof checksum === 'string' && /^[a-f0-9]{64}$/i.test(checksum)
          ? `sha256:${checksum}`
          : undefined
      })
      if (digests.some((d) => !d)) {
        unverified = true
        continue
      }
      content = {
        role: value.role,
        content: value.content,
        artifactIds: ids,
        ...(value.responseToMessageId ? { responseToMessageId: value.responseToMessageId } : {}),
        ...(value.interrupted ? { interrupted: true } : {}),
        ...(rows(value.contextWindowSamples).length
          ? {
              turnTerminationHistory: rows(value.contextWindowSamples).map((s) => ({
                timestamp: s.timestamp,
                termination: s.termination
              }))
            }
          : {}),
        ...(ids.length ? { artifactDigests: digests } : {})
      }
    }
    if (typeof stored[i].contentHash !== 'string') {
      unverified = true
      continue
    }
    if (hash(content) !== stored[i].contentHash) return 'outdated'
  }
  return unverified ? 'unverified' : 'current'
}
