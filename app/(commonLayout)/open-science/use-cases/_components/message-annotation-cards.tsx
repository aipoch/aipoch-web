'use client'

// Static port of the app's SentAnnotationCards for the replay: pdf quote/area,
// text quotes, and image points ride inside the user's bubble; pdf quote cards
// clamp to three lines with an expand toggle rendered beside (never nested
// inside) the card's activate button.

import { FileText, MapPin, Quote, ScanLine } from 'lucide-react'
import { useLayoutEffect, useRef, useState } from 'react'
import type { MessageAnnotation } from '@/lib/use-case-types'
import { useFilePreview } from './file-preview'

const QUOTE_PREVIEW_LINES = 3

const AreaBody = ({ annotation }: { annotation: Extract<MessageAnnotation, { kind: 'area' }> }) => (
  <div
    className={`mt-2 ${annotation.image ? 'grid grid-cols-[5rem_minmax(0,1fr)] gap-2' : 'block'}`}
  >
    {annotation.image ? (
      // biome-ignore lint/performance/noImgElement: exported region crops render without rewriting.
      <img
        src={`data:${annotation.image.mimeType};base64,${annotation.image.data}`}
        alt=""
        className="h-14 w-20 rounded-md border border-border-200 bg-bg-100 object-cover"
      />
    ) : annotation.imageOmitted ? (
      <span className="block text-[11px] text-text-300">
        Image not retained: session image budget reached.
      </span>
    ) : null}
    <span className="line-clamp-3 self-center whitespace-pre-wrap break-words text-[12px] leading-5 text-text-000/90">
      {annotation.content}
    </span>
  </div>
)

const headerFor = (annotation: MessageAnnotation) => {
  if (annotation.kind === 'area') return { icon: ScanLine, title: 'PDF area' }
  if (annotation.kind === 'quote') return { icon: FileText, title: 'PDF quote' }
  if (annotation.kind === 'text') return { icon: Quote, title: 'Text quote' }
  return { icon: MapPin, title: `Image point ${annotation.number}` }
}

const AnnotationCard = ({ annotation }: { annotation: MessageAnnotation }) => {
  const openPreview = useFilePreview()
  const { icon: Icon, title } = headerFor(annotation)
  // Only pdf quotes clamp (app parity); the toggle is measured on mount since
  // cards are keyed by annotation id upstream.
  const quoteRef = useRef<HTMLQuoteElement>(null)
  const [expanded, setExpanded] = useState(false)
  const [canExpand, setCanExpand] = useState(false)

  useLayoutEffect(() => {
    if (annotation.kind !== 'quote') return
    const quote = quoteRef.current
    if (!quote) return
    const style = window.getComputedStyle(quote)
    const lineHeight = Number.parseFloat(style.lineHeight)
    const previewHeight = Number.isFinite(lineHeight)
      ? lineHeight * QUOTE_PREVIEW_LINES
      : quote.clientHeight
    setCanExpand(quote.scrollHeight > previewHeight + 1)
    // biome-ignore lint/correctness/useExhaustiveDependencies: one measurement per mount
  }, [])

  const activate = () =>
    annotation.url &&
    openPreview?.({
      name: annotation.source ?? title,
      url: annotation.url,
      // Only PDF-sourced cards force the PDF viewer; text/point sources classify by extension.
      mimeType:
        annotation.kind === 'quote' || annotation.kind === 'area' ? 'application/pdf' : undefined
    })

  return (
    <article className="overflow-hidden rounded-lg border border-border-200 bg-bg-000/80">
      <button
        type="button"
        disabled={!annotation.url || !openPreview}
        aria-label="Show annotation source"
        onClick={activate}
        className="group w-full p-2 text-left transition-colors hover:bg-bg-100 disabled:cursor-default"
      >
        <div className="flex min-w-0 items-start gap-2">
          <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md bg-bg-200 text-text-100">
            <Icon className="size-3.5" aria-hidden="true" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[12px] font-semibold text-text-000">{title}</span>
            {annotation.source ? (
              <span className="block truncate text-[11px] text-text-200">{annotation.source}</span>
            ) : null}
          </span>
        </div>
        {annotation.kind === 'area' ? (
          <AreaBody annotation={annotation} />
        ) : annotation.kind === 'image-point' ? (
          <blockquote className="mt-2 whitespace-pre-wrap break-words border-l-2 border-border-300 pl-2 text-[12px] leading-5 text-text-000/90">
            {annotation.naturalSize
              ? `Point ${annotation.number} at ${Math.round(annotation.x * (annotation.naturalSize.width - 1))}, ${Math.round(annotation.y * (annotation.naturalSize.height - 1))}`
              : `Point ${annotation.number} at ${Math.round(annotation.x * 100)}%, ${Math.round(annotation.y * 100)}%`}
          </blockquote>
        ) : (
          <blockquote
            ref={quoteRef}
            className={`mt-2 whitespace-pre-wrap break-words border-l-2 border-border-300 pl-2 text-[12px] leading-5 text-text-000/90 ${
              expanded ? '' : annotation.kind === 'quote' ? 'line-clamp-3' : ''
            }`}
          >
            {annotation.content}
          </blockquote>
        )}
        {annotation.note ? (
          <span className="mt-2 block border-t border-border-200 pt-2 text-[12px] text-text-000">
            {annotation.note}
          </span>
        ) : null}
      </button>
      {annotation.kind === 'quote' && canExpand ? (
        <button
          type="button"
          aria-expanded={expanded}
          onClick={() => setExpanded((current) => !current)}
          className="block w-full border-t border-border-200 px-2 py-1 text-right text-[11px] font-medium text-text-300 transition-colors hover:bg-bg-100 hover:text-text-000"
        >
          {expanded ? 'Show less' : 'Show more'}
        </button>
      ) : null}
    </article>
  )
}

export const MessageAnnotationCards = ({ annotations }: { annotations: MessageAnnotation[] }) => (
  <div className="mb-2 space-y-2">
    {annotations.map((annotation) => (
      <AnnotationCard key={annotation.id} annotation={annotation} />
    ))}
  </div>
)
