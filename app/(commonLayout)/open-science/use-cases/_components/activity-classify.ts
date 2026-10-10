import type { NormalizedActivity } from '@/lib/use-case-types'
import { isNotebookExecutionActivity, isSkillLoadActivity } from './activity-group-title'
import { isNotebookSummaryToolName, matchToolName } from './notebook-tool-names'

// Single source of truth for "which renderer handles this tool activity".
// buildActivityDetails (activity-row.tsx) dispatches on this, and
// scripts/audit-use-cases.ts reports coverage from it — the two can never drift.
export type ActivityRenderer =
  | 'skill'
  | 'notebook'
  | 'notebook-control'
  | 'read'
  | 'packages'
  | 'artifact-write'
  | 'library-inbox'
  | 'websearch'
  | 'generic-fallback'

// Every renderer the web UI ships. The coverage audit requires each of these
// to have a fixture entry in mocks/fixtures/use-case-coverage.ts.
export const ALL_ACTIVITY_RENDERERS: ActivityRenderer[] = [
  'skill',
  'notebook',
  'notebook-control',
  'read',
  'packages',
  'artifact-write',
  'library-inbox',
  'websearch',
  'generic-fallback'
]

export const classifyActivityRenderer = (activity: NormalizedActivity): ActivityRenderer => {
  const providerName = activity.providerToolName ?? ''
  if (isSkillLoadActivity(activity)) return 'skill'
  if (isNotebookExecutionActivity(activity)) return 'notebook'
  if ([activity.providerToolName, activity.title].some(isNotebookSummaryToolName)) {
    return 'notebook-control'
  }
  if (providerName === 'Read' || (activity.toolKind === 'read' && activity.locations?.length)) {
    return 'read'
  }
  if (providerName.includes('manage_packages') || providerName.includes('inspect_packages')) {
    return 'packages'
  }
  if (
    [activity.providerToolName, activity.title].some((name) =>
      matchToolName(name, 'open-science-artifacts', 'write_artifact_file')
    )
  ) {
    return 'artifact-write'
  }
  if (
    [activity.providerToolName, activity.title].some((name) =>
      matchToolName(name, 'open-science-library', 'save_to_inbox')
    )
  ) {
    return 'library-inbox'
  }
  if (
    providerName.toLowerCase().replace(/[\s-]/g, '_') === 'websearch' ||
    providerName === 'WebSearch'
  ) {
    return 'websearch'
  }
  return 'generic-fallback'
}
