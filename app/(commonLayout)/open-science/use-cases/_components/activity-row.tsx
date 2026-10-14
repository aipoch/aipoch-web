'use client'

import { AnimatePresence, motion } from 'motion/react'
import { useMemo, useState } from 'react'
import type { NormalizedActivity, NormalizedOutput, UseCaseAsset } from '@/lib/use-case-types'
import { cn } from '@/lib/utils'
import { classifyActivityRenderer } from './activity-classify'
import { ActivityIcon } from './activity-icon'
import { useFilePreview } from './file-preview'
import { staticNotebookPhase } from './notebook-run-status'
import {
  matchNotebookControlTool,
  matchNotebookRunTool,
  matchToolName,
  resolveNotebookLanguage
} from './notebook-tool-names'
import { PlanCard } from './plan-card'
import {
  PLAN_STEP_STATUS_LABELS,
  type PlanProjection,
  parsePlanStepUpdate,
  projectGeneratePlanActivity
} from './plan-projection'
import { SessionMarkdown } from './session-markdown'
import {
  SectionLabel,
  sectionLabelClassName,
  ToolCodeBlock,
  ToolDiffBlock,
  type ToolSummary,
  ToolSummaryCard
} from './tool-blocks'

// Port of the buildToolActivityDetails priority chain (workspace-tool-activity-details.ts)
// adapted to the normalized export model. Every branch degrades to raw input/output JSON
// instead of throwing on unknown shapes.

// A row in the manage-packages ledger table (app: PackageDetail).
type PackageLedgerRow = {
  name: string
  source?: string
  change?: string
  version?: string
}

type DetailSection =
  | {
      kind: 'code'
      label: string
      text: string
      language?: string
      muted?: boolean
      /** Notebook outputs start collapsed so the code stays the focus. */
      collapsible?: boolean
      /** Notebook code shows line numbers matching the cell source. */
      lineNumbers?: boolean
    }
  | { kind: 'summary'; summary: ToolSummary; file?: boolean }
  | { kind: 'markdown'; label: string; text: string }
  | { kind: 'packages'; label: string; packages: string[] }
  | {
      kind: 'packageLedger'
      packages: PackageLedgerRow[]
      related: PackageLedgerRow[]
      failed: boolean
      warning: boolean
      error?: string
    }
  | { kind: 'image'; label: string; url: string; mimeType: string }
  | { kind: 'plan'; projection: PlanProjection }
  | { kind: 'diff'; label: string; language?: string; oldText: string | null; newText: string }

