'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createContext, type ReactNode, useContext, useEffect, useRef, useState } from 'react'
import { navigationEntry, saveNavigationView } from '@/lib/navigation-entry'

const BACK_VIEW = 'use-case-back-path'
const BackPath = createContext('')

/** Track adjacent case routes in this layout, keeping provenance across detail reloads. */
export const UseCaseNavigation = ({ children }: { children: ReactNode }) => {
  const pathname = usePathname()
  const previous = useRef<{ pathname: string; id: string } | null>(null)
  const [backPath, setBackPath] = useState('')

  useEffect(() => {
    const entry = navigationEntry()
    const parent = pathname.slice(0, pathname.lastIndexOf('/'))
    let saved = entry.views[BACK_VIEW]
    // Record direct visits too, so Back/Forward cannot later invent a different origin.
    if (saved === undefined) {
      saved =
        previous.current?.id !== entry.id && previous.current?.pathname === parent ? parent : ''
      saveNavigationView(BACK_VIEW, saved, entry.id)
    }
    setBackPath(typeof saved === 'string' && saved === parent ? saved : '')
    previous.current = { pathname, id: entry.id }
  }, [pathname])

  return <BackPath.Provider value={backPath}>{children}</BackPath.Provider>
}

/** Preserve normal links for direct visits, new tabs, and browsers without JavaScript. */
export const UseCaseBackLink = ({
  href,
  className,
  children
}: {
  href: string
  className?: string
  children: ReactNode
}) => {
  const router = useRouter()
  const backPath = useContext(BackPath)
  return (
    <Link
      href={href}
      className={className}
      onClick={(event) => {
        if (
          backPath !== href ||
          event.button !== 0 ||
          event.metaKey ||
          event.ctrlKey ||
          event.shiftKey ||
          event.altKey
        )
          return
        event.preventDefault()
        router.back()
      }}
    >
      {children}
    </Link>
  )
}
