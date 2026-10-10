import { http } from 'msw'
import { downloadHandlers } from './content'
import { json, missing } from './shared'
import { stateHandlers } from './state'
import { useCaseManifestHandlers } from './use-case-manifest'

/** State and downloadable files have a single HTTP owner across reloads and runtimes. */
export const adapterHandlers = (origin: string) => [
  http.get(`${origin}/health`, () => json({ service: 'aipoch-mock-state' })),
  ...stateHandlers(origin),
  ...downloadHandlers(origin),
  ...useCaseManifestHandlers(origin),
  http.all(`${origin}/api/*`, ({ request }) =>
    request.method === 'GET' ? missing() : json(null, 405, 'Method not allowed')
  )
]
