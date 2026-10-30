'use client'

import { Download } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useTransition } from 'react'
import type { PackageProgress } from '@/lib/science-package/archive'
import { loadReplay, type ReplayState } from '@/lib/science-package/load'
import type { UseCasePackage } from '@/lib/use-case-types'
import { ImportComposer } from './import-composer'
import {
  ScienceImportButton,
  ScienceImportProvider,
  ScienceImportToolbarFeedback
} from './science-import-controls'
import { SessionTranscript } from './session-transcript'
import { UseCaseBackLink } from './use-case-navigation'

const TopBar = ({ slug, packageUrl }: { slug: string; packageUrl?: string }) => (
  <section
    aria-label="Replay import actions"
    className="sticky top-[var(--nav-h)] z-10 border-b border-[#dfdfda] bg-[#fafaf8]/90 backdrop-blur-sm"
  >
    <div className="mx-auto flex min-h-[47px] w-full max-w-4xl flex-wrap items-center gap-3 px-4 py-2.5 max-sm:justify-end max-sm:gap-2 max-sm:pl-36 max-[375px]:pl-24 md:px-6">
      <UseCaseBackLink
        href={`/open-science/use-cases/${slug}`}
        className="shrink-0 text-[13px] font-medium text-[#575853] transition-colors hover:text-[#10110f] max-sm:absolute max-sm:left-4 max-sm:top-1/2 max-[375px]:max-w-20 max-sm:-translate-y-1/2 md:absolute md:top-1/2 md:-translate-y-1/2"
      >
        ← Back to overview
      </UseCaseBackLink>
      {packageUrl ? (
        <>
          <a
            href={packageUrl}
            className="ml-auto inline-flex items-center gap-1.5 text-[13px] max-sm:text-xs font-medium text-[#575853] transition-colors hover:text-[#10110f]"
          >
            <Download className="size-4 shrink-0" aria-hidden="true" />
            Download research package
          </a>
          <ScienceImportButton variant="toolbar" />
        </>
      ) : null}
    </div>
    {packageUrl ? <ScienceImportToolbarFeedback /> : null}
  </section>
)

const labels = {
  metadata: 'Loading research session…',
  downloading: 'Downloading research package…',
  verifying: 'Verifying SHA-256…',
  parsing: 'Parsing research session…'
}

const ReplayProgress = ({ progress }: { progress: PackageProgress | { stage: 'metadata' } }) => {
  const percent =
    progress.stage === 'downloading' && progress.total && progress.loaded !== undefined
      ? Math.min(100, Math.floor((progress.loaded / progress.total) * 100))
      : undefined
  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-10 md:px-6">
      <div className="mb-8 text-center">
        <p role="status" aria-live="polite" className="text-sm text-[#777872]">
          {labels[progress.stage]}
          {percent !== undefined ? ` ${percent}%` : ''}
        </p>
        <progress
          aria-label={labels[progress.stage]}
          max={100}
          value={percent}
          className="sr-only"
        />
      </div>
      {/* Skeleton mimics the conversation layout so the wait previews the
          content; the stage line above keeps the download feedback. */}
      <div aria-hidden="true" className="animate-pulse space-y-6">
        <div className="ml-auto h-11 w-[38%] rounded-2xl bg-[#e9e9e6]" />
        <div className="h-40 rounded-2xl bg-[#e9e9e6]" />
        <div className="space-y-2.5">
          <div className="h-3.5 w-3/4 rounded bg-[#e9e9e6]" />
          <div className="h-3.5 w-2/3 rounded bg-[#e9e9e6]" />
        </div>
        <div className="h-12 rounded-xl bg-[#e9e9e6]" />
        <div className="space-y-2.5">
          <div className="h-3.5 w-4/5 rounded bg-[#e9e9e6]" />
          <div className="h-3.5 w-3/5 rounded bg-[#e9e9e6]" />
        </div>
        <div className="ml-auto h-11 w-[30%] rounded-2xl bg-[#e9e9e6]" />
        <div className="h-24 rounded-2xl bg-[#e9e9e6]" />
        <div className="space-y-2.5">
          <div className="h-3.5 w-2/3 rounded bg-[#e9e9e6]" />
          <div className="h-3.5 w-1/2 rounded bg-[#e9e9e6]" />
        </div>
      </div>
    </div>
  )
}

const ReplayFrame = ({
  slug,
  packageInfo,
  children
}: {
  slug: string
  packageInfo?: UseCasePackage
  children: React.ReactNode
}) => (
  <ScienceImportProvider key={slug} packageInfo={packageInfo}>
    <main id="top" className="-mt-[var(--nav-h)] flex-1 bg-[#fafaf8] pt-[var(--nav-h)]">
      <TopBar slug={slug} packageUrl={packageInfo?.url} />
      {children}
    </main>
  </ScienceImportProvider>
)

export const ReplayLoading = ({ slug }: { slug: string }) => (
  <ReplayFrame slug={slug}>
    <ReplayProgress progress={{ stage: 'metadata' }} />
  </ReplayFrame>
)

export const ReplayView = ({
  slug,
  packageInfo,
  error
}: {
  slug: string
  packageInfo: UseCasePackage | null
  error?: string
}) => {
  const router = useRouter()
  const [refreshing, startRefresh] = useTransition()
  const [attempt, setAttempt] = useState(0)
  const [state, setState] = useState<ReplayState>({
    status: 'loading',
    progress: { stage: packageInfo?.extractedBaseUrl ? 'metadata' : 'downloading' }
  })
  useEffect(() => {
    void attempt
    if (packageInfo) return loadReplay(slug, packageInfo, setState)
  }, [slug, packageInfo, attempt])
  const failure = packageInfo
    ? state.status === 'error'
      ? state.message
      : undefined
    : (error ?? 'Research package not found.')
  return (
    <ReplayFrame slug={slug} packageInfo={packageInfo ?? undefined}>
      {'data' in state && state.data && !refreshing ? (
        <SessionTranscript
          session={state.data}
          visibleCount={'visibleCount' in state ? state.visibleCount : undefined}
        />
      ) : null}
      {refreshing ? (
        <ReplayProgress progress={{ stage: 'metadata' }} />
      ) : failure ? (
        <div className="mx-auto max-w-4xl px-4 py-16 text-center">
          <div role="alert">
            <p className="font-medium">
              {state.status === 'error' && state.data
                ? 'Loading incomplete. The blocks already loaded are shown above.'
                : 'This use case could not be loaded.'}
            </p>
            <p className="mt-2 text-sm text-[#777872]">{failure}</p>
          </div>
          <button
            type="button"
            onClick={() => {
              if (packageInfo) setAttempt((value) => value + 1)
              else startRefresh(() => router.refresh())
            }}
            className="mt-4 rounded-full border px-4 py-2 text-sm"
          >
            Retry
          </button>
        </div>
      ) : state.status === 'ready' ? (
        packageInfo ? (
          <ImportComposer />
        ) : null
      ) : state.status === 'rendering' ? (
        <p role="status" className="py-6 text-center text-sm text-[#777872]">
          Loading remaining conversation blocks…
        </p>
      ) : state.status === 'loading' ? (
        <ReplayProgress progress={state.progress} />
      ) : null}
    </ReplayFrame>
  )
}
