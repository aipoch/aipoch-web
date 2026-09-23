/** Pages covered by the leaderboard and skill-detail Figma rollout. */
export function usesContentPageDesign(pathname: string): boolean {
  return pathname === '/leaderboard' || /^\/agent-skills\/(?!list$)[^/]+$/.test(pathname)
}
