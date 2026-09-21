import { ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { homeSection } from '../home-styles'

const principles = [
  [
    'Scientific Integrity',
    'integrity',
    'No fabricated citations, DOIs, sample sizes, or p-values. Enforced as a hard veto gate — one FAIL means rejection, regardless of the numeric score. Applies to research skills in categories 1–4.'
  ],
  [
    'Reproducibility',
    'reproducibility',
    'Core results must stay reproducible: no unseeded random-number calls, no unbounded loops, and generated code that runs with its declared dependencies. Each audit runs 3, 5 or 7 test inputs, scaled to assessed complexity.'
  ],
  [
    'Methodological Validity',
    'methodology',
    'No logical fallacies such as conflating correlation with causation; statistical methods and study-design choices must be valid and defensible for the stated task. Also a hard veto gate — one FAIL means rejection, regardless of score.'
  ]
] as const

export const HomeAuditSection = () => (
  <section id="audit" className={homeSection}>
    <div className="mx-auto max-w-[1000px] px-6 sm:px-7">
      <p className="mb-8 font-mono text-[10px] uppercase tracking-wide text-[#61615c]">
        Benchmark / Release gate
      </p>
      <h2
        data-testid="audit-title"
        className="font-[Georgia] text-[36px] leading-[1.03] tracking-[-.04em] sm:text-[56px]"
      >
        MedSkillAudit <br />
        Evaluate Medical Research Agent Skills
      </h2>
      <p className="mt-8 max-w-[840px] text-base leading-[26px] text-[#6b6b66]">
        MedSkillAudit is a domain-specific audit framework to evaluate whether a medical research
        agent skill is ready for release before deployment. It combines two hard veto gates with a
        two-layer scoring system: static design evaluation and dynamic task-based testing.
      </p>
      <div className="mt-12 grid min-h-[284px] border-y border-[#e7e5de] md:grid-cols-3">
        {principles.map(([title, icon, text]) => (
          <article
            key={title}
            className="border-[#e7e5de] px-7 py-7 md:border-r md:last:border-r-0"
          >
            {/* biome-ignore lint/performance/noImgElement: Exact stipple icon exported from Figma. */}
            <img
              src={`/figma/landing/audit-${icon}.svg`}
              alt=""
              width={20}
              height={20}
              className="mb-4 size-5"
            />
            <h3 className="font-[Georgia] text-lg tracking-[-.03em]">{title}</h3>
            <p className="mt-3 text-sm leading-[22px] text-[#6b6b66]">{text}</p>
          </article>
        ))}
      </div>
      <figure className="mt-12 overflow-x-auto rounded-md border border-[#e7e5de] bg-[#f2f0eb]">
        {/* biome-ignore lint/performance/noImgElement: Exact static Figma flowchart; semantic equivalent below. */}
        <img
          src="/figma/landing/audit-flow.png"
          alt="Submitted skill passes the MedSkillAudit release gate before entering the AIPOCH library. Outcomes: Production Ready, Limited Release, Beta Only, or Rejected."
          width={944}
          height={395}
          loading="lazy"
          className="h-auto min-w-[640px] w-full"
        />
      </figure>
      <Link
        href="/medskillaudit"
        className="mx-auto mt-[52px] flex h-12 w-fit items-center gap-2 bg-[#111] px-6 text-sm font-medium text-white transition-colors hover:bg-[#333]"
      >
        <span>Explore MedSkillAudit</span>
        <ArrowRight className="size-4" aria-hidden />
      </Link>
    </div>
  </section>
)
