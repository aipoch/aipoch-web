'use client'

import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'
import { usesContentPageDesign } from '@/lib/content-page-design'

/** Opt reviewed pages into the compact Figma footer without changing other routes. */
export function FooterByRoute({
  home,
  content,
  children
}: {
  home: ReactNode
  content: ReactNode
  children: ReactNode
}) {
  const pathname = usePathname()
  if (pathname === '/') return home
  return usesContentPageDesign(pathname) ? content : children
}
