import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { SITE_DOMAIN } from '@/lib/config'
import { createPageMetadata } from '@/lib/page-metadata'
import type { UseCaseIndexEntry } from '@/lib/use-case-types'
import { fetchUseCaseAssetText } from '@/service/open-science-use-case-assets'
import { fetchUseCaseDetail, fetchUseCaseList } from '@/service/open-science-use-cases'
import { SessionMarkdown } from '../_components/session-markdown'
import { ShareRow } from '../_components/share-row'

// Markdown styles come from app/globals.css → session-transcript.css; do not
// re-import that file here — Turbopack panics compiling it as a page CSS entry.

const headingClass = 'font-[Georgia,serif] font-normal tracking-normal'
// Same horizontal shell as the V2 gallery grid (~1120px content column).
const shellClass = 'mx-auto w-full px-5 sm:px-10 lg:px-[max(5vw,calc((100vw-1120px)/2))]'
/** Shared surface for related research and the bottom CTA. */
const surfaceClass = 'bg-[#f7f7f5]'

// PDF glyph from the design handoff: document outline with a folded corner
// and the Acrobat-style swirl. Lucide has no such icon, so it stays inline.
const PdfGlyph = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" {...props}>
    <g clipPath="url(#pdf-glyph-clip)">
      <path
        d="M13.5594 3.05933L10.9375 0.437451C10.6562 0.156201 10.275 -0.00317383 9.87813 -0.00317383H3.5C2.67188 -4.88281e-05 2 0.671826 2 1.49995V14.5C2 15.3281 2.67188 16 3.5 16H12.5C13.3281 16 14 15.3281 14 14.5V4.12183C14 3.72495 13.8406 3.34058 13.5594 3.05933ZM12.3781 3.99995H10V1.62183L12.3781 3.99995ZM3.5 14.5V1.49995H8.5V4.74995C8.5 5.16558 8.83437 5.49995 9.25 5.49995H12.5V14.5H3.5ZM11.3188 10.0093C10.9375 9.63433 9.85 9.73745 9.30625 9.8062C8.76875 9.47808 8.40938 9.02495 8.15625 8.35933C8.27812 7.8562 8.47187 7.09058 8.325 6.60933C8.19375 5.79058 7.14375 5.87183 6.99375 6.42495C6.85625 6.92808 6.98125 7.62808 7.2125 8.52183C6.9 9.2687 6.43437 10.2718 6.10625 10.8468C5.48125 11.1687 4.6375 11.6656 4.5125 12.2906C4.40937 12.7843 5.325 14.0156 6.89062 11.3156C7.59062 11.0843 8.35312 10.8 9.02812 10.6875C9.61875 11.0062 10.3094 11.2187 10.7719 11.2187C11.5688 11.2187 11.6469 10.3375 11.3188 10.0093ZM5.12812 12.4406C5.2875 12.0125 5.89375 11.5187 6.07812 11.3468C5.48438 12.2937 5.12812 12.4625 5.12812 12.4406ZM7.67812 6.48433C7.90937 6.48433 7.8875 7.48745 7.73438 7.75933C7.59688 7.32495 7.6 6.48433 7.67812 6.48433ZM6.91563 10.7531C7.21875 10.225 7.47813 9.59683 7.6875 9.0437C7.94688 9.51558 8.27813 9.8937 8.62813 10.1531C7.97813 10.2875 7.4125 10.5625 6.91563 10.7531ZM11.0281 10.5968C11.0281 10.5968 10.8719 10.7843 9.8625 10.3531C10.9594 10.2718 11.1406 10.5218 11.0281 10.5968Z"
        fill="currentColor"
      />
    </g>
    <defs>
      <clipPath id="pdf-glyph-clip">
        <rect width="16" height="16" fill="white" />
      </clipPath>
    </defs>
  </svg>
)

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  day: 'numeric',
  month: 'long',
  timeZone: 'UTC',
  year: 'numeric'
})

type PageProps = {
  params: Promise<{ id: string }>
}

export const dynamic = 'force-dynamic'

export const generateMetadata = async ({ params }: PageProps): Promise<Metadata> => {
  const { id } = await params
  const useCase = await fetchUseCaseDetail(id)
  if (!useCase) return {}
  const title = `${useCase.title} | Open-Science Use Cases`
  // Social share cards need an absolute image URL; relative mock paths only
  // work locally, which is fine for development.
  const coverImage = useCase.coverImage
  return createPageMetadata({
    title,
    description:
      useCase.description ?? `Read-only replay of the Open-Science session "${useCase.title}".`,
    canonical: `${SITE_DOMAIN}/open-science/use-cases/${encodeURIComponent(useCase.slug)}`,
    ...(coverImage
      ? {
          image: {
            url: coverImage.startsWith('http') ? coverImage : `${SITE_DOMAIN}${coverImage}`,
            width: 1200,
            height: 630,
            alt: useCase.title
          }
        }
      : {})
  })
}

