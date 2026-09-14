import { beforeEach, describe, expect, test } from 'bun:test'
import { getResponse } from 'msw'
import { skills } from '../../mocks/fixtures'
import { createHandlers } from '../../mocks/handlers'

const createMockHandler = () => {
  const handlers = createHandlers('http://127.0.0.1:3203')
  return async (request: Request) =>
    (await getResponse(handlers, request)) ?? new Response(null, { status: 404 })
}

let handle: ReturnType<typeof createMockHandler>
beforeEach(() => {
  handle = createMockHandler()
})
const request = (path: string, body?: unknown) =>
  handle(
    new Request(
      `http://127.0.0.1:3203${path}`,
      body === undefined
        ? undefined
        : {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
          }
    )
  )
const data = async (path: string) => {
  const response = await request(path)
  expect(response.status).toBe(200)
  return (await response.json()).data
}

describe('local mock API contracts', () => {
  test('filters before pagination and reports empty results honestly', async () => {
    const first = await data(
      '/api/v1/skills?category_id=research&page_size=2&order_by=score&order_direction=desc'
    )
    expect(first.total).toBeGreaterThan(2)
    expect(first.items).toHaveLength(2)
    expect(first.items[0].categories[0].id).toBe('research')
    const second = await data(
      '/api/v1/skills?category_id=research&page_size=2&page=2&order_by=score&order_direction=desc'
    )
    expect(second.items[0].id).not.toBe(first.items[0].id)
    expect(first.items[1].score).toBeGreaterThanOrEqual(second.items[0].score)
    expect((await data('/api/v1/skills?search=no-such-skill')).items).toEqual([])
    expect((await request('/api/v1/skills?page=0')).status).toBe(400)
  })
  test('filters the current fixture categories independently of numeric IDs', async () => {
    const original = skills[0]
    skills[0] = {
      ...original,
      id: 'custom-skill',
      categories: [
        { id: 'clinical', name: 'Clinical Practice' },
        { id: 'custom', name: 'Custom Category' }
      ]
    }
    try {
      for (const category of ['clinical', 'custom']) {
        const result = await data(
          `/api/v1/skills?category_id=${category}&search=Literature%20Review`
        )
        expect(result.items.some((item: { id: string }) => item.id === 'custom-skill')).toBe(true)
      }
      const result = await data('/api/v1/skills?category_id=research&search=Literature%20Review')
      expect(result.items.some((item: { id: string }) => item.id === 'custom-skill')).toBe(false)
    } finally {
      skills[0] = original
    }
  })
  test('links skills to details, evaluations and local downloads', async () => {
    const skill = await data('/api/v1/skills/literature-review')
    expect(skill.skill_md).toContain('Literature Review')
    const result = await data(`/api/v1/leaderboards/results/${skill.score_detail.leaderboard_slug}`)
    expect(result.raw_result_json.meta.skill_name).toBe(skill.name)
    const download = await data(`/api/v1/skills/${skill.path}/github_download`)
    expect(new URL(download.download_url).origin).toBe('http://127.0.0.1:3203')
    expect((await request(new URL(download.download_url).pathname)).status).toBe(200)
  })
  test('serves homepage links that resolve to blog details', async () => {
    expect((await data('/api/v1/homepage/openscience')).release_version).toBeTruthy()
    for (const item of (await data('/api/v1/homepage/openscience/read-watch')).items) {
      expect((await data(`/api/v1/blog/posts/${item.slug}`)).content).toBeTruthy()
    }
    expect((await data('/api/v1/skills/total_count')).total_skills).toBe(
      (await data('/api/v1/skills')).total
    )
  })
  test('supports leaderboard range and category filters', async () => {
    const result = await data(
      '/api/v1/leaderboards/overall?category=research&rank_min=2&rank_max=10&score_min=80&page_size=2'
    )
    expect(result.items.length).toBeGreaterThan(0)
    expect(result.pagination.total_count).toBeGreaterThanOrEqual(result.items.length)
    for (const row of result.items) {
      expect(row.rank).toBeGreaterThanOrEqual(2)
      expect(row.rank).toBeLessThanOrEqual(10)
      expect(row.total_score).toBeGreaterThanOrEqual(80)
    }
    for (const period of ['daily', 'weekly', 'monthly']) {
      expect((await data(`/api/v1/leaderboards/${period}`)).items.length).toBeGreaterThan(0)
    }
    expect(
      (await data('/api/v1/compare/literature-review-vs-clinical-trials')).left_skill.skill_name
    ).toBe('literature-review')
  })
  test('paginates blog and community and resolves comments', async () => {
    expect((await data('/api/v1/blog/posts?page=2&page_size=2')).items).toHaveLength(2)
    const posts = await data('/api/v1/posts?page_size=2')
    expect(posts.total).toBeGreaterThan(2)
    expect((await data(`/api/v1/posts/${posts.items[0].id}`)).content).toBeTruthy()
    expect((await data('/api/v1/posts/1/comments')).items[0].post_id).toBe(1)
    expect((await data('/api/v1/posts?search=nonexistent')).total).toBe(0)
  })
  test('validates waitlist input, preserves duplicates and supports explicit failures', async () => {
    expect((await request('/api/v1/members', { email: 'bad' })).status).toBe(400)
    const member = { display_name: 'Test User', email: 'user@example.test', source: 'medflowpre' }
    expect((await request('/api/v1/members', member)).status).toBe(200)
    expect((await (await request('/api/v1/members', member)).json()).data.message).toContain(
      'already'
    )
    expect(
      (await request('/api/v1/members', { ...member, email: 'rate-limit@example.test' })).status
    ).toBe(429)
    expect(
      (await request('/api/v1/members', { ...member, email: 'error@example.test' })).status
    ).toBe(500)
  })
  test('claims only known tokens and persists successful verification per instance', async () => {
    expect((await request('/api/v1/agent/claim?token=unknown')).status).toBe(404)
    const agent = (await data('/api/v1/agent/claim?token=demo-claim')).agent
    expect(agent.is_claimed).toBe(false)
    const body = {
      claim_token: 'demo-claim',
      verification_code: agent.verification_code,
      tweet_url: 'https://x.com/demo/status/123'
    }
    expect(
      (await request('/api/v1/agent/verify', { ...body, verification_code: 'wrong' })).status
    ).toBe(400)
    expect((await request('/api/v1/agent/verify', body)).status).toBe(200)
    expect((await data('/api/v1/agent/claim?token=demo-claim')).agent.is_claimed).toBe(true)
    handle = createMockHandler()
    expect((await data('/api/v1/agent/claim?token=demo-claim')).agent.is_claimed).toBe(false)
  })
  test('serves content timestamps and never falls through unknown routes', async () => {
    const entries = await data('/api/v1/skills/sitmap?base_url=https://example.test/agent-skills')
    expect(entries[0].url).toStartWith('https://example.test/agent-skills/')
    expect(entries[0].last_modified).toMatch(/^\d{4}-\d{2}-\d{2}T/)
    for (const path of [
      '/api/v1/unknown',
      '/api/v1/skills/missing',
      '/api/v1/blog/posts/missing',
      '/api/v1/posts/999',
      '/api/v1/posts/999/comments',
      '/api/v1/compare/missing'
    ]) {
      expect((await request(path)).status).toBe(404)
    }
    expect((await request('/api/v1/skills', {})).status).toBe(405)
  })
})
