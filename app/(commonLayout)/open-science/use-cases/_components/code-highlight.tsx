'use client'

// Shared Shiki code body: lazy highlighting with a plain-text fallback and an
// optional line-number gutter. Used by ToolCodeBlock (tool-blocks.tsx) and the
// file preview dialog (file-preview.tsx); kept separate so neither imports the
// other.

import type { HighlightResult } from '@streamdown/code'
import { Fragment, useEffect, useState } from 'react'
import type { BundledLanguage } from 'shiki'
import { useCodeHighlighter } from './use-code-highlighter'

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

type TokenLine = HighlightResult['tokens'][number]

const TokenLineContent = ({ line }: { line: TokenLine }) => (
  <>
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
  </>
)

export const CodeHighlightContent = ({
  code: source,
  language,
  lineNumbers = false,
  wrap = false
}: {
  code: string
  language?: string
  lineNumbers?: boolean
  /** Wrap long lines; required for huge single-line payloads that otherwise
   * exceed the engine's paint width and vanish (minified JSON exports). */
  wrap?: boolean
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

  if (!lineNumbers) {
    return tokens
      ? tokens.map((line, lineIndex) => (
          <Fragment key={lineIndex}>
            <TokenLineContent line={line} />
            {lineIndex < tokens.length - 1 ? '\n' : null}
          </Fragment>
        ))
      : source
  }

  const plainLines = tokens ? undefined : source.split('\n')
  const lineCount = tokens ? tokens.length : (plainLines ?? []).length
  const gutterWidth = `${Math.max(String(lineCount).length, 2)}ch`
  return (
    <>
      {Array.from({ length: lineCount }, (_, lineIndex) => (
        <span key={lineIndex} className="grid grid-cols-[auto_minmax(0,1fr)]">
          <span
            aria-hidden="true"
            className="select-none pr-3 text-right text-text-300"
            style={{ minWidth: gutterWidth }}
          >
            {lineIndex + 1}
          </span>
          <span className={wrap ? 'whitespace-pre-wrap break-all' : 'whitespace-pre'}>
            {tokens ? (
              <TokenLineContent line={tokens[lineIndex] ?? []} />
            ) : (
              (plainLines?.[lineIndex] ?? '')
            )}
          </span>
        </span>
      ))}
    </>
  )
}
