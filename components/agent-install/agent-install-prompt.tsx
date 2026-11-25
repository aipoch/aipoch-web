'use client'

import copy from 'clipboard-copy'
import { Check, Copy } from 'lucide-react'
import { useEffect, useState } from 'react'
import { OPEN_SCIENCE_INSTALL_PROMPT } from '@/lib/open-science-install-prompt'
import { PromptAgents } from './prompt-agents'

export function AgentInstallPrompt({ className = '' }: { className?: string }) {
  const [status, setStatus] = useState<'idle' | 'copied' | 'error'>('idle')

  useEffect(() => {
    if (status === 'idle') return
    const timer = window.setTimeout(() => setStatus('idle'), 4000)
    return () => window.clearTimeout(timer)
  }, [status])

  async function copyPrompt() {
    try {
      await copy(OPEN_SCIENCE_INSTALL_PROMPT)
      setStatus('copied')
    } catch {
      setStatus('error')
    }
  }

  return (
    <div className={`w-full max-w-[992px] ${className}`}>
      <div className="grid grid-rows-[3fr_2fr]">
        <div className="flex flex-col items-start justify-center gap-2 border border-[#cecec8] bg-[#fbfbfa] px-4 py-2 text-left shadow-sm sm:flex-row sm:items-center sm:gap-7 sm:px-7 sm:py-1.5 lg:px-6">
          <p className="min-w-0 select-all font-mono text-xs leading-[1.45] text-[#32342f] [overflow-wrap:anywhere] sm:text-sm lg:text-[15px]">
            {OPEN_SCIENCE_INSTALL_PROMPT}
          </p>
          <button
            type="button"
            onClick={copyPrompt}
            className="inline-flex min-h-11 shrink-0 cursor-pointer items-center justify-center gap-2 self-end bg-[#151611] px-4 text-xs font-semibold text-white transition-colors hover:bg-[#373832] focus-visible:outline-2 focus-visible:outline-offset-2 sm:min-h-12 sm:self-center sm:px-5"
          >
            {status === 'copied' ? (
              <Check aria-hidden="true" className="size-4 text-[#f2bd2f]" />
            ) : (
              <Copy aria-hidden="true" className="size-4" />
            )}
            {status === 'copied' ? 'Copied' : 'Copy prompt'}
          </button>
        </div>
        <PromptAgents />
      </div>
      <p role="status" className={status === 'error' ? 'mt-2 text-sm' : 'sr-only'}>
        {status === 'error' && 'Select the prompt and copy it manually.'}
        {status === 'copied' && 'Prompt copied to clipboard.'}
      </p>
    </div>
  )
}
