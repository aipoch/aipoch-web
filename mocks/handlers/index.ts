import { http, passthrough } from 'msw'
import { contentHandlers, downloadHandlers } from './content'
import { leaderboardHandlers } from './leaderboards'
import { json, missing } from './shared'
import { skillHandlers } from './skills'
import { stateHandlers } from './state'

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
  // A single adapter owns manifest revisions and navigational image requests.
  http.all(`${origin}/use-case-manifest/*`, () => passthrough()),
  http.all(`${origin}/api/v1/members`, () => passthrough()),
  http.all(`${origin}/api/v1/agent/:action`, () => passthrough()),
  ...fallbackHandlers(origin)
]
/** Complete contract used by isolated handler tests. */
export const createHandlers = (origin: string) => [
  ...stateHandlers(origin),
  ...downloadHandlers(origin),
  ...interceptionHandlers(origin)
]
