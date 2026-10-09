'use client'

import { Download } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useTransition } from 'react'
import type { PackageProgress } from '@/lib/science-package/archive'
import { loadReplay, type ReplayState } from '@/lib/science-package/load'
import type { UseCasePackage } from '@/lib/use-case-types'
import { SessionTranscript } from './session-transcript'

const TopBar = ({ slug, packageUrl }: { slug: string; packageUrl?: string }) => (
  <div className="sticky top-[var(--nav-h)] z-10 border-b border-[#dfdfda] bg-[#fafaf8]/90 backdrop-blur-sm">
    <div className="mx-auto flex min-h-[47px] w-full max-w-4xl flex-wrap items-center gap-3 px-4 py-2.5 md:px-6">
      <Link
        href={`/open-science/use-cases/${slug}`}
        className="shrink-0 text-[13px] font-medium text-[#575853] transition-colors hover:text-[#10110f]"
      >
        ← Back to overview
      </Link>
      {packageUrl ? (
        <a
          href={packageUrl}
          className="ml-auto inline-flex items-center gap-1.5 text-[13px] font-medium text-[#575853] transition-colors hover:text-[#10110f]"
        >
          <Download className="size-4 shrink-0" aria-hidden="true" />
          Download research package
        </a>
      ) : null}
    </div>
  </div>
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
    <div className="mx-auto max-w-4xl space-y-4 px-4 py-16 text-center">
      <p role="status" aria-live="polite">
        {labels[progress.stage]}
      </p>
      <progress aria-label={labels[progress.stage]} max={100} value={percent} className="w-64" />
      {percent !== undefined && <p className="text-sm tabular-nums">{percent}%</p>}
      <p className="text-sm text-[#777872]">
        Loading the session and the files needed to display it.
      </p>
    </div>
  )
}

const ReplayFrame = ({
  slug,
  packageUrl,
  children
}: {
  slug: string
  packageUrl?: string
  children: React.ReactNode
}) => (
  <main id="top" className="-mt-[var(--nav-h)] flex-1 bg-[#fafaf8] pt-[var(--nav-h)]">
    <TopBar slug={slug} packageUrl={packageUrl} />
    {children}
  </main>
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
    <ReplayFrame slug={slug} packageUrl={packageInfo?.url}>
      {refreshing ? (
        <ReplayProgress progress={{ stage: 'metadata' }} />
      ) : failure ? (
        <div className="mx-auto max-w-4xl px-4 py-16 text-center">
          <div role="alert">
            <p className="font-medium">This use case could not be loaded.</p>
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
        <SessionTranscript session={state.data} />
      ) : state.status === 'loading' ? (
        <ReplayProgress progress={state.progress} />
      ) : null}
    </ReplayFrame>
  )
}
