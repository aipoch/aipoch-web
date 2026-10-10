export const DEFAULT_SKILL_LIBRARY_COUNT = 597

/** Fallback GitHub star count for the homepage when the API request fails. */
export const DEFAULT_GITHUB_STAR_COUNT = 3500
// Last verified repository count on October 10, 2026; live data replaces this fallback.
export const DEFAULT_MEDICAL_RESEARCH_SKILLS_STAR_COUNT = 1937

const compactGithubCountFormatter = new Intl.NumberFormat('en', {
  notation: 'compact',
  maximumFractionDigits: 1
})

/** Format GitHub counts using K/M notation with a fixed English locale, independent of system settings. */
export const formatCompactGithubCount = (value: number): string => {
  const count = Math.max(0, Math.floor(Number.isFinite(value) ? value : 0))
  return compactGithubCountFormatter.format(count)
}

export const homeHeroStats = [
  { value: '25', label: 'OFFICIAL MODEL APIs', detail: '+ CUSTOM GATEWAY' },
  { value: '4', label: 'AGENT FRAMEWORKS' },
  { value: '597', label: 'SKILLS', testId: 'home-hero-stat-skills' },
  { value: '36', label: 'SCIENCE CONNECTORS' }
] as const

export const resolveSkillLibraryCount = (value?: number | null): number =>
  Number.isFinite(value) && Number(value) > 0
    ? Math.floor(Number(value))
    : DEFAULT_SKILL_LIBRARY_COUNT

export const skillAreas = [
  ['Evidence Insights', 'Search, assess, and synthesize research evidence.'],
  ['Protocol Design', 'Plan study methods, endpoints, and analyses.'],
  ['Data Analysis', 'Prepare data, run analyses, and inspect results.'],
  ['Academic Writing', 'Draft manuscripts, methods, and figure descriptions for researcher review.']
] as const
