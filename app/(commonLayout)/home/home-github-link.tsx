'use client'

import { ArrowUpRight, Star } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { GithubIcon } from '@/components/svg-icons/github-icon'
import { waitForBrowserMock } from '@/mocks/ready'
import {
  DEFAULT_GITHUB_STAR_COUNT,
  DEFAULT_MEDICAL_RESEARCH_SKILLS_STAR_COUNT,
  formatCompactGithubCount
} from './home-data'

const repositories = {
  hero: { slug: 'open-science', name: 'Open-Science', fallback: DEFAULT_GITHUB_STAR_COUNT },
  compact: {
    slug: 'medical-research-skills',
    name: 'Medical Research Skills',
    fallback: DEFAULT_MEDICAL_RESEARCH_SKILLS_STAR_COUNT
  }
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

export const HomeGithubLink = ({
  variant = 'hero',
  initialStars
}: {
  variant?: 'hero' | 'compact'
  initialStars?: number
}) => {
  const repository = repositories[variant]
  const [githubStars, setGithubStars] = useState(initialStars ?? repository.fallback)

  useEffect(() => {
    let isActive = true

    // Fetch once on page mount without polling; a hard refresh starts a new page lifecycle.
    void loadGithubStars(repository.slug).then((stars) => {
      if (isActive && stars !== null) setGithubStars(stars)
    })

    return () => {
      isActive = false
    }
  }, [repository.slug])

  const formattedGithubStars = formatCompactGithubCount(githubStars)
  const compact = variant === 'compact'
  const testId = compact ? 'ecosystem-github' : 'home-github'

  return (
    <Link
      href={`https://github.com/aipoch/${repository.slug}`}
      target="_blank"
      rel="noopener noreferrer"
      data-testid={`${testId}-link`}
      aria-label={`${repository.name} on GitHub, ${formattedGithubStars} stars`}
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
        className={
          compact
            ? 'flex items-center gap-1 whitespace-nowrap'
            : 'flex items-center gap-1.5 border-r border-white/20 pr-2.5'
        }
      >
        <Star className="size-3.5" aria-hidden="true" />
        {formattedGithubStars}
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
