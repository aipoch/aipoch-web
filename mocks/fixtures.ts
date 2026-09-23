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
    skill_md: `# ${title}

A local mock skill for development.

## Usage

Provide a sample research question. This workflow organizes the available evidence and returns a structured research summary.

## Workflow

1. Validate the research question and source material.
2. Extract the relevant evidence and retain source references.
3. Review the summary before sharing it.

## Example

\`\`\`bash
python scripts/main.py --input sample.md
\`\`\`

## Requirements

| Input | Description | Required |
| --- | --- | --- |
| Research question | A clearly defined research objective | Yes |
| Sources | The documents to review | Yes |
| Output format | A preferred summary structure | No |

> [!WARNING]
> Provide the required source material before running this workflow. Do not fabricate citations or research results.

## Limitations

This is deterministic sample data for local development. Review the source evidence and validate the output before using a research summary.

## Output

The workflow returns a structured summary with source references and a list of items that need further review.
`,
    manifest: {
      root: path,
      name: path,
      version: '1.0.0-mock',
      files: [
        { path: `${path}/SKILL.md`, size: 120 },
        { path: `${path}/scripts/main.py`, size: 240 },
        { path: `${path}/references/research-checklist.md`, size: 180 }
      ]
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
      static_categories: [
        ['functional_suitability', 'Functional Suitability', 12],
        ['reliability', 'Reliability', 12],
        ['performance_context', 'Performance & Context', 8],
        ['agent_usability', 'Agent Usability', 16],
        ['human_usability', 'Human Usability', 8],
        ['security', 'Security', 12],
        ['maintainability', 'Maintainability', 12],
        ['agent_specific', 'Agent-Specific', 20]
      ].map(([key, label, max]) => ({
        key: String(key),
        label: String(label),
        max: Number(max),
        score: Number(((Number(max) * score) / 100).toFixed(2))
      })),
      dynamic_score: {
        execution_avg: score,
        max: 100,
        assertion_pass_rate: { passed: 18, total: 20 },
        inputs: [
          'Summarize the supplied evidence with traceable references.',
          'Handle a research question with missing or incomplete source material.',
          'Preserve statistical findings and relevant methodological limitations.',
          'Run the packaged workflow using scripts/main.py.',
          'Identify unsupported conclusions and flag them for further review.'
        ].map((label, task) => ({
          index: task + 1,
          label,
          score: score + 4 - task * 2,
          assertions_passed: task === 4 ? 2 : 4,
          assertions_total: 4,
          assertions: Array.from({ length: 4 }, (_, assertion) => ({
            result: task === 4 && assertion >= 2 ? 'FAIL' : 'PASS'
          }))
        }))
      },
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
    '# Local research notes\n\nThis sample article is available without the business API.\n\n## Reproducible workflows\n\nKeep sources, analysis, and results together.' +
    [
      'Research planning',
      'Source collection',
      'Data validation',
      'Analysis review',
      'Artifact inspection',
      'Sharing results'
    ]
      .map(
        (heading) =>
          `\n\n## ${heading}\n\n${Array.from({ length: 4 }, () => 'Record each research decision alongside the source material, analysis code, and output artifacts. Review the available evidence before continuing, check assumptions with your collaborators, and retain a reproducible record of the workflow.').join('\n\n')}`
      )
      .join(''),
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
