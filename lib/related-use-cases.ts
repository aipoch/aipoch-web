import type { UseCaseIndexEntry } from './use-case-types'

// English function words should not make otherwise unrelated research look similar.
const STOP_WORDS = new Set(
  `a an the and or but nor so yet if because while although as than that this these those
   i me my mine we us our ours you your yours he him his she her hers it its they them their theirs
   who whom whose what whats thats which when where why how here there
   myself ourselves yourself yourselves himself herself itself themselves
   im ive youre youve youll hes shes theyre theyve weve theres
   am is isnt are arent was wasnt were werent be been being do does did dont doesnt didnt
   have has had having can cant cannot could couldnt may might must shall should shouldnt will wont would wouldnt
   all any both each either few more most much many neither no not only other same some such
   also even ever just never now once really still then too very again own itself themselves
   about above across after against along alongside amid among around at before behind below beneath
   beside besides between beyond by concerning considering despite down during except excluding
   following for from in including inside into like near of off on onto opposite out outside over past
   per regarding round since through throughout till to toward towards under underneath unlike until
   up upon versus via with within without`.split(/\s+/)
)

/** Strip apostrophes within contractions, then split punctuation and deduplicate keywords. */
const titleKeywords = (title: string): Set<string> =>
  new Set(
    (
      title
        .toLowerCase()
        .replace(/['’]/g, '')
        .match(/[\p{L}\p{N}]+/gu) ?? []
    ).filter((word) => !STOP_WORDS.has(word))
  )

/** Select recommendations from the existing server-side catalog snapshot. */
export const selectRelatedUseCases = (
  current: Pick<UseCaseIndexEntry, 'slug' | 'title'>,
  entries: readonly UseCaseIndexEntry[]
): UseCaseIndexEntry[] => {
  const keywords = titleKeywords(current.title)
  const seen = new Set([current.slug])
  const ranked = entries.flatMap((entry, order) => {
    if (seen.has(entry.slug)) return []
    seen.add(entry.slug)
    const score = [...titleKeywords(entry.title)].filter((word) => keywords.has(word)).length
    return [{ entry, score, order }]
  })

  // Zero-score candidates fill remaining slots in manifest order; never sort the cached array.
  return ranked
    .sort((a, b) => b.score - a.score || a.order - b.order)
    .slice(0, 3)
    .map(({ entry }) => entry)
}
