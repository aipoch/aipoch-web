import { DEFAULT_GITHUB_STAR_COUNT, homeHeroStats } from './home-data'
import { HomeDownload } from './home-download'
import { HomeGithubLink } from './home-github-link'
import { HomeModelMarquee } from './home-model-marquee'
import { HomeReveal, MotionPulseDot } from './home-motion'

export const HomeHero = ({ githubStars = DEFAULT_GITHUB_STAR_COUNT }: { githubStars?: number }) => (
  <section id="home-hero" className="relative flex flex-col overflow-hidden bg-[#f7f7f5]">
    <div
      aria-hidden
      data-testid="home-hero-architecture"
      className="pointer-events-none absolute inset-0 hidden bg-[length:1180px_auto] bg-[position:calc(50%+130px)_118px] bg-no-repeat opacity-[.78] md:block"
      style={{
        backgroundImage: 'url(/figma/landing/hero-blueprint.png)',
        maskImage:
          'linear-gradient(90deg,transparent 44%,rgba(0,0,0,.02) 56%,rgba(0,0,0,.34) 68%,#000 84%)'
      }}
    />
    <div
      aria-hidden
      className="pointer-events-none absolute inset-x-0 top-[92px] hidden h-[200px] md:block"
      style={{
        background:
          'linear-gradient(180deg,#f7f7f5 0%,rgba(247,247,245,.96) 16%,rgba(247,247,245,.45) 50%,transparent 100%)'
      }}
    />
    <div
      aria-hidden
      className="pointer-events-none absolute inset-x-0 top-[636px] hidden h-[190px] md:block"
      style={{
        background:
          'linear-gradient(180deg,transparent 0%,rgba(247,247,245,.18) 38%,rgba(247,247,245,.78) 72%,#f7f7f5 100%)'
      }}
    />
    <div className="relative mx-auto w-full max-w-[1220px] px-6 pb-16 pt-[calc(var(--nav-h)+72px)] sm:px-7 lg:min-h-[826px] lg:pt-[176px]">
      <div data-testid="home-hero-content" className="max-w-[836px]">
        <HomeReveal
          visibleInitially
          className="mb-5 flex flex-wrap items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-[.84px] sm:text-xs"
        >
          <MotionPulseDot className="size-1.5 rounded-full bg-[#f6cc46]" />
          <span data-testid="home-hero-eyebrow-product">AIPOCH PRODUCT</span>
          <span className="text-[#6b6b66]">/ OPEN-SOURCE RESEARCH WORKBENCH</span>
        </HomeReveal>
        <h1 className="font-[Georgia] text-[52px] font-normal leading-[1.05] tracking-[-.043em] sm:text-[76px] lg:whitespace-nowrap lg:text-[100px] lg:leading-[.8]">
          <span data-testid="home-hero-title">Science, Open to All</span>
        </h1>
        <p
          data-testid="home-hero-description"
          className="mt-8 max-w-[549px] text-[15px] leading-[25px] text-[#6b6b66]"
        >
          Open-Science is AIPOCH&apos;s open-source, local-first AI research workbench. It combines
          agent workflows, Python and R execution, scientific data connectors, and traceable
          research artifacts in one inspectable workspace.
        </p>
        <HomeDownload />
        <div className="mt-12 flex flex-wrap items-center gap-6">
          <HomeGithubLink initialStars={githubStars} />
          <a
            href="https://github.com/aipoch/open-science?tab=Apache-2.0-1-ov-file"
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-[13px] text-[#6b6b66] underline underline-offset-2 transition-colors hover:text-[#915600]"
          >
            Apache-2.0 license
          </a>
        </div>
        <div
          data-testid="home-hero-stats"
          className="mt-14 grid max-w-[807px] grid-cols-2 sm:grid-cols-4"
        >
          {homeHeroStats.map((stat, index) => (
            <div
              key={stat.label}
              data-testid={'testId' in stat ? stat.testId : undefined}
              className={`flex min-h-[100px] flex-col items-center justify-center px-3 py-4 text-center ${index % 2 === 0 ? 'border-r border-black/10' : ''} ${index < 2 ? 'border-b border-black/10 sm:border-b-0' : ''} sm:border-r sm:border-black/10 sm:last:border-r-0`}
            >
              <strong className="font-mono text-[30px] leading-none text-[#202020]">
                {stat.value}
              </strong>
              <span className="mt-2 text-[11px] uppercase leading-[1.35] tracking-[.05em] text-[#61615c]">
                {stat.label}
                {'detail' in stat ? (
                  <>
                    <br />
                    {stat.detail}
                  </>
                ) : null}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
    <HomeModelMarquee />
  </section>
)
