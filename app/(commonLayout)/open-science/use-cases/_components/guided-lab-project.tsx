'use client'

import { ChevronRight, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import {
  createScienceImport,
  INITIAL_IMPORT_STATE,
  type ImportState,
  scienceImportFilename
} from '@/lib/science-package/browser-import'
import { OPEN_SCIENCE_INSTALL_PROMPT } from '@/lib/open-science-install-prompt'
import { readLabPackage, storeLabPackage } from '@/lib/science-package/lab-package-cache'
import type { UseCasePackage } from '@/lib/use-case-types'
import { CopyButton } from './copy-button'
import styles from './guided-lab-project.module.css'

type Project = { title: string; package: UseCasePackage }

export function GuidedLabProjectDialog({
  project,
  opened,
  onClose,
  error,
  onRetry
}: {
  project?: Project
  opened: boolean
  onClose: () => void
  error?: boolean
  onRetry?: () => void
}) {
  const dialog = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    if (opened && !dialog.current?.open) dialog.current?.showModal()
  }, [opened])
  return (
    <dialog
      ref={dialog}
      className={styles.dialog}
      aria-labelledby="lab-project-title"
      onClose={onClose}
    >
      <header>
        <div>
          <p>Open-Science project</p>
          <h2 id="lab-project-title">{project?.title ?? 'Open-Science'}</h2>
        </div>
        <button type="button" aria-label="Close project" onClick={() => dialog.current?.close()}>
          <X size={20} />
        </button>
      </header>
      {project ? (
        <ProjectActions
          key={project.package.sha256}
          title={project.title}
          packageInfo={project.package}
          opened={opened}
        />
      ) : (
        <div className={styles.body} role="status">
          <p>{error ? 'Could not load the project details.' : 'Loading project details…'}</p>
          {error && (
            <div className={styles.actions}>
              <button type="button" onClick={onRetry}>
                Try again
              </button>
            </div>
          )}
        </div>
      )}
    </dialog>
  )
}

function ProjectActions({
  title,
  packageInfo,
  opened
}: {
  title: string
  packageInfo: UseCasePackage
  opened: boolean
}) {
  const [agentExpanded, setAgentExpanded] = useState(true)
  const agentField = useRef<HTMLTextAreaElement>(null)
  const [state, setState] = useState<ImportState>(INITIAL_IMPORT_STATE)
  useEffect(() => {
    if (!opened) setAgentExpanded(true)
  }, [opened])
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

  const [file, setFile] = useState<Blob>()
  const [checking, setChecking] = useState(true)
  const [storing, setStoring] = useState(false)
  useEffect(() => {
    if (!opened || file) return
    let active = true
    setChecking(true)
    readLabPackage(packageInfo)
      .then((saved) => {
        if (active && saved) setFile(saved)
      })
      .catch(() => {})
      .finally(() => {
        if (active) setChecking(false)
      })
    return () => {
      active = false
    }
  }, [opened, file, packageInfo])

  async function prepareFile() {
    const current = session.current
    if (!current || !(await current.prepare(true))) return
    const verified = current.preparedFile()
    if (!verified || session.current !== current) return
    setStoring(true)
    let message = 'Package ready to save.'
    try {
      await storeLabPackage(packageInfo, verified)
    } catch {
      message = 'Package ready to save. Your browser could not cache it for the next visit.'
    }
    if (session.current !== current) return
    setFile(verified)
    setState({ phase: 'ready', message })
    setStoring(false)
  }

  const agentPrompt = `Import "${title}" in AIPOCH Open-Science. Download ${packageInfo.filename} from ${downloadUrl}, then import it and open the research session. If Open-Science is missing, ${OPEN_SCIENCE_INSTALL_PROMPT}`
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
        {!file && !busy && !storing && !checking && (
          <button type="button" onClick={() => void prepareFile()}>
            Download .science
          </button>
        )}
        {file && (
          <button type="button" onClick={save}>
            Save to device
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
      <p role="status">
        {storing ? 'Caching package…' : checking && !file ? 'Checking local cache…' : state.message}
      </p>
    </div>
  )
}
