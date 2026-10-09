'use client'

import { type ComponentProps, useEffect, useState } from 'react'
import { waitForBrowserMock } from '@/mocks/ready'

type AssetImageProps = ComponentProps<'img'> & { filename?: string; mimeType?: string }

/** Retry mislabeled SVGs as image-only blobs after the browser's lazy image request fails. */
export const AssetImage = ({ filename, mimeType, src, onError, ...props }: AssetImageProps) => {
  const [failedSource, setFailedSource] = useState<string>()
  const [recovered, setRecovered] = useState<{ source: string; url: string }>()
  const sourceUrl = typeof src === 'string' ? src : ''
  const name = filename ?? sourceUrl.split('#')[1] ?? sourceUrl.split(/[?#]/)[0]
  const isSvg = mimeType === 'image/svg+xml' || /\.svg$/i.test(name)

  useEffect(() => {
    setRecovered(undefined)
    if (!src || failedSource !== src || !isSvg) return
    const controller = new AbortController()
    let objectUrl: string | undefined
    let cancelled = false
    // Keep SVG in <img>; never inject its markup or expose its blob as a navigable document.
    void waitForBrowserMock()
      .then(() => fetch(src, { signal: controller.signal, credentials: 'omit' }))
      .then(async (response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        const blob = await response.blob()
        if (cancelled) return
        objectUrl = URL.createObjectURL(blob.slice(0, blob.size, 'image/svg+xml'))
        setRecovered({ source: src, url: objectUrl })
      })
      .catch(() => {
        // Preserve the normal broken-image/alt-text state when recovery is unavailable.
      })
    return () => {
      cancelled = true
      controller.abort()
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [src, failedSource, isSvg])

  return (
    // biome-ignore lint/performance/noImgElement: exported resources must bypass Next image rewriting.
    <img
      {...props}
      alt={props.alt ?? ''}
      src={recovered && recovered.source === src ? recovered.url : src}
      onError={(event) => {
        if (isSvg && sourceUrl && !sourceUrl.startsWith('blob:')) setFailedSource(sourceUrl)
        onError?.(event)
      }}
    />
  )
}
