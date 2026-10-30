import { Check, CircleAlert, CircleHelp, CircleMinus, Minimize2 } from 'lucide-react'
import type { TranscriptItem } from '@/lib/use-case-types'

const labels = {
  in_progress: 'Compacting context',
  completed: 'Context compacted',
  failed: 'Context compaction failed',
  cancelled: 'Context compaction cancelled',
  unknown: 'Context compaction status unavailable'
} as const

export const SessionCompactionItem = ({
  item
}: {
  item: Extract<TranscriptItem, { type: 'compaction' }>
}) => {
  const Icon =
    item.status === 'completed'
      ? Check
      : item.status === 'cancelled'
        ? CircleMinus
        : item.status === 'failed'
          ? CircleAlert
          : item.status === 'in_progress'
            ? Minimize2
            : CircleHelp
  // Historical lifecycle only: no expandable provider payload or message-copy action.
  return (
    <div className="px-4 pb-0.5 pt-2.5 md:px-6">
      <div
        data-testid="context-compaction"
        role="note"
        className="flex items-center gap-2 rounded-lg bg-bg-200/70 px-3 py-2 text-xs text-text-300"
      >
        <Icon className="size-3.5 shrink-0" aria-hidden="true" />
        <span>{labels[item.status]}</span>
      </div>
    </div>
  )
}
