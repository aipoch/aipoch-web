'use client'

import { ArrowUpRight, Globe, Paperclip, SlidersHorizontal } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import {
  createScienceImport,
  type ImportState,
  INITIAL_IMPORT_STATE
} from '@/lib/science-package/browser-import'
import type { UseCasePackage } from '@/lib/use-case-types'

const tools = [
  { icon: Paperclip, label: 'Attach files in Open-Science' },
  { icon: Globe, label: 'Research tools in Open-Science' },
  { icon: SlidersHorizontal, label: 'Configure your research in Open-Science' }
]

export function ImportComposer({ packageInfo }: { packageInfo: UseCasePackage }) {
  const [state, setState] = useState<ImportState>(INITIAL_IMPORT_STATE)
  const session = useRef<ReturnType<typeof createScienceImport> | null>(null)
  const { url, filename } = packageInfo
  const importUrl = packageInfo.importUrl ?? url
  useEffect(() => {
    setState(INITIAL_IMPORT_STATE)
    const current = createScienceImport({ url: importUrl, filename }, setState)
    session.current = current
    return () => {
      current.dispose()
      session.current = null
    }
  }, [importUrl, filename])
  const busy = ['checking', 'opening', 'downloading', 'sending', 'canceling'].includes(state.phase)
  const downloading = state.phase === 'downloading'
  const sending = state.phase === 'sending'
  const progressing = downloading || (sending && state.loaded !== undefined)
  const needsApp = state.needsApp
  const downloadPrompt = 'download it first'
  const inlineDownload = needsApp && state.message?.endsWith(`${downloadPrompt}.`)
  const waitingTimedOut = state.phase === 'ready' && state.action === 'resume'
  const total = state.total ?? (downloading ? packageInfo.sizeBytes : undefined)
  const percent =
    total && total > 0 && state.loaded !== undefined
      ? Math.min(100, Math.floor((state.loaded / total) * 100))
      : undefined
  const progressText = percent !== undefined ? `${percent}%` : '—%'
  const progressLabel = downloading ? 'Downloading .science package' : 'Sending to Open-Science'
  const label =
    state.phase === 'checking'
      ? 'Checking Open-Science…'
      : state.phase === 'opening'
        ? 'Waiting for Open-Science…'
        : sending
          ? 'Sending to Open-Science…'
          : state.phase === 'canceling'
            ? 'Canceling…'
            : state.phase === 'received'
              ? 'Open Open-Science'
              : state.action === 'resume'
                ? 'I’ve opened Open-Science'
                : state.action === 'open'
                  ? 'Open Open-Science'
                  : state.needsApp
                    ? 'Try again'
                    : 'Continue in Open-Science'

  return (
    <section
      aria-label="Import to Open-Science"
      className="mx-auto w-full max-w-4xl px-4 pb-8 pt-[26px] md:px-6 md:pb-12"
    >
      <div className="rounded-2xl border border-[#d8d9d2] bg-white px-4 py-3 shadow-[0_4px_24px_-12px_rgba(16,17,15,0.16)] sm:px-5">
        <textarea
          aria-label="Continue this research in the desktop app"
          placeholder="What would you explore next? Import this session to continue in Open-Science."
          disabled
          rows={3}
          className="block min-h-28 w-full resize-none border-0 bg-transparent text-[15px] leading-7 text-[#777872] placeholder:text-[#777872] disabled:cursor-default disabled:opacity-100 focus:outline-none"
        />
        <div className="mt-2 flex flex-wrap items-end justify-between gap-2">
          <div className="flex items-center gap-1">
            {tools.map(({ icon: Icon, label: toolLabel }) => (
              <button
                key={toolLabel}
                type="button"
                disabled
                aria-label={toolLabel}
                title={toolLabel}
                className="flex size-10 cursor-not-allowed items-center justify-center rounded-lg text-[#b2b3ad]"
              >
                <Icon className="size-5" aria-hidden="true" />
              </button>
            ))}
          </div>
          <button
            type="button"
            aria-label={progressing ? `${progressLabel}: ${progressText}` : undefined}
            disabled={busy || !state.action}
            onClick={() => {
              if (state.action === 'prepare') void session.current?.prepareAndOpen()
              else if (state.action === 'resume') void session.current?.resume()
              else if (state.action === 'open') void session.current?.open()
              else if (state.action === 'launch') session.current?.openApp()
            }}
            className="inline-flex min-h-10 w-full items-center justify-center gap-3 rounded-xl bg-[#10110f] px-5 py-1 text-sm font-semibold text-white transition-colors hover:bg-[#34352f] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#10110f] disabled:cursor-default sm:w-auto sm:min-w-56"
          >
            {progressing ? (
              <span className="flex w-full flex-col items-center gap-1">
                <span className="text-sm leading-4 tabular-nums">{progressText}</span>
                <small className="text-[11px] font-normal leading-4 text-white/80">
                  {progressLabel}
                </small>
              </span>
            ) : (
              <>
                {label}
                <ArrowUpRight className="size-5 shrink-0" aria-hidden="true" />
              </>
            )}
          </button>
        </div>
      </div>
      <p className="mt-1.5 text-xs leading-5 text-[#777872]">
        <span>
          {state.phase === 'opening' || state.action === 'resume'
            ? 'If your browser asks to open Open-Science, choose Open. You may also need to allow local network access.'
            : 'You may need to allow your browser to open Open-Science and access your local network. Keep this page open until the file is sent.'}
        </span>
      </p>
      <div className="space-y-2 text-[13px] leading-6 text-[#777872]">
        <div className="flex items-center gap-x-4">
          <p
            role={state.phase === 'error' || state.phase === 'unsupported' ? 'alert' : 'status'}
            aria-live="polite"
            className={
              state.phase === 'error'
                ? 'text-status-failure-foreground'
                : state.phase === 'unsupported'
                  ? 'text-status-warning-foreground'
                  : !state.message
                    ? 'sr-only'
                    : undefined
            }
          >
            {inlineDownload ? (
              <>
                {state.message?.slice(0, -`${downloadPrompt}.`.length)}
                <a
                  href="/open-science/download"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium underline underline-offset-4"
                >
                  {downloadPrompt}
                </a>
                .
              </>
            ) : (
              state.message
            )}{' '}
            {state.phase === 'received' ? (
              <span>
                Clicked Cancel by mistake?{' '}
                <button
                  type="button"
                  onClick={() => void session.current?.retryImport()}
                  className="font-medium text-[#10110f] underline underline-offset-4"
                >
                  Retry the import.
                </button>
              </span>
            ) : null}
          </p>
          {busy ? (
            <button
              type="button"
              disabled={state.phase === 'canceling'}
              onClick={() => session.current?.cancel()}
              className="min-h-10 shrink-0 whitespace-nowrap font-medium text-[#10110f] underline underline-offset-4 disabled:opacity-50"
            >
              Cancel
            </button>
          ) : null}
        </div>
        {state.launchError ? (
          <p role="alert" className="text-status-failure-foreground">
            {state.launchError}
          </p>
        ) : null}
        {waitingTimedOut ? (
          <p aria-live="polite">
            If Open-Science does not open,{' '}
            <a
              href={url}
              download={filename}
              className="font-medium text-[#10110f] underline underline-offset-4"
            >
              download the .science package
            </a>{' '}
            and double-click it to open it with your installed Open-Science app. You can also choose
            “Open with” and select Open-Science. If you haven’t installed it yet,{' '}
            <a
              href="/open-science/download"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-[#10110f] underline underline-offset-4"
            >
              Download Open-Science
            </a>{' '}
            and install it first.
          </p>
        ) : null}
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          {needsApp && !waitingTimedOut && !inlineDownload ? (
            <a
              href="/open-science/download"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-10 items-center font-medium text-[#10110f] underline underline-offset-4"
            >
              Download Open-Science
            </a>
          ) : null}
          {state.action === 'resume' ? (
            <button
              type="button"
              onClick={() => void session.current?.open()}
              className="min-h-10 font-medium text-[#10110f] underline underline-offset-4"
            >
              Open Open-Science
            </button>
          ) : null}
          {(state.phase === 'error' && state.action === 'open') || state.action === 'resume' ? (
            <button
              type="button"
              onClick={() => session.current?.restart()}
              className="min-h-10 font-medium text-[#10110f] underline underline-offset-4"
            >
              Start a new transfer
            </button>
          ) : null}
        </div>
      </div>
    </section>
  )
}
