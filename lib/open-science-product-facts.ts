/** Static fallback snapshot, verified against the published v1.0.3 source on 2026-10-27.
 * https://github.com/aipoch/open-science/tree/97ba68ee315ccf760f7e44462c088856c2598a6b
 * Marketplace counts are dated catalog snapshots; do not add them to bundled resources.
 */
export const openScienceProductFacts = {
  releaseVersion: 'v1.0.3',
  releaseDate: '2026-10-26',
  releaseLabel: 'Oct 26, 2026',
  builtInConnectors: 43,
  builtInSkills: 23,
  marketplaceSkills: 525,
  providerPresets: 25,
  agentFrameworks: 4
} as const
