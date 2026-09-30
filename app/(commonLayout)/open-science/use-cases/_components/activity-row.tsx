'use client'

import { AnimatePresence, motion } from 'motion/react'
import { useMemo, useState } from 'react'
import type { NormalizedActivity, NormalizedOutput, UseCaseAsset } from '@/lib/use-case-types'
import { cn } from '@/lib/utils'
import { classifyActivityRenderer } from './activity-classify'
import { ActivityIcon } from './activity-icon'
import { useFilePreview } from './file-preview'
import { SessionMarkdown } from './session-markdown'
import { SectionLabel, ToolCodeBlock, type ToolSummary, ToolSummaryCard } from './tool-blocks'

// Port of the buildToolActivityDetails priority chain (workspace-tool-activity-details.ts)
// adapted to the normalized export model. Every branch degrades to raw input/output JSON
// instead of throwing on unknown shapes.

type DetailSection =
  | { kind: 'code'; label: string; text: string; language?: string; muted?: boolean }
  | { kind: 'summary'; summary: ToolSummary; file?: boolean }
  | { kind: 'markdown'; label: string; text: string }
  | { kind: 'packages'; label: string; packages: string[] }
  | { kind: 'image'; label: string; url: string }

type ActivityDetails = {
  displayName: string
  subtitle?: string
  metaLabel?: string
  sections: DetailSection[]
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const getInput = (activity: NormalizedActivity): Record<string, unknown> | undefined =>
  isRecord(activity.input) ? activity.input : undefined

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

const prettifyToolName = (activity: NormalizedActivity): string => {
  const title = activity.title.trim()
  const provider = activity.providerToolName?.trim()
  if (title && title !== provider) return title
  const leaf = (provider ?? title).split('__').pop() ?? 'Tool'
  const words = leaf.replace(/_/g, ' ').trim()
  return words ? `${words.charAt(0).toUpperCase()}${words.slice(1)}` : 'Tool'
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
  const language =
    getStringField(input, 'language') ??
    (activity.providerToolName?.includes('repl') ? 'javascript' : undefined)
  const sections: DetailSection[] = []

  const script = run?.script ?? run?.text ?? getStringField(input, 'code')
  if (script) sections.push({ kind: 'code', label: 'Code', text: script, language })

  if (run) {
    for (const output of run.outputs) {
      sections.push(...notebookOutputSections(output))
    }
  }

  if (sections.length === 0) {
    const fallback = fallbackGenericSections(activity)
    sections.push(...fallback)
  }

  const statusLabel = run
    ? run.status === 'completed'
      ? 'done'
      : run.status || undefined
    : activity.status === 'failed'
      ? 'failed'
      : undefined

  return {
    displayName: 'Notebook run',
    subtitle: run?.cellId ?? getStringField(input, 'cellId'),
    metaLabel: statusLabel,
    sections
  }
}

const notebookOutputSections = (output: NormalizedOutput): DetailSection[] => {
  if (!NOTEBOOK_OUTPUT_LANGUAGE.has(output.type)) {
    return output.text ? [{ kind: 'code', label: output.type, text: output.text }] : []
  }
  if (output.type === 'stream') {
    if (!output.text) return []
    return [
      {
        kind: 'code',
        label: output.name ?? 'stream',
        text: output.text,
        muted: output.name === 'stderr'
      }
    ]
  }
  if (output.type === 'error') {
    const text =
      output.text ??
      (typeof output.evalue === 'string'
        ? `${String(output.ename ?? 'Error')}: ${output.evalue}`
        : undefined)
    return text ? [{ kind: 'code', label: 'Error', text, muted: true }] : []
  }
  const sections: DetailSection[] = []
  const data = output.data
  if (data) {
    if (typeof data['text/plain'] === 'string') {
      sections.push({ kind: 'code', label: 'Result', text: data['text/plain'] })
    }
    if (typeof data['image/png'] === 'string' && data['image/png'].startsWith('/')) {
      sections.push({ kind: 'image', label: 'Figure', url: data['image/png'] })
    }
  }
  if (sections.length === 0 && output.text) {
    sections.push({ kind: 'code', label: 'Result', text: output.text })
  }
  return sections
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

const buildPackagesDetails = (activity: NormalizedActivity): ActivityDetails => {
  const input = getInput(activity)
  const isManage = (activity.providerToolName ?? '').includes('manage_packages')
  const packages = Array.isArray(input?.packages)
    ? input.packages.filter((pkg): pkg is string => typeof pkg === 'string')
    : []
  const sections: DetailSection[] = []
  if (packages.length > 0) {
    sections.push({ kind: 'packages', label: 'Packages', packages })
  }
  const result = getOutputText(activity)
  if (result)
    sections.push({ kind: 'code', label: 'Result', text: pretty(result), language: 'json' })
  if (sections.length === 0) sections.push(...fallbackGenericSections(activity))
  return {
    displayName: isManage ? 'Manage packages' : 'Inspect packages',
    subtitle: getStringField(input, 'language'),
    metaLabel: activity.status === 'failed' ? 'failed' : undefined,
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

const buildWebSearchDetails = (activity: NormalizedActivity): ActivityDetails => {
  const input = getInput(activity)
  const query = getStringField(input, 'query') ?? ''
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

const buildActivityDetails = (
  activity: NormalizedActivity,
  assets: Record<string, UseCaseAsset>
): ActivityDetails => {
  // Dispatch order lives in activity-classify.ts (shared with the coverage audit).
  switch (classifyActivityRenderer(activity)) {
    case 'skill':
      return buildSkillDetails(activity)
    case 'notebook':
      return buildNotebookDetails(activity)
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
    default:
      return {
        displayName: prettifyToolName(activity),
        metaLabel: activity.status === 'failed' ? 'failed' : undefined,
        sections: fallbackGenericSections(activity)
      }
  }
}

const SectionBody = ({ section }: { section: DetailSection }) => {
  const openPreview = useFilePreview()
  switch (section.kind) {
    case 'code':
      return (
        <ToolCodeBlock
          code={section.text}
          language={section.language}
          className={section.muted ? '[&_code]:text-text-200' : undefined}
        />
      )
    case 'summary':
      return <ToolSummaryCard summary={section.summary} file={section.file} />
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
    case 'image':
      return (
        <button
          type="button"
          onClick={() => openPreview?.({ name: section.label, url: section.url })}
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
  assets
}: {
  activity: NormalizedActivity
  assets: Record<string, UseCaseAsset>
}) => {
  const details = useMemo(() => buildActivityDetails(activity, assets), [activity, assets])
  const [isExpanded, setIsExpanded] = useState(false)
  const canExpand = details.sections.length > 0
  const detailsDomId = createRowDetailsDomId(activity.id)
  const failed = activity.status === 'failed'

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
        <span className="mt-0.5 inline-flex shrink-0 items-center md:mt-0">
          <ActivityIcon activity={activity} />
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
              {activity.essentialTruncated ? (
                <p className="rounded-md bg-bg-200/70 px-2.5 py-1.5 text-[11px] text-text-200">
                  Long payloads are shortened in the essential view — load the full version for the
                  complete output.
                </p>
              ) : null}
              {details.sections.map((section, index) =>
                section.kind === 'summary' ? (
                  <SectionBody key={`summary-${index}`} section={section} />
                ) : (
                  <div key={`${section.kind}-${section.label}-${index}`} className="space-y-1">
                    <SectionLabel>{section.label}</SectionLabel>
                    <SectionBody section={section} />
                  </div>
                )
              )}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  )
}
