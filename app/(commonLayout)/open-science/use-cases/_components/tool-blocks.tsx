'use client'

import type { HighlightResult } from '@streamdown/code'
import { FileText, FlaskConical, Info } from 'lucide-react'
import { Fragment, type ReactNode, useEffect, useState } from 'react'
import type { BundledLanguage } from 'shiki'
import { cn } from '@/lib/utils'
import { previewKindFor, useFilePreview } from './file-preview'
import { useCodeHighlighter } from './use-code-highlighter'

// Static ports of WorkspaceToolCodeBlock / WorkspaceToolDiffBlock / WorkspaceToolSummaryCard.

export const sectionLabelClassName = 'text-[11px] font-medium uppercase tracking-wide text-text-300'

export const SectionLabel = ({ children }: { children: ReactNode }) => (
  <div className={sectionLabelClassName}>{children}</div>
)

// Shiki font-style bitmask: Italic = 1, Bold = 2, Underline = 4.
const fontStyleToCss = (fontStyle: number | undefined): React.CSSProperties => {
  if (!fontStyle) return {}
  const style: React.CSSProperties = {}
  if (fontStyle & 1) style.fontStyle = 'italic'
  if (fontStyle & 2) style.fontWeight = 600
  if (fontStyle & 4) style.textDecoration = 'underline'
  return style
}

// Keys a highlight request to its exact input so stale tokens never paint newer code.
const createHighlightKey = (code: string, language: string | undefined): string =>
  language ? `${language} ${code}` : ''

// Light-only site: both theme slots are github-light, matching the session markdown.
const SHIKI_THEMES: ['github-light', 'github-light'] = ['github-light', 'github-light']

// Renders code with lazy Shiki highlighting, falling back to plain text before tokens resolve.
export const ToolCodeBlock = ({
  code: source,
  language,
  className
}: {
  code: string
  language?: string
  className?: string
}) => {
  const [highlighted, setHighlighted] = useState<{ key: string; result: HighlightResult } | null>(
    null
  )
  const highlightKey = createHighlightKey(source, language)
  const highlighter = useCodeHighlighter(Boolean(language))

  useEffect(() => {
    if (!language || !highlighter?.supportsLanguage(language as BundledLanguage)) return

    let active = true
    const apply = (result: HighlightResult): void => {
      if (active) setHighlighted({ key: highlightKey, result })
    }
    // The highlighter loads languages/themes asynchronously; cached hits return immediately instead.
    const immediate = highlighter.highlight(
      { code: source, language: language as BundledLanguage, themes: SHIKI_THEMES },
      apply
    )
    if (immediate) queueMicrotask(() => apply(immediate))

    return () => {
      active = false
    }
  }, [source, language, highlightKey, highlighter])

  // Only paint tokens that were produced for the currently rendered code and language.
  const tokens = highlighted?.key === highlightKey ? highlighted.result.tokens : undefined

  return (
    <div
      className={cn(
        'group relative max-h-[320px] overflow-hidden rounded-md border border-border-200 bg-bg-000',
        className
      )}
    >
      <pre data-language={language} className="m-0 max-h-[320px] overflow-auto px-3 py-2.5">
        <code className="block whitespace-pre font-mono text-[12px] leading-relaxed text-text-000">
          {tokens
            ? tokens.map((line, lineIndex) => (
                <Fragment key={lineIndex}>
                  {line.map((token, tokenIndex) => (
                    <span
                      key={tokenIndex}
                      style={{
                        color: token.color,
                        ...(token.htmlStyle as React.CSSProperties | undefined),
                        ...fontStyleToCss(token.fontStyle)
                      }}
                    >
                      {token.content}
                    </span>
                  ))}
                  {lineIndex < tokens.length - 1 ? '\n' : null}
                </Fragment>
              ))
            : source}
        </code>
      </pre>
    </div>
  )
}

const prettyPrint = (value: unknown): string => {
  if (typeof value === 'string') {
    try {
      return JSON.stringify(JSON.parse(value), null, 2)
    } catch {
      return value
    }
  }
  try {
    return JSON.stringify(value, null, 2) ?? String(value)
  } catch {
    return String(value)
  }
}

export const ToolJsonBlock = ({ value, className }: { value: unknown; className?: string }) => (
  <ToolCodeBlock code={prettyPrint(value)} language="json" className={className} />
)

type DiffLine = {
  type: 'added' | 'removed'
  text: string
}

const toLines = (value: string): string[] => value.replace(/\n$/u, '').split('\n')

const buildDiffLines = (oldText: string | null, newText: string): DiffLine[] => {
  const removed: DiffLine[] = oldText
    ? toLines(oldText).map((text) => ({ type: 'removed', text }))
    : []
  const added: DiffLine[] = newText ? toLines(newText).map((text) => ({ type: 'added', text })) : []

  return [...removed, ...added]
}

