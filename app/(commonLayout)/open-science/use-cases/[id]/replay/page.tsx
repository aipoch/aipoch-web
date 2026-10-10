import type { Metadata } from 'next'
import { Suspense } from 'react'
import { SITE_DOMAIN } from '@/lib/config'
import { createPageMetadata } from '@/lib/page-metadata'
import { fetchUseCaseDetail } from '@/service/open-science-use-cases.server'
import { ReplayLoading, ReplayView } from '../../_components/replay-view'

type PageProps = {
  params: Promise<{ id: string }>
}

export const dynamic = 'force-dynamic'

// The server supplies package metadata; only the browser downloads and parses the archive.
export const generateMetadata = async ({ params }: PageProps): Promise<Metadata> => {
  const { id } = await params
  // A catalog outage must not block the client loading UI or its error state.
  const useCase = await fetchUseCaseDetail(id).catch(() => null)
  if (!useCase) return {}
  return createPageMetadata({
    title: `Replay: ${useCase.title} | Open-Science Use Cases`,
    description:
      useCase.description ??
      `Read-only replay of the exported Open-Science session "${useCase.title}".`,
    canonical: `${SITE_DOMAIN}/open-science/use-cases/${encodeURIComponent(useCase.slug)}/replay`
  })
}

export default async function OpenScienceUseCaseReplayPage({ params }: PageProps) {
  const { id } = await params
  return (
    <Suspense fallback={<ReplayLoading slug={id} />}>
      <ReplayPackage id={id} />
    </Suspense>
  )
}

async function ReplayPackage({ id }: { id: string }) {
  try {
    const entry = await fetchUseCaseDetail(id)
    return (
      <ReplayView
        key={id}
        slug={id}
        packageInfo={entry?.package ?? null}
        error={entry?.package ? undefined : 'Research package not found.'}
      />
    )
  } catch (error) {
    console.error('[use-case-package] metadata.failed', error)
    return (
      <ReplayView
        key={id}
        slug={id}
        packageInfo={null}
        error="Package information is temporarily unavailable."
      />
    )
  }
}
