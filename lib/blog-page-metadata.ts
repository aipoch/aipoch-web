import { commonLayoutLastModified } from './common-layout-metadata'

/** Persistent local layout dates, separate from API publication dates. */
export const BLOG_PAGE_LAST_MODIFIED = '2026-11-19'
export const BLOG_ARTICLE_LAYOUT_LAST_MODIFIED = '2026-11-13'

// Existing published articles affected by the November 25 video player update.
const updatedVideoArticles = new Set([
  'ai-immune-pathway-analysis',
  'ai-pubmed-search',
  'aipoch-launches-open-science-v-1-0',
  'aipoch-open-science-0-37-1',
  'aipoch-open-science-0-37-2',
  'aipoch-open-science-1-0-1',
  'aipoch-open-science-1-0-2',
  'aipoch-open-science-1-0-5',
  'aipoch-open-science-1-0-7',
  'aipoch-open-science-v-0-1-8',
  'aipoch-open-science-v-0-27-0',
  'aipoch-open-science-v-0-28-0',
  'aipoch-open-science-v-0-29-0',
  'aipoch-open-science-v-0-33-3',
  'aipoch-open-science-v-0-34-0',
  'aipoch-open-science-v-0-35-1',
  'aipoch-open-science-v-0-36-0',
  'aipoch-open-science-v-1-0-0',
  'aipoch-open-science-v-1-0-3',
  'aipoch-open-science-v-1-0-4',
  'aipoch-open-science-v-1-2-1',
  'aipoch-open-science-v-1-2-2',
  'arxiv-preflight',
  'biomarker-landscape-map',
  'blind-review-sanitizer',
  'cibersort-immune-infiltration-analysis',
  'clinical-question-ai',
  'cover-letter-drafter',
  'decision-curve-analysis-ai',
  'design-mendelian-randomization-study',
  'design-single-cell-research-plan',
  'detect-population-gaps-biomedical-research',
  'differential-expression-analysis-ai',
  'estimate-immune-score-ai',
  'fastqc-report-tnterpretation',
  'find-medical-research-gap',
  'gsva-pathway-enrichment-analysis-ai',
  'how-to-evaluates-medical-research-agent-skills',
  'how-to-generate-forest-plot',
  'identify-methodological-gaps-in-research',
  'identify-study-design-with-ai',
  'literature-search-agent-skills-comparison-medskillaudit',
  'lyra-2-image-quality-consistency',
  'medical-research-gap-finder-comparison',
  'open-science-0-23-0',
  'open-science-0-24-0',
  'open-science-0-25-0',
  'open-science-0-25-1',
  'open-science-0-26-0',
  'open-science-0-31-0',
  'open-science-0-31-1',
  'open-science-v-0-13-1',
  'open-science-v-0-14-0',
  'open-science-v-0-17-0',
  'open-science-v-0-18-0',
  'open-science-v-0-18-1',
  'open-science-v-0-18-2',
  'open-science-v-0-20-1',
  'open-science-v-0-20-2',
  'open-science-v-0-21-0',
  'open-science-v-0-30-0',
  'open-science-v-0-30-2',
  'open-science-v-0-6-1-release',
  'open-science-v-0-7-2-release',
  'open-science-v-0-9-2',
  'open-science-v0-10-0',
  'open-science-v0-11-0',
  'open-science-v0-19-0',
  'open-science-v0-20-0',
  'open-science-v0-7-3',
  'open-science-v0-8-0',
  'peer-review-agent-skill-comparison',
  'prognostic-nomogram-ai',
  'project-suncatcher-cooling',
  'ssgsea-immune-infiltration-analysis-ai',
  'translational-study-blueprint-ai'
])

export function blogArticleLastModified(contentDate?: string, slug?: string): string {
  const contentTime = Date.parse(contentDate ?? '')
  const layoutDate =
    slug && updatedVideoArticles.has(slug) ? '2026-11-25' : BLOG_ARTICLE_LAYOUT_LAST_MODIFIED
  return commonLayoutLastModified(
    contentTime > Date.parse(layoutDate) ? new Date(contentTime).toISOString() : layoutDate
  )
}