export const ToolDiffBlock = ({
  oldText,
  newText
}: {
  oldText: string | null
  newText: string
}) => {
  const lines = buildDiffLines(oldText, newText)

  return (
    <pre className="max-h-[320px] overflow-auto rounded-md border border-border-200 bg-bg-000 py-2.5 font-mono text-[12px] leading-relaxed">
      <code className="block whitespace-pre">
        {lines.map((line, index) => (
          <span
            key={`${line.type}-${index}`}
            className={cn(
              'block px-3',
              line.type === 'added'
                ? 'bg-emerald-500/10 text-emerald-700'
                : 'bg-rose-500/10 text-rose-700'
            )}
          >
            <span aria-hidden="true" className="mr-2 select-none opacity-70">
              {line.type === 'added' ? '+' : '−'}
            </span>
            {line.text || ' '}
          </span>
        ))}
      </code>
    </pre>
  )
}

export type ToolSummaryField = {
  label: string
  value: string
  expandable?: boolean
  href?: string
}

export type ToolSummaryRow = {
  title: string
  status?: string
  detail?: string
  error?: string
}

export type ToolSummary = {
  title: string
  subtitle?: string
  fields: ToolSummaryField[]
  rows?: ToolSummaryRow[]
  error?: string
  note?: string
}

export const ToolSummaryCard = ({
  summary,
  file = false
}: {
  summary: ToolSummary
  file?: boolean
}) => {
  const Icon = file ? FileText : FlaskConical
  const openPreview = useFilePreview()
  const renderError = (error: string) => (
    <div
      role="status"
      className="mt-2 rounded-md bg-status-failure-surface p-3 text-xs text-status-failure-foreground"
    >
      <p className="max-h-32 overflow-auto whitespace-pre-wrap break-words">
        {error.slice(0, 2000)}
      </p>
      {error.length > 2000 ? <p className="mt-2">Output truncated</p> : null}
    </div>
  )
  return (
    <section
      aria-label={summary.title}
      className="min-w-0 overflow-hidden rounded-xl border border-border-200 bg-bg-000"
    >
      <div className="flex items-center gap-3 border-b border-border-200/70 px-4 py-3">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="size-4" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <h4 className="text-[13px] font-medium text-text-000">{summary.title}</h4>
          {summary.subtitle ? (
            <p className="break-words text-xs text-text-200">{summary.subtitle}</p>
          ) : null}
        </div>
      </div>
      {summary.fields.length ? (
        <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-5 gap-y-2 px-4 py-3 text-xs">
          {summary.fields.map((field) => (
            <div key={field.label} className="contents">
              <dt className="text-text-300">{field.label}</dt>
              <dd className="min-w-0 break-all text-text-100">
                {field.href && previewKindFor(field.value) ? (
                  <button
                    type="button"
                    onClick={() => openPreview?.({ name: field.value, url: field.href as string })}
                    className="underline underline-offset-2 hover:text-text-000"
                  >
                    {field.value}
                  </button>
                ) : field.href ? (
                  <a
                    href={field.href}
                    target="_blank"
                    rel="noreferrer"
                    className="underline underline-offset-2 hover:text-text-000"
                  >
                    {field.value}
                  </a>
                ) : field.expandable ? (
                  <details>
                    <summary className="cursor-pointer">
                      {field.value.split(/[\\/]/u).filter(Boolean).slice(-2).join('/')}
                    </summary>
                    <p className="mt-2 text-text-300">{field.value}</p>
                  </details>
                ) : (
                  field.value
                )}
              </dd>
            </div>
          ))}
        </dl>
      ) : null}
      {summary.rows?.length ? (
        <div className="divide-y divide-border-200/70 border-t border-border-200/70">
          {summary.rows.map((row) => (
            <div key={row.title} className="px-4 py-2.5">
              <div className="flex items-start justify-between gap-3">
                <span className="min-w-0 break-all text-xs font-medium text-text-100">
                  {row.title}
                </span>
                {row.status ? (
                  <span className="shrink-0 rounded bg-bg-200 px-1.5 py-0.5 text-[10px] text-text-200">
                    {row.status}
                  </span>
                ) : null}
              </div>
              {row.detail ? (
                <p className="mt-1 break-words text-[11px] text-text-300">{row.detail}</p>
              ) : null}
              {row.error ? renderError(row.error) : null}
            </div>
          ))}
        </div>
      ) : null}
      {summary.error ? <div className="m-3">{renderError(summary.error)}</div> : null}
      {summary.note ? (
        <div className="flex items-start gap-2 border-t border-border-200/70 bg-bg-100 px-4 py-3 text-[11px] leading-5 text-text-200">
          <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
          <p>{summary.note}</p>
        </div>
      ) : null}
    </section>
  )
}
