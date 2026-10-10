'use client'

import { Download, Eye, FileImage, FileSpreadsheet, FileText } from 'lucide-react'
import { useState } from 'react'
import type { MessageArtifact, MessageUpload, TranscriptItem } from '@/lib/use-case-types'
import { cn } from '@/lib/utils'
import {
  formatByteSize,
  getPreviewText,
  isTextPreviewArtifact,
  useArtifactTextPreview,
  useNearViewport
} from './artifact-preview'
import { AssetImage } from './asset-image'
import { CopyButton } from './copy-button'
import { ExtensionPreservingFileName } from './extension-preserving-file-name'
import { FileDownloadLink } from './file-download-link'
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
  const sizeLabel = formatByteSize(artifact.size)
  // Text files preview their first lines in the thumbnail; loading, failed
  // fetches, and empty content keep the file-type icon.
  const showTextPreview =
    !isImage && Boolean(artifact.url) && isTextPreviewArtifact(artifact.name, artifact.mimeType)
  const { ref: thumbnailRef, near } = useNearViewport<HTMLDivElement>()
  const previewText = useArtifactTextPreview(showTextPreview ? artifact.url : undefined, near)
  const previewSnippet = previewText ? getPreviewText(previewText) : ''
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
      <div
        ref={thumbnailRef}
        className="flex h-[56px] w-full items-center justify-center overflow-hidden bg-bg-200"
      >
        {isImage && artifact.url ? (
          <AssetImage
            filename={artifact.name}
            mimeType={artifact.mimeType}
            src={artifact.url}
            alt={artifact.name}
            className="size-full object-cover object-top"
            loading="lazy"
            decoding="async"
          />
        ) : previewSnippet ? (
          <div className="size-full overflow-hidden bg-bg-000 px-2 py-1.5" aria-hidden="true">
            <pre className="m-0 line-clamp-4 whitespace-pre-wrap break-words font-mono text-[9px] leading-[1.15] text-text-000">
              {previewSnippet}
            </pre>
          </div>
        ) : (
          <FileText className="size-5 text-text-300" strokeWidth={1.75} aria-hidden="true" />
        )}
      </div>
      <div className="flex w-full items-center px-2 pt-1">
        <ExtensionPreservingFileName
          name={artifact.name}
          compact
          className="flex-1 text-[11px] leading-4 text-text-100"
        />
        {sizeLabel ? (
          <span className="ml-1 shrink-0 text-[11px] text-text-000">{sizeLabel}</span>
        ) : null}
      </div>
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
    <FileDownloadLink
      href={artifact.url}
      download={artifact.name}
      className={`relative ${artifactCardClassName}`}
      title={`Download ${artifact.name} (no in-site preview for this type)`}
    >
      {card}
    </FileDownloadLink>
  ) : (
    <div
      className={`relative ${artifactCardClassName} cursor-default`}
      title={`${artifact.name} was not bundled with this export`}
    >
      {card}
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

// Gray pill for a user-uploaded attachment, shown above the bubble text like
// the app's MessageUploadAttachmentList. Clickable only when the package
// bundled the bytes; otherwise display-only.
const uploadChipClassName =
  'inline-flex max-w-full items-center gap-1.5 rounded-md border border-border-200 bg-bg-200 px-2 py-0.5 text-left text-[13px] leading-5 text-text-000'

const UploadChipIcon = ({ mimeType }: { mimeType?: string }) => {
  const Icon = mimeType?.startsWith('image/')
    ? FileImage
    : mimeType === 'text/csv' || mimeType?.includes('spreadsheet')
      ? FileSpreadsheet
      : FileText
  return <Icon className="size-3.5 shrink-0 text-text-300" aria-hidden="true" />
}

const UploadChip = ({ upload }: { upload: MessageUpload }) => {
  const openPreview = useFilePreview()
  const previewKind = upload.url ? previewKindFor(upload.name, upload.mimeType) : null
  const chip = (
    <>
      <UploadChipIcon mimeType={upload.mimeType} />
      <ExtensionPreservingFileName name={upload.name} compact />
    </>
  )
  if (previewKind && upload.url) {
    return (
      <button
        type="button"
        onClick={() =>
          openPreview?.({ name: upload.name, url: upload.url as string, mimeType: upload.mimeType })
        }
        className={cn(uploadChipClassName, 'transition-colors hover:bg-bg-000')}
        title={`Preview ${upload.name}`}
      >
        {chip}
      </button>
    )
  }
  return upload.url ? (
    <FileDownloadLink
      href={upload.url}
      download={upload.name}
      className={cn(uploadChipClassName, 'transition-colors hover:bg-bg-000')}
      title={`Download ${upload.name} (no in-site preview for this type)`}
    >
      {chip}
    </FileDownloadLink>
  ) : (
    <span className={uploadChipClassName} title={upload.name}>
      {chip}
    </span>
  )
}

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
              {message.uploads?.length ? (
                <div className="mb-1.5 flex flex-wrap items-start gap-1.5">
                  {message.uploads.map((upload, index) => (
                    <UploadChip key={`${upload.name}-${index}`} upload={upload} />
                  ))}
                </div>
              ) : null}
              {message.parts && message.parts.length > 0 ? (
                <MessagePartsContent parts={message.parts} content={message.content} />
              ) : (
                <p className="whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
                  {message.content}
                </p>
              )}
            </div>
          </div>
          {Number.isFinite(message.createdAt) ? (
            <span className="mt-1 text-[11px] leading-4 text-text-000/70 tabular-nums">
              Sent · {formatCompleted(message.createdAt)}
            </span>
          ) : null}
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
