import { Download, Eye } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import type { ReactNode, RefObject } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import type {
  OverallLeaderboardItem,
  OverallLeaderboardPagination
} from '@/service/leaderboard-overall'
import { getLeaderboardSkillDisplayName } from '@/service/leaderboard-overall'
import { LeaderboardRankCell } from '../shared/leaderboard-list-row-parts'
import { scoreTone } from '../shared/leaderboard-row-tone'

type Summary = {
  maxScore: number | '—'
  minScore: number | '—'
  avgTotal: string
  avgCore: string
  avgMed: string
  top1Name: string
}

type LeaderboardSummaryCardsProps = { summary: Summary }

const leaderboardSummaryStatCardRoot = 'min-w-0 bg-white px-5 py-4'
const leaderboardSummaryStatLabel = 'text-xs uppercase leading-4 tracking-[0.6px] text-[#111]'
const leaderboardSummaryStatValue =
  'text-[30px] font-semibold leading-9 tabular-nums text-[#111111]'
const leaderboardSummaryStatFooter = 'mt-1 text-xs leading-4 text-[#6b6b66]'

/** A single summary card, such as Highest or Avg, used only within LeaderboardSummaryCards. */
function LeaderboardSummaryStatCard({
  title,
  value,
  footer,
  className,
  footerClassName
}: {
  title: string
  value: ReactNode
  footer: ReactNode
  className?: string
  footerClassName?: string
}) {
  return (
    <div className={cn(leaderboardSummaryStatCardRoot, className)}>
      <div className={leaderboardSummaryStatLabel}>{title}</div>
      <div className={leaderboardSummaryStatValue}>{value}</div>
      <div className={footerClassName ?? leaderboardSummaryStatFooter}>{footer}</div>
    </div>
  )
}

/** Overall leaderboard summary above the list: highest and average scores, Core/Med weights, and score ranges. */
export function LeaderboardSummaryCards({ summary }: LeaderboardSummaryCardsProps) {
  const hasRange = typeof summary.maxScore === 'number' && typeof summary.minScore === 'number'

  return (
    <div className="grid grid-cols-1 gap-3 border border-[#e7e5de] bg-white sm:grid-cols-2 lg:grid-cols-5">
      <LeaderboardSummaryStatCard
        title="Highest Score"
        value={summary.maxScore}
        footer={summary.top1Name}
        footerClassName={cn(leaderboardSummaryStatFooter, 'break-words')}
      />
      <LeaderboardSummaryStatCard
        title="Avg Total Score"
        value={summary.avgTotal}
        footer="overall average"
      />
      <LeaderboardSummaryStatCard
        title="Avg Core Cap."
        value={summary.avgCore}
        footer="out of 100 (40% weight)"
      />
      <LeaderboardSummaryStatCard
        title="Avg Med. Task"
        value={summary.avgMed}
        footer="out of 100 (60% weight)"
      />
      <LeaderboardSummaryStatCard
        title="Score Range"
        value={hasRange ? `${summary.minScore}–${summary.maxScore}` : '—'}
        footer={hasRange ? `min ${summary.minScore} / max ${summary.maxScore}` : ''}
        className="sm:col-span-2 lg:col-span-1"
      />
    </div>
  )
}

/** Overall leaderboard columns: rank, total score ring, skill, Core bar, Med bar, views/downloads, and arrow. */
const leaderboardListRowGridClass =
  'grid min-h-[76px] grid-cols-[60px_64px_minmax(200px,1fr)_171px_171px_88px_28px] items-center gap-x-4 border-b border-[#e7e5de] bg-white px-4 py-3'

const skeletonMuted = 'rounded-none bg-black/5'

