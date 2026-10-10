'use client'

import { ArrowRight, ChevronDown, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { useRef, useState } from 'react'

const steps = [
  {
    id: 'plan',
    title: 'Plan',
    description:
      'Describe the task in plain language. The agent drafts a step-by-step execution plan for your review — nothing runs until you approve it.'
  },
  {
    id: 'execute',
    title: 'Execute',
    description:
      'Run commands, Python, R, search, and connectors in one persistent workspace. Every action stays visible, approval-gated, and open to review.'
  },
  {
    id: 'produce',
    title: 'Produce',
    description:
      'Turn the work into reports, tables, figures, and structured outputs while preserving the evidence and steps behind every result.'
  },
  {
    id: 'review',
    title: 'Review',
    description:
      'Open every result in place. Inspect data, documents, images, source, structures, and notebook output before you approve or share it.'
  },
  {
    id: 'share',
    title: 'Share',
    description:
      'Export a session as a portable .science package with its conversation branches, selected files, and recorded evidence — so a collaborator can inspect how the result was produced, not just see the conclusion.'
  }
] as const

export const ResearchWorkbench = () => {
  const [active, setActive] = useState(0)
  const buttons = useRef<(HTMLButtonElement | null)[]>([])
  return (
    <div className="mt-12 grid items-start gap-9 lg:grid-cols-[436px_minmax(0,1fr)]">
      <div>
        {steps.map((step, index) => (
          <div
            key={step.id}
            className={`border-t ${active === index ? 'border-t-2 border-[#fbdd67]' : 'border-[#dcdcd6]'}`}
          >
            <button
              ref={(element) => {
                buttons.current[index] = element
              }}
              type="button"
              id={`workflow-${step.id}`}
              aria-expanded={active === index}
              aria-controls={`workflow-${step.id}-detail`}
              onClick={() => setActive(index)}
              onKeyDown={(event) => {
                const next =
                  event.key === 'ArrowDown'
                    ? (index + 1) % steps.length
                    : event.key === 'ArrowUp'
                      ? (index + steps.length - 1) % steps.length
                      : event.key === 'Home'
                        ? 0
                        : event.key === 'End'
                          ? steps.length - 1
                          : null
                if (next === null) return
                event.preventDefault()
                setActive(next)
                buttons.current[next]?.focus()
              }}
              className={`flex w-full items-center justify-between py-5 text-left font-[Georgia] text-[22px] leading-[33px] tracking-[-.3px] transition-colors hover:text-[#111] ${active === index ? 'text-[#111]' : 'text-[#6b6b66]'}`}
            >
              {step.title}
              {active === index ? (
                <ChevronDown className="size-4" aria-hidden />
              ) : (
                <ChevronRight className="size-4" aria-hidden />
              )}
            </button>
            <div id={`workflow-${step.id}-detail`} hidden={active !== index} className="pb-7">
              <p className="text-[15px] leading-[25px] text-[#3d3d3a]">{step.description}</p>
              <Link
                href="/open-science"
                className="mt-[18px] inline-flex items-center gap-2 text-[13px] font-medium"
              >
                Learn more <ArrowRight className="size-3" aria-hidden />
              </Link>
            </div>
          </div>
        ))}
      </div>
      <figure
        data-testid="workflow-preview"
        className="relative aspect-[4/3] overflow-hidden bg-[#ddd9d0]"
        aria-labelledby={`workflow-${steps[active].id}`}
      >
        {/* biome-ignore lint/performance/noImgElement: Exact Figma background, with its original crop and no overlay. */}
        <img
          src="/figma/landing/workflow-background.png"
          alt=""
          loading="lazy"
          className="absolute left-[-2.73%] top-0 h-full w-[105.47%] max-w-none"
        />
        {steps[active].id === 'share' ? (
          <div
            data-testid="workflow-share-crop"
            className="absolute left-[8.3333%] top-[10.7906%] h-[109.4017%] w-[94.8718%] overflow-hidden border border-white/52 shadow-[0_12px_28px_rgba(0,0,0,.16)]"
          >
            {/* biome-ignore lint/performance/noImgElement: Preserve the export dialog's original Figma crop within the 624 × 468 preview. */}
            <img
              src="/figma/landing/workflow-share.png"
              alt="Open-Science share workflow preview: export a session as a portable .science package"
              width={1247}
              height={1261}
              loading="lazy"
              className="absolute left-0 top-[-.99%] h-[117.01%] w-full max-w-none"
            />
          </div>
        ) : (
          /* biome-ignore lint/performance/noImgElement: Apply the shadow to the visible bitmap bounds, not a wider letterboxed image element. */
          <img
            key={steps[active].id}
            src={`/figma/landing/workflow-${steps[active].id}.png`}
            alt={`Open-Science ${steps[active].title.toLowerCase()} workflow preview`}
            width={4096}
            height={3072}
            loading="lazy"
            className="absolute left-[9.856%] top-[10.79%] h-[166.67%] w-[166.67%] max-w-none rounded-lg object-contain shadow-[0_24px_70px_rgba(0,0,0,.34)]"
          />
        )}
      </figure>
    </div>
  )
}
