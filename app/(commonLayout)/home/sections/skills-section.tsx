import { ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { skillAreas } from '../home-data'
import { homeSection } from '../home-styles'
import { SkillsCountUp } from '../interactive/skills-count-up'

export const HomeSkillsSection = ({ skillsCount }: { skillsCount: number }) => (
  <section id="skills" className={`${homeSection} px-6`}>
    <div className="mx-auto max-w-[944px]">
      <div className="text-center">
        <p className="font-mono text-[10px] uppercase tracking-[.06em] text-[#61615c]">
          Agent Skills <span className="text-[#989894]">/ The library</span>
        </p>
        <SkillsCountUp skillsCount={skillsCount} />
        <h2 className="mt-3 font-[Georgia] text-[36px] leading-[1.03] tracking-[-.04em] sm:text-[56px]">
          Medical Research Agent Skills
        </h2>
        <p className="mx-auto mt-6 max-w-[680px] text-base leading-[26px] text-[#6b6b66]">
          Browse AIPOCH skills for literature review, study planning, data analysis, and academic
          writing. Each skill packages instructions and supporting resources for a specific task.
          Check its requirements and any available evaluation results before use.
        </p>
      </div>
      <div className="mt-12 grid lg:mt-16 border-y border-[#e7e5de] sm:grid-cols-2 lg:grid-cols-4">
        {skillAreas.map(([title, description], index) => (
          <article
            key={title}
            data-testid={`skill-area-${index}`}
            className="border-[#e7e5de] px-6 py-7 sm:odd:border-r lg:border-r lg:last:border-r-0"
          >
            <p className="font-mono text-[11px] text-[#b17820]">0{index + 1}</p>
            {/* biome-ignore lint/performance/noImgElement: Exact Figma stipple icons. */}
            <img
              src={`/figma/landing/skill-${['evidence', 'protocol', 'data', 'writing'][index]}.svg`}
              alt=""
              width={36}
              height={36}
              loading="lazy"
              className="mb-5 mt-5 size-9"
            />
            <h3 className="font-[Georgia] text-lg tracking-[-.02em]">{title}</h3>
            <p
              data-testid="skill-area-description"
              className="mt-3 text-[13.5px] leading-[22px] text-[#6b6b66]"
            >
              {description}
            </p>
          </article>
        ))}
      </div>
      <div className="mt-[68px] text-center">
        <div className="flex flex-wrap items-center justify-center text-[13px] text-[#111]">
          {[
            ['Claude Code', 'claude'],
            ['Codex', 'codex'],
            ['OpenCode', 'opencode']
          ].map(([name, image]) => (
            <span
              key={name}
              className="inline-flex min-h-10 items-center gap-2 border-r border-[#e7e5de] px-[18px] last:border-r-0"
            >
              {/* biome-ignore lint/performance/noImgElement: Exact official marks exported from Figma. */}
              <img
                src={`/figma/landing/agent-${image}.png`}
                alt=""
                width={20}
                height={20}
                loading="lazy"
                className="size-5 object-contain"
              />
              {name}
            </span>
          ))}
        </div>
        <div className="flex min-h-10 items-center justify-center gap-2 text-[13px] text-[#61615c]">
          <span className="flex size-[22px] items-center justify-center rounded-[3px] border border-black/20 font-mono text-[8.5px] text-[#111]">
            SK
          </span>
          <span>any other SKILL.md-compatible agent</span>
        </div>
        <Link
          href="/agent-skills/list"
          className="mt-[68px] inline-flex min-h-[46px] items-center gap-4 bg-[#111] px-6 font-mono text-[11px] uppercase tracking-[.06em] text-white transition-colors hover:bg-[#333]"
        >
          Browse the Skills Library <ArrowRight className="size-3" aria-hidden />
        </Link>
      </div>
    </div>
  </section>
)
