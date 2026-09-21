'use client'

import { useDebounce, useInViewport } from 'ahooks'
import { ChevronDown, ChevronUp, Download, Eye, Search, Star, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Input } from '@/components/ui/input'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { useNavigationViewState } from '@/hooks/use-navigation-view-state'
import { cn } from '@/lib/utils'
import type { SkillsOrderBy, SkillsOrderDirection } from '@/service/skills'
import { useCategories, useInfiniteSkills, useTotalCount } from '@/service/skills'
import { AGENT_SKILLS_LIST_DESCRIPTION } from './agent-skills-list-content'
import { ErrorState } from './components/error-state'
import { SkillCard } from './components/skill-card'
import {
  FilterBarSkeleton,
  SkillCardSkeleton,
  SkillListSkeleton
} from './components/skills-skeleton'

type Category = string

const skillToolbarItems = [
  { key: 'views', label: 'Views', icon: Eye, orderBy: 'view_count' as const },
  { key: 'downloads', label: 'Download', icon: Download, orderBy: 'download_count' as const },
  { key: 'score', label: 'Score', icon: Star, orderBy: 'score' as const }
] as const

const PAGE_SIZE = 9 // Nine items per page fit the three-column layout.

export default function SkillsPage() {
  const { data: categoriesData, isLoading: isLoadingCategories } = useCategories()
  const [view, setView, viewReady] = useNavigationViewState<{
    selectedCategory: Category
    searchInput: string
    sortState: { orderBy: SkillsOrderBy; orderType: SkillsOrderDirection }
    pageCount: number
  }>('skills-list', {
    selectedCategory: 'ALL',
    searchInput: '',
    sortState: { orderBy: 'view_count', orderType: 'desc' },
    pageCount: 1
  })
  const { selectedCategory, searchInput, sortState } = view
  const setSelectedCategory = (category: Category) =>
    setView((previous) => ({
      ...previous,
      selectedCategory: category,
      pageCount: 1
    }))
  const setSearchInput = (search: string) =>
    setView((previous) => ({
      ...previous,
      searchInput: search,
      pageCount: 1
    }))
  const [isSortRefreshing, setIsSortRefreshing] = useState(false)
  const debouncedSearch = useDebounce(searchInput, { wait: 400 })

  // Map category names to IDs.
  const categoryNameToId = useMemo(() => {
    const map: Record<string, string> = {}
    categoriesData?.items?.forEach((cat) => {
      map[cat.name] = cat.id
    })
    return map
  }, [categoriesData])

  // Resolve the current category ID.
  const categoryIdParam =
    selectedCategory === 'ALL' ? undefined : categoryNameToId[selectedCategory]

  // Use the React Query infinite query hook to manage caching automatically.
  const { data, fetchNextPage, hasNextPage, isFetching, isFetchingNextPage, isLoading, isError } =
    useInfiniteSkills(
      categoryIdParam,
      debouncedSearch || undefined,
      PAGE_SIZE,
      sortState.orderBy,
      sortState.orderType
    )

  // Combine the data from all loaded pages.
  const skills = useMemo(() => {
    return data?.pages.flatMap((page) => page?.items ?? []) ?? []
  }, [data])

  // Load more items when the loading skeleton enters the viewport.
  const loadMoreRef = useRef<HTMLDivElement>(null)
  const [inViewport] = useInViewport(loadMoreRef, {
    threshold: 0,
    rootMargin: '100px' // Start loading 100px before the element enters the viewport.
  })

  useEffect(() => {
    if (inViewport && hasNextPage && !isFetchingNextPage && !isError) {
      fetchNextPage()
    }
  }, [inViewport, hasNextPage, isFetchingNextPage, isError, fetchNextPage])

  useEffect(() => {
    if (!isSortRefreshing) return

    if (!isFetching || isFetchingNextPage) {
      const timer = window.setTimeout(() => {
        setIsSortRefreshing(false)
      }, 220)

      return () => window.clearTimeout(timer)
    }
  }, [isFetching, isFetchingNextPage, isSortRefreshing])

  // Add the "ALL" option to the category list.
  const categories = ['ALL', ...(categoriesData?.items?.map((c) => c.name) ?? [])]

  // Fetch statistics.
  const { data: totalCountData, isLoading: isLoadingTotalCount } = useTotalCount()

  const handleSortTrigger = (orderBy: SkillsOrderBy) => {
    setIsSortRefreshing(true)
    setView((previous) => ({
      ...previous,
      pageCount: 1,
      sortState: {
        orderBy,
        orderType:
          previous.sortState.orderBy === orderBy && previous.sortState.orderType === 'desc'
            ? 'asc'
            : 'desc'
      }
    }))
  }

  const loadedPages = data?.pages.length ?? 0
  const restoringPages =
    viewReady &&
    !isError &&
    (isLoadingCategories ||
      searchInput !== debouncedSearch ||
      (loadedPages < view.pageCount && (isLoading || Boolean(hasNextPage))))
  useEffect(() => {
    if (!viewReady || isLoadingCategories || searchInput !== debouncedSearch || isError) return
    if (loadedPages < view.pageCount && hasNextPage && !isFetchingNextPage) {
      void fetchNextPage()
    } else if (loadedPages > view.pageCount && !isFetching) {
      setView((previous) => ({ ...previous, pageCount: loadedPages }))
    }
  }, [
    viewReady,
    isLoadingCategories,
    searchInput,
    debouncedSearch,
    isError,
    loadedPages,
    view.pageCount,
    hasNextPage,
    isFetchingNextPage,
    isFetching,
    fetchNextPage,
    setView
  ])

  return (
    <main
      data-scroll-restoration-pending={!viewReady || restoringPages}
      className="-mt-[var(--nav-h)] min-h-dvh bg-[#f7f7f5] pt-[var(--nav-h)] text-[#111]"
    >
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* biome-ignore lint/performance/noImgElement: Exact decorative asset exported from Figma. */}
        <img
          src="/figma/landing/skills-network.png"
          alt=""
          aria-hidden
          width={1084}
          height={405}
          className="pointer-events-none absolute right-[calc(50%-900px)] top-0 hidden h-[405px] w-[1084px] object-contain opacity-[.41] lg:block"
        />
        <div className="relative mx-auto max-w-7xl px-4 py-12 lg:min-h-[419px] lg:px-8 lg:py-24">
          <div className="flex-1">
            <h1 className="mb-4 font-[Georgia] text-5xl leading-[1.03] text-[#111] md:text-6xl lg:text-[78px]">
              Skills
            </h1>
            <p className="max-w-xl text-base leading-[26px] text-[#61615c]">
              {AGENT_SKILLS_LIST_DESCRIPTION}
            </p>
          </div>
          <div className="mt-8 flex gap-8">
            <div className="text-center">
              <div
                className={cn(
                  'text-3xl font-semibold text-black min-w-[2ch]',
                  isLoadingTotalCount && 'animate-pulse bg-black/10 rounded'
                )}
              >
                {isLoadingTotalCount ? '\u00A0' : (totalCountData?.data.total_skills ?? 0)}
              </div>
              <div className="text-xs uppercase tracking-wider text-black/40">Active Skills</div>
            </div>
            <div className="text-center">
              <div
                className={cn(
                  'text-3xl font-semibold text-black min-w-[2ch]',
                  isLoadingTotalCount && 'animate-pulse bg-black/10 rounded'
                )}
              >
                {isLoadingTotalCount ? '\u00A0' : (totalCountData?.data.total_authors ?? 0)}
              </div>
              <div className="text-xs uppercase tracking-wider text-black/40">Contributors</div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content Section */}
      <section className="mx-auto max-w-7xl px-4 pb-24 lg:px-8 lg:pb-32">
        {/* Filter Bar */}
        {isLoadingCategories ? (
          <FilterBarSkeleton />
        ) : (
          <div className="mb-8 flex flex-col gap-4 lg:gap-10 lg:flex-row lg:items-end lg:justify-between">
            {/* Category Group */}
            <div
              className="scrollbar-thin scrollbar-thumb-black/20 scrollbar-track-transparent -mx-4 flex-1 overflow-x-auto px-4"
              style={{
                scrollbarWidth: 'thin',
                scrollbarColor: 'rgba(0,0,0,0.2) transparent'
              }}
            >
              <ToggleGroup
                type="single"
                variant="outline"
                value={selectedCategory}
                onValueChange={(value) => value && setSelectedCategory(value as Category)}
                className="flex-nowrap justify-start gap-0"
              >
                {categories.map((category) => (
                  <ToggleGroupItem
                    key={category}
                    value={category}
                    className={cn(
                      'h-9 rounded-none text-[10px] sm:text-xs px-6 cursor-pointer font-medium border-black/50 uppercase tracking-wider shrink-0',
                      'data-[state=on]:bg-black data-[state=on]:text-white hover:bg-black/10'
                    )}
                  >
                    {category}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </div>

            <div className="w-full lg:w-[320px] shrink-0 lg:mb-2">
              <div className="ml-auto w-full space-y-2 lg:w-[276px]">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-medium uppercase tracking-wider text-black/45">
                  {skillToolbarItems.map(({ key, label, icon: Icon, orderBy }) => (
                    <div key={key} className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleSortTrigger(orderBy)}
                        className={cn(
                          'flex cursor-pointer items-center gap-1 transition-colors hover:text-black/70',
                          sortState.orderBy === orderBy ? 'text-black/80' : 'text-black/45'
                        )}
                      >
                        <Icon className="h-3.5 w-3.5" />
                        {label}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSortTrigger(orderBy)}
                        className={cn(
                          'flex cursor-pointer flex-col items-center leading-none transition-colors hover:text-black/60',
                          sortState.orderBy === orderBy ? 'text-black/65' : 'text-black/30'
                        )}
                      >
                        <ChevronUp
                          className={cn(
                            'h-3 w-3',
                            sortState.orderBy === orderBy &&
                              sortState.orderType === 'asc' &&
                              'text-black'
                          )}
                        />
                        <ChevronDown
                          className={cn(
                            '-mt-0.5 h-3 w-3',
                            sortState.orderBy === orderBy &&
                              sortState.orderType === 'desc' &&
                              'text-black'
                          )}
                        />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="relative flex items-center">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-black/30" />
                  <Input
                    type="text"
                    placeholder="Search skills..."
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    className="h-10 rounded-none border-black/15 bg-transparent pl-9 pr-9 text-sm placeholder:text-black/35 focus-visible:ring-black/15"
                  />
                  {searchInput && (
                    <button
                      type="button"
                      onClick={() => setSearchInput('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-black/30 hover:text-black/55"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Skills Content */}
        {isLoading || isSortRefreshing ? (
          <SkillListSkeleton />
        ) : isError ? (
          <ErrorState onRetry={() => window.location.reload()} />
        ) : (
          <>
            {/* Skills Grid */}
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {skills.map((skill) => (
                <SkillCard key={skill.id} skill={skill} />
              ))}
            </div>

            {/* Empty State */}
            {skills.length === 0 && (
              <div className="py-16 text-center col-span-full">
                <p className="text-black/60">No skills found matching your criteria.</p>
              </div>
            )}

            {/* Load More */}
            <div ref={loadMoreRef} className="py-8 flex justify-center">
              {isFetchingNextPage ? (
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 w-full">
                  {[...Array(3)].map((_, i) => (
                    <SkillCardSkeleton key={i} />
                  ))}
                </div>
              ) : !hasNextPage && skills.length > 0 ? (
                <p className="text-black/40 text-sm">more skills to be added</p>
              ) : null}
            </div>
          </>
        )}
      </section>
    </main>
  )
}
