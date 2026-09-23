import { Search, SlidersHorizontal, X } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import type { LeaderboardPeriod } from '@/service/leaderboard-period'

/** Page subtitle.*/
export const defaultLeaderboardSubtitle =
  'Ranked evaluation results for all audited medical research agent skills — scored on core capability and live task execution.'

type LeaderboardHeroProps = {
  headerStats: { total: number | '—'; top: number | '—'; avg: number | '—' }
  title?: string
  subtitle?: string
  /** The overall leaderboard has three columns; daily, weekly, and monthly boards show only Top and Avg. */
  statsLayout?: 'two' | 'three'
}

/** Page hero: title, subtitle, and statistics on the right. */
export function LeaderboardHero({
  headerStats,
  title = 'Leaderboard',
  subtitle = defaultLeaderboardSubtitle,
  statsLayout = 'three'
}: LeaderboardHeroProps) {
  return (
    <section className="border-b border-[#D4D4D4] bg-[#E9E9E9] bg-[linear-gradient(rgba(0,0,0,0.055)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.055)_1px,transparent_1px)] bg-[length:72px_72px]">
      <div className="mx-auto flex max-w-[1200px] flex-col items-start justify-between gap-6 px-5 py-12 sm:px-8 sm:py-14 md:flex-row md:items-center md:gap-8 md:px-10 md:pb-[60px] md:pt-16">
        <div>
          <h1 className="mb-4 text-5xl font-bold leading-none tracking-tight sm:text-6xl md:text-[72px]">
            {title}
          </h1>
          <p className="max-w-[480px] text-[15px] font-mono italic leading-relaxed text-[#555555]">
            {subtitle}
          </p>
        </div>
        <div className="flex shrink-0 gap-10 sm:gap-12 md:gap-[52px]">
          {statsLayout === 'three' ? (
            <div className="text-center">
              <div className="text-4xl font-bold leading-none tracking-tight text-[#111111] md:text-[44px]">
                {headerStats.total}
              </div>
              <div className="mt-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-[#909090]">
                Evaluated Skills
              </div>
            </div>
          ) : null}
          <div className="text-center">
            <div className="text-4xl font-bold leading-none tracking-tight text-[#111111] md:text-[44px]">
              {headerStats.top}
            </div>
            <div className="mt-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-[#909090]">
              Top Score
            </div>
          </div>
          <div className="text-center">
            <div className="text-4xl font-bold leading-none tracking-tight text-[#111111] md:text-[44px]">
              {headerStats.avg}
            </div>
            <div className="mt-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-[#909090]">
              Avg Score
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export const leaderboardTabLinkClass =
  'relative top-px flex items-center gap-1.5 whitespace-nowrap border-b-2 py-3.5 pl-2 pr-2 text-xs font-semibold uppercase tracking-[0.06em]'

const subnavLinkClass = leaderboardTabLinkClass

type LeaderboardToolbarProps = {
  active: 'overview' | LeaderboardPeriod
  visibility: { daily: boolean; weekly: boolean; monthly: boolean } | undefined
  visibilityLoading: boolean
  showOverviewFilters?: boolean
  filterOpen?: boolean
  filtersActive?: boolean
  searchInput?: string
  searchExpanded?: boolean
  onToggleFilters?: () => void
  onSearchInputChange?: (value: string) => void
  onSearchFocus?: () => void
  onSearchBlur?: () => void
  onClearSearch?: () => void
  onSearchIconClick?: () => void
}

/**
 * Toolbar: Overview and Daily/Weekly/Monthly tabs.
 * Show filters and search only for the overall leaderboard (showOverviewFilters).
 */
export function LeaderboardToolbar({
  active,
  visibility,
  visibilityLoading,
  showOverviewFilters,
  filterOpen,
  filtersActive,
  searchInput,
  searchExpanded,
  onToggleFilters,
  onSearchInputChange,
  onSearchFocus,
  onSearchBlur,
  onClearSearch,
  onSearchIconClick
}: LeaderboardToolbarProps) {
  const showPeriodTabs = Boolean(
    visibility && (visibility.daily || visibility.weekly || visibility.monthly)
  )

  return (
    <div
      className={cn(
        'border-b',
        showOverviewFilters ? 'border-[#e7e5de] bg-[#f7f7f5]' : 'border-[#DCDCDC] bg-[#E9E9E9]'
      )}
    >
      <div
        className={cn(
          'mx-auto flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-5 py-2 sm:px-8',
          showOverviewFilters ? 'max-w-7xl' : 'max-w-[1200px] md:px-10'
        )}
      >
        <div className="flex min-w-0 flex-wrap items-stretch gap-x-1">
          <Link
            href="/leaderboard"
            className={cn(
              subnavLinkClass,
              active === 'overview'
                ? 'border-[#111111] text-[#111111]'
                : 'border-transparent text-[#909090] transition-colors hover:text-[#111111]'
            )}
          >
            Overview
          </Link>
          {visibilityLoading ? (
            <span className="flex items-center px-2 py-3.5 text-xs text-[#909090]">Loading…</span>
          ) : showPeriodTabs ? (
            <>
              {visibility?.daily ? (
                <Link
                  href="/leaderboard/daily"
                  className={cn(
                    subnavLinkClass,
                    active === 'daily'
                      ? 'border-[#111111] text-[#111111]'
                      : 'border-transparent text-[#909090] transition-colors hover:text-[#111111]'
                  )}
                >
                  Daily
                </Link>
              ) : null}
              {visibility?.weekly ? (
                <Link
                  href="/leaderboard/weekly"
                  className={cn(
                    subnavLinkClass,
                    active === 'weekly'
                      ? 'border-[#111111] text-[#111111]'
                      : 'border-transparent text-[#909090] transition-colors hover:text-[#111111]'
                  )}
                >
                  Weekly
                </Link>
              ) : null}
              {visibility?.monthly ? (
                <Link
                  href="/leaderboard/monthly"
                  className={cn(
                    subnavLinkClass,
                    active === 'monthly'
                      ? 'border-[#111111] text-[#111111]'
                      : 'border-transparent text-[#909090] transition-colors hover:text-[#111111]'
                  )}
                >
                  Monthly
                </Link>
              ) : null}
            </>
          ) : null}
        </div>

        {showOverviewFilters ? (
          <div className="flex shrink-0 items-center gap-1.5">
            <button
              type="button"
              onClick={onToggleFilters}
              aria-expanded={filterOpen}
              aria-controls="leaderboard-filters"
              className={cn(
                'flex h-9 items-center gap-1.5 whitespace-nowrap rounded-none border px-2.5 text-xs font-medium tracking-[0.03em] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#111]',
                filterOpen
                  ? 'border-[#b6ad8f] bg-[#e5e3d6] text-[#111111]'
                  : 'border-[#e7e5de] bg-transparent text-[#555555] hover:border-[#AEAEAE] hover:text-[#111111]'
              )}
            >
              <SlidersHorizontal className="size-[13px] shrink-0" strokeWidth={1.8} />
              Filters
              <span
                className={cn(
                  'size-[5px] shrink-0 rounded-full bg-[#4A8A72]',
                  filtersActive ? 'inline-block' : 'hidden'
                )}
                aria-hidden
              />
            </button>
            <div
              className={cn(
                'flex h-9 items-center overflow-hidden rounded-none border border-[#e7e5de] transition-colors duration-200 focus-within:border-[#111] focus-within:ring-1 focus-within:ring-[#111]',
                showOverviewFilters || searchExpanded || searchInput
                  ? 'w-[min(220px,55vw)] sm:w-[220px]'
                  : 'w-[30px]'
              )}
            >
              <button
                type="button"
                title="Search"
                className="flex size-[30px] shrink-0 items-center justify-center text-[#909090] hover:text-[#111111]"
                onClick={onSearchIconClick}
              >
                <Search className="size-[13px]" aria-hidden />
              </button>
              <input
                type="search"
                aria-label="Search skills"
                placeholder="Search skills…"
                autoComplete="off"
                value={searchInput ?? ''}
                onChange={(e) => onSearchInputChange?.(e.target.value)}
                onFocus={onSearchFocus}
                onBlur={onSearchBlur}
                className="min-w-0 flex-1 border-0 bg-transparent pr-1 text-[12.5px] text-[#111111] outline-none placeholder:text-[#909090]"
              />
              {searchInput ? (
                <button
                  type="button"
                  title="Clear"
                  className="flex size-[26px] shrink-0 items-center justify-center text-[#909090] hover:text-[#111111]"
                  onClick={onClearSearch}
                >
                  <X className="size-[11px]" aria-hidden />
                </button>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
