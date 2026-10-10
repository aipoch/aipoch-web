import type { LucideIcon } from 'lucide-react'
import { BookOpen, Download, LayoutGrid, Trophy } from 'lucide-react'

export type NavBadge = 'Beta' | 'Soon'
export type NavBadgeTone = 'beta' | 'soon' | 'gray'

export type NavChild = {
  label: string
  href?: string
  description: string
  icon: LucideIcon
  disabled?: boolean
  badge?: NavBadge
  badgeTone?: NavBadgeTone
  iconClassName?: string
}

export type NavGroup = {
  type: 'group'
  label: string
  id: string
  children: NavChild[]
}

export type NavLink = {
  type: 'link'
  label: string
  href: string
}

export type NavItem = NavGroup | NavLink

export type NavAction = {
  label: string
  href: string
  emphasis?: boolean
}

export const isExternalNavHref = (href: string) => /^https?:\/\//.test(href)

export const navItems: NavItem[] = [
  { type: 'link', label: 'Open-Science', href: '/open-science' },
  { type: 'link', label: 'Use Cases', href: '/open-science/use-cases' },
  {
    type: 'group',
    label: 'Agent Skills',
    id: 'agent-skills',
    children: [
      {
        label: 'Install',
        href: '/agent-skills',
        description: 'Install & run skills locally',
        icon: Download
      },
      {
        label: 'Skills Hub',
        href: '/agent-skills/list',
        description: 'Browse every medical skill',
        icon: LayoutGrid
      },
      {
        label: 'Leaderboard',
        href: '/leaderboard',
        description: 'Skill performance rankings',
        icon: Trophy
      },
      {
        label: 'Guides',
        href: '/guides',
        description: 'Tutorials & deployment docs',
        icon: BookOpen
      }
    ]
  },
  { type: 'link', label: 'Benchmark', href: '/medskillaudit' },
  { type: 'link', label: 'Blog', href: '/blog' }
  // Community route code is retained, but the public entry is hidden while the page returns 404.
  // { type: 'link', label: 'Community', href: '/community' }
]

export const navActions: NavAction[] = [
  { label: 'Docs', href: 'https://aipoch.com/docs/' },
  {
    label: 'Download',
    href: '/open-science/download',
    emphasis: true
  }
]

export const badgeClassNames: Record<NavBadgeTone, string> = {
  beta: 'border-[#b8dfc9] bg-[#e6f4ed] text-[#1a6b3c]',
  soon: 'border-[#e9d553] bg-[#f5ead0] text-[#7a6800]',
  gray: 'border-[#d6d6d6] bg-[#ececec] text-[#6b6b6b]'
}

export const isLinkActive = (pathname: string | null, href: string) => {
  return Boolean(pathname && (pathname === href || pathname.startsWith(`${href}/`)))
}

export const isGroupActive = (pathname: string | null, item: NavGroup) => {
  return item.children.some((child) => Boolean(child.href && isLinkActive(pathname, child.href)))
}

export const getActiveChildHref = (pathname: string | null, children: Pick<NavChild, 'href'>[]) => {
  const activeChildren = children.filter(
    (child) => child.href && isLinkActive(pathname, child.href)
  )

  return activeChildren.sort(
    (first, second) => (second.href?.length ?? 0) - (first.href?.length ?? 0)
  )[0]?.href
}

/** Prefer the dedicated entry over a parent route, such as Use Cases over Open-Science. */
export const getActiveLinkHref = (pathname: string | null) =>
  getActiveChildHref(
    pathname,
    navItems.filter((item) => item.type === 'link')
  )

export const getActiveGroupIds = (pathname: string | null) => {
  return navItems
    .filter((item): item is NavGroup => item.type === 'group' && isGroupActive(pathname, item))
    .map((item) => item.id)
}
