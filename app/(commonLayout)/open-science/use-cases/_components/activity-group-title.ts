import type { NormalizedActivity } from '@/lib/use-case-types'
import { matchNotebookRunTool, matchToolName } from './notebook-tool-names'

// Port of workspace-tool-activity-groups.ts (open-science) reduced to the static replay model:
// no ToolSearch wrappers, no live phases, so search-inference and execution-phase branches go away.

type ActivityCategory =
  | 'command'
  | 'search'
  | 'fetch'
  | 'read'
  | 'edit'
  | 'skill'
  | 'environment'
  | 'call'
  | 'artifact'
  | 'notebook'
  | 'other'

const ACTIVITY_CATEGORY_ORDER: readonly ActivityCategory[] = [
  'command',
  'search',
  'fetch',
  'read',
  'edit',
  'skill',
  'environment',
  'call',
  'artifact',
  'notebook',
  'other'
]

// Kernel-run tools are matched across every provider namespacing form
// (mcp__server__tool, mcp.server.tool, server/tool, server_tool); the title
// fallback covers providers that keep the identity out of providerToolName.
export const isNotebookExecutionActivity = (activity: NormalizedActivity): boolean =>
  [activity.providerToolName, activity.title].some(
    (name) => matchNotebookRunTool(name) !== undefined
  )

// Skill loads are matched across every provider namespacing form, same as the
// kernel-run tools (mcp__skills__load_skill, mcp.skills.load_skill, …).
export const isSkillLoadActivity = (activity: NormalizedActivity): boolean =>
  [activity.providerToolName, activity.title].some((name) =>
    matchToolName(name, 'skills', 'load_skill')
  )

const getNormalizedProviderName = (activity: NormalizedActivity): string =>
  activity.providerToolName?.trim().toLowerCase() ?? ''

const categorizeActivity = (activity: NormalizedActivity): ActivityCategory => {
  const providerName = getNormalizedProviderName(activity)

  if (isNotebookExecutionActivity(activity)) return 'notebook'
  if (isSkillLoadActivity(activity)) return 'skill'
  if (providerName === 'save_artifacts' || providerName.includes('artifact')) return 'artifact'
  if (providerName === 'manage_packages' || providerName.includes('package')) return 'environment'
  if (providerName === 'request_network_access' || providerName.startsWith('request_network')) {
    return 'call'
  }
  if (activity.toolKind === 'execute') return 'command'
  if (activity.toolKind === 'edit') return 'edit'
  if (activity.toolKind === 'read') return 'read'
  if (activity.toolKind === 'fetch') return 'fetch'
  if (activity.toolKind === 'search') return 'search'

  return 'other'
}

const formatCategoryClause = (category: ActivityCategory, count: number): string => {
  switch (category) {
    case 'command':
      return count === 1 ? 'ran a command' : `ran ${count} commands`
    case 'search':
      return count === 1 ? 'ran a search' : `ran ${count} searches`
    case 'fetch':
      return count === 1 ? 'fetched a page' : `fetched ${count} pages`
    case 'read':
      return count === 1 ? 'read a file' : `read ${count} files`
    case 'edit':
      return count === 1 ? 'edited a file' : `edited ${count} files`
    case 'skill':
      return count === 1 ? 'loaded a skill' : `loaded ${count} skills`
    case 'environment':
      return count === 1 ? 'managed an environment' : 'managed environments'
    case 'call':
      return count === 1 ? 'made a call' : `made ${count} calls`
    case 'artifact':
      return count === 1 ? 'saved a file' : `saved ${count} files`
    case 'notebook':
      return count === 1 ? 'completed a Notebook run' : `completed ${count} Notebook runs`
    default:
      return count === 1 ? 'ran a tool' : `ran ${count} tools`
  }
}

const capitalizeFirst = (value: string): string =>
  value.length > 0 ? `${value.charAt(0).toUpperCase()}${value.slice(1)}` : value

// Summarizes a group as "Ran 2 commands, loaded a skill" style category clauses.
export const formatActivityGroupTitle = (activities: NormalizedActivity[]): string => {
  const categoryCounts = new Map<ActivityCategory, number>()
  for (const activity of activities) {
    const category = categorizeActivity(activity)
    categoryCounts.set(category, (categoryCounts.get(category) ?? 0) + 1)
  }

  const clauses = ACTIVITY_CATEGORY_ORDER.filter(
    (category) => (categoryCounts.get(category) ?? 0) > 0
  ).map((category) => formatCategoryClause(category, categoryCounts.get(category) ?? 0))

  if (clauses.length === 0) return 'Ran a tool'

  return capitalizeFirst(clauses.join(', '))
}

// Formats the group header's total visible-step count, flagging any failed steps.
export const formatStepCount = (activities: NormalizedActivity[]): string => {
  const stepLabel = activities.length === 1 ? '1 step' : `${activities.length} steps`
  const failedCount = activities.filter((activity) => activity.status === 'failed').length

  return failedCount > 0 ? `${stepLabel} · ${failedCount} failed` : stepLabel
}

// Adds each tool's own runtime, excluding idle gaps between tools in the same group.
export const getActivityGroupElapsedMs = (activities: NormalizedActivity[]): number =>
  activities.reduce(
    (total, activity) => total + Math.max(0, activity.updatedAt - activity.createdAt),
    0
  )

// Keeps short work precise, then switches to compact clock units as the elapsed span grows.
export const formatActivityGroupElapsed = (elapsedMs: number): string => {
  const milliseconds = Math.max(0, Math.floor(elapsedMs))
  if (milliseconds < 1000) return `${milliseconds}ms`

  const totalSeconds = Math.floor(milliseconds / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`
  if (minutes > 0) return `${minutes}m ${seconds}s`
  return `${seconds}s`
}
