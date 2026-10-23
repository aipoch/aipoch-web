'use client'

import { ArrowUpRight, Star } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { GithubIcon } from '@/components/svg-icons/github-icon'
import { waitForBrowserMock } from '@/mocks/ready'
import { formatCompactGithubCount } from './home-data'

const repositories = {
  hero: { slug: 'open-science', name: 'Open-Science' },
  compact: { slug: 'medical-research-skills', name: 'Medical Research Skills' }
} as const

// Deduplicate development effect reruns independently for each repository.
const githubStarsRequests = new Map<string, Promise<number | null>>()

const requestGithubStars = async (repository: string): Promise<number | null> => {
  try {
    await waitForBrowserMock()
    // Use a page timestamp to bypass browser caching while keeping a simple GET without a CORS preflight.
    const requestUrl = `https://api.github.com/repos/aipoch/${repository}?homepage_load=${Date.now()}`
    const response = await fetch(requestUrl, {
      headers: { Accept: 'application/vnd.github+json' }
    })
    if (!response.ok) return null

    const data: { stargazers_count?: unknown } = await response.json()
    const stars = data.stargazers_count
    return typeof stars === 'number' && Number.isFinite(stars) && stars >= 0
      ? Math.floor(stars)
      : null
  } catch {
    return null
  }
}

const loadGithubStars = (repository: string) => {
  const pending = githubStarsRequests.get(repository)
  if (pending) return pending
  const request = requestGithubStars(repository)
  githubStarsRequests.set(repository, request)
  void request.finally(() => {
    if (githubStarsRequests.get(repository) === request) githubStarsRequests.delete(repository)
  })
  return request
}

export const HomeGithubLink = ({ variant = 'hero' }: { variant?: 'hero' | 'compact' }) => {
  const repository = repositories[variant]
  // Undefined means pending; null means unavailable. Never present a fallback as live data.
  const [githubStars, setGithubStars] = useState<number | null | undefined>(undefined)

  useEffect(() => {
    let isActive = true

    // Fetch once on page mount without polling; a hard refresh starts a new page lifecycle.
    void loadGithubStars(repository.slug).then((stars) => {
      if (isActive) setGithubStars(stars)
    })

    return () => {
      isActive = false
    }
  }, [repository.slug])

  const loading = githubStars === undefined
  const formattedGithubStars =
    typeof githubStars === 'number' ? formatCompactGithubCount(githubStars) : null
  const starsLabel = loading
    ? 'loading stars'
    : formattedGithubStars === null
      ? 'stars unavailable'
      : `${formattedGithubStars} stars`
  const compact = variant === 'compact'
  const testId = compact ? 'ecosystem-github' : 'home-github'

  return (
    <Link
      href={`https://github.com/aipoch/${repository.slug}`}
      target="_blank"
      rel="noopener noreferrer"
      data-testid={`${testId}-link`}
      aria-label={`${repository.name} on GitHub, ${starsLabel}`}
      className={
        compact
          ? 'ml-auto inline-flex shrink-0 items-center gap-1.5 text-[#111] transition-colors hover:text-[#915600]'
          : 'inline-flex min-h-[42px] w-[507px] max-w-full items-center gap-3 bg-[#212121] px-5 py-2.5 font-mono text-[11px] font-semibold tracking-[.03em] text-white transition-opacity hover:opacity-80 sm:text-[13px]'
      }
    >
      <GithubIcon
        className={compact ? 'size-3.5 shrink-0' : 'size-[18px] shrink-0'}
        aria-hidden="true"
      />
      <span
        data-testid={`${testId}-stars`}
        aria-busy={loading}
        className={
          compact
            ? 'flex items-center gap-1 whitespace-nowrap'
            : 'flex items-center gap-1.5 border-r border-white/20 pr-2.5'
        }
      >
        <Star className="size-3.5" aria-hidden="true" />
        {loading ? (
          <span className="inline-flex min-w-[4.5ch] items-center">
            {/* Reserve the count width and respect reduced-motion preferences while loading. */}
            <span
              aria-hidden="true"
              className="h-3 w-[4.5ch] rounded-none bg-[#c4c4bf] motion-safe:animate-pulse"
            />
            <span className="sr-only">Loading stars</span>
          </span>
        ) : (
          <span className="min-w-[4.5ch]">{formattedGithubStars ?? 'Unavailable'}</span>
        )}
      </span>
      {compact ? null : (
        <>
          <span className="min-w-0 break-all">github.com/aipoch/open-science</span>
          <ArrowUpRight className="ml-auto size-4 shrink-0" aria-hidden="true" />
        </>
      )}
    </Link>
  )
}
