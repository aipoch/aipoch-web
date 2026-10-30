/** Release fallback snapshot, verified against the published v1.0.3 source on 2026-10-27.
 * https://github.com/aipoch/open-science/tree/97ba68ee315ccf760f7e44462c088856c2598a6b
 * Built-in resource counts use the published v1.0.5 source, verified on 2026-10-29.
 * https://github.com/aipoch/open-science/tree/b664635320b595cc8624a9ddc39e608149b86141
 * Marketplace counts are dated catalog snapshots; do not add them to bundled resources.
 */
export const openScienceProductFacts = {
  releaseVersion: 'v1.0.3',
  releaseDate: '2026-10-26',
  releaseLabel: 'Oct 26, 2026',
  builtInConnectors: 48,
  builtInSkills: 24,
  marketplaceSkills: 525,
  providerPresets: 25,
  agentFrameworks: 4
} as const
