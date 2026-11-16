'use client'

import {
  createContext,
  type KeyboardEvent,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState
} from 'react'

export type BenchmarkTab = { id: string; label: string; meta: string; highlight?: boolean }

type TabsState = {
  tabs: BenchmarkTab[]
  active: string
  select: (id: string, options?: { scroll?: boolean; push?: boolean }) => void
}

const TabsContext = createContext<TabsState | null>(null)

function useTabs() {
  const context = useContext(TabsContext)
  if (!context) throw new Error('Benchmark tab parts must render inside BenchmarkTabs')
  return context
}

// Layout effects must not run on the server; this keeps the indicator measurement synchronous.
const useIsomorphicLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect

function navHeight() {
  return (
    Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--nav-h')) || 80
  )
}

/** Scrolls so `element` sits just below the fixed site header and the sticky tab bar. */
function scrollBelowBars(element: Element) {
  const bar = document.querySelector('.tabbar')?.getBoundingClientRect().height ?? 0
  const top = element.getBoundingClientRect().top + window.scrollY - navHeight() - bar - 16
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  window.scrollTo({ top: Math.max(0, top), behavior: reduce ? 'auto' : 'smooth' })
}

/**
 * Category tabs for the benchmark article. Every panel is server rendered; inactive panels carry
 * `data-inactive` (hidden by benchmark.css), and a <noscript> rule shows them all when JavaScript
 * is unavailable. A plain `hidden` attribute cannot be overridden there, because Tailwind's
 * layered `[hidden] { display: none !important }` outranks unlayered rules. The URL hash
 * selects a tab (#literature) or any element inside one (#method, #n2), so deep links,
 * in-page anchors and the back button all keep working.
 */
export function BenchmarkTabs({ tabs, children }: { tabs: BenchmarkTab[]; children: ReactNode }) {
  const [active, setActive] = useState(tabs[0].id)
  const activeRef = useRef(active)
  activeRef.current = active
  // 'panel' scrolls to the top of the newly active panel when the tab bar is already stuck.
  const pending = useRef<Element | 'panel' | null>(null)

  const select = useCallback<TabsState['select']>(
    (id, { scroll = true, push = true } = {}) => {
      if (!tabs.some((tab) => tab.id === id) || id === activeRef.current) return
      if (push) window.history.pushState(null, '', `#${id}`)
      pending.current = scroll ? 'panel' : null
      setActive(id)
    },
    [tabs]
  )

  // Resolve the hash to a tab, or to the panel containing the target element.
  useEffect(() => {
    const resolve = () => {
      let hash: string
      try {
        hash = decodeURIComponent(window.location.hash.slice(1))
      } catch {
        // Ignore malformed external fragments instead of breaking tab navigation.
        return
      }
      const tab = tabs.find((item) => item.id === hash)
      const target = tab ? null : hash ? document.getElementById(hash) : null
      const panel = tab?.id ?? target?.closest<HTMLElement>('[data-tab-panel]')?.dataset.tabPanel
      const next = panel ?? (hash ? undefined : tabs[0].id)
      // Targets in the visible panel are scrolled to natively by the browser.
      if (!next || next === activeRef.current) return
      pending.current = target ?? (tab ? 'panel' : null)
      setActive(next)
    }
    resolve()
    window.addEventListener('hashchange', resolve)
    window.addEventListener('popstate', resolve)
    return () => {
      window.removeEventListener('hashchange', resolve)
      window.removeEventListener('popstate', resolve)
    }
  }, [tabs])

  // Scroll once the newly active panel has been unhidden and laid out.
  useEffect(() => {
    const target = pending.current
    pending.current = null
    if (!target) return
    requestAnimationFrame(() => {
      if (target !== 'panel') return scrollBelowBars(target)
      const bar = document.querySelector('.tabbar')
      const panel = document.getElementById(`panel-${active}`)
      if (!bar || !panel) return
      // Leave the page where it is while the tab bar is still in its natural position.
      if (bar.getBoundingClientRect().top > navHeight() + 1) return
      scrollBelowBars(panel)
    })
  }, [active])

  return (
    <TabsContext.Provider value={{ tabs, active, select }}>
      <noscript>
        <style>
          {
            '.science-benchmark .tab-panel[data-inactive]{display:block!important}.science-benchmark .tabbar,.science-benchmark .tab-pager{display:none!important}'
          }
        </style>
      </noscript>
      <TabBar />
      {children}
    </TabsContext.Provider>
  )
}

