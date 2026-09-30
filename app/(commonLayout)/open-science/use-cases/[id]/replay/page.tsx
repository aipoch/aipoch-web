import type { Metadata } from 'next'
import { Suspense } from 'react'
import { SITE_DOMAIN } from '@/lib/config'
import { createPageMetadata } from '@/lib/page-metadata'
import { fetchUseCaseTranscript } from '@/service/open-science-use-cases'
import { ReplayView } from '../../_components/replay-view'

type PageProps = {
  params: Promise<{ id: string }>
}

export const dynamic = 'force-dynamic'

// Metadata stays server-rendered for SEO and link previews; the transcript
// itself is fully client-rendered by ReplayView (single JSON download instead
// of HTML + hydration payload, and no per-request server render cost).
export const generateMetadata = async ({ params }: PageProps): Promise<Metadata> => {
  const { id } = await params
  const useCase = await fetchUseCaseTranscript(id)
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
    <Suspense fallback={null}>
      <ReplayView slug={id} />
    </Suspense>
  )
}