/** Related card: same simple anatomy as the gallery card (image, serif title,
 *  "View use case in AIPOCH Lab" link). */
const RelatedCard = ({ useCase }: { useCase: UseCaseIndexEntry }) => {
  const detailHref = `/open-science/use-cases/${useCase.slug}`
  return (
    <Link
      href={detailHref}
      className="group flex flex-col overflow-hidden border border-[#e4e4df] bg-white shadow-[0_1px_2px_rgba(16,17,15,0.05)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_16px_40px_-12px_rgba(16,17,15,0.22)]"
    >
      <div className="aspect-[626/292] overflow-hidden bg-[#e8e8e4]">
        {useCase.preview?.image ? (
          // biome-ignore lint/performance/noImgElement: local static preview asset, no Next image rewriting needed.
          <img
            src={useCase.preview.image}
            alt=""
            aria-hidden="true"
            className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
            loading="lazy"
            decoding="async"
          />
        ) : null}
      </div>
      <div className="flex min-h-[114px] flex-1 flex-col gap-3 bg-white px-4 py-4">
        <h3 className={`${headingClass} line-clamp-2 text-[16px] leading-[1.35] text-[#10110f]`}>
          {useCase.title}
        </h3>
        <span className="mt-auto text-[13px] font-medium text-[#10110f]">
          View use case in AIPOCH Lab →
        </span>
      </div>
    </Link>
  )
}

