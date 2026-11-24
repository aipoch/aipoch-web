'use client'

import { ArrowLeft, ChevronRight, X } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import {
  createScienceImport,
  INITIAL_IMPORT_STATE,
  type ImportState,
  scienceImportFilename
} from '@/lib/science-package/browser-import'
import type { GuidedLab, UseCasePackage } from '@/lib/use-case-types'
import { CopyButton } from './copy-button'
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
  const dialog = useRef<HTMLDialogElement>(null)
  const [listening, setListening] = useState(false)
  const [opened, setOpened] = useState(false)
  const [agentExpanded, setAgentExpanded] = useState(true)
  const agentField = useRef<HTMLTextAreaElement>(null)
  const [frameReady, setFrameReady] = useState(false)
  const [frameSlow, setFrameSlow] = useState(false)
  const [frameAttempt, setFrameAttempt] = useState(0)
  const [state, setState] = useState<ImportState>(INITIAL_IMPORT_STATE)
  const session = useRef<ReturnType<typeof createScienceImport> | null>(null)
  const downloadUrl = packageInfo.importUrl ?? packageInfo.url

  useEffect(() => {
    const current = createScienceImport(
      {
        url: downloadUrl,
        filename: packageInfo.filename,
        sizeBytes: packageInfo.sizeBytes,
        sha256: packageInfo.sha256
      },
      setState
    )
    session.current = current
    return () => {
      current.dispose()
      session.current = null
    }
  }, [downloadUrl, packageInfo.filename, packageInfo.sizeBytes, packageInfo.sha256])

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
    if (!listening || frameReady) return
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
  }, [frameReady, lab.entryUrl, listening])

  useEffect(() => {
    if (opened) dialog.current?.showModal()
  }, [opened])
  const agentPrompt = `Open "${title}" in AIPOCH Open-Science. Download ${packageInfo.filename} from ${downloadUrl}, then import it and open the research conversation. If Open-Science is missing, install it from https://aipoch.com/open-science/download.`
  const file = session.current?.preparedFile()
  const busy = ['downloading', 'opening', 'sending', 'canceling'].includes(state.phase)
  const total = state.total ?? packageInfo.sizeBytes
  const percent =
    total && state.loaded !== undefined
      ? Math.min(100, Math.floor((state.loaded / total) * 100))
      : undefined
  const save = () => {
    if (!file) return
    const url = URL.createObjectURL(file)
    const link = document.createElement('a')
    link.href = url
    link.download = scienceImportFilename(packageInfo.filename)
    document.body.append(link)
    link.click()
    link.remove()
    window.setTimeout(() => URL.revokeObjectURL(url), 60000)
  }
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
      {listening && (
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
          The lab is taking longer to open.{' '}
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
      <dialog
        ref={dialog}
        className={styles.dialog}
        aria-labelledby="lab-project-title"
        onClose={() => {
          setOpened(false)
          setAgentExpanded(true)
        }}
      >
        <header>
          <div>
            <p>Open-Science project</p>
            <h2 id="lab-project-title">{title}</h2>
          </div>
          <button type="button" aria-label="Close project" onClick={() => dialog.current?.close()}>
            <X size={20} />
          </button>
        </header>
        <div className={styles.body}>
          <div className={styles.promptRow}>
            <h3>
              <button
                type="button"
                className={styles.disclosure}
                aria-expanded={agentExpanded}
                aria-controls="lab-agent-prompt"
                onClick={() => setAgentExpanded(!agentExpanded)}
              >
                <ChevronRight size={15} aria-hidden="true" />
                Open with an agent
              </button>
            </h3>
            <CopyButton
              text={agentPrompt}
              label="Copy import instructions"
              onCopyError={() => {
                setAgentExpanded(true)
                requestAnimationFrame(() => agentField.current?.select())
              }}
            />
          </div>
          <textarea
            id="lab-agent-prompt"
            ref={agentField}
            aria-label="Agent import prompt"
            value={agentPrompt}
            readOnly
            hidden={!agentExpanded}
          />
          <hr />
          <h3>Research package</h3>
          <p className={styles.filename}>
            {packageInfo.filename} · {(packageInfo.sizeBytes / 1e6).toFixed(1)} MB
          </p>
          {state.phase === 'downloading' || state.phase === 'sending' ? (
            <div className={styles.progress}>
              <progress
                aria-label={state.phase === 'downloading' ? 'Download progress' : 'Import progress'}
                value={percent}
                max={100}
              />
              <span>{percent === undefined ? '…' : `${percent}%`}</span>
            </div>
          ) : null}
          <div className={styles.actions}>
            {!file && !busy && (
              <button type="button" onClick={() => void session.current?.prepare(true)}>
                Download .science
              </button>
            )}
            {file && (
              <button type="button" onClick={save}>
                Save to device
              </button>
            )}
            {file && !busy && state.phase !== 'unsupported' && (
              <button
                type="button"
                onClick={() => {
                  if (state.action === 'resume') void session.current?.resume()
                  else if (state.phase === 'received') session.current?.openApp()
                  else void session.current?.open()
                }}
              >
                {state.action === 'resume'
                  ? 'Reconnect to Open-Science'
                  : state.phase === 'received'
                    ? 'Open Open-Science'
                    : 'Import into Open-Science'}
              </button>
            )}
            {busy && (
              <button
                type="button"
                disabled={state.phase === 'canceling'}
                onClick={() => session.current?.cancel()}
              >
                Cancel
              </button>
            )}
          </div>
          <p role="status">{state.launchError || state.message}</p>
        </div>
      </dialog>
    </main>
  )
}
