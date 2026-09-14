import type { LeaderboardEvaluationPayload } from '../app/(commonLayout)/leaderboard/items/[slug]/components/leaderboard-evaluation'
import type { BlogPostDetail } from '../service/blog'
import type { CommentItem, PostDetail } from '../service/community'
import type { OverallLeaderboardItem } from '../service/leaderboard-overall'
import type { SkillDetail } from '../service/skills'

// Fixed sample dates describe fixtures, never live product releases or page edits.
export const fixtureDate = '2026-09-01T00:00:00.000Z'
export const categories = [
  { id: 'research', name: 'Medical Research' },
  { id: 'clinical', name: 'Clinical Practice' },
  { id: 'data', name: 'Data Analysis' }
]
const names = [
  'Literature Review',
  'Clinical Trials',
  'Data Analysis',
  'Evidence Synthesis',
  'Patient Summary',
  'Statistical Review'
]

// More than one default page makes pagination and infinite scrolling observable.
export const skills: SkillDetail[] = Array.from({ length: 30 }, (_, index) => {
  const title = `${names[index % names.length]}${index < names.length ? '' : ` ${Math.floor(index / names.length) + 1}`}`
  const path = title.toLowerCase().replaceAll(' ', '-')
  const score = 95 - index
  return {
    id: String(index + 1),
    name: path,
    path,
    title,
    description: `Local demo workflow for ${title.toLowerCase()}. Sample data for development.`,
    categories: [categories[index % categories.length]],
    tags: [{ id: 'demo', name: 'Demo' }],
    icon: '',
    author: { name: 'Demo Researcher', avatar_url: '', org: 'Mock Lab' },
    stats: { views: 1000 - index * 10, downloads: 100 + index * 3 },
    updated_at: fixtureDate,
    score,
    version: '1.0.0-mock',
    published_at: fixtureDate,
    changelog: 'Initial local demo.',
    skill_md: `# ${title}\n\nA local mock skill for development.\n\n## Usage\n\nProvide a sample research question.\n`,
    manifest: {
      root: path,
      name: path,
      version: '1.0.0-mock',
      files: [{ path: `${path}/SKILL.md`, size: 120 }]
    },
    storage_provider: 'mock',
    zip_uri: '',
    zip_size: 0,
    zip_sha256: '',
    github_repo_url: null,
    github_release_download_url: null,
    license: 'MIT',
    content_language: 'en',
    score_detail: {
      score,
      max: 100,
      grade: 'A',
      deployable: true,
      static_score_total: score,
      static_score_max: 100,
      leaderboard_slug: `${path}-result`
    }
  }
})

export const evaluationFor = (skill: SkillDetail): LeaderboardEvaluationPayload => ({
  meta: {
    skill_name: skill.name,
    category: categories[(Number(skill.id) - 1) % 3].name,
    skill_description: skill.description,
    evaluated_on: fixtureDate,
    evaluator_version: 'mock-1'
  },
  final: {
    score: skill.score ?? 0,
    max: 100,
    static_weighted: (skill.score ?? 0) * 0.4,
    dynamic_weighted: (skill.score ?? 0) * 0.6
  },
  static_score: {
    subtotal: skill.score ?? 0,
    max: 100,
    categories: {
      functional_suitability: { score: 11, max: 12, note: 'Sample workflow evaluation.' }
    }
  },
  dynamic_score: {
    execution_avg: skill.score ?? 0,
    max: 100,
    assertion_pass_rate: { passed: 4, total: 5 },
    inputs: [
      {
        total: skill.score ?? 0,
        label: 'Summarize sample evidence',
        type: 'Canonical',
        assertions_passed: 4,
        assertions_total: 5,
        note: 'Local demo result.'
      }
    ]
  },
  veto_gates: {
    skill_veto: { stability: 'PASS', contract: 'PASS', determinism: 'PASS', security: 'PASS' },
    research_veto: { applicable: false }
  },
  key_strengths: ['Traceable sample workflow'],
  recommendations: []
})

export const leaderboard: OverallLeaderboardItem[] = skills.map((skill, index) => ({
  rank: index + 1,
  skill_name: skill.name,
  skill_title: skill.title,
  category: categories[index % 3].name,
  author: skill.author.name,
  total_score: skill.score ?? 0,
  core_score: (skill.score ?? 0) * 0.4,
  medical_score: (skill.score ?? 0) * 0.6,
  result_path: `${skill.path}-result`,
  local_skill_slug: skill.path,
  local_skill_id: skill.id,
  skill_exists_in_local_library: true,
  stats: skill.stats
}))

export const blogs: BlogPostDetail[] = Array.from({ length: 24 }, (_, index) => ({
  id: index + 1,
  title:
    index === 0
      ? 'Release notes and changelog'
      : index === 1
        ? 'What is an agent skill?'
        : `Research notebook ${index + 1}`,
  slug:
    index === 0
      ? 'release-notes'
      : index === 1
        ? 'what-is-a-skill'
        : `research-notebook-${index + 1}`,
  description: 'Sample research notes served by the local mock API.',
  author: 'Demo Researcher',
  tags: ['openscience', 'demo'],
  read_time: 3,
  category: { id: 1, name: 'Research', slug: 'research' },
  view_count: 100 - index,
  published_at: fixtureDate,
  content:
    '# Local research notes\n\nThis sample article is available without the business API.\n\n## Reproducible workflows\n\nKeep sources, analysis, and results together.',
  previous_post: null,
  next_post: null
}))
const author = {
  id: 1,
  username: 'demo-researcher',
  x_handle: 'demo',
  display_name: 'Demo Researcher',
  avatar_url: null
}
export const posts: PostDetail[] = Array.from({ length: 24 }, (_, index) => ({
  id: index + 1,
  title: `Research discussion ${index + 1}`,
  content: `# Research discussion ${index + 1}\n\nShare a reproducible workflow with the community. This is local sample content.`,
  author,
  status: 'published',
  view_count: 100 + index,
  comment_count: 1,
  upvote_count: 24 - index,
  downvote_count: 0,
  score: 24 - index,
  created_at: `2026-08-${String(index + 1).padStart(2, '0')}T00:00:00.000Z`,
  updated_at: fixtureDate,
  user_vote: null
}))
export const commentFor = (postId: number): CommentItem => ({
  id: postId,
  post_id: postId,
  content: 'Thanks for sharing this sample workflow.',
  author,
  parent_id: null,
  root_id: null,
  depth: 0,
  upvote_count: 2,
  downvote_count: 0,
  score: 2,
  created_at: fixtureDate,
  user_vote: null,
  children: []
})

/** Download buttons save an explicitly labeled text sample, never a pretend installer. */
export const mockManifest = (origin: string) => ({
  version: '1.0.0-mock',
  releaseDate: fixtureDate,
  downloads: Object.fromEntries(
    ['mac-x64', 'mac-arm64', 'win-x64', 'linux-x64-appimage', 'linux-x64-deb'].map((key) => [
      key,
      { url: `${origin}/downloads/${key}.txt` }
    ])
  )
})