/** Loading skeleton row with the same column widths as LeaderboardRow. */
function LeaderboardSkeletonRow() {
  return (
    <div className={leaderboardListRowGridClass} aria-hidden>
      <div className="flex justify-center">
        <Skeleton className={cn('h-4 w-7', skeletonMuted)} />
      </div>
      <div className="flex justify-center">
        <Skeleton className={cn('size-[50px] shrink-0 rounded-full', skeletonMuted)} />
      </div>
      <div className="flex min-w-0 flex-col gap-2">
        <Skeleton className={cn('h-4 w-[min(100%,220px)] max-w-full', skeletonMuted)} />
        <div className="flex flex-wrap gap-2">
          <Skeleton className={cn('h-5 w-16', skeletonMuted)} />
          <Skeleton className={cn('h-4 w-24', skeletonMuted)} />
        </div>
      </div>
      <div className="flex w-full min-w-0 flex-col justify-center gap-2">
        <Skeleton className={cn('h-3 w-20', skeletonMuted)} />
        <Skeleton className={cn('h-1.5 w-full rounded-full', skeletonMuted)} />
      </div>
      <div className="flex w-full min-w-0 flex-col justify-center gap-2">
        <Skeleton className={cn('h-3 w-20', skeletonMuted)} />
        <Skeleton className={cn('h-1.5 w-full rounded-full', skeletonMuted)} />
      </div>
      <div className="flex flex-col items-end gap-2">
        <Skeleton className={cn('h-3 w-9', skeletonMuted)} />
        <Skeleton className={cn('h-3 w-9', skeletonMuted)} />
      </div>
      <div className="flex justify-center">
        <Skeleton className={cn('size-7 rounded-none', skeletonMuted)} />
      </div>
    </div>
  )
}

/** Multiple skeleton rows for the initial load or loading more items. */
function LeaderboardSkeletonRows({ count, idPrefix }: { count: number; idPrefix: string }) {
  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <LeaderboardSkeletonRow key={`${idPrefix}-${i}`} />
      ))}
    </>
  )
}

/** Preserve score thresholds while using the softer Figma palette. */
function OverviewMetric({
  label,
  score,
  value
}: {
  label: string
  score: number
  value: ReactNode
}) {
  const green = scoreTone(score) === 'green'
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <div className="flex items-center justify-between gap-2 text-xs leading-4">
        <span className="font-medium uppercase tracking-[0.2px]">{label}</span>
        <span
          className={cn('font-semibold tabular-nums', green ? 'text-[#607a32]' : 'text-[#915600]')}
        >
          {value}
        </span>
      </div>
      <div className="h-[3px] overflow-hidden rounded-full bg-[#e7e5de]">
        <div
          className={cn('h-full rounded-full', green ? 'bg-[#afd670]' : 'bg-[#edb732]')}
          style={{ width: `${Math.min(100, Math.max(0, score))}%` }}
        />
      </div>
    </div>
  )
}