type ActivityDetails = {
  displayName: string
  subtitle?: string
  metaLabel?: string
  /** The activity reports failure in its result payload despite a completed
   * status (e.g. a package install whose tool call succeeded but ok:false). */
  failed?: boolean
  sections: DetailSection[]
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const trimDetail = (value: string | null | undefined): string | undefined => {
  const trimmed = value?.trim()
  return trimmed ? trimmed : undefined
}

// Removes the quote wrapper that ACP search titles often use around the raw query.
const stripWrappingQuotes = (value: string): string => value.replace(/^["'](.+)["']$/u, '$1').trim()

// Exported packages wrap tool inputs in the MCP envelope
// ({ server, tool, arguments }); field readers want the arguments object.
const getInput = (activity: NormalizedActivity): Record<string, unknown> | undefined => {
  if (!isRecord(activity.input)) return undefined
  const envelopeArguments = activity.input.arguments
  return typeof activity.input.tool === 'string' && isRecord(envelopeArguments)
    ? envelopeArguments
    : activity.input
}

const getStringField = (
  record: Record<string, unknown> | undefined,
  key: string
): string | undefined =>
  record && typeof record[key] === 'string' ? (record[key] as string) : undefined

const getContentBlockTexts = (activity: NormalizedActivity): string[] => {
  if (!Array.isArray(activity.contentBlocks)) return []
  const texts: string[] = []
  for (const block of activity.contentBlocks) {
    if (isRecord(block) && isRecord(block.content) && typeof block.content.text === 'string') {
      texts.push(block.content.text)
    }
  }
  return texts
}

// Raw output may be a string, an array of { type: 'text', text } parts, or arbitrary JSON.
const getOutputText = (activity: NormalizedActivity): string | undefined => {
  const { output } = activity
  if (typeof output === 'string') return output
  if (Array.isArray(output)) {
    const texts = output
      .filter(
        (part): part is { type: string; text: string } =>
          isRecord(part) && typeof part.text === 'string'
      )
      .map((part) => part.text)
    if (texts.length > 0) return texts.join('\n')
  }
  return getContentBlockTexts(activity)[0]
}

const parseJson = (text: string | undefined): unknown => {
  if (!text) return undefined
  try {
    return JSON.parse(text)
  } catch {
    return undefined
  }
}

const basename = (path: string): string => path.split('/').filter(Boolean).pop() ?? path

const formatBytes = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

const fallbackGenericSections = (activity: NormalizedActivity): DetailSection[] => {
  const sections: DetailSection[] = []
  if (activity.input !== undefined && activity.input !== null) {
    sections.push({ kind: 'code', label: 'Input', text: pretty(activity.input), language: 'json' })
  }
  const outputText = getOutputText(activity)
  if (outputText !== undefined) {
    sections.push({ kind: 'code', label: 'Output', text: pretty(outputText), language: 'json' })
  } else if (activity.output !== undefined && activity.output !== null) {
    sections.push({
      kind: 'code',
      label: 'Output',
      text: pretty(activity.output),
      language: 'json'
    })
  }
  return sections
}

const pretty = (value: unknown): string => {
  if (typeof value === 'string') {
    const parsed = parseJson(value)
    if (parsed !== undefined) return JSON.stringify(parsed, null, 2)
    return value
  }
  try {
    return JSON.stringify(value, null, 2) ?? String(value)
  } catch {
    return String(value)
  }
}

// Unknown tools keep their provider identity verbatim (app behavior:
// getToolDisplayName in workspace-tool-activity-details.ts); only the known
// tools below get curated display names.
const TOOL_KIND_LABELS: Record<string, string> = {
  read: 'Read',
  edit: 'Edit',
  delete: 'Delete',
  move: 'Move',
  search: 'Search',
  execute: 'Terminal',
  think: 'Task',
  fetch: 'Fetch',
  switch_mode: 'Switch Mode',
  other: 'Tool'
}

const getToolDisplayName = (activity: NormalizedActivity): string => {
  const provider = activity.providerToolName?.trim()
  if (provider) return provider
  if (activity.toolKind) return TOOL_KIND_LABELS[activity.toolKind] ?? 'Tool'
  return 'Tool'
}

const buildSkillDetails = (activity: NormalizedActivity): ActivityDetails => {
  const input = getInput(activity)
  const document = getContentBlockTexts(activity)[0] ?? getOutputText(activity)
  const sections: DetailSection[] = document
    ? [{ kind: 'markdown', label: 'Skill', text: document }]
    : fallbackGenericSections(activity)
  return {
    displayName: 'Skill',
    subtitle: getStringField(input, 'skill'),
    sections
  }
}

const NOTEBOOK_OUTPUT_LANGUAGE = new Set(['stream', 'display', 'execute_result', 'error'])

const buildNotebookDetails = (activity: NormalizedActivity): ActivityDetails => {
  const input = getInput(activity)
  const run = activity.run
  // Input field order mirrors the app: code, then command (bash_execute), then script.
  const script =
    run?.script ??
    run?.text ??
    (['code', 'command', 'script'] as const)
      .map((key) => getStringField(input, key))
      .find((value) => value !== undefined)
  const toolName = [activity.providerToolName, activity.title].find(
    (name) => matchNotebookRunTool(name) !== undefined
  )
  // Same language chain as the app: explicit kernel field → tool suffix → code
  // heuristics → python. It drives both the display name and Shiki highlighting.
  const language = resolveNotebookLanguage(toolName, input, script)
  const sections: DetailSection[] = []

  if (script) {
    sections.push({
      kind: 'code',
      label: language === 'bash' ? 'Command' : 'Code',
      text: script,
      language,
      // Transcript line numbers match the cell source (app: showLineNumbers).
      lineNumbers: true
    })
  }

  if (run) {
    for (const output of run.outputs) {
      sections.push(...notebookOutputSections(output))
    }
  }

  if (sections.length === 0) {
    const fallback = fallbackGenericSections(activity)
    sections.push(...fallback)
  }

  // Execution truth comes from the run record or the run summary in the tool
  // output (app: getToolExecutionPhase). Without either, the code was shown
  // but never ran — the outer observer's failed status must not relabel it.
  const phase = staticNotebookPhase(activity)
  const statusLabel =
    phase === 'prepared'
      ? 'code shown'
      : phase === 'completed'
        ? undefined
        : phase === 'limit-reached'
          ? 'limit reached'
          : phase === 'declined'
            ? 'declined by you'
            : phase

  // App meta (WorkspaceToolDetailsRow + notebook-run-figures.ts): figure count
  // and output line count; a completed run adds no status word, failed keeps it.
  const figureCount =
    run?.outputs.filter((output) => {
      const data = output.data
      if (!data) return false
      return ['image/png', 'image/jpeg'].some((mime) => {
        const image = data[mime]
        return typeof image === 'string' && (image.startsWith('/') || image.startsWith('blob:'))
      })
    }).length ?? 0
  const outputLines = run ? countNotebookOutputLines(run.outputs) : 0
  const metaLabel =
    [
      figureCount > 0 ? `${figureCount} ${figureCount === 1 ? 'figure' : 'figures'}` : undefined,
      outputLines > 0 ? `${outputLines} ${outputLines === 1 ? 'line' : 'lines'}` : undefined,
      statusLabel
    ]
      .filter(Boolean)
      .join(' · ') || undefined

  // Derive display name from language: python/r are Notebook runs, javascript
  // (repl) is Agent SDK, and bash is shell.
  const displayName =
    language === 'javascript' ? 'Agent SDK' : language === 'bash' ? 'Shell' : 'Notebook run'

  return {
    displayName,
    subtitle: run?.cellId ?? getStringField(input, 'cellId'),
    metaLabel,
    // Explicit false suppresses the row's outer-status failure styling when
    // the run evidence says the code never executed (prepared/declined).
    failed: phase === 'failed',
    sections
  }
}

// Output line counting ports the app's countNotebookRunOutputLines
// (notebook-run-figures.ts): stream/error text first, then display/result
// payloads that the stream text did not already cover, trimmed and deduped.
const countTextLines = (text: string): number => {
  const trimmed = text.trimEnd()
  return trimmed.trim().length > 0 ? trimmed.split(/\r?\n/u).length : 0
}

const countNotebookOutputLines = (outputs: NormalizedOutput[]): number => {
  const streamParts = outputs
    .filter((output) => output.type === 'stream' || output.type === 'error')
    .map((output) => (typeof output.text === 'string' ? output.text.trimEnd() : ''))
    .filter((text) => text.length > 0)
  const streamText = streamParts.join('\n')
  const displayParts = outputs.flatMap((output) => {
    if (output.type === 'stream' || output.type === 'error') return []
    const parts: string[] = []
    if (typeof output.text === 'string') parts.push(output.text.trimEnd())
    if (output.data) {
      for (const [mime, payload] of Object.entries(output.data)) {
        if (mime.startsWith('image/')) continue
        if (typeof payload === 'string') parts.push(payload.trimEnd())
      }
    }
    return parts
  })
  const visibleParts = [
    ...streamParts,
    ...displayParts.filter((part) => part.trim().length > 0 && !streamText.includes(part))
  ]
  return countTextLines(visibleParts.join('\n'))
}

const notebookOutputSections = (output: NormalizedOutput): DetailSection[] => {
  // Long outputs start collapsed so the code stays the focus (app: collapsible
  // output sections in WorkspaceToolDetailsRow).
  if (!NOTEBOOK_OUTPUT_LANGUAGE.has(output.type)) {
    return output.text
      ? [{ kind: 'code', label: output.type, text: output.text, collapsible: true }]
      : []
  }
  if (output.type === 'stream') {
    if (!output.text) return []
    return [
      {
        kind: 'code',
        label: output.name ?? 'stream',
        text: output.text,
        muted: output.name === 'stderr',
        collapsible: true
      }
    ]
  }
  if (output.type === 'error') {
    const text =
      output.text ??
      (typeof output.evalue === 'string'
        ? `${String(output.ename ?? 'Error')}: ${output.evalue}`
        : undefined)
    return text ? [{ kind: 'code', label: 'Error', text, muted: true, collapsible: true }] : []
  }
  const sections: DetailSection[] = []
  const data = output.data
  if (data) {
    if (typeof data['text/plain'] === 'string') {
      sections.push({ kind: 'code', label: 'Result', text: data['text/plain'], collapsible: true })
    }
    for (const mime of ['image/png', 'image/jpeg'] as const) {
      const image = data[mime]
      if (typeof image === 'string' && (image.startsWith('/') || image.startsWith('blob:'))) {
        sections.push({ kind: 'image', label: 'Figure', url: image, mimeType: mime })
      }
    }
  }
  if (sections.length === 0 && output.text) {
    sections.push({ kind: 'code', label: 'Result', text: output.text, collapsible: true })
  }
  return sections
}

// --- notebook control tools (state / restart / runtimes) ---------------------
// Port of notebook-tool-presentation.ts reduced to the static replay model:
// no approval notes, no i18n, English labels only.

const text = (value: unknown): string | undefined =>
  typeof value === 'string' && value.trim() ? value : undefined
const scalar = (value: unknown): string | undefined =>
  text(value) ?? (typeof value === 'number' && Number.isFinite(value) ? String(value) : undefined)

// Providers wrap the same MCP result in JSON text, content blocks or a bridge envelope.
const readNotebookToolResult = (value: unknown, depth = 0): Record<string, unknown> | undefined => {
  if (depth > 5) return undefined
  if (typeof value === 'string') {
    try {
      return readNotebookToolResult(JSON.parse(value), depth + 1)
    } catch {
      return undefined
    }
  }
  const item = isRecord(value) ? value : undefined
  if (!item) return undefined
  if (
    ['kernelStatus', 'runtimes', 'bound', 'bindingChanged', 'status'].some((key) => key in item) ||
    text(item.error)
  )
    return item
  for (const nested of [item.structuredContent, item.result]) {
    const found = readNotebookToolResult(nested, depth + 1)
    if (found) return found
  }
  if (Array.isArray(item.content)) {
    for (const block of item.content) {
      const found = readNotebookToolResult(isRecord(block) ? block.text : undefined, depth + 1)
      if (found) return found
    }
  }
  return undefined
}

const kernelStatusLabel = (value: unknown): string | undefined => {
  switch (value) {
    case 'idle':
      return 'Idle'
    case 'active':
      return 'Active'
    case 'completed':
      return 'Completed'
    case 'failed':
      return 'Failed'
    case 'running':
      return 'Running'
    case 'restarted':
      return 'Restarted'
    default:
      return text(value)
  }
}

const kernelLanguageLabel = (value: unknown): string | undefined =>
  value === 'r' ? 'R' : value === 'python' ? 'Python' : text(value)

const buildNotebookControlDetails = (activity: NormalizedActivity): ActivityDetails => {
  const tool = matchNotebookControlTool(
    [activity.providerToolName, activity.title].find(
      (name) => matchNotebookControlTool(name) !== undefined
    )
  )
  const input = getInput(activity) ?? {}
  const result = [activity.output, getOutputText(activity)]
    .map((value) => readNotebookToolResult(value))
    .find(Boolean)

  const fields: ToolSummary['fields'] = []
  const field = (label: string, value: unknown): void => {
    const formatted = scalar(value)
    if (formatted !== undefined) fields.push({ label, value: formatted })
  }
  const summary: ToolSummary = { title: '', fields, error: text(result?.error) }

  if (tool === 'notebook_restart') {
    summary.title = 'Restart notebook'
    field('Status', kernelStatusLabel(result?.status))
    field('Kernel', kernelStatusLabel(result?.kernelStatus))
    field('Cells', result?.cells)
    if (result?.status === 'restarted' && !summary.error) {
      summary.note = 'In-memory variables cleared. Run history preserved.'
    }
  } else if (tool === 'notebook_bind_runtime' || tool === 'notebook_switch_runtime') {
    const bound = isRecord(result?.bound) ? result.bound : undefined
    const target = isRecord(result?.target) ? result.target : undefined
    summary.title =
      tool === 'notebook_switch_runtime' ? 'Switch notebook runtime' : 'Bind notebook runtime'
    summary.subtitle = text(bound?.label)
    field('Language', kernelLanguageLabel(bound?.language ?? input.language))
    field('Version', bound?.version)
    field(
      'Runtime source',
      bound?.source === 'managed'
        ? 'Managed'
        : bound?.source === 'external'
          ? 'External'
          : bound?.source
    )
    field('Status', kernelStatusLabel(bound?.status))
    field('Runtime', bound?.runtimeId ?? target?.runtimeId ?? input.runtimeId)
    if (result?.bindingChanged === true) {
      summary.note = 'The runtime binding changed despite the error.'
    }
  } else if (tool === 'list_notebook_runtimes') {
    summary.title = 'Notebook runtimes'
    field('Language', kernelLanguageLabel(input.language))
    field('Limit', input.limit)
    field('Offset', input.offset)
    field('Total', result?.runtimeCount)
    if (Array.isArray(result?.runtimes)) {
      summary.rows = result.runtimes.slice(0, 40).flatMap((entry) => {
        const runtime = isRecord(entry) ? entry : undefined
        if (!runtime) return []
        return [
          {
            title: text(runtime.label) ?? text(runtime.runtimeId) ?? 'Runtime',
            detail: [
              kernelLanguageLabel(runtime.language),
              text(runtime.version),
              runtime.source === 'managed'
                ? 'Managed'
                : runtime.source === 'external'
                  ? 'External'
                  : text(runtime.source)
            ]
              .filter(Boolean)
              .join(' · '),
            status: runtime.bound === true ? 'Bound' : kernelStatusLabel(runtime.status),
            error:
              runtime.runnable === false
                ? (text(runtime.reason) ?? text(runtime.detail) ?? 'Unavailable')
                : undefined
          }
        ]
      })
      if (!result.runtimes.length) summary.note = 'No runtimes returned.'
      else if (result.nextOffset !== undefined || result.runtimes.length > 40) {
        summary.note = 'More runtimes are available. See details for pagination.'
      }
    }
  } else {
    summary.title = 'Notebook state'
    field('Kernel', kernelStatusLabel(result?.kernelStatus))
    field('Cells', result?.cellCount)
    field('Runs', result?.runCount)
    field('Environments', result?.environmentCount)
    if (Array.isArray(result?.environments)) {
      for (const environment of result.environments.slice(0, 4)) {
        const env = isRecord(environment) ? environment : undefined
        if (env) {
          field(
            kernelLanguageLabel(env.kind) ?? 'Environment',
            [text(env.environment), kernelStatusLabel(env.status)].filter(Boolean).join(' · ')
          )
        }
      }
    }
    if (Array.isArray(result?.recentRuns)) {
      summary.rows = result.recentRuns
        .slice(-5)
        .reverse()
        .flatMap((entry) => {
          const run = isRecord(entry) ? entry : undefined
          if (!run) return []
          return [
            {
              title: text(run.cellId) ?? text(run.runId) ?? 'Notebook run',
              detail: [
                kernelLanguageLabel(run.kernelKind),
                text(run.environment),
                scalar(run.executionCount) ? `#${scalar(run.executionCount)}` : undefined
              ]
                .filter(Boolean)
                .join(' · '),
              status: kernelStatusLabel(run.status),
              error: run.status === 'failed' ? text(run.outputPreview) : undefined
            }
          ]
        })
    }
  }
  if (activity.status === 'failed' && !summary.error) summary.error = 'Failed'

  return { displayName: summary.title, sections: [{ kind: 'summary', summary }] }
}

const stripReadGutter = (raw: string): string => {
  let text = raw
  // The exported content wraps file dumps in a fenced block with a "N\t" line-number gutter.
  if (text.startsWith('```')) text = text.replace(/^```[^\n]*\n/, '')
  if (text.endsWith('```')) text = text.replace(/\n?```$/, '')
  return text
    .split('\n')
    .map((line) => line.replace(/^\d+\t/, ''))
    .join('\n')
}

const EXTENSION_LANGUAGES: Record<string, string> = {
  csv: 'csv',
  js: 'javascript',
  json: 'json',
  md: 'markdown',
  py: 'python',
  r: 'r',
  ts: 'typescript',
  txt: 'text'
}

const buildReadDetails = (activity: NormalizedActivity): ActivityDetails => {
  const input = getInput(activity)
  const path = activity.locations?.[0]?.path ?? getStringField(input, 'file_path')
  const raw = getContentBlockTexts(activity)[0] ?? getOutputText(activity)
  const extension = path?.split('.').pop()?.toLowerCase() ?? ''
  const sections: DetailSection[] = raw
    ? [
        {
          kind: 'code',
          label: 'Content',
          text: stripReadGutter(raw),
          language: EXTENSION_LANGUAGES[extension]
        }
      ]
    : fallbackGenericSections(activity)
  return {
    displayName: 'Read',
    subtitle: path ? basename(path) : undefined,
    sections
  }
}

// --- package installs (manage_packages / inspect_packages) -------------------
// Port of the app's manage-packages rendering (workspace-tool-activity-details.ts
// + WorkspaceManagePackagesActivityRow) reduced to the static replay model.

const isManagePackagesResult = (value: unknown): value is Record<string, unknown> =>
  isRecord(value) &&
  ['ok', 'needsRestart', 'method', 'environmentName', 'packageChanges', 'error'].some(
    (key) => key in value
  )

// ACP providers retain MCP results in different envelopes; unwrap only the
// known result/content fields (app: parseManagePackagesResultValue, depth
// limit +1 here because web outputs may be a stringified envelope).
const parseManagePackagesResultValue = (
  value: unknown,
  depth = 0
): Record<string, unknown> | undefined => {
  if (depth > 4) return undefined
  if (typeof value === 'string') {
    try {
      return parseManagePackagesResultValue(JSON.parse(value), depth + 1)
    } catch {
      return undefined
    }
  }
  if (!isRecord(value)) return undefined
  for (const key of ['structuredContent', 'result'] as const) {
    const nested = parseManagePackagesResultValue(value[key], depth + 1)
    if (nested) return nested
  }
  if (Array.isArray(value.content)) {
    for (const block of value.content) {
      if (!isRecord(block) || block.type !== 'text') continue
      const nested = parseManagePackagesResultValue(block.text, depth + 1)
      if (nested) return nested
    }
  }
  return isManagePackagesResult(value) ? value : undefined
}

const parseManagePackagesResult = (activity: NormalizedActivity) =>
  parseManagePackagesResultValue(activity.output) ??
  parseManagePackagesResultValue(getOutputText(activity))

// Trims libmamba trace/debug verbosity and backtrace decoration from install
// logs, and collapses blank-line runs (app: cleanInstallLog).
const cleanInstallLog = (log: string): string =>
  log
    .split('\n')
    .filter(
      (line) =>
        !/^\s*(trace|debug)\s+libmamba\b/u.test(line) &&
        !/libmamba.*Backtrace (Start|End)/u.test(line)
    )
    .join('\n')
    .replace(/\n{3,}/gu, '\n\n')
    .trim()

// Package spec derivation mirrors the app row (WorkspaceManagePackagesActivityRow):
// R GitHub specs name the repository, conda-style prefixes are stripped for R.
const githubRepositoryFromSpec = (spec: string): string | undefined => {
  const repository = spec.trim().split('@', 1)[0]
  return /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/u.test(repository) ? repository : undefined
}

const packageNameFromSpec = (spec: string, language: unknown): string => {
  const repository = language === 'r' ? githubRepositoryFromSpec(spec) : undefined
  if (repository) return repository.split('/').at(-1) ?? spec
  const unqualified = spec.trim().split('::').at(-1) ?? spec.trim()
  const name = unqualified.match(/^[A-Za-z0-9_.-]+/u)?.[0] ?? unqualified
  if (language !== 'r') return name
  if (name.toLowerCase().startsWith('r-')) return name.slice(2)
  if (name.toLowerCase().startsWith('bioconductor-')) return name.slice('bioconductor-'.length)
  return name
}

const buildPackagesDetails = (activity: NormalizedActivity): ActivityDetails => {
  const args = getInput(activity) ?? {}
  const isManage = [activity.providerToolName, activity.title].some(
    (name) => matchNotebookControlTool(name) === 'manage_packages'
  )
  const packages = Array.isArray(args.packages)
    ? args.packages.filter((pkg): pkg is string => typeof pkg === 'string')
    : []

  if (!isManage) {
    // inspect_packages keeps its previous shape.
    const sections: DetailSection[] = []
    if (packages.length > 0) {
      sections.push({ kind: 'packages', label: 'Packages', packages })
    }
    const resultText = getOutputText(activity)
    if (resultText)
      sections.push({ kind: 'code', label: 'Result', text: pretty(resultText), language: 'json' })
    if (sections.length === 0) sections.push(...fallbackGenericSections(activity))
    return {
      displayName: 'Inspect packages',
      subtitle: getStringField(args, 'language'),
      metaLabel: activity.status === 'failed' ? 'failed' : undefined,
      sections
    }
  }

  const result = parseManagePackagesResult(activity)

  const languageLabel =
    args.language === 'r' ? 'R' : args.language === 'python' ? 'Python' : undefined
  const environmentName = trimDetail(
    typeof result?.environmentName === 'string'
      ? result.environmentName
      : typeof args.environment === 'string'
        ? args.environment
        : undefined
  )
  const packageChanges = Array.isArray(result?.packageChanges) ? result.packageChanges : []
  const noInstallerNeeded =
    result?.ok === true &&
    !result.method &&
    packageChanges.length > 0 &&
    packageChanges.every((change) => isRecord(change) && change.change === 'unchanged')
  const installer = noInstallerNeeded
    ? undefined
    : typeof result?.method === 'string' && result.method.trim()
      ? result.method === 'biocmanager'
        ? 'Bioconductor'
        : result.method === 'github'
          ? 'GitHub'
          : result.method.trim()
      : args.installer === 'biocmanager'
        ? 'Bioconductor'
        : args.installer === 'github'
          ? 'GitHub'
          : args.usePip === true
            ? 'pip'
            : 'conda'

  const sections: DetailSection[] = []
  const error = typeof result?.error === 'string' ? trimDetail(result.error) : undefined
  // App row: "Installed N packages" once settled, "Installing N packages"
  // while running or failed; subtitle is language · environment · installer.
  const failed = activity.status === 'failed' || result?.ok === false
  const isRemoving = args.operation === 'uninstall'

  // Ledger rows join the requested specs with the reported packageChanges so
  // each package shows its change and version (app: detailFromChange).
  const typedChanges = packageChanges.filter(isRecord)
  const detailFromChange = (change: Record<string, unknown>): PackageLedgerRow => {
    const name = typeof change.name === 'string' ? change.name : ''
    const source = isRecord(change.source) ? change.source : undefined
    const sourceLabel =
      source?.type === 'github' && typeof source.repository === 'string'
        ? `${source.repository}${typeof source.ref === 'string' ? `@${source.ref}` : ''}`
        : source?.type === 'bioconductor'
          ? ['Bioconductor', typeof source.version === 'string' ? source.version : null]
              .filter(Boolean)
              .join(' ')
          : undefined
    const beforeVersion =
      typeof change.beforeVersion === 'string' ? change.beforeVersion.trim() : undefined
    const afterVersion =
      typeof change.afterVersion === 'string' ? change.afterVersion.trim() : undefined
    const version =
      change.change === 'updated' && beforeVersion && afterVersion
        ? `${beforeVersion} → ${afterVersion}`
        : isRemoving
          ? beforeVersion
          : afterVersion
    return {
      name,
      source: sourceLabel,
      change: typeof change.change === 'string' ? change.change : undefined,
      version: version || undefined
    }
  }
  const ledgerPackages: PackageLedgerRow[] = packages.map((spec) => {
    const name = packageNameFromSpec(spec, args.language)
    const repository = args.language === 'r' ? githubRepositoryFromSpec(spec) : undefined
    const change = typedChanges.find((candidate) => {
      if (typeof candidate.name !== 'string') return false
      if (candidate.name.toLowerCase() === name.toLowerCase()) return true
      if (!repository || !isRecord(candidate.source)) return false
      return (
        candidate.source.type === 'github' &&
        typeof candidate.source.repository === 'string' &&
        candidate.source.repository.toLowerCase() === repository.toLowerCase()
      )
    })
    return change ? detailFromChange(change) : { name }
  })
  for (const change of typedChanges) {
    if (change.relationship !== 'requested') continue
    const detail = detailFromChange(change)
    if (
      detail.name &&
      !ledgerPackages.some((row) => row.name.toLowerCase() === detail.name.toLowerCase())
    ) {
      ledgerPackages.push(detail)
    }
  }
  const relatedPackages = typedChanges
    .filter((change) => change.relationship !== 'requested' && change.change !== 'unchanged')
    .map(detailFromChange)
    .filter((detail) => detail.name)

  if (ledgerPackages.length > 0 || relatedPackages.length > 0) {
    sections.push({
      kind: 'packageLedger',
      packages: ledgerPackages,
      related: relatedPackages,
      failed,
      warning: result?.needsRestart === true,
      error
    })
  } else if (error) {
    sections.push({ kind: 'code', label: 'Error', text: error, muted: true })
  }
  // Plain-text provider output only masquerades as a log when no structured
  // result was found at all (app: getManagePackagesFallbackText); a parsed
  // result without a log field shows no Log section.
  const log =
    typeof result?.log === 'string'
      ? cleanInstallLog(result.log)
      : result
        ? ''
        : cleanInstallLog(getOutputText(activity) ?? '')
  if (log) sections.push({ kind: 'code', label: 'Log', text: log, collapsible: true })
  if (sections.length === 0) sections.push(...fallbackGenericSections(activity))

  const countLabel =
    packages.length > 0
      ? `${packages.length} ${packages.length === 1 ? 'package' : 'packages'}`
      : undefined
  const displayName = isRemoving
    ? failed
      ? countLabel
        ? `Removing ${countLabel}`
        : 'Removing packages'
      : countLabel
        ? `Removed ${countLabel}`
        : 'Removed packages'
    : failed
      ? countLabel
        ? `Installing ${countLabel}`
        : 'Installing packages'
      : countLabel
        ? `Installed ${countLabel}`
        : 'Installed packages'
  const metaLabel =
    [failed ? 'failed' : undefined, result?.needsRestart === true ? 'restart needed' : undefined]
      .filter(Boolean)
      .join(' · ') || undefined

  return {
    displayName,
    subtitle: [languageLabel, environmentName, installer].filter(Boolean).join(' · ') || undefined,
    metaLabel,
    failed,
    sections
  }
}

const buildArtifactWriteDetails = (
  activity: NormalizedActivity,
  assets: Record<string, UseCaseAsset>
): ActivityDetails => {
  const input = getInput(activity)
  const filename = getStringField(input, 'filename') ?? 'file'
  const result = parseJson(getOutputText(activity))
  const artifact = isRecord(result) && isRecord(result.artifact) ? result.artifact : undefined
  const sizeBytes =
    typeof artifact?.size_bytes === 'number' ? (artifact.size_bytes as number) : undefined
  const asset = Object.values(assets).find((candidate) => candidate.filename === filename)

  return {
    displayName: 'Write file',
    subtitle: filename,
    sections: [
      {
        kind: 'summary',
        file: true,
        summary: {
          title: filename,
          subtitle: asset ? 'Saved as a session artifact' : undefined,
          fields: [
            {
              label: 'Filename',
              value: filename,
              href: asset?.url
            },
            ...(sizeBytes !== undefined
              ? [{ label: 'Size', value: formatBytes(sizeBytes) }]
              : asset
                ? [{ label: 'Size', value: formatBytes(asset.sizeBytes) }]
                : []),
            ...(getStringField(input, 'mimeType')
              ? [{ label: 'Type', value: getStringField(input, 'mimeType') as string }]
              : [])
          ]
        }
      }
    ]
  }
}

const buildSaveToInboxDetails = (activity: NormalizedActivity): ActivityDetails => {
  const input = getInput(activity)
  const refs = Array.isArray(input?.refs)
    ? input.refs.filter((ref): ref is string => typeof ref === 'string')
    : []
  const sections: DetailSection[] =
    refs.length > 0
      ? [{ kind: 'code', label: 'References', text: refs.join('\n'), language: 'text' }]
      : fallbackGenericSections(activity)
  return {
    displayName: 'Save to library inbox',
    subtitle: refs.length > 0 ? `${refs.length} refs` : undefined,
    sections
  }
}

// "Title (https://url)" lines from the search result text, mirroring the app's
// web-search row: query on top, clickable result list below.
const parseWebSearchResults = (activity: NormalizedActivity): { title: string; url: string }[] => {
  const text = getOutputText(activity) ?? ''
  const results: { title: string; url: string }[] = []
  for (const line of text.split('\n')) {
    const match = /^(.*) \((https?:\/\/[^)]+)\)\s*$/.exec(line.trim())
    if (match) results.push({ title: match[1], url: match[2] })
  }
  return results
}

// Recursively finds a query field in nested structured payloads (port of the
// app's extractQueryFromUnknown in workspace-web-search-details.ts).
const extractQueryFromUnknown = (value: unknown): string | undefined => {
  if (Array.isArray(value)) {
    for (const item of value) {
      const query = extractQueryFromUnknown(item)
      if (query) return query
    }
  }
  if (!isRecord(value)) return undefined
  for (const key of ['query', 'q', 'searchQuery', 'search_query']) {
    const raw = value[key]
    if (typeof raw === 'string' && raw.trim()) return stripWrappingQuotes(raw)
  }
  for (const property of Object.values(value)) {
    const nestedQuery = extractQueryFromUnknown(property)
    if (nestedQuery) return nestedQuery
  }
  return undefined
}

// Claude-style plain-text search summaries carry the query in their first line.
const WEB_SEARCH_QUERY_PATTERN = /Web search results for query:\s*["“]([^"”\n]+)["”]/iu

const extractQueryFromText = (value: string): string | undefined => {
  const match = value.match(WEB_SEARCH_QUERY_PATTERN)
  return match?.[1] ? stripWrappingQuotes(match[1]) : undefined
}

const buildWebSearchDetails = (activity: NormalizedActivity): ActivityDetails => {
  // Prefer explicit payload queries, then plain-text summaries, then the title.
  const query =
    extractQueryFromUnknown(activity.input) ??
    extractQueryFromUnknown(activity.output) ??
    extractQueryFromUnknown(activity.contentBlocks) ??
    extractQueryFromText(getOutputText(activity) ?? '') ??
    (trimDetail(activity.title) ? stripWrappingQuotes(activity.title.trim()) : undefined)
  const results = parseWebSearchResults(activity)
  const sections: DetailSection[] = []
  if (query) sections.push({ kind: 'code', label: 'Query', text: query, language: 'text' })
  if (results.length > 0) {
    sections.push({
      kind: 'markdown',
      label: `Results (${results.length})`,
      text: results.map((result) => `- [${result.title}](${result.url})`).join('\n')
    })
  }
  if (sections.length === 0) sections.push(...fallbackGenericSections(activity))
  return {
    displayName: 'Web Search',
    subtitle: query || undefined,
    metaLabel: results.length > 0 ? `${results.length} results` : undefined,
    sections
  }
}

// Resolves the command string for execute tools from raw input or the activity title.
const getCommandText = (activity: NormalizedActivity): string | undefined => {
  const command = getStringField(getInput(activity), 'command')?.trim()
  return command || trimDetail(activity.title)
}

// --- edit (diff) tools -------------------------------------------------------
// Port of the app's buildDiffDetails: per-file diff sections from ACP diff
// content blocks, "+A −R" meta, path or file-count subtitle.

// Detects file-editing tools by ACP kind or a known editor tool name (Edit, Write, str_replace…).
const EDIT_PROVIDER_TOOL_NAMES = new Set([
  'edit',
  'multiedit',
  'write',
  'write_file',
  'edit_file',
  'create_file',
  'str_replace',
  'strreplace',
  'str_replace_editor',
  'apply_patch',
  'fswrite',
  'fsappend',
  'notebookedit'
])

const isEditActivity = (activity: NormalizedActivity): boolean => {
  if (activity.toolKind === 'edit') return true
  const providerName = trimDetail(activity.providerToolName)?.toLowerCase() ?? ''
  return EDIT_PROVIDER_TOOL_NAMES.has(providerName)
}

type DiffContent = { path: string; oldText: string | null; newText: string }

const collectDiffs = (activity: NormalizedActivity): DiffContent[] =>
  (activity.contentBlocks ?? []).flatMap((block) => {
    if (!isRecord(block) || block.type !== 'diff') return []
    if (typeof block.path !== 'string' || typeof block.newText !== 'string') return []
    return [
      {
        path: block.path,
        oldText: typeof block.oldText === 'string' ? block.oldText : null,
        newText: block.newText
      }
    ]
  })

const countLines = (value: string | null): number =>
  value ? value.replace(/\n$/u, '').split('\n').length : 0

// Formats the compact "+A −R" summary shown on the right side of an edit row.
const formatDiffMeta = (added: number, removed: number): string | undefined => {
  const parts: string[] = []
  if (added > 0) parts.push(`+${added}`)
  if (removed > 0) parts.push(`−${removed}`)
  return parts.length > 0 ? parts.join(' ') : undefined
}

const buildDiffDetails = (activity: NormalizedActivity): ActivityDetails | undefined => {
  const diffs = collectDiffs(activity)
  if (diffs.length === 0) return undefined

  let totalAdded = 0
  let totalRemoved = 0
  const sections: DetailSection[] = diffs.map((diff) => {
    const added = countLines(diff.newText)
    const removed = countLines(diff.oldText)
    totalAdded += added
    totalRemoved += removed
    return {
      kind: 'diff',
      label: basename(diff.path),
      language: EXTENSION_LANGUAGES[diff.path.split('.').pop()?.toLowerCase() ?? ''],
      oldText: diff.oldText,
      newText: diff.newText
    }
  })

  return {
    displayName: getToolDisplayName(activity),
    // A single diff shows its path; several collapse to a count.
    subtitle: diffs.length === 1 ? diffs[0].path : `${diffs.length} files`,
    metaLabel: formatDiffMeta(totalAdded, totalRemoved),
    sections
  }
}

// --- execute tools (Bash / scripts) ------------------------------------------
// Port of the app's buildExecuteDetails: Command + Output sections, exit-code meta.

// Extracts a terminal exit code from known output envelope shapes (bare JSON,
// MCP result/structuredContent wrappers, arrays of text parts).
const extractExitCode = (value: unknown, depth = 0): number | undefined => {
  if (depth > 5 || value === null || value === undefined) return undefined
  if (typeof value === 'string') {
    try {
      return extractExitCode(JSON.parse(value), depth + 1)
    } catch {
      return undefined
    }
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      const code = extractExitCode(
        isRecord(item) && typeof item.text === 'string' ? item.text : item,
        depth + 1
      )
      if (code !== undefined) return code
    }
    return undefined
  }
  if (isRecord(value)) {
    for (const key of ['exitCode', 'exit_code', 'exitStatus', 'exit_status']) {
      const code = value[key]
      if (typeof code === 'number' && Number.isFinite(code)) return code
    }
    for (const nested of [value.result, value.structuredContent]) {
      const code = extractExitCode(nested, depth + 1)
      if (code !== undefined) return code
    }
  }
  return undefined
}

const buildExecuteDetails = (activity: NormalizedActivity): ActivityDetails | undefined => {
  const command = getCommandText(activity)
  const output = getOutputText(activity)
  const sections: DetailSection[] = []
  if (command) sections.push({ kind: 'code', label: 'Command', text: command, language: 'bash' })
  if (output) sections.push({ kind: 'code', label: 'Output', text: output })
  if (sections.length === 0) return undefined

  const exitCode = extractExitCode(activity.output)
  return {
    displayName: getToolDisplayName(activity),
    subtitle: command,
    metaLabel: exitCode !== undefined ? `exit ${exitCode}` : undefined,
    sections
  }
}

// --- plan tools (generate_plan / update_step_status) -------------------------
// Static port of the app's generate-plan projection; the replay timeline is a
// stateless single-activity view, so update_step_status renders as its own
// friendly row instead of folding into a plan card like the app does.
const buildPlanDetails = (activity: NormalizedActivity): ActivityDetails => {
  const isGeneratePlan = [activity.providerToolName, activity.title].some((name) =>
    matchToolName(name, 'open-science-plan', 'generate_plan')
  )

  if (!isGeneratePlan) {
    const update = parsePlanStepUpdate(activity)
    if (!update) {
      return {
        displayName: 'Plan step update',
        metaLabel: activity.status === 'failed' ? 'failed' : undefined,
        sections: fallbackGenericSections(activity)
      }
    }
    const summary: ToolSummary = {
      title: 'Plan step update',
      fields: [
        { label: 'Step', value: update.title },
        ...(update.status
          ? [{ label: 'Status', value: PLAN_STEP_STATUS_LABELS[update.status] ?? update.status }]
          : []),
        ...(update.notes ? [{ label: 'Notes', value: update.notes }] : [])
      ]
    }
    return {
      displayName: 'Plan step update',
      subtitle: update.title,
      metaLabel: activity.status === 'failed' ? 'failed' : undefined,
      sections: [{ kind: 'summary', summary }]
    }
  }

  const projection = projectGeneratePlanActivity(activity)
  const sections: DetailSection[] = []
  if (projection.kind === 'content') {
    sections.push({ kind: 'plan', projection })
  } else if (projection.kind === 'revision-conflict') {
    sections.push({ kind: 'markdown', label: 'Detail', text: projection.detail })
  } else if (projection.kind === 'unavailable' || projection.kind === 'failed') {
    // Malformed/missing plan documents degrade to the raw input/output view.
    sections.push(...fallbackGenericSections(activity))
  }
  // approved / rejected / already-pending are heading-only rows.
  return {
    displayName: projection.heading,
    metaLabel:
      projection.kind === 'content'
        ? `${projection.steps.length} ${projection.steps.length === 1 ? 'step' : 'steps'}`
        : activity.status === 'failed'
          ? 'failed'
          : undefined,
    sections
  }
}

// Exported for tests; the audit script shares the classifier it dispatches on.
export const buildActivityDetails = (
  activity: NormalizedActivity,
  assets: Record<string, UseCaseAsset>
): ActivityDetails => {
  // Dispatch order lives in activity-classify.ts (shared with the coverage audit).
  switch (classifyActivityRenderer(activity)) {
    case 'skill':
      return buildSkillDetails(activity)
    case 'notebook':
      return buildNotebookDetails(activity)
    case 'notebook-control':
      return buildNotebookControlDetails(activity)
    case 'read':
      return buildReadDetails(activity)
    case 'packages':
      return buildPackagesDetails(activity)
    case 'artifact-write':
      return buildArtifactWriteDetails(activity, assets)
    case 'library-inbox':
      return buildSaveToInboxDetails(activity)
    case 'websearch':
      return buildWebSearchDetails(activity)
    case 'plan':
      return buildPlanDetails(activity)
    default: {
      // Edit tools with diff payloads get per-file diff sections; execute
      // tools get Command/Output with an exit-code meta (both app behaviors).
      if (isEditActivity(activity)) {
        const diffDetails = buildDiffDetails(activity)
        if (diffDetails) return diffDetails
      }
      if (activity.toolKind === 'execute') {
        const executeDetails = buildExecuteDetails(activity)
        if (executeDetails) return executeDetails
      }
      const displayName = getToolDisplayName(activity)
      // App rule (workspace-tool-activity-details.ts): execute tools lead with
      // the command; everything else takes the first location path, else the
      // raw title. A subtitle that just repeats the tool name is dropped.
      const candidateSubtitle =
        activity.toolKind === 'execute'
          ? getCommandText(activity)
          : (trimDetail(activity.locations?.[0]?.path) ?? trimDetail(activity.title))
      return {
        displayName,
        subtitle:
          candidateSubtitle && candidateSubtitle !== displayName ? candidateSubtitle : undefined,
        metaLabel: activity.status === 'failed' ? 'failed' : undefined,
        sections: fallbackGenericSections(activity)
      }
    }
  }
}

// Static port of the app's manage-packages ledger (WorkspaceManagePackagesActivityRow):
// Package/Status/Version grid, status under the name on narrow screens, related
// changes behind a toggle, and the failure message in red below the table.
const PackageLedgerTable = ({
  section
}: {
  section: Extract<DetailSection, { kind: 'packageLedger' }>
}) => {
  const statusClass = section.failed
    ? 'text-status-failure-foreground'
    : section.warning
      ? 'text-status-warning-foreground'
      : 'text-status-success-foreground'
  const changeLabel = (row: PackageLedgerRow): string =>
    row.change === 'updated'
      ? 'Updated'
      : row.change === 'removed'
        ? 'Removed'
        : row.change === 'unchanged'
          ? 'Unchanged'
          : row.change === 'installed'
            ? 'Installed'
            : section.failed
              ? 'Failed'
              : 'Installed'
  const gridClass =
    'grid min-w-0 grid-cols-[minmax(0,1fr)_auto] gap-x-3 sm:grid-cols-[minmax(0,1fr)_minmax(76px,auto)_minmax(88px,auto)]'
  return (
    <div>
      {section.packages.length > 0 ? (
        <div className="border-y border-border-200">
          <div
            className={`${gridClass} border-b border-border-200 px-2.5 py-1.5 text-[11px] font-medium text-text-200`}
          >
            <span>Package</span>
            <span className="hidden sm:block">Status</span>
            <span className="text-right">Version</span>
          </div>
          <div className="divide-y divide-border-200">
            {section.packages.map((row, index) => (
              <div
                key={`${row.name}-${index}`}
                className={`${gridClass} items-center px-2.5 py-2 text-[12px]`}
              >
                <div className="min-w-0" title={row.name}>
                  <span className="block truncate font-medium text-text-000">{row.name}</span>
                  {row.source ? (
                    <span className="block truncate text-[11px] text-text-200">{row.source}</span>
                  ) : null}
                  <span className={`mt-0.5 block text-[11px] sm:hidden ${statusClass}`}>
                    {changeLabel(row)}
                  </span>
                </div>
                <span className={`hidden sm:block ${statusClass}`}>{changeLabel(row)}</span>
                <span className="block truncate text-right font-mono tabular-nums text-text-100">
                  {row.version ?? '—'}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : null}
      {section.related.length > 0 ? (
        <details className="border-b border-border-200 text-[12px]">
          <summary className={`${sectionLabelClassName} cursor-pointer select-none`}>
            Related changes ({section.related.length})
          </summary>
          <div className="divide-y divide-border-200 border-t border-border-200">
            {section.related.map((row, index) => (
              <div key={`${row.name}-${index}`} className={`${gridClass} items-center px-2.5 py-2`}>
                <span className="block min-w-0 truncate font-medium text-text-000">{row.name}</span>
                <span className="hidden text-text-100 sm:block">
                  {row.change === 'updated'
                    ? 'Updated'
                    : row.change === 'removed'
                      ? 'Removed'
                      : 'Installed'}
                </span>
                <span className="block truncate text-right font-mono tabular-nums text-text-100">
                  {row.version ?? '—'}
                </span>
              </div>
            ))}
          </div>
        </details>
      ) : null}
      {section.error ? (
        <p
          className="mt-2 line-clamp-2 break-words text-[12px] text-status-failure-foreground"
          title={section.error}
        >
          {section.error}
        </p>
      ) : null}
    </div>
  )
}

const SectionBody = ({ section }: { section: DetailSection }) => {
  const openPreview = useFilePreview()
  switch (section.kind) {
    case 'code':
      return (
        <ToolCodeBlock
          code={section.text}
          language={section.language}
          lineNumbers={section.lineNumbers}
          className={section.muted ? '[&_code]:text-text-200' : undefined}
        />
      )
    case 'summary':
      return <ToolSummaryCard summary={section.summary} file={section.file} />
    case 'plan':
      return <PlanCard projection={section.projection} />
    case 'diff':
      return <ToolDiffBlock oldText={section.oldText} newText={section.newText} />
    case 'markdown':
      return (
        <div className="max-h-[320px] overflow-auto rounded-md border border-border-200 bg-bg-000 px-3 py-2.5">
          <SessionMarkdown content={section.text} />
        </div>
      )
    case 'packages':
      return (
        <div className="flex flex-wrap gap-1">
          {section.packages.map((pkg) => (
            <span
              key={pkg}
              className="rounded bg-bg-200 px-1.5 py-0.5 font-mono text-[11px] text-text-100"
            >
              {pkg}
            </span>
          ))}
        </div>
      )
    case 'packageLedger':
      return <PackageLedgerTable section={section} />
    case 'image':
      return (
        <button
          type="button"
          onClick={() =>
            openPreview?.({ name: section.label, url: section.url, mimeType: section.mimeType })
          }
          className="block w-fit cursor-pointer overflow-hidden rounded-md border border-border-200 bg-bg-000"
          title={`Preview ${section.label}`}
        >
          {/* biome-ignore lint/performance/noImgElement: exported figure URLs should render without Next image rewriting. */}
          <img
            src={section.url}
            alt={section.label}
            className="max-h-[320px] w-auto max-w-full"
            loading="lazy"
            decoding="async"
          />
        </button>
      )
  }
}

const createRowDetailsDomId = (activityId: string): string =>
  `tool-details-${activityId.replace(/[^A-Za-z0-9_-]/gu, '_') || 'row'}`

export const ActivityRow = ({
  activity,
  assets,
  defaultExpanded = false
}: {
  activity: NormalizedActivity
  assets: Record<string, UseCaseAsset>
  /** Start expanded; used by SSR tests to render the detail panel. */
  defaultExpanded?: boolean
}) => {
  const details = useMemo(() => buildActivityDetails(activity, assets), [activity, assets])
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)
  // Figure outputs render beside the row, not inside the collapsible details,
  // so collapsing the row never hides a produced chart (app:
  // NotebookToolFigureOutputs sits outside the row's detail panel).
  const figures = details.sections.filter((section) => section.kind === 'image')
  const collapsibleSections = details.sections.filter((section) => section.kind !== 'image')
  const canExpand = collapsibleSections.length > 0
  const detailsDomId = createRowDetailsDomId(activity.id)
  // The details builder may override the outer status (e.g. a notebook run
  // that never executed is prepared, not failed).
  const failed = details.failed ?? activity.status === 'failed'

  return (
    <>
      <button
        type="button"
        className={cn(
          'flex w-full min-h-[44px] items-start gap-2 rounded-lg py-2 pl-1.5 pr-2.5 text-[13px] transition-colors md:min-h-0 md:items-center md:py-[5px]',
          failed ? 'text-danger-000 hover:bg-danger-900' : 'text-text-100 hover:bg-bg-200'
        )}
        aria-expanded={canExpand ? isExpanded : undefined}
        aria-controls={canExpand ? detailsDomId : undefined}
        disabled={!canExpand}
        onClick={() => setIsExpanded((current) => !current)}
      >
        <span
          className={cn(
            'mt-0.5 inline-flex shrink-0 items-center md:mt-0',
            failed && 'text-status-failure-foreground'
          )}
        >
          <ActivityIcon activity={activity} failed={details.failed} />
        </span>
        <span className="min-w-0 flex-1 text-left md:flex md:items-center md:gap-2">
          <span className="block shrink-0 text-text-000">{details.displayName}</span>
          {details.subtitle ? (
            <>
              <span className="hidden shrink-0 text-text-300 md:inline">·</span>
              <span className="mt-0.5 block min-w-0 truncate font-normal text-text-100 md:mt-0">
                {details.subtitle}
              </span>
            </>
          ) : null}
        </span>
        {details.metaLabel ? (
          <span className="mt-0.5 shrink-0 whitespace-nowrap text-[12px] tabular-nums text-text-100 md:mt-0">
            {details.metaLabel}
          </span>
        ) : null}
      </button>
      {figures.length > 0 ? (
        <div className="mx-1 mb-1.5 space-y-2.5 md:ml-[30px]">
          {figures.map((section, index) => (
            <SectionBody key={`figure-${index}`} section={section} />
          ))}
        </div>
      ) : null}
      <AnimatePresence initial={false}>
        {canExpand && isExpanded ? (
          <motion.div
            key="details"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="overflow-hidden"
          >
            <div id={detailsDomId} className="mx-1 mb-1.5 space-y-2.5 md:ml-[30px]">
              {collapsibleSections.map((section, index) =>
                section.kind === 'summary' ||
                section.kind === 'plan' ||
                section.kind === 'packageLedger' ? (
                  <SectionBody key={`${section.kind}-${index}`} section={section} />
                ) : section.kind === 'code' && section.collapsible ? (
                  // Notebook outputs start collapsed (app: WorkspaceToolDetailsRow).
                  <details key={`${section.kind}-${section.label}-${index}`} className="space-y-1">
                    <summary className={`${sectionLabelClassName} cursor-pointer select-none`}>
                      {section.label}
                    </summary>
                    <div className="mt-1">
                      <SectionBody section={section} />
                    </div>
                  </details>
                ) : (
                  <div key={`${section.kind}-${section.label}-${index}`} className="space-y-1">
                    <SectionLabel>{section.label}</SectionLabel>
                    <SectionBody section={section} />
                  </div>
                )
              )}
              {activity.essentialTruncated ? (
                <div className="text-[11px] text-text-300">Output truncated</div>
              ) : null}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  )
}
