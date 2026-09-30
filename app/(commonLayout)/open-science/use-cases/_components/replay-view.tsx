'use client'

import { LoaderCircle } from 'lucide-react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import type { UseCaseIndexEntry, UseCaseSession } from '@/lib/use-case-types'
import { apiClient } from '@/service'
import {
  getUseCaseFullTranscriptUrl,
  getUseCaseTranscriptUrl,
  USE_CASE_LIST_URL
} from '@/service/open-science-use-cases'
import { SessionTranscript } from './session-transcript'

const formatBytes = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

const SUCCESS_CODE = 20000

type LoadStatus = 'idle' | 'loading' | 'error'

// Skeleton shown while the essential transcript downloads: shapes echo the
// real layout (user bubble, question card, prose, group rows) so the page
// does not jump when the content lands.
const ReplaySkeleton = () => (
  <div className="mx-auto w-full max-w-4xl animate-pulse space-y-6 px-4 pb-14 pt-6 md:px-6">
    <div className="ml-auto h-10 w-2/5 rounded-2xl bg-[#e9e9e5]" />
    <div className="h-44 rounded-[14px] bg-[#ececea]" />
    <div className="space-y-2.5">
      <div className="h-4 w-3/4 rounded bg-[#e9e9e5]" />
      <div className="h-4 w-2/3 rounded bg-[#e9e9e5]" />
    </div>
    <div className="space-y-2.5">
      <div className="h-4 w-4/5 rounded bg-[#e9e9e5]" />
      <div className="h-4 w-1/2 rounded bg-[#e9e9e5]" />
    </div>
    {[0, 1, 2].map((row) => (
      <div key={row} className="h-11 rounded-[14px] bg-[#ececea]" />
    ))}
  </div>
)

const TopBar = ({
  slug,
  title,
  children
}: {
  slug: string
  title?: string
  children?: React.ReactNode
}) => (
  <div className="sticky top-[var(--nav-h)] z-10 border-b border-[#dfdfda] bg-[#fafaf8]/90 backdrop-blur-sm">
    <div className="mx-auto flex min-h-[47px] w-full max-w-4xl items-center gap-3 px-4 py-2.5 md:px-6">
      <Link
        href={`/open-science/use-cases/${slug}`}
        className="shrink-0 text-[13px] font-medium text-[#575853] transition-colors hover:text-[#10110f]"
      >
        ← Back to overview
      </Link>
      <span
        className="ml-auto hidden truncate text-right text-[11px] uppercase tracking-[0.04em] text-[#90908a] sm:inline"
        title={title}
      >
        Read-only replay of an exported Open-Science session
      </span>
      {children}
    </div>
  </div>
)

// Fully client-rendered replay: the shell (top bar + skeleton) paints
// immediately, the essential transcript downloads once as JSON, and the full
// tier loads on demand. The URL (`?view=full`) stays the source of truth.
export const ReplayView = ({ slug }: { slug: string }) => {
  const [essential, setEssential] = useState<UseCaseSession | null>(null)
  const [indexEntry, setIndexEntry] = useState<UseCaseIndexEntry | undefined>()
  const [loadError, setLoadError] = useState(false)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const transcriptResponse = await apiClient.get(getUseCaseTranscriptUrl(slug))
        if (cancelled) return
        const transcriptBody = transcriptResponse.data as {
          code: number
          data: UseCaseSession
        }
        if (transcriptBody.code !== SUCCESS_CODE || !transcriptBody.data) {
          setLoadError(true)
          return
        }
        setEssential(transcriptBody.data)
      } catch {
        if (!cancelled) setLoadError(true)
      }
    }
    const loadIndexEntry = async () => {
      // The list only powers the full-tier affordance (size label); its
      // failure must not take down the transcript itself.
      try {
        const listResponse = await apiClient.get(USE_CASE_LIST_URL)
        if (cancelled) return
        const listBody = listResponse.data as { code: number; data: UseCaseIndexEntry[] }
        setIndexEntry(
          listBody.code === SUCCESS_CODE
            ? listBody.data.find((entry) => entry.slug === slug)
            : undefined
        )
      } catch {
        // indexEntry stays undefined; the full-tier button degrades gracefully
      }
    }
    void load()
    void loadIndexEntry()
    return () => {
      cancelled = true
    }
  }, [slug])

  return (
    <main id="top" className="-mt-[var(--nav-h)] flex-1 bg-[#fafaf8] pt-[var(--nav-h)]">
      {loadError ? (
        <>
          <TopBar slug={slug} />
          <div className="mx-auto w-full max-w-4xl px-4 py-16 text-center md:px-6">
            <p className="text-base font-medium text-[#10110f]">
              This use case could not be loaded.
            </p>
            <p className="mt-2 text-sm text-[#777872]">
              It may have been removed, or the content service is unavailable.
            </p>
          </div>
        </>
      ) : essential ? (
        <ReplayViewLoaded essential={essential} indexEntry={indexEntry} />
      ) : (
        <>
          <TopBar slug={slug} />
          <ReplaySkeleton />
        </>
      )}
    </main>
  )
}

