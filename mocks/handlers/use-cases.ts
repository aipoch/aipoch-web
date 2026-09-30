import { http } from 'msw'
import { json, missing, withRequest } from './shared'

// Serves the use-case showcase contract from the generated tier files under
// public/use-cases/ until the real backend exists. On the Next server the
// files are read from disk; in the browser the worker fetches the static
// public path (a different URL, so it passes through unintercepted).
const readPublicFixture = async (publicPath: string): Promise<unknown | undefined> => {
  if (typeof window === 'undefined') {
    const { existsSync, readFileSync } = await import('node:fs')
    const { join } = await import('node:path')
    const absolute = join(process.cwd(), 'public', publicPath)
    if (!existsSync(absolute)) return undefined
    return JSON.parse(readFileSync(absolute, 'utf8')) as unknown
  }
  const response = await fetch(publicPath)
  return response.ok ? ((await response.json()) as unknown) : undefined
}

const transcriptFixture = (
  slug: string | readonly string[] | undefined,
  tier: 'essential' | 'full'
) =>
  slug === undefined
    ? Promise.resolve(undefined)
    : readPublicFixture(`/use-cases/${String(slug)}/${tier}.json`)

export const useCaseHandlers = (origin: string) => [
  http.get(`${origin}/api/v1/open-science/use-cases`, () =>
    readPublicFixture('/use-cases/index.json').then((data) => (data ? json(data) : missing()))
  ),
  http.get(
    `${origin}/api/v1/open-science/use-cases/:slug/transcript/full`,
    withRequest(({ params }) =>
      transcriptFixture(params.slug, 'full').then((data) => (data ? json(data) : missing()))
    )
  ),
  http.get(
    `${origin}/api/v1/open-science/use-cases/:slug/transcript`,
    withRequest(({ params }) =>
      transcriptFixture(params.slug, 'essential').then((data) => (data ? json(data) : missing()))
    )
  ),
  http.get(`${origin}/api/v1/open-science/use-cases/:slug`, ({ params }) =>
    readPublicFixture(`/use-cases/${String(params.slug)}/detail.json`).then((data) =>
      data ? json(data) : missing()
    )
  )
]
