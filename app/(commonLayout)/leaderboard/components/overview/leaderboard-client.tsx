'use client'

import { useQuery } from '@tanstack/react-query'
/**
 * Client for the overall leaderboard (/leaderboard): filters, search, infinite scrolling, and period tab visibility.
 * page.tsx provides the initial data; React Query loads subsequent pages, and leaderboard-view composes the UI.
 */
import { useDebounce } from 'ahooks'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  fetchLeaderboardCategoriesClient,
  type LeaderboardInfiniteFilters,
  leaderboardCategoriesKeys,
  type OverallLeaderboardData,
  type OverallLeaderboardStatsData,
  useInfiniteOverallLeaderboard
} from '@/service/leaderboard-overall'
import {
  fetchPeriodLeaderboardVisibility,
  leaderboardPeriodKeys
} from '@/service/leaderboard-period'
import {
  isAnyFilterActive,
  LeaderboardFiltersPanel,
  LeaderboardList,
  LeaderboardSummaryCards,
  LeaderboardToolbar,
  skillHref
} from '..'
import { LeaderboardOverviewHero } from './leaderboard-overview-hero'

type LeaderboardClientProps = {
  initialPageData: OverallLeaderboardData
  initialStats: OverallLeaderboardStatsData
}

/** Overall leaderboard root: receives the first page and statistics from the server and manages filters and the infinite query. */
export function LeaderboardClient({ initialPageData, initialStats }: LeaderboardClientProps) {
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null)
  const [searchInput, setSearchInput] = useState('')
  const debouncedKeyword = useDebounce(searchInput, { wait: 400 })
  const [filterOpen, setFilterOpen] = useState(false)
  const [searchExpanded, setSearchExpanded] = useState(false)
  const [rankMin, setRankMin] = useState('')
  const [rankMax, setRankMax] = useState('')
  const [scoreMin, setScoreMin] = useState('')
  const [scoreMax, setScoreMax] = useState('')
  const [coreMin, setCoreMin] = useState('')
  const [coreMax, setCoreMax] = useState('')
  const [medMin, setMedMin] = useState('')
  const [medMax, setMedMax] = useState('')

  const periodVisibilityQuery = useQuery({
    queryKey: leaderboardPeriodKeys.visibility(),
    queryFn: fetchPeriodLeaderboardVisibility,
    staleTime: 5 * 60 * 1000
  })

  const categoriesQuery = useQuery({
    queryKey: leaderboardCategoriesKeys.list(),
    queryFn: async () => {
      const result = await fetchLeaderboardCategoriesClient()
      if (!result.data) {
        throw new Error(result.msg)
      }
      return result.data
    },
    enabled: filterOpen,
    retryDelay: 500,
    staleTime: 5 * 60 * 1000
  })
  const categoryItems = categoriesQuery.data?.items

  const categoryApiValue = useMemo(() => {
    if (activeCategoryId == null) return null
    const cat = categoryItems?.find((c) => c.id === activeCategoryId)
    return cat?.name?.trim() || null
  }, [activeCategoryId, categoryItems])

  const filters = useMemo<LeaderboardInfiniteFilters>(
    () => ({
      keyword: debouncedKeyword,
      categoryApiValue,
      rankMin,
      rankMax,
      scoreMin,
      scoreMax,
      coreMin,
      coreMax,
      medMin,
      medMax
    }),
    [
      debouncedKeyword,
      categoryApiValue,
      rankMin,
      rankMax,
      scoreMin,
      scoreMax,
      coreMin,
      coreMax,
      medMin,
      medMax
    ]
  )

  const listQuery = useInfiniteOverallLeaderboard(filters, initialPageData)

  const loadMoreRef = useRef<HTMLDivElement>(null)
  const { hasNextPage, isFetchingNextPage, fetchNextPage } = listQuery

  const items = useMemo(
    () => listQuery.data?.pages.flatMap((p) => p.items) ?? [],
    [listQuery.data?.pages]
  )

  const firstPagePagination = listQuery.data?.pages[0]?.pagination

  useEffect(() => {
    const el = loadMoreRef.current
    if (!el || items.length === 0) return
    const ob = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage()
        }
      },
      { root: null, rootMargin: '240px 0px', threshold: 0 }
    )
    ob.observe(el)
    return () => ob.disconnect()
  }, [hasNextPage, isFetchingNextPage, fetchNextPage, items.length])

  const { headerStats, summary } = useMemo(() => {
    const s = initialStats
    const evaluated = s.evaluated_skills
    const max = s.max_score
    const min = s.min_score
    const topName = s.max_score_skill?.trim() || '—'
    return {
      headerStats: {
        total:
          typeof evaluated === 'number' && !Number.isNaN(evaluated) ? Math.round(evaluated) : '—',
        top:
          typeof s.max_score === 'number' && !Number.isNaN(s.max_score)
            ? Math.round(s.max_score)
            : '—',
        avg:
          typeof s.avg_total_score === 'number' && !Number.isNaN(s.avg_total_score)
            ? Math.round(s.avg_total_score)
            : '—'
      } as const,
      summary: {
        maxScore: typeof max === 'number' && !Number.isNaN(max) ? max : ('—' as const),
        minScore: typeof min === 'number' && !Number.isNaN(min) ? min : ('—' as const),
        avgTotal:
          typeof s.avg_total_score === 'number' && !Number.isNaN(s.avg_total_score)
            ? s.avg_total_score.toFixed(1)
            : ('—' as const),
        avgCore:
          typeof s.avg_core_score === 'number' && !Number.isNaN(s.avg_core_score)
            ? s.avg_core_score.toFixed(1)
            : ('—' as const),
        avgMed:
          typeof s.avg_medical_score === 'number' && !Number.isNaN(s.avg_medical_score)
            ? s.avg_medical_score.toFixed(1)
            : ('—' as const),
        top1Name: topName
      }
    }
  }, [initialStats])

  const filtersActive = isAnyFilterActive(
    activeCategoryId != null,
    debouncedKeyword,
    rankMin,
    rankMax,
    scoreMin,
    scoreMax,
    coreMin,
    coreMax,
    medMin,
    medMax
  )

  function resetFilters() {
    setActiveCategoryId(null)
    setSearchInput('')
    setRankMin('')
    setRankMax('')
    setScoreMin('')
    setScoreMax('')
    setCoreMin('')
    setCoreMax('')
    setMedMin('')
    setMedMax('')
    setSearchExpanded(false)
  }

  const listLoading = listQuery.isLoading && !listQuery.data?.pages?.length
  const categoriesLoading = Boolean(
    categoriesQuery.isFetching && filterOpen && !categoryItems?.length
  )

  return (
    <main className="flex min-h-0 flex-1 flex-col bg-[#f7f7f5] text-[#111111] antialiased">
      {/* Hero banner with the highest score, average score, and statistics (participants, Top 1, and average). */}
      <LeaderboardOverviewHero headerStats={headerStats} />

      {/* Toolbar: Overview and API-controlled Daily/Weekly/Monthly tabs; filters and search appear only on the overall leaderboard. */}
      <div className="sticky top-[var(--nav-h)] z-40 bg-[#f7f7f5]">
        <LeaderboardToolbar
          active="overview"
          visibility={periodVisibilityQuery.data}
          visibilityLoading={periodVisibilityQuery.isLoading}
          showOverviewFilters
          filterOpen={filterOpen}
          filtersActive={filtersActive}
          searchInput={searchInput}
          searchExpanded={searchExpanded}
          onToggleFilters={() => setFilterOpen((v) => !v)}
          onSearchInputChange={setSearchInput}
          onSearchFocus={() => setSearchExpanded(true)}
          onSearchBlur={() => {
            if (!searchInput) setSearchExpanded(false)
          }}
          onClearSearch={() => {
            setSearchInput('')
            setSearchExpanded(false)
          }}
          onSearchIconClick={() => {
            if (!searchExpanded) setSearchExpanded(true)
          }}
        />
      </div>

      {/* Overall leaderboard filter panel: category chips and multiple rank/score ranges, expanded below the toolbar. */}
      <LeaderboardFiltersPanel
        filterOpen={filterOpen}
        activeCategoryId={activeCategoryId}
        onActiveCategoryId={setActiveCategoryId}
        categoryItems={categoryItems}
        categoriesLoading={categoriesLoading}
        categoriesError={categoriesQuery.isError}
        rankMin={rankMin}
        rankMax={rankMax}
        scoreMin={scoreMin}
        scoreMax={scoreMax}
        coreMin={coreMin}
        coreMax={coreMax}
        medMin={medMin}
        medMax={medMax}
        onRankMin={setRankMin}
        onRankMax={setRankMax}
        onScoreMin={setScoreMin}
        onScoreMax={setScoreMax}
        onCoreMin={setCoreMin}
        onCoreMax={setCoreMax}
        onMedMin={setMedMin}
        onMedMax={setMedMax}
        onResetAll={resetFilters}
      />

      <div className="mx-auto w-full max-w-7xl flex-1 px-5 py-7 sm:px-8 md:pb-20">
        {/* Overall leaderboard summary above the list: highest and average scores, Core/Med weights, and score ranges. */}
        <LeaderboardSummaryCards summary={summary} />

        {/* Overall leaderboard table: header, data rows, loadMoreRef placeholder, and loaded item count. */}
        <LeaderboardList
          listError={!!listQuery.error}
          listLoading={listLoading}
          items={items}
          firstPagePagination={firstPagePagination}
          hasNextPage={!!hasNextPage}
          isFetchingNextPage={isFetchingNextPage}
          loadMoreRef={loadMoreRef}
          hrefForItem={skillHref}
        />
      </div>
    </main>
  )
}
