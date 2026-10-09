'use client'

import Panzoom, { type PanzoomObject } from '@panzoom/panzoom'
import {
  Check,
  Copy,
  Download,
  ExternalLink,
  Eye,
  FileText,
  LoaderCircle,
  X,
  ZoomIn,
  ZoomOut
} from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState
} from 'react'
import { waitForBrowserMock } from '@/mocks/ready'
import { AssetImage } from './asset-image'
import { ExtensionPreservingFileName } from './extension-preserving-file-name'
import { FileDownloadLink } from './file-download-link'
import { SessionMarkdown } from './session-markdown'

// In-site preview for exported session files. Kinds the browser can render
// open in a modal; anything else downloads directly (see ArtifactCard).
export type PreviewKind = 'image' | 'markdown' | 'json' | 'csv' | 'text' | 'pdf'

export interface PreviewFile {
  name: string
  url: string
  mimeType?: string
}

const IMAGE_EXTENSIONS = ['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp']
const TEXT_EXTENSIONS = [
  'txt',
  'log',
  'py',
  'js',
  'ts',
  'tsx',
  'sh',
  'r',
  'yaml',
  'yml',
  'toml',
  'xml'
]

const extensionOf = (name: string): string => {
  const segment = name.split(/[?#]/u)[0]
  return segment.includes('.') ? (segment.split('.').pop()?.toLowerCase() ?? '') : ''
}

export const previewKindFor = (name: string, mimeType?: string): PreviewKind | null => {
  const ext = extensionOf(name)
  if (mimeType?.startsWith('image/') || IMAGE_EXTENSIONS.includes(ext)) return 'image'
  if (mimeType === 'application/pdf' || ext === 'pdf') return 'pdf'
  if (ext === 'md' || ext === 'markdown') return 'markdown'
  if (ext === 'csv' || mimeType === 'text/csv') return 'csv'
  if (ext === 'json' || mimeType?.includes('json')) return 'json'
  if (mimeType?.startsWith('text/') || TEXT_EXTENSIONS.includes(ext)) return 'text'
  return null
}

// SVG blobs keep image/svg+xml so <img> renders them, but navigating to one as
// a top-level document would run its scripts same-origin — downloads and inline
// images are the only offered exits, never "open in a new tab".
export const canOpenInNewTab = (file: PreviewFile): boolean =>
  file.mimeType !== 'image/svg+xml' && extensionOf(file.name) !== 'svg'

const isTextKind = (kind: PreviewKind | null): kind is 'markdown' | 'json' | 'csv' | 'text' =>
  kind === 'markdown' || kind === 'json' || kind === 'csv' || kind === 'text'

// Minimal RFC-4180-ish CSV parser (quoted fields, escaped quotes, newlines in quotes).
const parseCsv = (text: string): string[][] => {
  const rows: string[][] = []
  let field = ''
  let row: string[] = []
  let inQuotes = false
  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        field += char
      }
    } else if (char === '"') {
      inQuotes = true
    } else if (char === ',') {
      row.push(field)
      field = ''
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && text[i + 1] === '\n') i++
      row.push(field)
      field = ''
      if (row.some((cell) => cell !== '')) rows.push(row)
      row = []
    } else {
      field += char
    }
  }
  row.push(field)
  if (row.some((cell) => cell !== '')) rows.push(row)
  return rows
}

const CSV_PREVIEW_ROWS = 100

