/** Namespaced page state; preserve Next.js's own history fields. */
export const NAVIGATION_ENTRY_KEY = '__aipochNavigation'

interface NavigationEntry {
  id: string
  views: Record<string, unknown>
}

export function navigationEntry(): NavigationEntry {
  const existing = window.history.state?.[NAVIGATION_ENTRY_KEY] as NavigationEntry | undefined
  if (existing?.id) return existing
  const entry = { id: crypto.randomUUID(), views: {} }
  window.history.replaceState({ ...window.history.state, [NAVIGATION_ENTRY_KEY]: entry }, '')
  return entry
}

export function saveNavigationView(key: string, value: unknown, entryId: string) {
  const entry = navigationEntry()
  // A departing page's effect must never overwrite the destination entry.
  if (entry.id !== entryId) return
  window.history.replaceState(
    {
      ...window.history.state,
      [NAVIGATION_ENTRY_KEY]: { ...entry, views: { ...entry.views, [key]: value } }
    },
    ''
  )
}
