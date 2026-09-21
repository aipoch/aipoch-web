'use client'

import { useEffect, useRef, useState } from 'react'
import { navigationEntry, saveNavigationView } from '@/lib/navigation-entry'

/** Restore list controls and expansion for this visit, without leaking into a new visit. */
export function useNavigationViewState<T>(key: string, initialState: T) {
  const [state, setState] = useState(initialState)
  const [ready, setReady] = useState(false)
  const entryId = useRef('')

  useEffect(() => {
    const entry = navigationEntry()
    entryId.current = entry.id
    const saved = entry.views[key] as T | undefined
    if (saved !== undefined) setState(saved)
    setReady(true)
  }, [key])

  useEffect(() => {
    if (ready) saveNavigationView(key, state, entryId.current)
  }, [key, ready, state])

  return [state, setState, ready] as const
}
