'use client'

import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'

/** Keep the new landing footer scoped to the homepage during the staged redesign. */
export function FooterByRoute({ home, children }: { home: ReactNode; children: ReactNode }) {
  return usePathname() === '/' ? home : children
}