// Replay with two tiers: the essential transcript is shown first; the full
// tier is fetched on demand and rendered locally.
const ReplayViewLoaded = ({
  essential,
  indexEntry
}: {
  essential: UseCaseSession
  indexEntry?: UseCaseIndexEntry
}) => {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [fullSession, setFullSession] = useState<UseCaseSession | null>(null)
  const [status, setStatus] = useState<LoadStatus>('idle')
  const [progress, setProgress] = useState<{ loaded: number; total?: number } | null>(null)

  const hasFull = Boolean(indexEntry?.hasFull)
  const wantsFull = searchParams.get('view') === 'full'

  // Prefer the server's Content-Length; fall back to the manifest estimate.
  const expectedBytes = progress?.total ?? indexEntry?.fullSizeBytes
  const progressPercent =
    progress && expectedBytes
      ? Math.min(100, Math.round((progress.loaded / expectedBytes) * 100))
      : null

  const loadFull = useCallback(async () => {
    setStatus('loading')
    setProgress(null)
    // The full tier is the transcript JSON plus every full-only blob. All of
    // it is fetched up front (blobs stream into the HTTP cache for later
    // preview), and the progress bar tracks the combined bytes.
    const loadedByPart = new Map<string, number>()
    const track = (part: string, loaded: number, total?: number) => {
      loadedByPart.set(part, loaded)
      const combined = [...loadedByPart.values()].reduce((sum, value) => sum + value, 0)
      setProgress({ loaded: combined, total })
    }
    const streamAsset = async (url: string) => {
      const response = await fetch(url)
      if (!response.ok || !response.body) throw new Error(`HTTP ${response.status} for ${url}`)
      const reader = response.body.getReader()
      let loaded = 0
      for (;;) {
        const { done, value } = await reader.read()
        if (done) break
        loaded += value.byteLength
        track(url, loaded)
      }
    }
    try {
      const response = await apiClient.get(getUseCaseFullTranscriptUrl(essential.slug), {
        onDownloadProgress: (event) => track('transcript', event.loaded, event.total)
      })
      const body = response.data as { code: number; data: UseCaseSession }
      if (body.code !== SUCCESS_CODE || !body.data)
        throw new Error(`Unexpected response ${body.code}`)
      const essentialUrls = new Set(Object.values(essential.assets).map((asset) => asset.url))
      const fullOnlyUrls = Object.values(body.data.assets)
        .map((asset) => asset.url)
        .filter((url) => !essentialUrls.has(url))
      if (fullOnlyUrls.length > 0) await Promise.all(fullOnlyUrls.map(streamAsset))
      setFullSession(body.data)
      setStatus('idle')
    } catch {
      setStatus('error')
    }
  }, [essential])

  useEffect(() => {
    if (!wantsFull || !hasFull || fullSession || status === 'loading') return
    void loadFull()
  }, [wantsFull, hasFull, fullSession, status, loadFull])

  const setViewParam = (view: 'essential' | 'full') => {
    const params = new URLSearchParams(searchParams.toString())
    if (view === 'full') params.set('view', 'full')
    else params.delete('view')
    const query = params.toString()
    // push (not replace) so the browser Back button reverses a tier switch
    router.push(query ? `${pathname}?${query}` : pathname, { scroll: false })
  }

  const showingFull = wantsFull && Boolean(fullSession)
  const session = showingFull && fullSession ? fullSession : essential

  return (
    <>
      <TopBar slug={essential.slug} title={essential.title}>
        {hasFull ? (
          <button
            type="button"
            disabled={status === 'loading'}
            onClick={() => {
              if (showingFull) {
                setViewParam('essential')
              } else {
                setViewParam('full')
                if (!fullSession && status !== 'loading') void loadFull()
              }
            }}
            className={`relative grid shrink-0 overflow-hidden whitespace-nowrap rounded-full border px-3 py-1 text-[12px] font-medium transition-colors ${
              showingFull
                ? 'border-[#10110f] text-[#10110f] hover:bg-[#10110f] hover:text-white'
                : 'border-[#10110f] bg-[#10110f] text-white hover:bg-[#2a2b28] disabled:opacity-80'
            }`}
          >
            {/* Invisible width drivers: the button keeps the width of the
                widest label across all states, so tier switches never jitter. */}
            <span aria-hidden="true" className="invisible col-start-1 row-start-1">
              {`View full version${indexEntry?.fullSizeBytes ? ` · ${formatBytes(indexEntry.fullSizeBytes)}` : ''}`}
            </span>
            <span aria-hidden="true" className="invisible col-start-1 row-start-1">
              Loading full version…
            </span>
            <span aria-hidden="true" className="invisible col-start-1 row-start-1">
              Back to essential
            </span>
            {status === 'loading' && !showingFull ? (
              <span
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={progressPercent ?? undefined}
                aria-label="Loading full version"
                className={`absolute inset-y-0 left-0 bg-white/25 transition-[width] duration-200 ${progressPercent === null ? 'animate-pulse' : ''}`}
                style={{ width: `${progressPercent ?? 100}%` }}
              />
            ) : null}
            <span className="relative col-start-1 row-start-1 flex items-center justify-center gap-1.5">
              {showingFull ? (
                'Back to essential'
              ) : status === 'loading' ? (
                progressPercent !== null ? (
                  <span className="tabular-nums">{progressPercent}%</span>
                ) : (
                  <>
                    <LoaderCircle className="size-3 animate-spin" aria-hidden="true" />
                    Loading full version…
                  </>
                )
              ) : status === 'error' ? (
                'Retry full version'
              ) : (
                `View full version${indexEntry?.fullSizeBytes ? ` · ${formatBytes(indexEntry.fullSizeBytes)}` : ''}`
              )}
            </span>
          </button>
        ) : null}
      </TopBar>
      {status === 'error' && wantsFull ? (
        <p className="mx-auto w-full max-w-4xl px-4 pt-3 text-[13px] text-[#a14a3a] md:px-6">
          Could not load the full version. Check your connection and retry.
        </p>
      ) : null}
      <SessionTranscript session={session} />
    </>
  )
}
