import {
  Check,
  CircleAlert,
  CircleMinus,
  FilePen,
  FileText,
  Globe2,
  Search,
  Sparkles,
  Terminal,
  Wrench
} from 'lucide-react'
import type { NormalizedActivity } from '@/lib/use-case-types'

// Static port of WorkspaceActivityIcon: no executing phase exists in a replay, so the
// spinner branch is gone and status/kind map directly to a terminal icon.
export const ActivityIcon = ({ activity }: { activity: NormalizedActivity }) => {
  const iconProps = {
    className: 'size-3.5 shrink-0',
    strokeWidth: 2.2,
    'aria-hidden': true
  } as const

  if (activity.status === 'failed') return <CircleAlert {...iconProps} />
  if (
    activity.status === 'declined' ||
    activity.status === 'cancelled' ||
    activity.toolDisposition === 'declined'
  ) {
    return <CircleMinus {...iconProps} />
  }
  if (activity.status === 'completed') return <Check {...iconProps} />

  switch (activity.toolKind) {
    case 'fetch':
      return <Globe2 {...iconProps} />
    case 'execute':
      return <Terminal {...iconProps} />
    case 'read':
      return <FileText {...iconProps} />
    case 'edit':
      return <FilePen {...iconProps} />
    case 'search':
      return <Search {...iconProps} />
    case 'think':
      return <Sparkles {...iconProps} />
    default:
      return <Wrench {...iconProps} />
  }
}
