import { http } from 'msw'
import { categories, evaluationFor, leaderboard, skills } from '../fixtures'
import { json, matches, missing, paginate, query, withRequest } from './shared'

const scores = leaderboard.map((row) => row.total_score)
const stats = {
  total_count: leaderboard.length,
  evaluated_skills: leaderboard.length,
  max_score: Math.max(...scores),
  min_score: Math.min(...scores),
  avg_total_score: scores.reduce((a, b) => a + b, 0) / scores.length,
  max_score_skill: leaderboard[0].skill_name
}
export const leaderboardHandlers = (origin: string) => [
  http.get(`${origin}/api/v1/leaderboards/visibility`, () =>
    json({ daily: true, weekly: true, monthly: true })
  ),
  http.get(`${origin}/api/v1/leaderboards/overall/stats`, () => json(stats)),
  http.get(
    `${origin}/api/v1/leaderboards/overall`,
    withRequest(({ request }) => {
      const params = query(request)
      const category = params.get('category')
      const ranges = [
        ['rank', 'rank'],
        ['score', 'total_score'],
        ['core', 'core_score'],
        ['medical', 'medical_score']
      ] as const
      const filtered = leaderboard.filter((row) => {
        if (!matches(`${row.skill_name} ${row.skill_title} ${row.author}`, params.get('keyword')))
          return false
        if (
          category &&
          row.category !== category &&
          categories.find((item) => item.id === category)?.name !== row.category
        )
          return false
        return ranges.every(
          ([param, field]) =>
            (!params.has(`${param}_min`) || row[field] >= Number(params.get(`${param}_min`))) &&
            (!params.has(`${param}_max`) || row[field] <= Number(params.get(`${param}_max`)))
        )
      })
      const page = paginate(filtered, params)
      return json({
        items: page.items,
        pagination: {
          page: page.page,
          page_size: page.page_size,
          total_count: page.total,
          total_pages: page.total_pages
        }
      })
    })
  ),
  ...['daily', 'weekly', 'monthly'].map((period) =>
    http.get(`${origin}/api/v1/leaderboards/${period}`, () =>
      json({
        type: period,
        is_visible: true,
        stats: {
          total_count: stats.total_count,
          max_score: stats.max_score,
          avg_score: stats.avg_total_score
        },
        items: leaderboard
      })
    )
  ),
  http.get(
    `${origin}/api/v1/leaderboards/results/:slug`,
    withRequest(({ params }) => {
      const skill = skills.find((item) => `${item.path}-result` === params.slug)
      return skill
        ? json({
            raw_result_json: evaluationFor(skill),
            breadcrumb: { local_skill_path: skill.path }
          })
        : missing()
    })
  ),
  http.get(`${origin}/api/v1/compare/literature-review-vs-clinical-trials`, () => {
    const side = (index: number) => ({
      rank_skill_id: index + 1,
      skill_name: skills[index].name,
      skill_title: skills[index].title,
      skill_description: skills[index].description,
      category: categories[index].name,
      skill_author: skills[index].author.name,
      total_score: skills[index].score,
      raw_result_json: evaluationFor(skills[index])
    })
    return json({
      path: 'literature-review-vs-clinical-trials',
      left_skill: side(0),
      right_skill: side(1),
      seo: null
    })
  })
]
