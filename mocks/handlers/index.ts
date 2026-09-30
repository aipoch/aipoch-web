import { http, passthrough } from 'msw'
import { contentHandlers, downloadHandlers } from './content'
import { leaderboardHandlers } from './leaderboards'
import { json, missing } from './shared'
import { skillHandlers } from './skills'
import { stateHandlers } from './state'
import { useCaseHandlers } from './use-cases'

const fallbackHandlers = (origin: string) => [
  http.all(`${origin}/api/*`, ({ request }) =>
    request.method === 'GET' ? missing() : json(null, 405, 'Method not allowed')
  )
]
/** Read-only interception is identical in the browser and Next server. */
export const interceptionHandlers = (origin: string) => [
  ...skillHandlers(origin),
  ...contentHandlers(origin),
  ...leaderboardHandlers(origin),
  ...useCaseHandlers(origin),
  http.all(`${origin}/api/v1/members`, () => passthrough()),
  http.all(`${origin}/api/v1/agent/:action`, () => passthrough()),
  ...fallbackHandlers(origin)
]
/** State and downloadable files have a single HTTP owner across reloads and runtimes. */
export const adapterHandlers = (origin: string) => [
  http.get(`${origin}/health`, () => json({ service: 'aipoch-mock-state' })),
  ...stateHandlers(origin),
  ...downloadHandlers(origin),
  // Read-only use-case fixtures also live on the adapter so SSR fetches that
  // reach the mock port still resolve when MSW interception is skipped.
  ...useCaseHandlers(origin),
  ...fallbackHandlers(origin)
]
/** Complete contract used by isolated handler tests. */
export const createHandlers = (origin: string) => [
  ...stateHandlers(origin),
  ...downloadHandlers(origin),
  ...interceptionHandlers(origin)
]
