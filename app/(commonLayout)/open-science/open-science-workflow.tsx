import { CdnImage as Image } from '@/components/cdn-image'
import workflowArtwork from '@/public/figma/open-science/workflow-share.png'
import { OpenScienceSectionHeading, openScienceContainer } from './open-science-section'

const steps = [
  {
    title: 'Define',
    icon: 'workflow-define.svg',
    description: 'Define a research question and provide the relevant files or context.'
  },
  {
    title: 'Plan',
    icon: 'workflow-plan.svg',
    description:
      'Let an AI agent plan the work and delegate scoped tasks to Specialists or subagents when appropriate.'
  },
  {
    title: 'Execute',
    icon: 'workflow-execute.svg',
    description:
      'Search approved sources, inspect datasets, and run Python, R, shell commands, or research tools.'
  },
  {
    title: 'Inspect',
    icon: 'workflow-inspect.svg',
    description:
      'Create reports, tables, figures, and notebooks, then inspect them alongside execution records, provenance evidence, and optional Reviewer findings.'
  },
  {
    title: 'Share',
    icon: 'workflow-share.svg',
    description:
      'Export selected research records as a .science package for review, handoff, or continuation on another project or computer.'
  }
]

export function OpenScienceWorkflow() {
  return (
    <section className={`${openScienceContainer} py-16 lg:pt-[70px] lg:pb-20`}>
      <OpenScienceSectionHeading
        eyebrow="One workspace"
        title={
          <>
            One workspace from research question
            <br className="hidden lg:block" /> to traceable artifact
          </>
        }
      >
        Open-Science keeps research questions, project files, code execution, outputs,
        <br className="hidden lg:block" /> and review evidence together inside persistent projects.
        Agents can continue multi-step
        <br className="hidden lg:block" /> investigations and use specialized capabilities without
        separating the reasoning interface from the execution environment.
      </OpenScienceSectionHeading>
      <div data-testid="open-science-workflow" className="border border-[#dad8ce]">
        <div data-open-science-reveal="0.08" className="p-4 sm:p-[34px]">
          <div className="relative overflow-hidden rounded-lg">
            <Image
              src={workflowArtwork}
              quality={100}
              alt="Research workflow connecting Define, Plan, Execute, Inspect, and Share"
              sizes="(min-width: 1230px) 1112px, (min-width: 640px) calc(100vw - 118px), calc(100vw - 82px)"
              className="h-auto w-full"
            />
            <Image
              src="/figma/open-science/workflow-outline.svg"
              width={1111}
              height={581}
              alt=""
              aria-hidden="true"
              className="pointer-events-none absolute left-[0.04%] top-[0.08%] h-auto w-[99.92%]"
            />
          </div>
        </div>
        <ol className="grid sm:grid-cols-2 lg:grid-cols-5">
          {steps.map((step, index) => (
            <li
              key={step.title}
              data-open-science-reveal={index * 0.06}
              className="border-t border-[#dad8ce] p-6 sm:odd:border-r sm:last:col-span-2 sm:last:border-r-0 lg:min-h-[290px] lg:border-r lg:p-[34px] lg:last:col-span-1 lg:last:border-r-0"
            >
              <Image
                src={`/figma/open-science/${step.icon}`}
                alt=""
                width={21}
                height={21}
                className="mb-[14px]"
              />
              <h3 className="text-lg font-medium leading-6">{step.title}</h3>
              <p className="mt-[14px] text-sm leading-[21px] text-[#6b6b66]">{step.description}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
