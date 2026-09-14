import { http } from 'msw'
import { fixtureDate } from '../fixtures'
import { json, missing, query, withRequest } from './shared'

/** Only the HTTP adapter owns these mutable values in development. */
export const stateHandlers = (origin: string) => {
  const members = new Set<string>()
  let claimed = false
  return [
    http.post(
      `${origin}/api/v1/members`,
      withRequest(async ({ request }) => {
        const input = await request.json()
        if (
          !input ||
          typeof input.display_name !== 'string' ||
          !input.display_name.trim() ||
          typeof input.email !== 'string' ||
          !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email) ||
          input.source !== 'medflowpre'
        )
          return json(null, 400, 'Valid name, email and source are required')
        const email = input.email.trim().toLowerCase()
        if (email === 'rate-limit@example.test')
          return json(null, 429, 'Too many requests. Please try again later.')
        if (email === 'error@example.test')
          return json(null, 500, 'Mock submission failed. Please try again later.')
        const duplicate = members.has(email)
        members.add(email)
        return json({ message: duplicate ? 'Email already reserved.' : 'Email reserved.' })
      })
    ),
    http.get(
      `${origin}/api/v1/agent/claim`,
      withRequest(({ request }) => {
        const token = query(request).get('token')
        if (!['demo-claim', 'already-claimed'].includes(token ?? '')) return missing()
        return json({
          success: true,
          agent: {
            id: 'demo-agent',
            name: 'Demo Research Agent',
            description: 'Local mock agent',
            verification_code: 'MOCK-1234',
            is_claimed: claimed || token === 'already-claimed',
            created_at: fixtureDate
          }
        })
      })
    ),
    http.post(
      `${origin}/api/v1/agent/verify`,
      withRequest(async ({ request }) => {
        const input = await request.json()
        if (!input || typeof input !== 'object' || Array.isArray(input))
          return json(null, 400, 'Expected a JSON object')
        if (input.claim_token !== 'demo-claim') return missing()
        if (
          input.verification_code !== 'MOCK-1234' ||
          typeof input.tweet_url !== 'string' ||
          !/^https:\/\/(x\.com|twitter\.com)\/\w+\/status\/\d+$/.test(input.tweet_url)
        )
          return json(null, 400, 'Valid demo verification code and tweet URL are required')
        if (claimed) return json(null, 409, 'Agent already claimed')
        claimed = true
        return json({
          success: true,
          x_handle: 'demo',
          claim_status: 'claimed',
          actor: {
            id: 1,
            x_handle: 'demo',
            display_name: 'Demo Researcher',
            avatar_url: null,
            created_at: fixtureDate
          }
        })
      })
    )
  ]
}
