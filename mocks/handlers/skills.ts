import { http } from 'msw'
import { categories, fixtureDate, skills } from '../fixtures'
import { json, matches, missing, paginate, query, withRequest } from './shared'

export const skillHandlers = (origin: string) => [
  http.get(`${origin}/api/v1/skills/total_count`, () =>
    json({ total_skills: skills.length, total_authors: 1 })
  ),
  http.get(
    `${origin}/api/v1/skills/categories`,
    withRequest(({ request }) => json(paginate(categories, query(request))))
  ),
  // Preserve the backend's existing "sitmap" spelling.
  http.get(
    `${origin}/api/v1/skills/sitmap`,
    withRequest(({ request }) => {
      const base = (query(request).get('base_url') || `${origin}/agent-skills`).replace(/\/$/, '')
      return json(
        skills.map((skill) => ({
          url: `${base}/${skill.path}`,
          last_modified: fixtureDate,
          change_frequency: 'weekly'
        }))
      )
    })
  ),
  http.get(
    `${origin}/api/v1/skills`,
    withRequest(({ request }) => {
      const params = query(request)
      const category = params.get('category_id')
      const filtered = skills.filter(
        (skill) =>
          matches(`${skill.title} ${skill.description}`, params.get('search')) &&
          (!category ||
            skill.categories.some(
              (item) => (typeof item === 'string' ? item : item.id) === category
            ))
      )
      const order = params.get('order_by') ?? 'view_count'
      const value = (skill: (typeof skills)[number]) =>
        order === 'score'
          ? (skill.score ?? 0)
          : order === 'download_count'
            ? skill.stats.downloads
            : skill.stats.views
      filtered.sort(
        (a, b) => (value(a) - value(b)) * (params.get('order_direction') === 'asc' ? 1 : -1)
      )
      return json(paginate(filtered, params))
    })
  ),
  http.get(
    `${origin}/api/v1/skills/:slug/github_download`,
    withRequest(({ params }) => {
      const skill = skills.find((item) => item.path === params.slug)
      return skill
        ? json({ download_url: `${origin}/skill-downloads/${skill.path}.md` })
        : missing()
    })
  ),
  http.get(
    `${origin}/api/v1/skills/:slug`,
    withRequest(({ params }) => {
      const skill = skills.find((item) => item.path === params.slug)
      return skill ? json(skill) : missing()
    })
  )
]
