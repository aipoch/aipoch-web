// Text-content thumbnails for artifact cards, ported from the Open-Science
// app's artifact-preview.tsx / lib/utils.ts. Pure helpers are unit-tested; the
// hooks are browser-only (IntersectionObserver + fetch).

import { type RefObject, useEffect, useRef, useState } from 'react'
import { previewKindFor } from './file-preview'

// Formats a byte count as a compact human-readable size (B/KB/MB), or undefined when unknown.
export const formatByteSize = (size: number | undefined): string | undefined => {
  if (typeof size !== 'number' || !Number.isFinite(size) || size < 0) return undefined
  if (size < 1024) return `${size} B`

  const kilobytes = size / 1024
  if (kilobytes < 1024) return `${Math.round(kilobytes)} KB`

  return `${(kilobytes / 1024).toFixed(1)} MB`
}

// First non-empty trimmed lines, capped — the card thumbnail paints these raw.
export const getPreviewText = (content: string, maxLines = 4): string =>
  content
    .replace(/\0/g, '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .slice(0, maxLines)
    .join('\n')

// previewKindFor's text-ish kinds already cover the common code extensions
// (py/r/js/ts/txt/log via TEXT_EXTENSIONS), markdown, JSON, and CSV.
const TEXT_PREVIEW_KINDS = new Set(['text', 'markdown', 'json', 'csv'])

export const isTextPreviewArtifact = (name: string, mimeType?: string): boolean =>
  TEXT_PREVIEW_KINDS.has(previewKindFor(name, mimeType) ?? '')

const PREVIEW_BYTE_LIMIT = 32768

const textPreviewCache = new Map<string, Promise<string | undefined>>()

// blob: URLs serve the whole blob anyway, so slice client-side; http(s) tries
// a Range request first and still caps the bytes in case the server ignores it.
const fetchTextPreview = (url: string): Promise<string | undefined> => {
  let cached = textPreviewCache.get(url)
  if (!cached) {
    cached = (async () => {
      try {
        if (url.startsWith('blob:')) {
          const response = await fetch(url)
          if (!response.ok) return undefined
          return await (await response.blob()).slice(0, PREVIEW_BYTE_LIMIT).text()
        }
        const response = await fetch(url, {
          headers: { Range: `bytes=0-${PREVIEW_BYTE_LIMIT - 1}` },
          credentials: 'omit'
        })
        if (!response.ok) return undefined
        return await (await response.blob()).slice(0, PREVIEW_BYTE_LIMIT).text()
      } catch {
        return undefined
      }
    })()
    textPreviewCache.set(url, cached)
  }
  return cached
}

export const useArtifactTextPreview = (
  url: string | undefined,
  enabled: boolean
): string | undefined => {
  const [state, setState] = useState<{ url: string; text?: string }>()

  useEffect(() => {
    if (!url || !enabled) return
    let active = true
    void fetchTextPreview(url).then((text) => {
      if (active) setState({ url, text })
    })
    return () => {
      active = false
    }
  }, [url, enabled])

  // A preview is only valid for the url it was fetched for.
  return url && state?.url === url ? state.text : undefined
}

// Flips to true (and stays) once the element enters the viewport, 240px early.
// Without IntersectionObserver everything loads immediately.
export const useNearViewport = <T extends HTMLElement>(): {
  ref: RefObject<T | null>
  near: boolean
} => {
  const ref = useRef<T>(null)
  const [near, setNear] = useState(false)

  useEffect(() => {
    if (near) return
    const element = ref.current
    if (!element) return
    if (typeof IntersectionObserver === 'undefined') {
      setNear(true)
      return
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setNear(true)
          observer.disconnect()
        }
      },
      { rootMargin: '240px' }
    )
    observer.observe(element)
    return () => observer.disconnect()
  }, [near])

  return { ref, near }
}
