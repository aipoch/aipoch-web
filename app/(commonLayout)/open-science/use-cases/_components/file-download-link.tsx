'use client'

import { type ComponentProps, useState } from 'react'
import { waitForBrowserMock } from '@/mocks/ready'

/** Fetch only on download: cross-origin hash URLs cannot honor an anchor's filename. */
export const FileDownloadLink = ({
  href,
  download,
  children,
  ...props
}: Omit<ComponentProps<'a'>, 'href' | 'download' | 'onClick'> & {
  href: string
  download: string
}) => {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string>()
  return (
    <>
      <a
        {...props}
        href={href}
        download={download}
        aria-busy={busy}
        onClick={async (event) => {
          if (!/^https?:/.test(href)) return
          event.preventDefault()
          if (busy) return
          setBusy(true)
          setError(undefined)
          try {
            await waitForBrowserMock()
            const response = await fetch(href, {
              credentials: 'omit',
              signal: AbortSignal.timeout(120_000)
            })
            if (!response.ok) throw new Error(`HTTP ${response.status}`)
            const url = URL.createObjectURL(await response.blob())
            const link = document.createElement('a')
            link.href = url
            link.download = download
            link.click()
            // Keep the URL alive until the browser has accepted the download.
            setTimeout(() => URL.revokeObjectURL(url), 1000)
          } catch (error) {
            setError(error instanceof Error ? error.message : 'Failed to download')
          } finally {
            setBusy(false)
          }
        }}
      >
        {children}
      </a>
      {error ? (
        <span role="alert" className="text-xs text-status-failure-foreground">
          Could not download the file: {error}. Try again.
        </span>
      ) : null}
    </>
  )
}
