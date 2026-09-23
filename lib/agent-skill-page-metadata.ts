/** Persistent template date; the API still owns the skill's release/update dates. */
export const AGENT_SKILL_DETAIL_LAST_MODIFIED = '2026-09-23'

export function agentSkillPageLastModified(contentDate?: string): string {
  const timestamp = Date.parse(contentDate ?? '')
  return timestamp > Date.parse(AGENT_SKILL_DETAIL_LAST_MODIFIED)
    ? new Date(timestamp).toISOString()
    : AGENT_SKILL_DETAIL_LAST_MODIFIED
}
