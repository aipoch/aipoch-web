import type { HomepagePublicConfig, HomepageReadWatchResponse } from '@/service/homepage'
import { DEFAULT_SKILL_LIBRARY_COUNT, resolveSkillLibraryCount } from './home-data'
import { HomeHero } from './home-hero'
import { type HomeSpotlightContent, resolveHomeSpotlightContent } from './home-spotlight-content'
import { DEFAULT_HOMEPAGE_LAST_UPDATED, type HomepageLastUpdated } from './home-structured-data'
import { homeMainShell } from './home-styles'
import { HomeAuditSection } from './sections/audit-section'
import { HomeEcosystemSection } from './sections/ecosystem-section'
import { HomeSkillsSection } from './sections/skills-section'
import { HomeSpotlightSection } from './sections/spotlight-section'
import { HomeTourSection } from './sections/tour-section'
import { HomeWorkbenchSection } from './sections/workbench-section'

export const HomePage = ({
  openScienceConfig = null,
  readWatch = null,
  spotlightContent,
  lastUpdated = DEFAULT_HOMEPAGE_LAST_UPDATED,
  skillsCount = DEFAULT_SKILL_LIBRARY_COUNT,
  githubStars
}: {
  openScienceConfig?: HomepagePublicConfig | null
  readWatch?: HomepageReadWatchResponse | null
  spotlightContent?: HomeSpotlightContent
  lastUpdated?: HomepageLastUpdated
  skillsCount?: number | null
  githubStars?: number
}) => {
  const spotlight = spotlightContent ?? resolveHomeSpotlightContent(openScienceConfig, readWatch)
  const currentSkillsCount = resolveSkillLibraryCount(skillsCount)

  return (
    <main data-homepage="aipoch-open-science" className={`${homeMainShell} -mt-[var(--nav-h)]`}>
      <HomeHero githubStars={githubStars} />
      <HomeTourSection media={spotlight.media} />
      <HomeEcosystemSection skillsCount={currentSkillsCount} />
      <HomeSpotlightSection content={spotlight} lastUpdated={lastUpdated} />
      <HomeWorkbenchSection />
      <HomeSkillsSection skillsCount={currentSkillsCount} />
      <HomeAuditSection />
    </main>
  )
}
