import { LoaderCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { LeaderboardCategoryItem } from '@/service/leaderboard-overall'

const filterRangeNumClass =
  'min-w-[62px] w-[62px] rounded-none border border-[#e7e5de] bg-[#f7f7f5] h-9 px-1 py-1 text-center text-xs text-[#111111] outline-none transition-colors focus:border-[#111] focus:ring-1 focus:ring-[#111] [appearance:auto]'

type LeaderboardFiltersPanelProps = {
  filterOpen: boolean
  activeCategoryId: string | null
  onActiveCategoryId: (id: string | null) => void
  categoryItems: LeaderboardCategoryItem[] | undefined
  categoriesLoading: boolean
  categoriesError: boolean
  rankMin: string
  rankMax: string
  scoreMin: string
  scoreMax: string
  coreMin: string
  coreMax: string
  medMin: string
  medMax: string
  onRankMin: (v: string) => void
  onRankMax: (v: string) => void
  onScoreMin: (v: string) => void
  onScoreMax: (v: string) => void
  onCoreMin: (v: string) => void
  onCoreMax: (v: string) => void
  onMedMin: (v: string) => void
  onMedMax: (v: string) => void
  onResetAll: () => void
}

/** Overall leaderboard filter panel: category chips and multiple rank/score ranges, expanded below the toolbar. */
export function LeaderboardFiltersPanel({
  filterOpen,
  activeCategoryId,
  onActiveCategoryId,
  categoryItems,
  categoriesLoading,
  categoriesError,
  rankMin,
  rankMax,
  scoreMin,
  scoreMax,
  coreMin,
  coreMax,
  medMin,
  medMax,
  onRankMin,
  onRankMax,
  onScoreMin,
  onScoreMax,
  onCoreMin,
  onCoreMax,
  onMedMin,
  onMedMax,
  onResetAll
}: LeaderboardFiltersPanelProps) {
  return (
    <div
      id="leaderboard-filters"
      hidden={!filterOpen}
      className="border-b border-[#e7e5de] bg-[#f7f7f5]"
    >
      <div className="mx-auto max-w-7xl px-5 py-4 sm:px-8">
        <div className="mb-3 flex flex-wrap items-center gap-2.5 gap-y-2">
          <span className="min-w-[66px] shrink-0 text-[10px] font-semibold uppercase tracking-[0.1em] text-[#909090]">
            Category
          </span>
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => onActiveCategoryId(null)}
              aria-pressed={activeCategoryId == null}
              className={cn(
                'whitespace-nowrap rounded-none border px-2.5 py-1 text-[11px] font-semibold tracking-[0.04em] transition-colors',
                activeCategoryId == null
                  ? 'border-[#111111] bg-[#111111] text-white'
                  : 'border-[#DCDCDC] bg-white text-[#555555] hover:border-[#AEAEAE] hover:text-[#111111]'
              )}
            >
              All
            </button>
            {categoriesLoading && filterOpen && !categoryItems?.length ? (
              <LoaderCircle
                className="size-4 shrink-0 animate-spin text-[#909090]"
                aria-label="Loading categories"
              />
            ) : null}
            {(categoryItems ?? []).map((cat) => {
              const selected = activeCategoryId === cat.id
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => onActiveCategoryId(cat.id)}
                  aria-pressed={selected}
                  className={cn(
                    'max-w-[220px] truncate whitespace-nowrap rounded-none border px-2.5 py-1 text-[11px] font-semibold tracking-[0.04em] transition-colors',
                    selected
                      ? 'border-[#111111] bg-[#111111] text-white'
                      : 'border-[#DCDCDC] bg-white text-[#555555] hover:border-[#AEAEAE] hover:text-[#111111]'
                  )}
                  title={cat.name}
                >
                  {cat.name}
                </button>
              )
            })}
            {categoriesError ? (
              <span className="text-[11px] text-red-600">Failed to load categories</span>
            ) : null}
          </div>
        </div>
        <div className="mb-0 flex flex-wrap items-center gap-2.5 gap-y-3">
          <span className="min-w-[66px] shrink-0 text-[10px] font-semibold uppercase tracking-[0.1em] text-[#909090]">
            Rank
          </span>
          <div className="flex items-center gap-1.5">
            <input
              type="number"
              min={1}
              step={1}
              className={filterRangeNumClass}
              placeholder="1"
              aria-label="Minimum rank"
              value={rankMin}
              onChange={(e) => onRankMin(e.target.value)}
            />
            <span className="text-[11px] text-[#909090]">–</span>
            <input
              type="number"
              min={1}
              step={1}
              className={filterRangeNumClass}
              placeholder="∞"
              aria-label="Maximum rank"
              value={rankMax}
              onChange={(e) => onRankMax(e.target.value)}
            />
          </div>
          <span className="ml-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#909090]">
            Total Score
          </span>
          <div className="flex items-center gap-1.5">
            <input
              type="number"
              min={0}
              max={100}
              step={0.1}
              className={filterRangeNumClass}
              placeholder="0"
              aria-label="Minimum total score"
              value={scoreMin}
              onChange={(e) => onScoreMin(e.target.value)}
            />
            <span className="text-[11px] text-[#909090]">–</span>
            <input
              type="number"
              min={0}
              max={100}
              step={0.1}
              className={filterRangeNumClass}
              placeholder="100"
              aria-label="Maximum total score"
              value={scoreMax}
              onChange={(e) => onScoreMax(e.target.value)}
            />
          </div>
          <span className="ml-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#909090]">
            Core Cap.
          </span>
          <div className="flex items-center gap-1.5">
            <input
              type="number"
              min={0}
              max={100}
              step={0.1}
              className={filterRangeNumClass}
              placeholder="0"
              aria-label="Minimum core capability"
              value={coreMin}
              onChange={(e) => onCoreMin(e.target.value)}
            />
            <span className="text-[11px] text-[#909090]">–</span>
            <input
              type="number"
              min={0}
              max={100}
              step={0.1}
              className={filterRangeNumClass}
              placeholder="100"
              aria-label="Maximum core capability"
              value={coreMax}
              onChange={(e) => onCoreMax(e.target.value)}
            />
          </div>
          <span className="ml-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#909090]">
            Med. Task
          </span>
          <div className="flex items-center gap-1.5">
            <input
              type="number"
              min={0}
              max={100}
              step={0.1}
              className={filterRangeNumClass}
              placeholder="0"
              aria-label="Minimum medical task score"
              value={medMin}
              onChange={(e) => onMedMin(e.target.value)}
            />
            <span className="text-[11px] text-[#909090]">–</span>
            <input
              type="number"
              min={0}
              max={100}
              step={0.1}
              className={filterRangeNumClass}
              placeholder="100"
              aria-label="Maximum medical task score"
              value={medMax}
              onChange={(e) => onMedMax(e.target.value)}
            />
          </div>
          <button
            type="button"
            onClick={onResetAll}
            className="ml-1 rounded-none border border-[#DCDCDC] px-3 py-1 text-[11px] font-medium text-[#909090] transition-colors hover:border-[#999] hover:text-[#111111]"
          >
            Reset all
          </button>
        </div>
      </div>
    </div>
  )
}
