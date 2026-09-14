'use client'

import { ArrowUpRight, Star } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { waitForBrowserMock } from '@/mocks/ready'
import { GithubIcon } from '@/components/svg-icons/github-icon'
import { DEFAULT_GITHUB_STAR_COUNT, formatCompactGithubCount } from './home-data'

const GITHUB_REPOSITORY_API_URL = 'https://api.github.com/repos/aipoch/open-science'

// Share one request per page lifecycle to avoid consuming the GitHub rate limit when development effects rerun.
let githubStarsRequest: Promise<number | null> | null = null

const requestGithubStars = async (): Promise<number | null> => {
  try {
    await waitForBrowserMock()
    // Use a page timestamp to bypass browser caching while keeping a simple GET without a CORS preflight.
    const requestUrl = `${GITHUB_REPOSITORY_API_URL}?homepage_load=${Date.now()}`
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

const loadGithubStars = () => {
  if (!githubStarsRequest) {
    const request = requestGithubStars()
    githubStarsRequest = request

    // Allow the next homepage mount to fetch again after completion; the current mount does not refetch.
    void request.finally(() => {
      if (githubStarsRequest === request) githubStarsRequest = null
    })
  }
  return githubStarsRequest
}

export const HomeGithubLink = ({
  initialStars = DEFAULT_GITHUB_STAR_COUNT
}: {
  initialStars?: number
}) => {
  const [githubStars, setGithubStars] = useState(initialStars)

  useEffect(() => {
    let isActive = true

    // Fetch once on page mount without polling; a hard refresh starts a new page lifecycle.
    void loadGithubStars().then((stars) => {
      if (isActive && stars !== null) setGithubStars(stars)
    })

    return () => {
      isActive = false
    }
  }, [])

  const formattedGithubStars = formatCompactGithubCount(githubStars)

  return (
    <Link
      href="https://github.com/aipoch/open-science"
      target="_blank"
      rel="noopener noreferrer"
      data-testid="home-github-link"
      aria-label={`Open-Science on GitHub, ${formattedGithubStars} stars`}
      className="mt-12 inline-flex max-w-full items-center gap-3.5 bg-[#222] px-6 py-3 font-mono text-[12px] font-semibold tracking-[0.1em] text-white transition-opacity hover:opacity-90 sm:text-[14px]"
    >
      <GithubIcon className="size-[18px] shrink-0" aria-hidden="true" />
      <span
        data-testid="home-github-stars"
        className="flex items-center gap-1.5 border-r border-white/20 pr-2.5"
      >
        <Star className="size-3.5" aria-hidden="true" />
        {formattedGithubStars}
      </span>
      <span className="min-w-0 break-all">github.com/aipoch/open-science</span>
      <ArrowUpRight className="ml-20 size-4 shrink-0" />
    </Link>
  )
}
