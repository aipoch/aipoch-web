import type { ReactNode } from 'react'
import type { StaticImageFileName } from '@/lib/static-assets'
import { OpenScienceImage } from './open-science-image'
import { OpenScienceSectionHeading, openScienceContainer } from './open-science-section'

function CapabilityList({ items }: { items: { title: string; description?: ReactNode }[] }) {
  return (
    <ul className="mt-4 space-y-4">
      {items.map((item) => (
        <li key={item.title} className="flex items-start gap-3">
          <OpenScienceImage
            asset="open-science-check-6530ff26.svg"
            sizes="16px"
            className="mt-0.5 size-4 shrink-0"
          />
          <div className="min-w-0">
            <p className="text-sm leading-[21px]">{item.title}</p>
            {item.description ? (
              <p className="mt-3 text-sm leading-[21px] text-[#6b6b66]">{item.description}</p>
            ) : null}
          </div>
        </li>
      ))}
    </ul>
  )
}

function Capability({
  label,
  title,
  asset,
  reverse,
  children
}: {
  label: string
  title: string
  asset: StaticImageFileName
  reverse?: boolean
  children: ReactNode
}) {
  return (
    <article className="grid items-center gap-8 lg:grid-cols-2 lg:gap-16">
      <div data-open-science-reveal="" className={reverse ? 'lg:col-start-2 lg:row-start-1' : ''}>
        <p className="mb-4 font-mono text-[10px] leading-4 tracking-normal text-[#6b6b66]">
          {label}
        </p>
        <h3 className="text-lg font-medium leading-6 tracking-normal">{title}</h3>
        {children}
      </div>
      <div
        data-open-science-reveal="0.1"
        className={reverse ? 'lg:col-start-1 lg:row-start-1' : ''}
      >
        <OpenScienceImage
          asset={asset}
          alt={`${title} — Open-Science workspace`}
          sizes="(min-width: 1230px) 559px, (min-width: 1024px) 45vw, calc(100vw - 48px)"
          className="h-auto w-full"
        />
      </div>
    </article>
  )
}

const descriptionClass = 'mt-4 text-sm leading-[21px] text-[#6b6b66]'

export function OpenScienceCapabilities() {
  return (
    <section className={`${openScienceContainer} py-16 lg:py-20`}>
      <OpenScienceSectionHeading
        eyebrow="How it works"
        title="Run, inspect, and share research with .science"
      >
        AIPOCH Open-Science connects agent reasoning with executable tools, scientific resources,
        persistent context, and traceable outputs. .science packages make selected research records
        portable for review, handoff, and continuation.
      </OpenScienceSectionHeading>
      <div className="space-y-16 lg:space-y-24">
        <Capability
          label="01 · EXECUTION & COMPUTE"
          title="Run Python, R, shell commands, and research tools"
          asset="open-science-execution-22cf5be9.webp"
        >
          <div className={`${descriptionClass} space-y-4`}>
            <p>
              Open-Science provides persistent Python and R kernels, stateless shell execution, and
              supported remote SSH compute in one research workspace.
            </p>
            <p>
              Persistent kernels let researchers and agents maintain variables and analytical state
              across related steps. Shell commands support file operations, scientific tooling, and
              reproducible workflows, while environment and package information makes computational
              assumptions more visible.
            </p>
            <p>
              When local resources are insufficient, supported SSH workflows can submit and manage
              research jobs on registered remote compute hosts.
            </p>
          </div>
          <CapabilityList
            items={[
              { title: 'Persistent Python and R kernels' },
              { title: 'Stateless shell execution with recorded history' },
              { title: 'Supported remote SSH compute' }
            ]}
          />
        </Capability>
        <Capability
          label="02 · SPECIALISTS, SKILLS & CONNECTORS"
          title="Extend research workflows with scoped capabilities"
          asset="open-science-specialists-495d54a2.webp"
          reverse
        >
          <p className={descriptionClass}>
            Open-Science combines Scientific Connectors, purpose-scoped Specialists, and reusable
            Skills so research agents can use domain-specific capabilities without bypassing
            workspace permissions.
          </p>
          <CapabilityList
            items={[
              {
                title: 'Scientific Connectors',
                description:
                  'Open-Science includes 24 built-in Scientific Connectors covering scientific literature, biomedical databases, genomics, chemistry, clinical research, and related resources. Connector and tool access remains governed by workspace permissions, and researchers can add compatible custom connectors.'
              },
              {
                title: 'Specialists',
                description:
                  'Specialists are purpose-scoped AI agent profiles configured with selected instructions, Skills, Scientific Connectors, and permissions. The main agent can delegate scoped work to a Specialist, but Specialists cannot bypass the researcher’s permission settings.'
              },
              {
                title: 'Reusable Skills',
                description: (
                  <>
                    Open-Science includes featured Skills for literature review, computational
                    biology, biomolecular modeling and design, environment and package workflows,
                    and remote compute. Researchers can also use Personal and imported Skills
                    through the Skills system.
                    <a
                      href="https://aipoch.com/docs/settings/skills"
                      className="mt-4 block underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4"
                    >
                      Manage Skills in Settings →
                    </a>
                  </>
                )
              }
            ]}
          />
        </Capability>
        <Capability
          label="03 · TRACEABILITY & REVIEW"
          title="Traceable research workflows in Open-Science"
          asset="open-science-traceability-19cb72cd.webp"
        >
          <p className={descriptionClass}>
            Traceability is a core design principle in Open-Science. Instead of treating reports,
            tables, figures, and notebooks as isolated chat outputs, the workbench preserves them as
            versioned research artifacts connected to the available evidence behind their creation.
          </p>
          <CapabilityList
            items={[
              {
                title: 'Versioned artifacts',
                description:
                  'Preserve changes to reports, figures, tables, notebooks, and other research outputs.'
              },
              {
                title: 'Provenance records',
                description:
                  'Connect an artifact to available inputs, producer code, execution history, environment details, and the conversation branch that produced it.'
              },
              {
                title: 'Reviewer checks',
                description:
                  'Compare completed agent work with available transcripts, execution records, and artifacts to identify unsupported claims, inconsistencies, or missing evidence.'
              },
              {
                title: 'Explicit evidence gaps',
                description:
                  'Show when provenance information is unavailable instead of reconstructing or guessing what happened.'
              }
            ]}
          />
        </Capability>
        <Capability
          label="04 · MODELS, DATA & ACCESS"
          title="Local-first research with explicit external access"
          asset="open-science-permissions-70f580a2.webp"
          reverse
        >
          <p className={descriptionClass}>
            Open-Science stores project state, sessions, uploads, notebook history, and generated
            artifacts on the user’s computer by default. Data may leave the device when a researcher
            invokes a configured model provider, Scientific Connector, web search, or remote compute
            host. These external calls are governed by the active approval and permission settings,
            while provider-specific retention and training policies may still apply. Review
            Permissions &amp; Runtimes before using sensitive or regulated data.
          </p>
          <a
            href="https://aipoch.com/docs/settings/permissions-runtimes"
            className="mt-4 block text-sm leading-[21px] underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4"
          >
            Permissions &amp; runtimes →
          </a>
        </Capability>
      </div>
      <p
        data-open-science-reveal=""
        className="mt-16 border border-[#e7e5de] bg-[#f1f1ef] p-4 text-xs leading-5 text-[#6b6b66]"
      >
        Reviewer findings and provenance records improve transparency and auditability, but they do
        not certify scientific correctness or replace expert validation.
      </p>
    </section>
  )
}
