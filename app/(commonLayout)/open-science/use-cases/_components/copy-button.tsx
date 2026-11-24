'use client'

import { Check, Copy } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

type CopyButtonProps = {
  text: string
  className?: string
  /** Labeled actions show the icon and visible copy feedback side by side. */
  label?: string
  onCopyError?: () => void
}

export const CopyButton = ({ text, className, label, onCopyError }: CopyButtonProps) => {
  const [copied, setCopied] = useState(false)
  const resetTimeoutRef = useRef<number | null>(null)

  useEffect(
    () => () => {
      if (resetTimeoutRef.current !== null) window.clearTimeout(resetTimeoutRef.current)
    },
    []
  )

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      if (resetTimeoutRef.current !== null) window.clearTimeout(resetTimeoutRef.current)
      resetTimeoutRef.current = window.setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
      onCopyError?.()
    }
  }

  return (
    <button
      type="button"
      aria-label={copied ? 'Copied' : (label ?? 'Copy message')}
      title={copied ? 'Copied' : (label ?? 'Copy message')}
      disabled={!text && Boolean(label)}
      onClick={handleCopy}
      className={cn(
        'flex touch-manipulation items-center justify-center rounded-md text-text-300 transition-colors duration-200 ease-out hover:bg-bg-200 hover:text-text-100 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50',
        label ? 'min-h-8 gap-1.5 px-2 text-xs font-medium disabled:opacity-50' : 'size-6',
        className
      )}
    >
      {copied ? (
        <Check className="size-3.5" strokeWidth={2} aria-hidden="true" />
      ) : (
        <Copy className="size-3.5" strokeWidth={2} aria-hidden="true" />
      )}
      {label && <span>{copied ? 'Copied' : 'Copy'}</span>}
    </button>
  )
}
