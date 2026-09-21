import Link from 'next/link'
import { homeContainer, homeSection } from '../home-styles'

export const HomeEcosystemSection = ({ skillsCount }: { skillsCount: number }) => (
  <section id="ecosystem" className={homeSection}>
    <div className={homeContainer}>
      <div className="text-center">
        <p className="font-mono text-[10px] uppercase tracking-[.06em] text-[#61615c]">
          Ecosystem <span className="text-[#989894]">/ Signal flow</span>
        </p>
        {/* biome-ignore lint/performance/noImgElement: Exact decorative artwork exported from Figma. */}
        <img
          src="/figma/landing/ecosystem-bridge.png"
          alt=""
          width={287}
          height={54}
          className="mx-auto mb-5 mt-8 h-[54px] w-[287px] object-contain opacity-40"
          loading="lazy"
        />
        <h2
          data-testid="ecosystem-title"
          className="font-[Georgia] text-[36px] leading-[1.03] tracking-[-.04em] sm:text-[56px]"
        >
          AIPOCH Ecosystem <br />
          Scientific AI Workflows
        </h2>
        <p className="mx-auto mt-6 max-w-[912px] text-base leading-[26px] text-[#6b6b66]">
          AIPOCH Open-Science provides the research workspace. Reusable skills define task-specific
          instructions and resources, while MedSkillAudit provides a framework for evaluating
          medical research skills.
        </p>
      </div>
      <div className="mt-12 grid gap-9 md:grid-cols-3">
        {[
          {
            title: 'Open-Science',
            image: 'ecosystem-workbench.png',
            imageClass: 'left-[.54%] top-[.94%] h-full w-[69.38%]',
            href: '/open-science',
            description: 'Organize projects, run analyses, and inspect outputs.',
            detail:
              'Orchestrate end-to-end scientific workflows with agents, tools, and data connectors in one place.',
            label: 'Workbench',
            value: 'Orchestrator'
          },
          {
            title: 'Medical Research Skills',
            image: 'ecosystem-skills.png',
            imageClass: 'left-[-2.98%] top-[-10.06%] h-[114.41%] w-[75.77%]',
            href: '/agent-skills/list',
            description: 'Domain knowledge and execution logic.',
            detail:
              'Access 550+ vetted medical research skills covering analysis, reporting, data ops, and study operations.',
            label: 'Library',
            value: `${skillsCount} skills`
          },
          {
            title: 'MedSkillAudit',
            image: 'ecosystem-audit.png',
            imageClass: 'left-[-17.26%] top-[-21.22%] h-[144.13%] w-full',
            href: '/medskillaudit',
            description: 'Audited release-ready before deployment.',
            detail:
              'Validate skills for safety, correctness, and reliability with automated and human-in-the-loop review.',
            label: 'Release gate',
            value: 'Pass / Reject'
          }
        ].map((item) => (
          <article
            key={item.title}
            className="grid min-w-0 gap-2 px-4 text-left md:row-span-5 md:grid-rows-subgrid lg:px-7"
          >
            <div className="relative mb-2 aspect-[308/213.7] w-full overflow-hidden">
              {/* biome-ignore lint/performance/noImgElement: Preserve the exact Figma artwork and crop. */}
              <img
                src={`/figma/landing/${item.image}`}
                alt=""
                loading="lazy"
                className={`absolute max-w-none ${item.imageClass}`}
              />
            </div>
            <h3 className="text-[27px] font-semibold leading-[1.1] tracking-[-.04em]">
              <Link href={item.href} className="hover:underline">
                {item.title}
              </Link>
            </h3>
            <p className="text-base font-medium leading-[22px]">{item.description}</p>
            <p className="text-[15.5px] leading-[22px] text-[#484844]">{item.detail}</p>
            <p className="mt-2 flex min-h-[51px] items-center justify-between gap-2 bg-[#e5e7eb] px-4 py-4 font-mono text-[11px] font-bold uppercase tracking-[.07em] text-[#6b6b66] xl:px-7 xl:text-[13px]">
              <span>{item.label}</span>
              <span aria-hidden className="h-[13px] w-px shrink-0 bg-[#b6b7bb]" />
              <span className="text-[#111]">{item.value}</span>
            </p>
          </article>
        ))}
      </div>
    </div>
  </section>
)
