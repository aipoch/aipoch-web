'use client'

import { cn } from '@/lib/utils'
import { Folder } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { Guide } from '@/lib/guides'

interface GuidesDirectoryProps {
  guides: Guide[]
  className?: string
}

export function GuidesDirectory({ guides, className }: GuidesDirectoryProps) {
  const pathname = usePathname()

  const currentSlug =
    pathname && pathname.startsWith('/guides/')
      ? pathname.replace('/guides/', '').split('/')[0] ?? ''
      : ''

  if (!guides?.length) return null

  return (
    <nav
      className={cn(
        'rounded-lg border border-black/10 bg-white/80 dark:bg-zinc-900/80 dark:border-white/10 p-4',
        className
      )}
      aria-label="Guides modules"
    >
      <div className="flex items-center gap-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">
        <Folder className="size-4" />
        <span>MODULES</span>
      </div>
      
      <ul className="space-y-1">
        {guides.map(({ slug, frontmatter }, index) => {
          const num = String(index + 1).padStart(2, '0')
          const isActive = currentSlug === slug

          return (
            <li key={slug}>
              <Link
                href={`/guides/${slug}`}
                className={cn(
                  'flex items-start gap-2 py-2 px-3 -mx-1 rounded-md text-sm',
                  'transition-colors duration-200 ease-out',
                  'hover:bg-black/5 dark:hover:bg-white/5'
                )}
              >
                <span
                  className={cn(
                    'w-1 h-5 rounded-full shrink-0',
                    isActive ? 'bg-yellow-400' : 'bg-transparent'
                  )}
                  aria-hidden="true"
                />

                <span
                  className={cn(
                    'wrap-break-word min-w-0',
                    isActive
                      ? 'font-bold text-gray-900 dark:text-gray-100'
                      : 'text-gray-600 dark:text-gray-400'
                  )}
                >
                  {num} {frontmatter.title}
                </span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
