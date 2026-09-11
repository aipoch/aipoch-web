import Image from 'next/image'
import Link from 'next/link'
import { staticImage } from '@/lib/staticAsset'

const heroStats = ['597 ACTIVE SKILLS', '3 CONTRIBUTORS', 'OPEN SOURCE', 'AUDITABLE']

export const HeroSection = () => {
  return (
    <section className="relative isolate min-h-[calc(620px+var(--nav-h))] overflow-hidden bg-[#f6f6f4]">
      {/* Match the reference canvas and fade the artwork edges to avoid a visible seam. */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        {/* Serve the lossless CDN original without another resize or lossy encoding pass. */}
        <Image
          {...staticImage('agent-skills-hero-3854ac8d.webp')}
          alt=""
          aria-hidden="true"
          priority
          unoptimized
          className="absolute inset-y-0 left-1/2 h-full w-auto max-w-none -translate-x-1/2 object-contain object-center opacity-64 [mask-image:linear-gradient(to_right,transparent,black_4%,black_96%,transparent)] lg:ml-[69px]"
        />
      </div>
      <div className="absolute inset-y-0 left-0 -z-10 w-full bg-gradient-to-r from-[#f6f6f4] via-[#f6f6f4]/94 via-[58%] to-transparent lg:w-[62.5%]" />

      {/* Keep all original destinations while matching the quieter editorial hierarchy. */}
      <div className="mx-auto w-full max-w-[1264px] px-5 pt-[calc(var(--nav-h)+80px)] pb-20 sm:px-8 lg:pt-[calc(var(--nav-h)+123.5px)] lg:pb-[123.5px]">
        <div className="max-w-[900px]">
          <p className="mb-[22px] font-mono text-[12px] leading-[1.2] tracking-[0.08em] text-[#6b6b66] uppercase">
            AIPOCH / AGENT SKILLS
          </p>
          <h1 className="font-[Georgia,serif] text-[48px] font-normal leading-[1.02] tracking-normal text-[#111] sm:text-[64px] lg:text-[78px] lg:leading-[79.6px]">
            The Ultimate Skills Hub
            <br className="hidden sm:block" /> for Medical Research
          </h1>
          <p className="mt-[22px] max-w-[760px] text-[16px] leading-[26px] text-[#6b6b66]">
            Explore reusable medical knowledge units that researchers can run directly
            <br className="hidden sm:block" /> or that AI agents can invoke programmatically.
          </p>

          <div className="mt-[22px] flex flex-wrap gap-3">
            <Link
              href="/agent-skills/list"
              className="inline-flex h-[46px] w-[148px] items-center justify-center border border-[#111] bg-[#111] px-6 text-[14px] font-medium text-[#fafafa] transition-colors hover:bg-[#333]"
            >
              Explore Skills
            </Link>
            <a
              href="https://aipoch.com/skill.md"
              download="skill.md"
              className="inline-flex h-[46px] w-[170px] items-center justify-center border border-[#111] bg-[#f6f6f4]/78 px-6 text-[14px] font-medium text-[#111] transition-colors hover:bg-white"
            >
              aipoch/skill.md
            </a>
          </div>

          <div className="mt-[22px] flex flex-wrap items-center gap-x-4 gap-y-2 font-mono text-[11px] leading-[1.2] text-[#6B6B66]">
            {heroStats.map((stat, index) => (
              <span key={stat} className="inline-flex items-center gap-4">
                {index > 0 ? <span aria-hidden="true">·</span> : null}
                {stat}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
