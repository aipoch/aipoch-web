import { OpenScienceImage } from './open-science-image'
import { openScienceAction, openScienceContainer, openScienceHeading } from './open-science-section'

export function OpenScienceCommunity() {
  return (
    <section className="relative isolate overflow-hidden pt-16 pb-48 lg:min-h-[900px] lg:pt-[86px]">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
        <OpenScienceImage
          asset="open-science-community-background-bb262071.webp"
          sizes="100vw"
          className="size-full object-cover object-bottom opacity-[0.82]"
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(247,247,245,.94),rgba(247,247,245,.72)_28%,rgba(247,247,245,.34)_61%,rgba(247,247,245,.1)),radial-gradient(ellipse_83.6%_83.6%_at_50%_33%,rgba(247,247,245,.9),rgba(247,247,245,.72)_27%,rgba(247,247,245,.28)_56%,transparent_80%)]" />
      </div>
      <div className={`${openScienceContainer} text-center`}>
        <p
          data-open-science-reveal=""
          className="mb-4 font-mono text-[11px] font-semibold leading-4 tracking-normal text-[#6b6b66] uppercase"
        >
          Open-Science / open source
        </p>
        <h2 data-open-science-reveal="0.06" className={openScienceHeading}>
          Start building inspectable research workflows
          <br className="hidden lg:block" /> with Open-Science.
        </h2>
        <p
          data-open-science-reveal="0.12"
          className="mx-auto mt-[30px] max-w-[620px] text-base leading-[26px] text-[#6b6b66]"
        >
          Bring scientific AI agents, executable analysis, and traceable research artifacts into one
          local-first workspace. Share selected work as a .science package, and present a completed
          conversation as a Research Film.
        </p>
        <div
          data-open-science-reveal="0.18"
          className="mx-auto mt-[34px] flex max-w-[330px] flex-col gap-2.5"
        >
          {[
            {
              label: 'Star on GitHub',
              href: 'https://github.com/aipoch/open-science',
              icon: 'open-science-github-9c5574e6.svg' as const
            },
            {
              label: 'Join the Discord',
              href: 'https://discord.gg/zxQAYjReRv',
              icon: 'open-science-discord-10feb19d.svg' as const
            }
          ].map((link) => (
            <a
              key={link.label}
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              className={`${openScienceAction} min-h-12 border-[#111] bg-[#202020] font-mono text-[11px] font-semibold tracking-normal text-[#f4f2ec] uppercase hover:bg-[#333] hover:shadow-md`}
            >
              <OpenScienceImage asset={link.icon} sizes="14px" className="size-3.5" />
              {link.label}
            </a>
          ))}
        </div>
        <div
          aria-hidden="true"
          className="relative my-14 h-px bg-[#deddd8] before:absolute before:top-1/2 before:left-1/2 before:size-2 before:-translate-1/2 before:rotate-45 before:bg-[#b5b5b0]"
        />
        <p
          data-open-science-reveal=""
          className="mx-auto max-w-[720px] text-xs leading-[18px] text-[#6b6b66]"
        >
          Open-Science is an independent, open-source project from AIPOCH. It is not affiliated with
          or endorsed by Anthropic; references to Claude Science describe Anthropic's own public
          presentation of that product and are included here for context.
        </p>
      </div>
    </section>
  )
}
