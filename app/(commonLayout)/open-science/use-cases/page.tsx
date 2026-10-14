import type { Metadata } from 'next'
import Link from 'next/link'
import { SITE_DOMAIN } from '@/lib/config'
import { createPageMetadata } from '@/lib/page-metadata'
import { fetchUseCaseList } from '@/service/open-science-use-cases.server'
import { UseCaseCategories } from './_components/use-case-categories'
import { UseCaseGallery } from './_components/use-case-gallery'
import { USE_CASE_BATCH_SIZE } from './_components/use-case-gallery-data'

const headingClass = 'font-[Georgia,serif] font-normal tracking-normal'
/** Shared surface for the gallery grid and bottom CTA. */
const surfaceClass = 'bg-[#f7f7f5]'

const pageTitle = 'Open-Science Use Cases | AIPOCH'
const pageDescription =
  'Explore selected .science research packages and see how research questions become inspectable outputs through connected workflows of data, code, evidence, and conversation.'

export const metadata: Metadata = createPageMetadata({
  title: pageTitle,
  description: pageDescription,
  canonical: `${SITE_DOMAIN}/open-science/use-cases`
})

export const dynamic = 'force-dynamic'

type PageProps = {
  searchParams: Promise<{ page?: string; category?: string }>
}

export default async function OpenScienceUseCasesPage({ searchParams }: PageProps) {
  const params = await searchParams
  const useCases = await fetchUseCaseList()
  const loadFailed = useCases === null

  // Categories derive from the manifest catalog/catalog_name fields; counts
  // always describe the full catalog, not the filtered view.
  const catalogSummaries = new Map<string, { key: string; label: string; count: number }>()
  for (const entry of useCases ?? []) {
    if (!entry.catalogKey) continue
    const summary = catalogSummaries.get(entry.catalogKey)
    if (summary) summary.count += 1
    else
      catalogSummaries.set(entry.catalogKey, {
        key: entry.catalogKey,
        label: entry.catalog ?? entry.catalogKey,
        count: 1
      })
  }
  const categories = [...catalogSummaries.values()].sort(
    (a, b) => b.count - a.count || a.label.localeCompare(b.label)
  )
  // Unknown or missing category params fall back to the unfiltered gallery.
  const activeCategory = categories.some((entry) => entry.key === params.category)
    ? params.category
    : undefined
  const visibleUseCases =
    useCases && activeCategory
      ? useCases.filter((entry) => entry.catalogKey === activeCategory)
      : useCases

  const pageCount = visibleUseCases
    ? Math.max(1, Math.ceil(visibleUseCases.length / USE_CASE_BATCH_SIZE))
    : 1
  const requested = Number.parseInt(params.page ?? '1', 10)
  const current = Number.isFinite(requested) ? Math.min(Math.max(1, requested), pageCount) : 1
  // Retain old page links by revealing all batches through the requested page.
  const initialCount = current * USE_CASE_BATCH_SIZE

  return (
    <main id="top" className={`-mt-[var(--nav-h)] flex-1 ${surfaceClass} text-[#10110f]`}>
      <section className="pt-[var(--nav-h)]">
        <div className="mx-auto flex max-w-[1000px] flex-col items-center px-5 py-16 text-center sm:px-10 lg:py-[88px]">
          <h1 className={`${headingClass} text-[clamp(40px,5vw,56px)] leading-[1.08]`}>
            Use Case Gallery
          </h1>
          <p className="mt-5 text-[15px] leading-[1.65] text-[#73746e] sm:text-[16px]">
            <span className="block">
              Explore selected .science research packages and see how research questions become
              inspectable outputs
            </span>
            <span className="block">
              through connected workflows of data, code, evidence, and conversation.
            </span>
          </p>
        </div>
      </section>

      <div className="mx-auto -mt-6 w-full max-w-[1440px] px-5 pb-8 sm:px-10 lg:-mt-10 lg:px-20">
        <UseCaseCategories
          total={useCases?.length ?? 0}
          categories={categories}
          active={activeCategory}
        />
      </div>

      <section
        aria-label="Use case gallery"
        className="mx-auto w-full max-w-[1440px] px-5 pb-16 sm:px-10 lg:px-20 lg:pb-20"
      >
        {loadFailed ? (
          <div className="border border-[#a14a3a]/40 bg-[#faf3f1] p-8 text-center">
            <p className="text-base font-medium text-[#a14a3a]">
              Use cases could not be loaded right now.
            </p>
            <p className="mt-2 text-sm text-[#777872]">
              The content service is unavailable — please try again later.
            </p>
          </div>
        ) : !visibleUseCases || visibleUseCases.length === 0 ? (
          <div className="border border-[#e4e4df] bg-white p-8 text-center">
            <p className="text-base text-[#777872]">No published use cases yet.</p>
          </div>
        ) : (
          <UseCaseGallery
            key={activeCategory ?? 'all'}
            category={activeCategory}
            initialCount={initialCount}
            items={visibleUseCases.map(({ slug, title, preview }) => ({ slug, title, preview }))}
          />
        )}
      </section>

      <section className={`${surfaceClass} px-5 py-16 text-center sm:px-10 lg:py-20`}>
        <h2 className={`${headingClass} text-[clamp(26px,3vw,40px)] leading-[1.2]`}>
          Make your next research result easier to impact
        </h2>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/open-science"
            className="inline-flex min-h-11 items-center bg-[#10110f] px-5 text-[13px] font-semibold text-white transition-colors hover:bg-[#4a4b46] active:bg-black"
          >
            Explore Open-Science
          </Link>
          <Link
            href="https://aipoch.com/docs/guides/research-packages/"
            className="inline-flex min-h-11 items-center border border-[#10110f] bg-white px-5 text-[13px] font-semibold text-[#10110f] transition-colors hover:bg-[#10110f] hover:text-white"
          >
            Read the .science Guide
          </Link>
        </div>
      </section>
    </main>
  )
}
