'use client'

import { CircleAlert } from 'lucide-react'
import { Component, type ReactNode } from 'react'

interface Props {
  /** Label shown when the row crashes (tool name helps pinpoint the gap). */
  label: string
  children: ReactNode
}

interface State {
  failed: boolean
}

// One bad tool payload must not blank the whole transcript: a crashing row
// degrades to a visible error chip that names the tool.
export class RowErrorBoundary extends Component<Props, State> {
  state: State = { failed: false }

  static getDerivedStateFromError(): State {
    return { failed: true }
  }

  componentDidCatch(error: unknown): void {
    console.error(`[use-cases] failed to render tool row "${this.props.label}":`, error)
  }

  render(): ReactNode {
    if (this.state.failed) {
      return (
        <div className="flex items-center gap-1.5 px-2 py-1.5 text-[13px] text-status-failure-foreground">
          <CircleAlert className="size-3.5" aria-hidden="true" />
          <span>
            Could not render <span className="font-medium">{this.props.label}</span>
          </span>
        </div>
      )
    }
    return this.props.children
  }
}