function TabBar() {
  const { tabs, active, select } = useTabs()
  const list = useRef<HTMLDivElement>(null)
  const [indicator, setIndicator] = useState<{ left: number; width: number } | null>(null)

  useIsomorphicLayoutEffect(() => {
    const element = list.current?.querySelector<HTMLElement>(`[data-tab="${active}"]`)
    if (!element || !list.current) return
    const measure = () => setIndicator({ left: element.offsetLeft, width: element.offsetWidth })
    measure()
    // Keep the active tab visible inside the horizontally scrolling bar on small screens.
    const scroller = list.current
    const offset = element.offsetLeft - (scroller.clientWidth - element.offsetWidth) / 2
    scroller.scrollTo({ left: Math.max(0, offset) })
    const observer = new ResizeObserver(measure)
    observer.observe(scroller)
    return () => observer.disconnect()
  }, [active])

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const index = tabs.findIndex((tab) => tab.id === active)
    const next =
      event.key === 'ArrowRight'
        ? (index + 1) % tabs.length
        : event.key === 'ArrowLeft'
          ? (index - 1 + tabs.length) % tabs.length
          : event.key === 'Home'
            ? 0
            : event.key === 'End'
              ? tabs.length - 1
              : -1
    if (next < 0) return
    event.preventDefault()
    select(tabs[next].id)
    list.current?.querySelector<HTMLElement>(`[data-tab="${tabs[next].id}"]`)?.focus()
  }

  return (
    <div className="tabbar">
      <div
        ref={list}
        className="tabbar-list"
        role="tablist"
        aria-label="Benchmark categories"
        tabIndex={-1}
        onKeyDown={onKeyDown}
      >
        {tabs.map((tab, index) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            id={`tab-${tab.id}`}
            data-tab={tab.id}
            aria-selected={active === tab.id}
            aria-controls={`panel-${tab.id}`}
            tabIndex={active === tab.id ? 0 : -1}
            className={tab.highlight ? 'highlight' : undefined}
            onClick={() => select(tab.id)}
          >
            <span className="tab-index">{String(index).padStart(2, '0')}</span>
            <span className="tab-label">{tab.label}</span>
            <span className="tab-meta">{tab.meta}</span>
          </button>
        ))}
        {indicator && (
          <span
            className="tab-indicator"
            aria-hidden="true"
            style={{ transform: `translateX(${indicator.left}px)`, width: indicator.width }}
          />
        )}
      </div>
    </div>
  )
}

export function TabPanel({ id, children }: { id: string; children: ReactNode }) {
  const { active, tabs } = useTabs()
  const isActive = active === id
  const index = tabs.findIndex((tab) => tab.id === id)
  return (
    <section
      id={`panel-${id}`}
      role="tabpanel"
      aria-labelledby={`tab-${id}`}
      data-tab-panel={id}
      data-inactive={isActive ? undefined : ''}
      className="tab-panel"
    >
      <span id={id} className="tab-anchor" aria-hidden="true" />
      {children}
      <TabPager index={index} />
    </section>
  )
}

/** Previous/next navigation at the end of a panel, so readers can go through in order. */
function TabPager({ index }: { index: number }) {
  const { tabs, select } = useTabs()
  const previous = tabs[index - 1]
  const next = tabs[index + 1]
  return (
    <nav className="tab-pager" aria-label="More benchmark categories">
      {previous ? (
        <button type="button" onClick={() => select(previous.id)}>
          <small>{'← Previous'}</small>
          {previous.label}
        </button>
      ) : (
        <span />
      )}
      {next && (
        <button type="button" className="next" onClick={() => select(next.id)}>
          <small>{'Next →'}</small>
          {next.label}
        </button>
      )}
    </nav>
  )
}

/** Link that switches tab without relying on hash scrolling (works as a plain anchor without JS). */
export function TabLink({
  to,
  children,
  className
}: {
  to: string
  children: ReactNode
  className?: string
}) {
  const { select } = useTabs()
  return (
    <a
      href={`#${to}`}
      className={className}
      onClick={(event) => {
        event.preventDefault()
        select(to)
      }}
    >
      {children}
    </a>
  )
}