/** Overview rows link to the same skill destination and keep all API-provided metrics. */
function LeaderboardRow({
  item,
  hrefForItem
}: {
  item: OverallLeaderboardItem
  hrefForItem: (item: OverallLeaderboardItem) => string
}) {
  const displayName = getLeaderboardSkillDisplayName(item)
  return (
    <Link
      href={hrefForItem(item)}
      title="View skill"
      className={cn(
        leaderboardListRowGridClass,
        'group relative text-inherit no-underline transition-colors duration-150 hover:bg-[#e5e3d6] focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#111] active:bg-[#dedbcc] motion-reduce:transition-none'
      )}
    >
      <div>
        <span className="sr-only">Rank {item.rank}</span>
        <LeaderboardRankCell rank={item.rank} />
      </div>
      <div className="flex justify-center">
        <div className="flex size-[50px] flex-col items-center justify-center rounded-full bg-[#f7f7f5]">
          <span
            className={cn(
              'text-base font-semibold leading-5 tabular-nums',
              scoreTone(item.total_score) === 'green' ? 'text-[#607a32]' : 'text-[#915600]'
            )}
          >
            {Number.isInteger(item.total_score) ? item.total_score : item.total_score.toFixed(1)}
          </span>
          <span className="mt-px text-[10px] leading-[14px] text-[#6b6b66]">/100</span>
        </div>
      </div>
      <div className="min-w-0">
        <div className="font-[Georgia] text-lg leading-6 text-[#111]">{displayName}</div>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs leading-4 text-[#6b6b66]">
          <span className="bg-[#f7f7f5] px-2.5 font-medium uppercase tracking-[0.2px]">
            {item.category}
          </span>
          <span>{item.author}</span>
        </div>
      </div>
      <OverviewMetric
        label="Core Cap."
        score={item.core_score}
        value={Number.isInteger(item.core_score) ? item.core_score : item.core_score.toFixed(1)}
      />
      <OverviewMetric
        label="Med. Task"
        score={item.medical_score}
        value={item.medical_score.toFixed(1)}
      />
      <div className="flex flex-col items-end gap-1 text-xs leading-4 tabular-nums text-[#6b6b66]">
        <span className="flex items-center gap-1.5">
          <Eye className="size-[11px]" aria-hidden />
          <span className="sr-only">Views: </span>
          {item.stats?.views ?? 0}
        </span>
        <span className="flex items-center gap-1.5">
          <Download className="size-[11px]" aria-hidden />
          <span className="sr-only">Downloads: </span>
          {item.stats?.downloads ?? 0}
        </span>
      </div>
      <Image
        src="/figma/leaderboard/row-action.svg"
        alt=""
        width={20}
        height={20}
        className="mx-auto size-5"
      />
    </Link>
  )
}

type LeaderboardListProps = {
  listError: boolean
  listLoading: boolean
  items: OverallLeaderboardItem[]
  firstPagePagination: OverallLeaderboardPagination | undefined
  hasNextPage: boolean
  isFetchingNextPage: boolean
  loadMoreRef: RefObject<HTMLDivElement | null>
  hrefForItem: (item: OverallLeaderboardItem) => string
}

/** Overall leaderboard table: header, data rows, loadMoreRef placeholder, and loaded item count. */
export function LeaderboardList({
  listError,
  listLoading,
  items,
  firstPagePagination,
  hasNextPage,
  isFetchingNextPage,
  loadMoreRef,
  hrefForItem
}: LeaderboardListProps) {
  return (
    <>
      {listError ? (
        <p className="rounded-none border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          Failed to load. Check your connection or try again later.
        </p>
      ) : null}

      {/* biome-ignore lint/a11y/noNoninteractiveTabindex: Keyboard users need to scroll the wide results region. */}
      <section className="w-full overflow-x-auto" aria-label="Leaderboard results" tabIndex={0}>
        <div className="min-w-[1000px]">
          <div className="grid grid-cols-[60px_64px_minmax(200px,1fr)_171px_171px_88px_28px] items-center gap-x-4 border-b border-[#e7e5de] px-4 py-1.5">
            <div className="text-center text-xs font-medium uppercase leading-4 tracking-[0.6px] text-[#6b6b66]">
              Rank
            </div>
            <div className="text-center text-xs font-medium uppercase leading-4 tracking-[0.6px] text-[#6b6b66]">
              Score
            </div>
            <div className="min-w-0 text-left text-xs font-medium uppercase leading-4 tracking-[0.6px] text-[#6b6b66]">
              Skill
            </div>
            <div className="text-left text-xs font-medium uppercase leading-4 tracking-[0.6px] text-[#6b6b66]">
              Core Capability (40%)
            </div>
            <div className="text-left text-xs font-medium uppercase leading-4 tracking-[0.6px] text-[#6b6b66]">
              Medical Task (60%)
            </div>
            <div className="text-right text-xs font-medium uppercase leading-4 tracking-[0.6px] text-[#6b6b66]">
              Stats
            </div>
            <div className="shrink-0" aria-hidden />
          </div>

          <div
            className="relative flex min-h-[120px] flex-col"
            aria-busy={listLoading || isFetchingNextPage}
          >
            {listLoading ? (
              <>
                <span className="sr-only">Loading leaderboard</span>
                <LeaderboardSkeletonRows count={8} idPrefix="lb-initial" />
              </>
            ) : items.length === 0 ? (
              <div className="py-14 text-center text-sm text-[#909090]">
                <strong className="mb-1.5 block text-base font-bold text-[#555555]">
                  No results found
                </strong>
                Try adjusting your filters or search query.
              </div>
            ) : (
              <>
                {items.map((item) => (
                  <LeaderboardRow
                    key={`${item.skill_name}-${item.rank}`}
                    item={item}
                    hrefForItem={hrefForItem}
                  />
                ))}
                {isFetchingNextPage ? (
                  <>
                    <span className="sr-only">Loading more results</span>
                    <LeaderboardSkeletonRows count={3} idPrefix="lb-more" />
                  </>
                ) : null}
              </>
            )}
          </div>
        </div>
      </section>

      {items.length > 0 ? (
        <div className="mt-6 flex flex-col items-center gap-3 text-sm text-[#555555]">
          <p className="text-center text-xs text-[#909090]">
            {firstPagePagination
              ? `Loaded ${items.length} / ${firstPagePagination.total_count}`
              : null}
          </p>
          {isFetchingNextPage ? (
            <p className="text-xs text-[#909090]">Loading more…</p>
          ) : !hasNextPage ? (
            <p className="text-xs text-[#909090]">All results loaded</p>
          ) : null}
          <div ref={loadMoreRef} className="h-8 w-full shrink-0" aria-hidden />
        </div>
      ) : null}
    </>
  )
}
