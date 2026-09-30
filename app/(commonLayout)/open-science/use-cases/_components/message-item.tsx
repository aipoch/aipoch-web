'use client'

import { Download, Eye, FileText } from 'lucide-react'
import { useState } from 'react'
import type { MessageArtifact, TranscriptItem } from '@/lib/use-case-types'
import { CopyButton } from './copy-button'
import { previewKindFor, useFilePreview } from './file-preview'
import { SessionMarkdown } from './session-markdown'

type TranscriptMessage = Extract<TranscriptItem, { type: 'message' }>

const userMessageBubbleClassName =
  'max-w-[90%] break-words rounded-2xl bg-bg-300 px-3.5 py-2 text-sm text-message-user-text md:max-w-[min(85%,56rem)] md:px-4 md:py-2.5 md:text-[15px]'

const assistantMessageSurfaceClassName =
  'relative w-full max-w-[56rem] text-sm leading-relaxed text-text-000 md:text-[15px]'

const artifactCardClassName =
  'h-[82px] w-[128px] shrink-0 cursor-pointer overflow-hidden rounded-lg border border-border-200 bg-bg-000 text-left text-text-000 shadow-none transition-colors hover:bg-bg-200 active:bg-bg-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-200/60'

const artifactGalleryClassName = 'grid max-w-full grid-cols-[repeat(auto-fill,128px)] gap-2 pb-1'

const mentionPillClassName =
  'inline-block max-w-[220px] truncate align-middle rounded px-1.5 py-0.5 mx-0.5 text-sm font-medium bg-bg-200 text-text-100'

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

// Structured parts drive styled pills; anything unrecognized falls back to plain text.
const MessagePartsContent = ({ parts, content }: { parts: unknown[]; content: string }) => (
  <p className="whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
    {parts.map((part, index) => {
      if (!isRecord(part)) return null
      if (part.type === 'text' && typeof part.text === 'string') {
        return <span key={`text-${index}`}>{part.text}</span>
      }
      const pillText =
        (typeof part.name === 'string' && part.name) ||
        (typeof part.title === 'string' && part.title) ||
        (isRecord(part.item) && typeof part.item.title === 'string' && part.item.title) ||
        null
      if (!pillText) return null
      const prefix = part.type === 'skill' ? '/' : part.type === 'session' ? '#' : '@'
      return (
        <span key={`part-${index}`} className={mentionPillClassName}>
          {prefix}
          {pillText}
        </span>
      )
    })}
    {parts.length === 0 ? content : null}
  </p>
)

const ArtifactCard = ({ artifact }: { artifact: MessageArtifact }) => {
  const openPreview = useFilePreview()
  const isImage = artifact.mimeType?.startsWith('image/') && Boolean(artifact.url)
  const previewKind = artifact.url ? previewKindFor(artifact.name, artifact.mimeType) : null
  const badge = (
    <span className="absolute right-1 top-1 flex size-5 items-center justify-center rounded bg-bg-000/85 text-text-300">
      {previewKind ? (
        <Eye className="size-3" aria-hidden="true" />
      ) : (
        <Download className="size-3" aria-hidden="true" />
      )}
    </span>
  )
  const card = (
    <>
      <div className="flex h-[56px] w-full items-center justify-center overflow-hidden bg-bg-200">
        {isImage && artifact.url ? (
          // biome-ignore lint/performance/noImgElement: exported object URLs should render without Next image rewriting.
          <img
            src={artifact.url}
            alt={artifact.name}
            className="size-full object-cover"
            loading="lazy"
            decoding="async"
          />
        ) : (
          <FileText className="size-5 text-text-300" strokeWidth={1.75} aria-hidden="true" />
        )}
      </div>
      <div className="truncate px-2 pt-1 text-[11px] leading-4 text-text-100">{artifact.name}</div>
      {artifact.url ? badge : null}
    </>
  )

  if (previewKind && artifact.url) {
    return (
      <button
        type="button"
        onClick={() =>
          openPreview?.({
            name: artifact.name,
            url: artifact.url as string,
            mimeType: artifact.mimeType
          })
        }
        className={`relative ${artifactCardClassName}`}
        title={`Preview ${artifact.name}`}
      >
        {card}
      </button>
    )
  }
  return artifact.url ? (
    <a
      href={artifact.url}
      download={artifact.name}
      className={`relative ${artifactCardClassName}`}
      title={`Download ${artifact.name} (no in-site preview for this type)`}
    >
      {card}
    </a>
  ) : (
    <div
      className={`relative ${artifactCardClassName} cursor-default`}
      title={
        artifact.fullOnly
          ? `${artifact.name} ships in the full version — load it to preview or download`
          : `${artifact.name} was not bundled with this export`
      }
    >
      {card}
      {artifact.fullOnly ? (
        <span className="absolute bottom-6 left-1 rounded bg-bg-000/85 px-1 py-px text-[9px] font-medium uppercase tracking-wide text-text-300">
          Full only
        </span>
      ) : null}
    </div>
  )
}

