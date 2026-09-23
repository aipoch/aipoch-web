import { defaultLeaderboardSubtitle } from '../shared/leaderboard-hero-toolbar'

/** Figma overview hero; period pages retain their existing presentation. */
export function LeaderboardOverviewHero({
  headerStats
}: {
  headerStats: { total: number | '—'; top: number | '—'; avg: number | '—' }
}) {
  return (
    <section className="bg-[#f7f7f5]">
      <div className="mx-auto flex max-w-7xl flex-col gap-8 px-5 pb-12 pt-14 sm:px-8 lg:flex-row lg:items-center lg:justify-between lg:gap-12 lg:pb-14 lg:pt-24">
        <div className="min-w-0 lg:max-w-[640px]">
          <h1 className="font-[Georgia] text-[48px] font-normal leading-[1.08] sm:text-[64px] lg:text-[78px] lg:leading-[80px]">
            Leaderboard
          </h1>
          <p className="mt-4 text-base leading-[26px] text-[#61615c]">
            {defaultLeaderboardSubtitle}
          </p>
        </div>
        <dl
          aria-label="Leaderboard statistics"
          className="flex shrink-0 flex-wrap gap-x-8 gap-y-5 xl:gap-x-10"
        >
          {[
            ['Evaluated Skills', headerStats.total],
            ['Top Score', headerStats.top],
            ['Avg Score', headerStats.avg]
          ].map(([label, value]) => (
            <div key={label} className="flex flex-col-reverse gap-1.5 text-center">
              <dt className="text-[10px] uppercase leading-4 tracking-[0.6px] text-[#6b6b66] sm:text-xs">
                {label}
              </dt>
              <dd className="text-[30px] font-semibold leading-9 tabular-nums lg:text-[40px] lg:leading-[48px]">
                {value}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  )
}