export default async function OpenScienceUseCaseIntroPage({ params }: PageProps) {
  const { id } = await params
  // The detail payload is its own tier, split from the session package at
  // publish time; the transcript tiers are only fetched by the replay page.
  const [useCase, index] = await Promise.all([fetchUseCaseDetail(id), fetchUseCaseList()])
  if (!useCase) notFound()

  const category = useCase.category
  const figureCount = useCase.figureCount
  const heroImageUrl = useCase.coverImage
  const related =
    index?.filter((entry) => entry.slug !== useCase.slug).slice(0, 3) ?? ([] as UseCaseIndexEntry[])
  // Report is data-side designated: the rendered markdown content and the
  // original file behind the button are separate fields, no frontend guessing.
  const reportUrl = useCase.report?.url
  const reportPageCount = useCase.report?.pageCount
  const reportMarkdown = useCase.report?.contentUrl
    ? await fetchUseCaseAssetText(useCase.report.contentUrl)
    : null

  return (
    // One continuous surface (#f7f7f5) for header, article, related, and CTA.
    <main id="top" className={`-mt-[var(--nav-h)] flex-1 ${surfaceClass} text-[#10110f]`}>
      <section className="pt-[var(--nav-h)]">
        <div className={`${shellClass} pb-12 pt-14 lg:pt-16`}>
          <Link
            href="/open-science/use-cases"
            className="text-[13px] font-medium text-[#73746e] transition-colors hover:text-[#10110f]"
          >
            ← Use Cases
          </Link>

          <div className="mt-8 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-[#90908a]">
            {category ? (
              <>
                <span className="bg-[#e8e2d6] px-1.5 py-0.5 text-[#10110f]">{category}</span>
                <span aria-hidden="true">·</span>
              </>
            ) : null}
            <span>{dateFormatter.format(new Date(useCase.exportedAt))}</span>
            {reportPageCount ? (
              <>
                <span aria-hidden="true">·</span>
                <span>{reportPageCount}-page report</span>
              </>
            ) : null}
            {figureCount > 0 ? (
              <>
                <span aria-hidden="true">·</span>
                <span>
                  {figureCount} {figureCount === 1 ? 'figure' : 'figures'}
                </span>
              </>
            ) : null}
          </div>

          <h1 className={`${headingClass} mt-4 text-[clamp(32px,4.2vw,52px)] leading-[1.1]`}>
            {useCase.title}
          </h1>

          {useCase.description ? (
            <p className="mt-5 max-w-[760px] text-[16px] leading-[1.65] text-[#5c5d57]">
              {useCase.description}
            </p>
          ) : null}

          <div className="mt-8 flex flex-wrap items-center gap-3">
            {reportUrl ? (
              <a
                href={reportUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-11 items-center gap-2 bg-[#10110f] px-5 text-[13px] font-semibold text-white transition-colors hover:bg-[#4a4b46] active:bg-black"
              >
                <PdfGlyph className="size-4" />
                Read the full report
              </a>
            ) : null}
            <Link
              href={`/open-science/use-cases/${useCase.slug}/replay`}
              className="inline-flex min-h-11 items-center border border-[#10110f] bg-white px-5 text-[13px] font-semibold text-[#10110f] transition-colors hover:bg-[#10110f] hover:text-white active:bg-white active:text-[#10110f]"
            >
              View the research session
            </Link>
          </div>

          {heroImageUrl ? (
            <div className="mt-[130px] overflow-hidden border border-[#e4e4df] bg-white">
              {/* biome-ignore lint/performance/noImgElement: exported artifact asset, no Next image rewriting needed. */}
              <img
                src={heroImageUrl}
                alt={useCase.title}
                className="mx-auto max-h-[420px] w-auto max-w-full object-contain"
                loading="lazy"
                decoding="async"
              />
            </div>
          ) : null}
        </div>
      </section>

      {reportMarkdown ? (
        <section className="pb-14">
          {/* osp-session brings markdown tokens; kill its default #fafaf8 fill so this
              block shares the page surface (#f7f7f5) with Related research below. */}
          <div className={`${shellClass} osp-session ![background:transparent]`}>
            <h2 className={`${headingClass} mb-6 text-[28px] leading-[1.2]`}>
              What this research found
            </h2>
            <SessionMarkdown content={reportMarkdown} />
          </div>
        </section>
      ) : useCase.description ? (
        <section className="pb-14">
          <div className={shellClass}>
            <h2 className={`${headingClass} text-[28px] leading-[1.2]`}>
              What this research found
            </h2>
            <p className="mt-4 max-w-[760px] text-[16px] leading-[1.7] text-[#3f403b]">
              {useCase.description}
            </p>
          </div>
        </section>
      ) : null}

      {/* How this research was produced + share row (per the V2 design). */}
      <section className="border-t border-[#e4e4df] py-12">
        <div className={shellClass}>
          <h2 className={`${headingClass} text-[24px] leading-[1.25]`}>
            How this research was produced
          </h2>
          <p className="mt-3 max-w-[720px] text-[15px] leading-[1.7] text-[#5c5d57]">
            AIPOCH planned and ran this
            {category ? ` ${category.toLowerCase()}` : ''} investigation end to end — searching the
            literature, producing the figures, and drafting the report. The full session transcript
            is available to inspect.
          </p>
          <div className="mt-5">
            <ShareRow
              url={`${SITE_DOMAIN}/open-science/use-cases/${useCase.slug}`}
              title={useCase.title}
            />
          </div>
        </div>
      </section>

      <section className="py-14">
        <div className={shellClass}>
          <div className="mb-8 flex items-end justify-between gap-4">
            <h2 className={`${headingClass} text-[28px] leading-[1.2]`}>Related research</h2>
            <Link
              href="/open-science/use-cases"
              className="text-[13px] font-medium text-[#575853] underline underline-offset-4"
            >
              View all →
            </Link>
          </div>
          {index === null ? (
            // List fetch failed: say so instead of claiming there is no content.
            <p className="text-sm text-[#777872]">Related research could not be loaded.</p>
          ) : related.length === 0 ? (
            <p className="text-sm text-[#777872]">No other published use cases yet.</p>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((entry) => (
                <RelatedCard key={entry.slug} useCase={entry} />
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="px-5 py-16 text-center sm:px-10">
        <h2 className={`${headingClass} text-[clamp(24px,2.8vw,36px)] leading-[1.2]`}>
          Run this kind of analysis on your own question
        </h2>
        <p className="mx-auto mt-3 max-w-[720px] text-[14px] leading-[1.6] text-[#73746e]">
          <span className="block">
            Start a session and see how an AI co-scientist accelerates your research. Pay-as-you-go,
            no
          </span>
          <span className="block">subscription required.</span>
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/open-science"
            className="inline-flex min-h-11 items-center bg-[#10110f] px-5 text-[13px] font-semibold text-white transition-colors hover:bg-[#4a4b46] active:bg-black"
          >
            Try AIPOCH Web
          </Link>
          <Link
            href="/open-science/use-cases"
            className="inline-flex min-h-11 items-center border border-[#10110f] bg-white px-5 text-[13px] font-semibold text-[#10110f] transition-colors hover:bg-[#10110f] hover:text-white"
          >
            Browse all use cases
          </Link>
        </div>
      </section>
    </main>
  )
}
