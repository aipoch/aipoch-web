'use client'

import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import type { GuidedLab, UseCasePackage } from '@/lib/use-case-types'
import { GuidedLabProjectDialog } from './guided-lab-project'
import styles from './guided-lab.module.css'

export function GuidedLabView({
  title,
  lab,
  packageInfo
}: {
  title: string
  lab: GuidedLab
  packageInfo: UseCasePackage
}) {
  const frame = useRef<HTMLIFrameElement>(null)
  const [listening, setListening] = useState(false)
  const [opened, setOpened] = useState(false)
  const [frameReady, setFrameReady] = useState(false)
  const [frameSlow, setFrameSlow] = useState(false)
  const [frameAttempt, setFrameAttempt] = useState(0)
  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (
        event.source !== frame.current?.contentWindow ||
        event.origin !== new URL(lab.entryUrl).origin
      )
        return
      if (event.data?.type === 'open-science:project') setOpened(true)
      if (event.data?.type === 'open-science:lab-ready') setFrameReady(true)
    }
    window.addEventListener('message', onMessage)
    setListening(true)
    return () => window.removeEventListener('message', onMessage)
  }, [lab.entryUrl])
  useEffect(() => {
    if (frameReady)
      frame.current?.contentWindow?.postMessage(
        { type: 'open-science:project-visibility', open: opened },
        new URL(lab.entryUrl).origin
      )
  }, [frameReady, opened, lab.entryUrl])
  // Retry the readiness check until the published document responds.
  useEffect(() => {
    if (!listening || frameReady || lab.standalone) return
    const ping = () =>
      frame.current?.contentWindow?.postMessage(
        { type: 'open-science:lab-ping' },
        new URL(lab.entryUrl).origin
      )
    ping()
    const timer = window.setInterval(ping, 1000)
    const slow = window.setTimeout(() => setFrameSlow(true), 18000)
    return () => {
      window.clearInterval(timer)
      window.clearTimeout(slow)
    }
  }, [frameReady, lab.entryUrl, lab.standalone, listening])

  return (
    <main className={styles.lab}>
      <div className={styles.bar}>
        <Link href="/open-science/use-cases">
          <ArrowLeft size={15} /> Use cases
        </Link>
        <h1>{title}</h1>
        <button type="button" disabled={!listening} onClick={() => setOpened(true)}>
          Project
        </button>
      </div>
      {lab.standalone && (
        <a className={styles.launch} href={lab.entryUrl} target="_blank" rel="noopener">
          {lab.screenshotUrl && (
            // biome-ignore lint/performance/noImgElement: This is the versioned publisher screenshot.
            <img src={lab.screenshotUrl} alt="" />
          )}
          <span>Open 3D lab in a new tab ↗</span>
        </a>
      )}
      {listening && !lab.standalone && (
        <iframe
          key={frameAttempt}
          ref={frame}
          title={title}
          src={lab.entryUrl}
          allow="fullscreen; autoplay; xr-spatial-tracking"
          sandbox="allow-scripts allow-same-origin allow-pointer-lock allow-downloads"
        />
      )}
      {frameSlow && !frameReady && (
        <div role="status" className={styles.notice}>
          <a href={lab.entryUrl} target="_blank" rel="noopener">
            Open lab in a new tab
          </a>{' '}
          or{' '}
          <button
            type="button"
            onClick={() => {
              setFrameAttempt((n) => n + 1)
            }}
          >
            Reload lab
          </button>
        </div>
      )}
      <GuidedLabProjectDialog
        project={{ title, package: packageInfo }}
        opened={opened}
        onClose={() => setOpened(false)}
      />
    </main>
  )
}
