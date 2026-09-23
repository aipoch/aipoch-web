'use client'

import { usePathname, useSearchParams } from 'next/navigation'
import { useEffect, useRef } from 'react'
import { NAVIGATION_ENTRY_KEY, navigationEntry } from '@/lib/navigation-entry'

const STORAGE_KEY = 'aipoch-scroll-positions'
type Position = { x: number; y: number }

/** Restore browser history after route rendering and asynchronous list expansion. */
export function ScrollRestoration() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const renderedUrl = useRef('')
  useEffect(() => {
    renderedUrl.current = `${pathname}${searchParams.size ? `?${searchParams}` : ''}`
  }, [pathname, searchParams])

  useEffect(() => {
    const positions = new Map<string, Position>()
    try {
      const saved: [string, Position][] = JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? '[]')
      for (const [id, position] of saved) {
        if (Number.isFinite(position?.x) && Number.isFinite(position?.y))
          positions.set(id, position)
      }
    } catch {
      // History still works in memory when browser storage is unavailable.
    }
    let currentId = navigationEntry().id
    let frame = 0
    let restoring = false
    let navigationPending = false
    const previousRestoration = history.scrollRestoration
    history.scrollRestoration = 'manual'
    const originalPush = history.pushState
    const originalReplace = history.replaceState
    let previousState = history.state

    const persist = () => {
      try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify([...positions].slice(-100)))
      } catch {
        // Storage limits must not prevent navigation.
      }
    }
    const remember = () => {
      if (!restoring && !navigationPending) {
        positions.set(currentId, { x: window.scrollX, y: window.scrollY })
      }
    }
    const cancel = () => {
      cancelAnimationFrame(frame)
      restoring = false
    }
    const restore = () => {
      cancel()
      navigationPending = false
      currentId = navigationEntry().id
      const target = positions.get(currentId)
      if (!target) return
      const url = `${location.pathname}${location.search}`
      restoring = true
      const deadline = performance.now() + 10000
      let settledAt = 0
      const attempt = () => {
        if (performance.now() > deadline) {
          cancel()
          return
        }
        const ready =
          renderedUrl.current === url &&
          !document.querySelector('[data-scroll-restoration-pending="true"]')
        if (ready) {
          window.scrollTo({ left: target.x, top: target.y, behavior: 'instant' })
          const reached = Math.abs(window.scrollY - target.y) <= 1
          if (reached) {
            settledAt ||= performance.now()
            if (performance.now() - settledAt > 300) {
              cancel()
              return
            }
          } else settledAt = 0
        }
        frame = requestAnimationFrame(attempt)
      }
      frame = requestAnimationFrame(attempt)
    }

    const push: History['pushState'] = (data, unused, url) => {
      persist()
      cancel()
      const entry = { id: crypto.randomUUID(), views: {} }
      originalPush.call(history, { ...data, [NAVIGATION_ENTRY_KEY]: entry }, unused, url)
      previousState = history.state
      currentId = entry.id
      navigationPending = false
    }
    const replace: History['replaceState'] = (data, unused, url) => {
      originalReplace.call(
        history,
        {
          ...data,
          [NAVIGATION_ENTRY_KEY]:
            data?.[NAVIGATION_ENTRY_KEY] ?? history.state?.[NAVIGATION_ENTRY_KEY]
        },
        unused,
        url
      )
      previousState = history.state
    }
    history.pushState = push
    history.replaceState = replace

    const onClick = (event: MouseEvent) => {
      const link = event.target instanceof Element ? event.target.closest('a') : null
      if (
        !link ||
        link.target === '_blank' ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey ||
        event.button !== 0
      )
        return
      remember()
      persist()
      // Freeze the departing entry before React removes its content and clamps scrollY.
      if (link.origin === location.origin && link.href !== location.href) navigationPending = true
    }
    const onPopState = (event: PopStateEvent) => {
      // popstate runs before React replaces the departing document, including rapid Back clicks.
      remember()
      persist()
      if (
        !event.state?.[NAVIGATION_ENTRY_KEY] &&
        renderedUrl.current === `${location.pathname}${location.search}`
      ) {
        // Native anchor navigation creates a blank history entry. Preserve the router's state
        // so a later Forward visit does not trigger a full-page reload.
        const entry = {
          id: crypto.randomUUID(),
          views: previousState?.[NAVIGATION_ENTRY_KEY]?.views ?? {}
        }
        originalReplace.call(
          history,
          { ...previousState, ...history.state, [NAVIGATION_ENTRY_KEY]: entry },
          ''
        )
        previousState = history.state
        currentId = entry.id
        navigationPending = false
        return
      }
      previousState = history.state
      restore()
    }
    const onPageHide = () => {
      remember()
      persist()
    }
    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) restore()
    }
    const onUserScroll = () => {
      cancel()
      navigationPending = false
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '].includes(event.key))
        onUserScroll()
    }
    window.addEventListener('scroll', remember, { passive: true })
    document.addEventListener('click', onClick, true)
    window.addEventListener('popstate', onPopState)
    window.addEventListener('pagehide', onPageHide)
    window.addEventListener('pageshow', onPageShow)
    window.addEventListener('wheel', onUserScroll, { passive: true })
    window.addEventListener('touchstart', onUserScroll, { passive: true })
    window.addEventListener('pointerdown', onUserScroll, { passive: true })
    window.addEventListener('input', onUserScroll)
    window.addEventListener('keydown', onKeyDown)
    // A full-document Back navigation recreates the provider; reuse the saved entry.
    if (positions.has(currentId)) restore()

    return () => {
      cancel()
      persist()
      if (history.pushState === push) history.pushState = originalPush
      if (history.replaceState === replace) history.replaceState = originalReplace
      history.scrollRestoration = previousRestoration
      window.removeEventListener('scroll', remember)
      document.removeEventListener('click', onClick, true)
      window.removeEventListener('popstate', onPopState)
      window.removeEventListener('pagehide', onPageHide)
      window.removeEventListener('pageshow', onPageShow)
      window.removeEventListener('wheel', onUserScroll)
      window.removeEventListener('touchstart', onUserScroll)
      window.removeEventListener('pointerdown', onUserScroll)
      window.removeEventListener('input', onUserScroll)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [])

  return null
}
