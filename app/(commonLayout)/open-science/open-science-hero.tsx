import { ArrowRight, Star } from 'lucide-react'
import Image from 'next/image'
import { OpenScienceDownload } from './open-science-download'
import type { DownloadManifest } from './open-science-download-data'
import { OpenScienceImage } from './open-science-image'
import { openScienceAction } from './open-science-section'

export function OpenScienceHero({ releaseManifest }: { releaseManifest: DownloadManifest | null }) {
  return (
    <section className="relative isolate pt-[calc(var(--nav-h)+40px)] lg:h-[calc(1043px+var(--nav-h))] lg:pt-[calc(var(--nav-h)+64px)]">
      <div
        className="pointer-events-none absolute inset-x-0 top-[var(--nav-h)] bottom-0 -z-10 overflow-hidden"
        aria-hidden="true"
      >
        <OpenScienceImage
          asset="open-science-hero-background-70ab9e46.webp"
          preload
          sizes="(min-width: 1024px) 95vw, 100vw"
          className="absolute -top-[17px] h-full w-full object-cover object-top opacity-30 lg:-top-[15px] lg:right-0 lg:h-auto lg:w-[95%]"
        />
        <div className="absolute inset-0 bg-linear-to-b from-transparent from-60% to-[#f6f6f4]" />
      </div>
      <div className="mx-auto max-w-5xl px-6 lg:px-4">
        <div className="relative z-10 flex flex-col items-start gap-5">
          <a
            data-open-science-reveal=""
            href="https://aipoch.com/docs/"
            className="inline-flex items-center gap-3 rounded-xs border border-[#e5e7eb] bg-white px-3 py-1 text-sm text-[#6b6b66] transition-colors hover:bg-[#f4f4f1] focus-visible:outline-2 focus-visible:outline-offset-4"
          >
            Read the documentation
            <span className="border-l border-[#e5e7eb] pl-2">
              <ArrowRight className="size-3" aria-hidden="true" />
            </span>
          </a>
          <h1
            data-open-science-reveal="0.06"
            className="font-[Georgia,serif] text-[44px] font-normal leading-[1.02] tracking-normal sm:text-[60px] lg:text-[78px]"
          >
            AIPOCH Open-Science <br />
            AI Research Workbench
          </h1>
          <p data-open-science-reveal="0.12" className="text-base leading-[26px] text-[#6b6b66]">
            AIPOCH Open-Science is an open-source, local-first AI research workbench for macOS,
            Windows, and Linux. It brings scientific agents, Python and R execution, scientific
            Connectors, and traceable artifacts into one workspace. A{' '}
            <a
              href="https://aipoch.com/blog/aipoch-open-science-research-packages"
              className="underline underline-offset-4 transition-colors hover:text-[#111] focus-visible:outline-2 focus-visible:outline-offset-4"
            >
              .science package
            </a>{' '}
            can carry selected conversation branches, file versions, Notebook records, and
            verification evidence for review, handoff, and archiving. Explore{' '}
            <a
              href="https://aipoch.com/open-science/use-cases"
              className="underline underline-offset-4 transition-colors hover:text-[#111] focus-visible:outline-2 focus-visible:outline-offset-4"
            >
              .science use cases
            </a>{' '}
            to see these workflows in practice.
          </p>
          <div data-open-science-reveal="0.18" className="flex flex-wrap items-center gap-3">
            <a
              href="https://github.com/aipoch/open-science"
              target="_blank"
              rel="noopener noreferrer"
              className={`${openScienceAction} border-[#e5e7eb] bg-white hover:bg-[#f4f4f1]`}
            >
              <Star className="size-4" aria-hidden="true" />
              View on GitHub
            </a>
            <OpenScienceDownload initialManifest={releaseManifest} />
          </div>
        </div>
        <div
          data-open-science-reveal="0.24"
          className="mt-12 pb-8 [mask-image:linear-gradient(black_20%,transparent_98%)] lg:mt-20 lg:pb-0"
        >
          <Image
            src="/open-science/setup-2026-10-29.webp"
            width={3960}
            height={2084}
            quality={100}
            alt="Open-Science first-time setup — connect a model to your research workspace"
            sizes="(min-width: 1024px) 990px, calc(100vw - 48px)"
            preload
            className="h-auto w-full rounded-lg"
          />
        </div>
      </div>
    </section>
  )
}
