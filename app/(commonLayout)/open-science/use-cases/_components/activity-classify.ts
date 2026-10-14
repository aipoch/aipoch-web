import type { NormalizedActivity } from '@/lib/use-case-types'
import { isNotebookExecutionActivity, isSkillLoadActivity } from './activity-group-title'
import {
  isNotebookSummaryToolName,
  isPlanToolName,
  matchNotebookControlTool,
  matchToolName
} from './notebook-tool-names'

// Single source of truth for "which renderer handles this tool activity".
// buildActivityDetails (activity-row.tsx) dispatches on this, and
// scripts/audit-use-cases.ts reports coverage from it — the two can never drift.
export type ActivityRenderer =
  | 'skill'
  | 'notebook'
  | 'notebook-control'
  | 'plan'
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
  'plan',
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
  if ([activity.providerToolName, activity.title].some(isPlanToolName)) {
    return 'plan'
  }
  if (providerName === 'Read' || (activity.toolKind === 'read' && activity.locations?.length)) {
    return 'read'
  }
  // Package tools live under the notebook server; the identity may sit in the
  // title when providerToolName is null (exported envelopes do that).
  if (
    [activity.providerToolName, activity.title]
      .map((name) => matchNotebookControlTool(name))
      .some((suffix) => suffix === 'manage_packages' || suffix === 'inspect_packages')
  ) {
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
