'use client'

import { ChevronRight } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useState } from 'react'
import type { NormalizedActivity, UseCaseAsset } from '@/lib/use-case-types'
import { cn } from '@/lib/utils'
import {
  formatActivityGroupElapsed,
  formatActivityGroupTitle,
  formatStepCount,
  getActivityGroupElapsedMs
} from './activity-group-title'
import { ActivityRow } from './activity-row'
import { RowErrorBoundary } from './error-boundary'

// Port of WorkspaceActivityGroup: adjacent tool calls as one collapsible transcript row group,
// collapsed by default, with the app's chevron header and natural-language summary.
export const SessionActivityGroup = ({
  activities,
  assets
}: {
  activities: NormalizedActivity[]
  assets: Record<string, UseCaseAsset>
}) => {
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <div className="px-4 pb-0.5 pt-2.5 md:px-6">
      <div className="w-full overflow-hidden rounded-[14px] bg-bg-200/70 px-1.5 py-1">
        <button
          type="button"
          aria-expanded={isExpanded}
          className="flex w-full items-center gap-2 rounded-lg py-[5px] pl-1.5 pr-2.5 text-[13px] transition-colors hover:bg-bg-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
          onClick={() => setIsExpanded((current) => !current)}
        >
          <span
            className={cn(
              'inline-flex w-4 shrink-0 items-center justify-center text-text-100 transition-transform duration-200',
              isExpanded ? 'rotate-90' : undefined
            )}
          >
            <ChevronRight className="size-3.5" strokeWidth={2.2} aria-hidden="true" />
          </span>
          <span className="min-w-0 truncate text-left font-medium text-text-000">
            {formatActivityGroupTitle(activities)}
          </span>
          <span className="ml-auto shrink-0 whitespace-nowrap text-[12px] tabular-nums text-text-000">
            {formatStepCount(activities)} ·{' '}
            {formatActivityGroupElapsed(getActivityGroupElapsedMs(activities))}
          </span>
        </button>
        <AnimatePresence initial={false}>
          {isExpanded ? (
            <motion.div
              key="group-details"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="overflow-hidden"
            >
              {activities.map((activity) => (
                <div key={activity.id} className="w-full overflow-hidden">
                  <RowErrorBoundary label={activity.providerToolName ?? activity.title}>
                    <ActivityRow activity={activity} assets={assets} />
                  </RowErrorBoundary>
                </div>
              ))}
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </div>
  )
}
