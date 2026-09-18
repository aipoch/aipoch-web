'use client'

import { cn } from '@/lib/utils'
import { ChevronDown, Menu, X } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useMemo, useRef, useState } from 'react'
import { LogoIcon } from '@/components/svg-icons'
import type { NavChild } from './navbar-data'
import {
  badgeClassNames,
  getActiveChildHref,
  getActiveGroupIds,
  isExternalNavHref,
  isGroupActive,
  isLinkActive,
  navActions,
  navItems
} from './navbar-data'
import { alignNavbarPanels, useAdaptiveNavbar } from './use-adaptive-navbar'

export function Navbar() {
  const pathname = usePathname()
  const activeGroupIds = useMemo(() => getActiveGroupIds(pathname), [pathname])
  const [isOpen, setIsOpen] = useState(false)
  const [openDesktopMenu, setOpenDesktopMenu] = useState<string | null>(null)
  const [openMobileSections, setOpenMobileSections] = useState<string[]>(activeGroupIds)
  const headerRef = useRef<HTMLElement>(null)
  const { theme, scrolled } = useAdaptiveNavbar(headerRef, { pathname })
  const isDark = theme === 'dark'

  // biome-ignore lint/correctness/useExhaustiveDependencies: opening a menu requires recalculating panel alignment.
  useEffect(() => {
    const header = headerRef.current
    if (!header) return
    alignNavbarPanels(header)
  }, [openDesktopMenu])

  // Lock body scroll when menu is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  // Close all expanded menu surfaces from keyboard or outside clicks.
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false)
        setOpenDesktopMenu(null)
      }
    }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [])

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (!headerRef.current?.contains(event.target as Node)) {
        setOpenDesktopMenu(null)
      }
    }

    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [])

  useEffect(() => {
    setOpenMobileSections(activeGroupIds)
    setOpenDesktopMenu(null)
  }, [activeGroupIds])

  const closeMobileMenu = () => {
    setIsOpen(false)
    setOpenMobileSections([])
  }

  const toggleMobileMenu = () => {
    if (isOpen) {
      closeMobileMenu()
      return
    }

    setOpenMobileSections(activeGroupIds)
    setIsOpen(true)
  }

  const toggleMobileSection = (id: string) => {
    setOpenMobileSections((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
    )
  }

  return (
    <header
      ref={headerRef}
      data-nav=""
      data-nav-menu={isOpen ? 'open' : 'closed'}
      data-nav-theme={theme}
      data-nav-scrolled={scrolled ? 'true' : 'false'}
      className={cn(
        'fixed inset-x-0 top-0 z-50 w-full bg-transparent transition-[color] duration-[350ms]',
        'before:pointer-events-none before:absolute before:inset-0 before:z-0 before:border-b before:transition-[background-color,border-color,backdrop-filter] before:duration-500 before:ease-[cubic-bezier(0.4,0,0.2,1)]',
        'after:pointer-events-none after:absolute after:inset-x-0 after:top-0 after:z-0 after:h-[62%] after:bg-[linear-gradient(180deg,rgba(255,255,255,var(--nav-sheen)),rgba(255,255,255,0))] after:transition-[background] after:duration-500 after:ease-[cubic-bezier(0.4,0,0.2,1)]',
        'motion-reduce:transition-none motion-reduce:before:transition-none motion-reduce:after:transition-none',
        isDark
          ? cn(
              '[--nav-bg:rgba(14,15,19,0.55)] [--nav-sheen:0.07] text-white',
              'before:border-white/[.12] before:bg-[var(--nav-bg)] before:backdrop-blur-[22px] before:backdrop-saturate-[170%] before:backdrop-brightness-[.85]',
              "[&_a[aria-current='page']]:!bg-white/[.08] [&_a[aria-current='page']:hover]:!bg-white/[.12]",
              "[&_a[data-nav-plain-link][aria-current='page']]:!bg-transparent [&_a[data-nav-plain-link][aria-current='page']:hover]:!bg-transparent",
              !scrolled &&
                '[--nav-bg:rgba(255,255,255,0.02)] [--nav-sheen:0.02] before:border-white/[.08] before:backdrop-blur-none before:backdrop-saturate-100 before:backdrop-brightness-100'
            )
          : cn(
              '[--nav-bg:rgba(255,255,255,0.55)] [--nav-sheen:0.26] text-[#0a0a0a]',
              'before:border-black/[.07] before:bg-[var(--nav-bg)] before:backdrop-blur-[20px] before:backdrop-saturate-[180%]',
              !scrolled &&
                '[--nav-bg:rgba(255,255,255,0.28)] [--nav-sheen:0.16] before:border-black/[.06]'
            )
      )}
    >
      <nav
        className="relative z-[2] mx-auto flex w-full max-w-[1320px] items-center justify-between px-4 py-5 sm:px-[clamp(16px,4vw,40px)]"
        onMouseLeave={() => setOpenDesktopMenu(null)}
      >
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <LogoIcon className={cn('size-8', isDark ? 'text-white' : 'text-black')} />
          <span className="text-2xl font-bold tracking-tight">AIPOCH</span>
        </Link>

        {/* Desktop mega navigation mirrors the reference menu while keeping project routes intact. */}
        <div className="absolute inset-x-0 mx-auto hidden w-fit items-center gap-0.5 lg:flex">
          {navItems.map((item) => {
            if (item.type === 'link') {
              const isActive = isLinkActive(pathname, item.href)

              return (
                <Link
                  key={item.label}
                  href={item.href}
                  aria-current={isActive ? 'page' : undefined}
                  data-nav-plain-link=""
                  onMouseEnter={() => setOpenDesktopMenu(null)}
                  className={cn(
                    'rounded-[8px] px-[13px] py-[9px] text-[13px] font-semibold leading-none transition-colors',
                    isActive
                      ? isDark
                        ? 'text-white'
                        : 'text-black'
                      : isDark
                        ? 'text-white/65 hover:text-white'
                        : 'text-black/60 hover:text-black'
                  )}
                >
                  {item.label}
                </Link>
              )
            }

            const isOpenDesktop = openDesktopMenu === item.id
            const isActive = isGroupActive(pathname, item)
            const activeChildHref = getActiveChildHref(pathname, item.children)

            return (
              <div key={item.id} className="relative">
                <button
                  type="button"
                  data-testid={`desktop-nav-trigger-${item.id}`}
                  className={cn(
                    'inline-flex items-center rounded-[8px] px-[13px] py-[9px] text-[13px] font-medium leading-none transition-colors',
                    isOpenDesktop
                      ? isDark
                        ? 'bg-white/[.12] text-white'
                        : 'bg-black/[0.06] text-black'
                      : isActive
                        ? isDark
                          ? 'text-white hover:bg-white/[.12]'
                          : 'text-black hover:bg-black/[0.06]'
                        : isDark
                          ? 'text-white/65 hover:bg-white/[.12] hover:text-white'
                          : 'text-black/60 hover:bg-black/[0.06] hover:text-black'
                  )}
                  aria-haspopup="true"
                  aria-expanded={isOpenDesktop}
                  onMouseEnter={() => setOpenDesktopMenu(item.id)}
                  onFocus={() => setOpenDesktopMenu(item.id)}
                  onClick={() => setOpenDesktopMenu(item.id)}
                >
                  {item.label}
                </button>

                <div
                  data-desktop-nav-panel=""
                  className={cn(
                    'invisible pointer-events-none fixed left-0 top-[calc(var(--nav-h)+1px)] z-[60] opacity-0 transition-opacity duration-150 ease-out',
                    isOpenDesktop && 'visible pointer-events-auto opacity-100'
                  )}
                >
                  <div
                    className={cn(
                      'flex min-w-[322px] flex-col gap-1 rounded-[14px] border p-2',
                      isDark
                        ? 'border-white/10 bg-[rgba(26,27,32,0.74)] backdrop-blur-[30px] backdrop-saturate-[180%]'
                        : 'border-black/[0.07] bg-white/[.88] backdrop-blur-[24px] backdrop-saturate-[180%]'
                    )}
                  >
                    {item.children.map((child) => (
                      <MegaNavLink
                        key={`${item.id}-${child.label}`}
                        child={child}
                        isActive={Boolean(child.href && activeChildHref === child.href)}
                        theme={theme}
                        onClick={() => setOpenDesktopMenu(null)}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        <div data-testid="navbar-actions" className="ml-auto hidden items-center gap-1 lg:flex">
          {navActions.map((action) => (
            <Link
              key={action.label}
              href={action.href}
              {...(isExternalNavHref(action.href)
                ? { target: '_blank', rel: 'noopener noreferrer' }
                : {})}
              data-nav-plain-link={action.emphasis ? undefined : ''}
              className={cn(
                'px-[13px] py-[9px] text-[13px] font-medium leading-none transition-colors',
                action.emphasis ? 'rounded-none' : 'rounded-[2px]',
                action.emphasis
                  ? isDark
                    ? 'bg-white text-black hover:bg-white/90'
                    : 'bg-black text-white hover:bg-black/85'
                  : isDark
                    ? 'text-white/65 hover:text-white'
                    : 'text-black/60 hover:text-black'
              )}
            >
              {action.label}
            </Link>
          ))}
        </div>

        {/* Mobile Menu Button */}
        <button
          type="button"
          onClick={toggleMobileMenu}
          className={cn(
            'flex h-10 w-10 items-center justify-center rounded-[8px] transition-colors lg:hidden',
            isDark ? 'text-white hover:bg-white/[.12]' : 'text-black hover:bg-black/[0.06]'
          )}
          aria-label={isOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={isOpen}
        >
          {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </nav>

      {/* Mobile Menu Backdrop - covers content below header */}
      <div
        className={cn(
          'fixed inset-x-0 bottom-0 top-[var(--nav-h)] z-40 h-dvh bg-black/30 motion-safe:transition-opacity motion-safe:duration-200 lg:hidden',
          isOpen ? 'opacity-100' : 'motion-safe:opacity-0 opacity-0 pointer-events-none'
        )}
        onClick={closeMobileMenu}
        aria-hidden="true"
      />

      {/* Mobile Menu Panel */}
      <div
        className={cn(
          'absolute right-0 left-0 top-full z-40 overflow-hidden border-b backdrop-blur-[28px] backdrop-saturate-[180%] motion-safe:transition-all motion-safe:duration-300 motion-safe:ease-out lg:hidden',
          isDark
            ? 'border-white/[.12] bg-[rgba(18,19,23,0.93)]'
            : 'border-black/[.07] bg-[rgba(240,240,240,0.93)]',
          isOpen ? 'pointer-events-auto' : 'pointer-events-none'
        )}
        role="dialog"
        aria-modal="true"
        aria-hidden={!isOpen}
        inert={!isOpen}
        aria-label="Mobile navigation"
      >
        <div
          className={cn(
            'flex flex-col overflow-y-auto px-5',
            isOpen ? 'max-h-[min(72vh,640px)] opacity-100 pt-1.5 pb-5' : 'max-h-0 opacity-0'
          )}
        >
          {navItems.map((item) => {
            if (item.type === 'link') {
              const isActive = isLinkActive(pathname, item.href)

              return (
                <div
                  key={item.label}
                  className={cn(
                    'border-b last:border-b-0',
                    isDark ? 'border-white/10' : 'border-black/[0.08]'
                  )}
                >
                  <Link
                    href={item.href}
                    aria-current={isActive ? 'page' : undefined}
                    onClick={closeMobileMenu}
                    className={cn(
                      'flex w-full items-center justify-between gap-2 py-4 text-xs font-semibold uppercase tracking-[0.08em] transition-colors',
                      isDark
                        ? isActive
                          ? 'text-white'
                          : 'text-white/70 hover:text-white'
                        : isActive
                          ? 'text-black'
                          : 'text-black/70 hover:text-black'
                    )}
                  >
                    {item.label}
                  </Link>
                </div>
              )
            }

            const isSectionOpen = openMobileSections.includes(item.id)
            const isActive = isGroupActive(pathname, item)
            const activeChildHref = getActiveChildHref(pathname, item.children)
            const sectionId = `mobile-nav-${item.id}`

            return (
              <div
                key={item.id}
                className={cn(
                  'border-b last:border-b-0',
                  isDark ? 'border-white/10' : 'border-black/[0.08]'
                )}
              >
                <button
                  type="button"
                  className={cn(
                    'flex w-full items-center justify-between gap-2 py-4 text-xs font-semibold uppercase tracking-[0.08em] transition-colors',
                    isDark
                      ? isActive || isSectionOpen
                        ? 'text-white'
                        : 'text-white/70 hover:text-white'
                      : isActive || isSectionOpen
                        ? 'text-black'
                        : 'text-black/70 hover:text-black'
                  )}
                  aria-expanded={isSectionOpen}
                  aria-controls={sectionId}
                  onClick={() => toggleMobileSection(item.id)}
                >
                  {item.label}
                  <ChevronDown
                    className={cn(
                      'size-3.5 opacity-60 transition-transform duration-200',
                      isSectionOpen && 'rotate-180'
                    )}
                    aria-hidden="true"
                  />
                </button>

                <div
                  id={sectionId}
                  data-open={isSectionOpen ? 'true' : 'false'}
                  aria-hidden={!isSectionOpen}
                  inert={!isSectionOpen}
                  className={cn(
                    'grid transition-[grid-template-rows] duration-300 ease-out',
                    isSectionOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
                  )}
                >
                  <div className="flex flex-col gap-1.5 overflow-hidden">
                    {item.children.map((child) => (
                      <MegaNavLink
                        key={`${item.id}-${child.label}-mobile`}
                        child={child}
                        compact
                        activeStyle="inline"
                        isActive={Boolean(child.href && activeChildHref === child.href)}
                        theme={theme}
                        onClick={closeMobileMenu}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )
          })}
          {navActions.map((action) => (
            <div
              key={`${action.label}-mobile`}
              className={cn(
                'border-b last:border-b-0',
                isDark ? 'border-white/10' : 'border-black/[0.08]'
              )}
            >
              <Link
                href={action.href}
                {...(isExternalNavHref(action.href)
                  ? { target: '_blank', rel: 'noopener noreferrer' }
                  : {})}
                onClick={closeMobileMenu}
                className={cn(
                  'my-2 flex w-full items-center justify-between px-3 py-3 text-xs font-semibold uppercase tracking-[0.08em] transition-colors',
                  action.emphasis ? 'rounded-none' : 'rounded-[8px]',
                  action.emphasis
                    ? isDark
                      ? 'bg-white text-black hover:bg-white/90'
                      : 'bg-black text-white hover:bg-black/85'
                    : isDark
                      ? 'text-white/70 hover:bg-white/[.08] hover:text-white'
                      : 'text-black/70 hover:bg-black/[0.05] hover:text-black'
                )}
              >
                {action.label}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </header>
  )
}

type MegaNavLinkProps = {
  child: NavChild
  compact?: boolean
  isActive?: boolean
  activeStyle?: 'card' | 'inline'
  theme?: 'light' | 'dark'
  onClick?: () => void
}

function MegaNavLink({
  child,
  compact = false,
  isActive = false,
  activeStyle = 'card',
  theme = 'light',
  onClick
}: MegaNavLinkProps) {
  const Icon = child.icon
  const usesCardActive = activeStyle === 'card'
  const isDark = theme === 'dark'
  const hasBrandIcon = Boolean(child.iconClassName)
  const className = cn(
    'group flex w-full appearance-none items-center gap-[13px] rounded-[10px] border-0 bg-transparent text-left no-underline transition-colors',
    isDark ? 'text-white hover:bg-white/[.08]' : 'text-black hover:bg-[#f3f3f3]',
    child.disabled && 'cursor-default',
    compact ? 'py-[11px] pl-2.5 pr-2.5' : 'px-3 py-2.5',
    isActive && (isDark ? 'bg-white/[.08]' : usesCardActive ? 'bg-[#f3f3f3]' : 'bg-black/[0.04]')
  )
  const content = (
    <>
      <span
        className={cn(
          'flex shrink-0 items-center justify-center rounded-[10px] border transition-colors',
          isDark && !hasBrandIcon
            ? 'border-white/[.15] bg-white/[.08] text-white/90 group-hover:bg-white/[.15] group-hover:text-white'
            : 'border-[#e4e4e4] bg-[#efefef] text-[#555] group-hover:bg-[#e7e7e7] group-hover:text-[#1a1a1a]',
          compact ? 'size-[34px]' : 'size-[38px]',
          isActive && usesCardActive && !isDark && 'bg-[#e7e7e7] text-[#1a1a1a]',
          child.iconClassName
        )}
      >
        <Icon className={compact ? 'size-[18px]' : 'size-5'} aria-hidden="true" />
      </span>
      <span className="flex min-w-0 flex-col gap-0.5">
        <span
          className={cn(
            'flex items-center gap-2 text-[14px] font-semibold leading-tight tracking-normal',
            isDark ? 'text-white/[.95]' : 'text-[#111]'
          )}
        >
          {child.label}
          {child.badge ? (
            <span
              className={cn(
                'rounded-full border px-1.5 py-px text-[9px] font-bold uppercase leading-[1.5] tracking-[0.06em]',
                badgeClassNames[child.badgeTone ?? 'soon']
              )}
            >
              {child.badge}
            </span>
          ) : null}
        </span>
        <span
          className={cn('text-[12px] leading-[1.4]', isDark ? 'text-white/50' : 'text-[#8b8b8b]')}
        >
          {child.description}
        </span>
      </span>
    </>
  )

  if (child.disabled || !child.href) {
    return (
      <span aria-disabled="true" className={className}>
        {content}
      </span>
    )
  }

  return (
    <Link
      href={child.href}
      onClick={onClick}
      aria-current={isActive ? 'page' : undefined}
      className={className}
    >
      {content}
    </Link>
  )
}