const CsvPreview = ({ text }: { text: string }) => {
  const rows = parseCsv(text)
  const [header, ...body] = rows
  const visible = body.slice(0, CSV_PREVIEW_ROWS)
  if (!header) return <pre className="whitespace-pre-wrap break-words text-xs">{text}</pre>
  return (
    <div className="max-h-[60vh] overflow-auto rounded-md border border-border-200">
      <table className="w-full min-w-max border-separate border-spacing-0 text-xs">
        <thead>
          <tr>
            {header.map((cell, index) => (
              <th
                key={`h-${index}`}
                className="sticky top-0 border-b border-border-200 bg-bg-100 px-3 py-2 text-left font-medium text-text-100"
              >
                {cell}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {visible.map((cells, rowIndex) => (
            <tr key={`r-${rowIndex}`}>
              {cells.map((cell, cellIndex) => (
                <td
                  key={`c-${cellIndex}`}
                  className="border-b border-border-200/50 px-3 py-1.5 align-top text-text-000"
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {body.length > CSV_PREVIEW_ROWS ? (
        <p className="px-3 py-2 text-[11px] text-text-300">
          Showing the first {CSV_PREVIEW_ROWS} of {body.length} rows — download for the full file.
        </p>
      ) : null}
    </div>
  )
}

const TextContent = ({ kind, text }: { kind: PreviewKind; text: string }) => {
  if (kind === 'markdown') return <SessionMarkdown content={text} />
  if (kind === 'csv') return <CsvPreview text={text} />
  const pretty =
    kind === 'json'
      ? (() => {
          try {
            return JSON.stringify(JSON.parse(text), null, 2)
          } catch {
            return text
          }
        })()
      : text
  return (
    <pre className="max-h-[60vh] overflow-auto whitespace-pre-wrap break-words rounded-md border border-border-200 bg-bg-000 p-3 font-mono text-xs text-text-000">
      {pretty}
    </pre>
  )
}

const ImageContent = ({ file }: { file: PreviewFile }) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const imageRef = useRef<HTMLImageElement>(null)
  const panzoomRef = useRef<PanzoomObject | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [zoomed, setZoomed] = useState(false)

  // Wheel zoom + drag pan; initialize only after the image has measurable size.
  useEffect(() => {
    if (!loaded || !imageRef.current) return
    const panzoom = Panzoom(imageRef.current, {
      maxScale: 8,
      minScale: 0.5,
      contain: 'outside',
      cursor: 'grab'
    })
    panzoomRef.current = panzoom
    const container = containerRef.current
    const onWheel = (event: WheelEvent) => {
      event.preventDefault()
      panzoom.zoomWithWheel(event)
      setZoomed(true)
    }
    container?.addEventListener('wheel', onWheel, { passive: false })
    return () => {
      container?.removeEventListener('wheel', onWheel)
      panzoom.destroy()
      panzoomRef.current = null
    }
  }, [loaded])

  const zoomIn = () => {
    panzoomRef.current?.zoomIn({ animate: true })
    setZoomed(true)
  }
  const zoomOut = () => {
    panzoomRef.current?.zoomOut({ animate: true })
    setZoomed(true)
  }
  const reset = () => {
    panzoomRef.current?.reset({ animate: true })
    setZoomed(false)
  }

  return (
    <div className="relative">
      <div
        ref={containerRef}
        className="flex min-h-[240px] max-h-[70vh] items-center justify-center overflow-hidden rounded-md bg-bg-100"
      >
        <AssetImage
          filename={file.name}
          mimeType={file.mimeType}
          ref={imageRef}
          src={file.url}
          alt={file.name}
          onLoad={() => setLoaded(true)}
          className="max-h-[70vh] w-auto max-w-full select-none"
          draggable={false}
        />
      </div>
      <div className="absolute bottom-2 right-2 flex items-center gap-1 rounded-md bg-black/55 p-1">
        <button
          type="button"
          onClick={zoomOut}
          aria-label="Zoom out"
          className="flex size-7 items-center justify-center rounded text-white hover:bg-white/20"
        >
          <ZoomOut className="size-3.5" aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={zoomIn}
          aria-label="Zoom in"
          className="flex size-7 items-center justify-center rounded text-white hover:bg-white/20"
        >
          <ZoomIn className="size-3.5" aria-hidden="true" />
        </button>
        {zoomed ? (
          <button
            type="button"
            onClick={reset}
            aria-label="Reset zoom"
            className="flex h-7 items-center rounded px-1.5 text-[11px] font-medium text-white hover:bg-white/20"
          >
            Reset
          </button>
        ) : null}
      </div>
    </div>
  )
}

const iconButtonClassName =
  'flex size-7 items-center justify-center rounded-md text-text-300 transition-colors hover:bg-bg-200 hover:text-text-000'

const FilePreviewDialog = ({ file, onClose }: { file: PreviewFile; onClose: () => void }) => {
  const kind = previewKindFor(file.name, file.mimeType)
  const panelRef = useRef<HTMLDivElement>(null)
  const [textState, setTextState] = useState<{ text?: string; pdfUrl?: string; error?: string }>({})
  const [copied, setCopied] = useState(false)

  // Fetch text and PDF only when opened; hashed CDN objects may use a generic MIME type.
  useEffect(() => {
    if (!isTextKind(kind) && kind !== 'pdf') return
    let pdfUrl: string | undefined
    let cancelled = false
    const controller = new AbortController()
    waitForBrowserMock()
      .then(() => fetch(file.url, { signal: controller.signal, credentials: 'omit' }))
      .then(async (response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        if (kind === 'pdf') {
          const blob = await response.blob()
          if (cancelled) return
          pdfUrl = URL.createObjectURL(blob.slice(0, blob.size, 'application/pdf'))
          setTextState({ pdfUrl })
        } else {
          const text = await response.text()
          if (!cancelled) setTextState({ text })
        }
      })
      .catch((error: unknown) => {
        if (!cancelled)
          setTextState({ error: error instanceof Error ? error.message : 'Failed to load' })
      })
    return () => {
      cancelled = true
      controller.abort()
      if (pdfUrl) URL.revokeObjectURL(pdfUrl)
    }
  }, [file.url, kind])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  // Lock background scroll and move focus into the dialog while it is open.
  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    const previousFocus =
      document.activeElement instanceof HTMLElement ? document.activeElement : null
    document.body.style.overflow = 'hidden'
    panelRef.current?.focus()
    return () => {
      document.body.style.overflow = previousOverflow
      previousFocus?.focus()
    }
  }, [])

  const copyText = async () => {
    if (textState.text === undefined) return
    try {
      await navigator.clipboard.writeText(textState.text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // clipboard unavailable (e.g. insecure context) — leave the button unchanged
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={file.name}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8"
    >
      <motion.button
        type="button"
        aria-label="Close preview"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-black/45 backdrop-blur-[2px]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
      />
      <motion.div
        ref={panelRef}
        tabIndex={-1}
        className="relative flex max-h-full w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-border-200 bg-bg-000 shadow-dialog outline-none"
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: 8 }}
        transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="flex items-center gap-2 border-b border-border-200/70 px-4 py-3">
          <FileText className="size-4 shrink-0 text-text-300" aria-hidden="true" />
          <ExtensionPreservingFileName
            name={file.name}
            className="min-w-0 flex-1 text-[13px] font-medium text-text-000"
          />
          {isTextKind(kind) && textState.text !== undefined ? (
            <button
              type="button"
              onClick={copyText}
              aria-label="Copy file content"
              title="Copy file content"
              className={iconButtonClassName}
            >
              {copied ? (
                <Check className="size-3.5 text-status-success-foreground" aria-hidden="true" />
              ) : (
                <Copy className="size-3.5" aria-hidden="true" />
              )}
            </button>
          ) : null}
          {canOpenInNewTab(file) ? (
            <a
              href={textState.pdfUrl ?? file.url}
              target="_blank"
              rel="noreferrer"
              aria-label="Open in a new tab"
              title="Open in a new tab"
              className={iconButtonClassName}
            >
              <ExternalLink className="size-3.5" aria-hidden="true" />
            </a>
          ) : null}
          <FileDownloadLink
            href={file.url}
            download={file.name}
            aria-label="Download the file"
            title="Download the file"
            className={iconButtonClassName}
          >
            <Download className="size-3.5" aria-hidden="true" />
          </FileDownloadLink>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close preview"
            title="Close preview"
            className={iconButtonClassName}
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>
        <div className="flex min-h-[240px] min-w-0 flex-col overflow-auto p-4">
          {textState.error ? (
            <p role="alert" className="text-sm text-status-failure-foreground">
              Could not load the file: {textState.error}
            </p>
          ) : kind === 'image' ? (
            <ImageContent file={file} />
          ) : kind === 'pdf' && !textState.pdfUrl ? (
            <p role="status">Loading…</p>
          ) : kind === 'pdf' ? (
            <div className="space-y-2">
              <iframe
                src={textState.pdfUrl}
                title={file.name}
                className="h-[70vh] w-full rounded-md border border-border-200 bg-bg-100"
              />
              <p className="text-[11px] text-text-300">
                If the PDF does not render inline,{' '}
                <a
                  href={textState.pdfUrl ?? file.url}
                  target="_blank"
                  rel="noreferrer"
                  className="underline underline-offset-2"
                >
                  open it in a new tab
                </a>
                .
              </p>
            </div>
          ) : isTextKind(kind) ? (
            textState.text === undefined ? (
              <div className="flex flex-1 items-center justify-center gap-2 text-text-300">
                <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
                <span className="text-sm">Loading…</span>
              </div>
            ) : (
              <TextContent kind={kind} text={textState.text} />
            )
          ) : (
            <p className="text-sm text-text-200">This file type cannot be previewed here.</p>
          )}
        </div>
      </motion.div>
    </div>
  )
}

const PreviewContext = createContext<((file: PreviewFile) => void) | null>(null)

/**
 * Preview opener, or null when no FilePreviewProvider is mounted (e.g. the
 * detail page renders SessionMarkdown without one). Callers outside the
 * transcript must degrade to plain links instead of intercepting clicks.
 */
export const useFilePreview = (): ((file: PreviewFile) => void) | null => useContext(PreviewContext)

export const FilePreviewProvider = ({ children }: { children: ReactNode }) => {
  const [file, setFile] = useState<PreviewFile | null>(null)
  const open = useCallback((next: PreviewFile) => setFile(next), [])
  const close = useCallback(() => setFile(null), [])
  return (
    <PreviewContext.Provider value={open}>
      {children}
      <AnimatePresence>
        {file ? <FilePreviewDialog key={file.url} file={file} onClose={close} /> : null}
      </AnimatePresence>
    </PreviewContext.Provider>
  )
}

// Standalone trigger with its own modal, for server-rendered surfaces like the
// use-case intro page's artifact table.
export const ArtifactPreviewButton = ({ file }: { file: PreviewFile }) => {
  const [open, setOpen] = useState(false)
  const kind = previewKindFor(file.name, file.mimeType)
  if (!kind) {
    return (
      <FileDownloadLink
        href={file.url}
        download={file.name}
        className="inline-flex items-center gap-1 text-xs text-[#6b6b66] underline underline-offset-2"
      >
        <Download className="size-3" aria-hidden="true" />
        Download only
      </FileDownloadLink>
    )
  }
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 text-xs text-[#111] underline underline-offset-2"
      >
        <Eye className="size-3" aria-hidden="true" />
        Preview
      </button>
      <AnimatePresence>
        {open ? (
          <div className="osp-session text-left">
            <FilePreviewDialog key={file.url} file={file} onClose={() => setOpen(false)} />
          </div>
        ) : null}
      </AnimatePresence>
    </>
  )
}
