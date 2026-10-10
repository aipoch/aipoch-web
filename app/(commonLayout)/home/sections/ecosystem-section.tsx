import Link from 'next/link'
import { HomeGithubLink } from '../home-github-link'
import { homeContainer, homeSection } from '../home-styles'

export const HomeEcosystemSection = ({ skillsCount }: { skillsCount: number }) => (
  <section id="ecosystem" className={homeSection}>
    <div className={homeContainer}>
      <div>
        <p className="flex items-center gap-2 text-xs font-medium leading-4 tracking-[.6px] text-[#111]/72">
          Ecosystem <span className="text-[#111]/38">/ signal flow</span>
        </p>
        <div className="mt-9 grid gap-6 lg:min-h-[132px] lg:grid-cols-[minmax(0,764px)_minmax(0,364px)] lg:gap-9">
          <h2
            data-testid="ecosystem-title"
            className="font-[Georgia] text-[36px] font-normal leading-[1.11] tracking-[-1px] sm:text-[56px] sm:leading-[62px] sm:tracking-[-2px]"
          >
            The AIPOCH ecosystem <br />
            Scientific AI workflows
          </h2>
          <p className="text-base leading-[26px] text-[#292929]/62">
            Open Science runs and documents the work. Medical Research Skills provide vetted domain
            methods, and MedSkillAudit checks each skill before release.
          </p>
        </div>
      </div>
      <div className="mt-12 grid gap-x-9 gap-y-12 md:grid-cols-3 md:gap-y-2 lg:mt-[86px]">
        {[
          {
            title: 'Open-Science',
            image: 'ecosystem-workbench.png',
            href: '/open-science',
            description: 'Organize projects, run analyses, and inspect outputs.',
            detail:
              'Orchestrate end-to-end scientific workflows with agents, tools, and data connectors in one place.',
            label: 'System role',
            value: 'Workbench · Orchestrator'
          },
          {
            title: 'Medical Research Skills',
            image: 'ecosystem-skills.png',
            href: '/agent-skills/list',
            description: 'Domain knowledge and execution logic.',
            detail:
              'Access 550+ vetted medical research skills covering analysis, reporting, data ops, and study operations.',
            label: 'Skill library',
            value: `${skillsCount} skills`,
            showGithubStars: true
          },
          {
            title: 'MedSkillAudit',
            image: 'ecosystem-audit.png',
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
            className="grid min-w-0 gap-2 text-left md:row-span-5 md:grid-rows-subgrid"
          >
            <div className="relative mb-6 aspect-[364/242] w-full overflow-hidden">
              {/* biome-ignore lint/performance/noImgElement: Preserve the exact Figma artwork and crop. */}
              <img
                src={`/figma/landing/${item.image}`}
                alt=""
                width={364}
                height={242}
                loading="lazy"
                className="absolute inset-0 h-full w-full object-cover"
              />
            </div>
            <h3 className="font-[Georgia] text-[22px] font-normal leading-[30px] md:min-h-8">
              <Link href={item.href} className="hover:underline">
                {item.title}
              </Link>
            </h3>
            <p className="text-base leading-[26px] text-[#171717] md:min-h-[52px]">
              {item.description}
            </p>
            <p className="text-sm leading-5 text-[#111]/78 md:min-h-[82px]">{item.detail}</p>
            <div className="mt-6 flex min-h-9 flex-wrap items-center gap-x-4 gap-y-2 py-2.5 text-xs font-medium leading-4 tracking-[.6px] md:mt-[34px]">
              <p className="flex min-w-0 items-center gap-2.5">
                <span className="shrink-0 uppercase text-[#111]/32">{item.label}</span>
                <span aria-hidden className="h-px w-[18px] shrink-0 bg-[#b6b7bb]/28" />
                <span className="min-w-0 text-[#111]">{item.value}</span>
              </p>
              {item.showGithubStars ? <HomeGithubLink variant="compact" /> : null}
            </div>
          </article>
        ))}
      </div>
    </div>
  </section>
)