// Format date and time separately: a combined Intl format joins them with
// "at" or "," depending on the ICU version, which differs between the Node
// server and the browser and breaks hydration.
const completedDateFormatter = new Intl.DateTimeFormat('en-US', {
  day: 'numeric',
  month: 'short',
  year: 'numeric'
})
const completedTimeFormatter = new Intl.DateTimeFormat('en-US', {
  hour: 'numeric',
  minute: '2-digit'
})
const formatCompleted = (ms: number): string => {
  const date = new Date(ms)
  return `${completedDateFormatter.format(date)} at ${completedTimeFormatter.format(date)}`
}

const ARTIFACT_GALLERY_VISIBLE_COUNT = 5

// Mirrors the app's MessageArtifactList: labeled strip pinned to the message
// that produced the files, first five cards visible, "+N more" expands.
const ArtifactGallery = ({ artifacts }: { artifacts: MessageArtifact[] }) => {
  const [expanded, setExpanded] = useState(false)
  const visibleArtifacts = expanded ? artifacts : artifacts.slice(0, ARTIFACT_GALLERY_VISIBLE_COUNT)
  const remainingCount = artifacts.length - visibleArtifacts.length
  return (
    <div className="mt-3 border-t border-border-200 pt-3">
      <div className="mb-2 text-[11px] font-medium uppercase text-text-300">
        Generated · {artifacts.length}
      </div>
      <div className={artifactGalleryClassName}>
        {visibleArtifacts.map((artifact) => (
          <ArtifactCard key={`${artifact.name}-${artifact.url ?? ''}`} artifact={artifact} />
        ))}
        {remainingCount > 0 ? (
          <button
            type="button"
            onClick={() => setExpanded(true)}
            aria-label="Expand generated files"
            className={`flex items-center justify-center text-[13px] font-semibold ${artifactCardClassName}`}
          >
            +{remainingCount} more
          </button>
        ) : null}
        {expanded && artifacts.length > ARTIFACT_GALLERY_VISIBLE_COUNT ? (
          <button
            type="button"
            onClick={() => setExpanded(false)}
            aria-label="Collapse generated files"
            className={`flex items-center justify-center text-[13px] ${artifactCardClassName}`}
          >
            Show less
          </button>
        ) : null}
      </div>
    </div>
  )
}

export const SessionMessageItem = ({
  message,
  showTurnCompletion = false
}: {
  message: TranscriptMessage
  showTurnCompletion?: boolean
}) => {
  if (message.role === 'user') {
    return (
      <div className="px-4 pb-1 pt-3 md:px-6">
        <div className="group flex flex-col items-end">
          <div className="flex w-full max-w-full items-center justify-end gap-1">
            <div className="flex items-center gap-0.5 opacity-0 transition-opacity duration-150 group-hover:opacity-100 focus-within:opacity-100">
              <CopyButton text={message.content} />
            </div>
            <div className={userMessageBubbleClassName}>
              {message.parts && message.parts.length > 0 ? (
                <MessagePartsContent parts={message.parts} content={message.content} />
              ) : (
                <p className="whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
                  {message.content}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="px-4 pb-1 pt-3 md:px-6">
      <div className={assistantMessageSurfaceClassName}>
        <SessionMarkdown content={message.content} />
        {message.artifacts?.length ? <ArtifactGallery artifacts={message.artifacts} /> : null}
        {showTurnCompletion ? (
          <div className="mt-3 flex items-center gap-x-3 whitespace-nowrap text-[11px] leading-4 text-text-000/70 tabular-nums">
            <div className="flex items-center gap-0.5">
              <CopyButton text={message.content} />
            </div>
            {message.completedAt ? (
              <span>Completed · {formatCompleted(message.completedAt)}</span>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  )
}
