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
  useEffect(() => {
    setState(INITIAL_IMPORT_STATE)
    const current = createScienceImport({ url, filename }, setState)
    session.current = current
    return () => {
      current.dispose()
      session.current = null
    }
  }, [url, filename])
  const busy = ['downloading', 'sending', 'canceling'].includes(state.phase)
  const downloading = state.phase === 'downloading'
  const needsApp =
    state.phase === 'unsupported' || (state.phase === 'error' && state.action === 'open')
  const percent =
    state.total && state.loaded !== undefined
      ? Math.min(100, Math.floor((state.loaded / state.total) * 100))
      : undefined
  const label =
    state.phase === 'sending'
      ? 'Sending to Open-Science…'
      : state.phase === 'canceling'
        ? 'Canceling…'
        : state.phase === 'received'
          ? 'Sent to Open-Science'
          : 'Continue in Open-Science'

  return (
    <section
      aria-label="Import to Open-Science"
      className="mx-auto w-full max-w-4xl px-4 pb-16 pt-[26px] md:px-6 md:pb-24"
    >
      <div className="rounded-2xl border border-[#d8d9d2] bg-white px-4 py-3 shadow-[0_4px_24px_-12px_rgba(16,17,15,0.16)] sm:px-5">
        <textarea
          aria-label="Continue this research in the desktop app"
          placeholder={
            needsApp
              ? 'If you have not installed Open-Science yet, download Open-Science first. Otherwise, open the app and try again.'
              : 'What would you explore next? Import this session to continue in Open-Science.'
          }
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
            aria-label={downloading ? 'Downloading .science package' : undefined}
            disabled={busy || !state.action}
            onClick={() => {
              if (state.action === 'prepare') void session.current?.prepareAndOpen()
              else if (state.action === 'open') void session.current?.open()
            }}
            className="inline-flex min-h-10 w-full items-center justify-center gap-3 rounded-xl bg-[#10110f] px-5 py-1 text-sm font-semibold text-white transition-colors hover:bg-[#34352f] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#10110f] disabled:cursor-default sm:w-auto sm:min-w-56"
          >
            {downloading ? (
              <span className="flex w-full flex-col items-center gap-1">
                <span className="flex w-full items-center gap-2">
                  <progress
                    aria-label="Package download"
                    value={percent}
                    max={100}
                    className="h-1.5 min-w-0 flex-1 accent-white"
                  />
                  <span className="shrink-0 text-xs leading-4 tabular-nums">
                    {percent !== undefined
                      ? `${percent}%`
                      : `${Math.round((state.loaded ?? 0) / 1024)} KB`}
                  </span>
                </span>
                <small className="text-[11px] font-normal leading-4 text-white/80">
                  Downloading .science package
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
      {state.phase !== 'received' ? (
        <p className="mt-1.5 text-xs leading-5 text-[#777872]">
          You may need to allow your browser to open Open-Science and access your local network.
          Keep this page open until the file is sent.
        </p>
      ) : null}
      <div className="space-y-2 text-[13px] leading-6 text-[#777872]">
        <p
          role={state.phase === 'error' ? 'alert' : 'status'}
          aria-live="polite"
          className={
            state.phase === 'error'
              ? 'text-status-failure-foreground'
              : downloading || !state.message
                ? 'sr-only'
                : undefined
          }
        >
          {state.message}
          {percent !== undefined && busy ? ` ${percent}%` : ''}
        </p>
        {busy && !downloading ? (
          <progress
            aria-label="Package transfer"
            value={percent}
            max={100}
            className="block h-1.5 w-full accent-[#10110f]"
          />
        ) : null}
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          {needsApp ? (
            <a
              href="/open-science/download"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-10 items-center font-medium text-[#10110f] underline underline-offset-4"
            >
              Download Open-Science
            </a>
          ) : null}
          {busy ? (
            <button
              type="button"
              disabled={state.phase === 'canceling'}
              onClick={() => session.current?.cancel()}
              className="min-h-10 font-medium text-[#10110f] underline underline-offset-4 disabled:opacity-50"
            >
              Cancel
            </button>
          ) : null}
          {state.phase === 'error' && state.action === 'open' ? (
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
