'use client'

import copy from 'clipboard-copy'
import { Check, Copy } from 'lucide-react'
import { useEffect, useState } from 'react'
import { PromptAgents } from './prompt-agents'

export function AgentInstallPrompt({ prompt }: { prompt: string }) {
  const [status, setStatus] = useState<'idle' | 'copied' | 'error'>('idle')

  useEffect(() => {
    if (status === 'idle') return
    const timer = window.setTimeout(() => setStatus('idle'), 4000)
    return () => window.clearTimeout(timer)
  }, [status])

  async function copyPrompt() {
    try {
      await copy(prompt)
      setStatus('copied')
    } catch {
      setStatus('error')
    }
  }

  return (
    <div className="mt-7 w-full max-w-[992px]">
      <p className="text-[16px] leading-normal text-[#555650] sm:text-lg">
        Paste this prompt into your coding agent to build the stable release from source.
      </p>
      <div className="mt-4 flex flex-col items-start gap-4 border border-[#cecec8] bg-[#fbfbfa] p-4 text-left shadow-sm sm:flex-row sm:items-center sm:gap-7 sm:px-7 sm:py-6 lg:min-h-[168px] lg:px-9">
        <p className="min-w-0 select-all font-mono text-sm leading-relaxed text-[#32342f] [overflow-wrap:anywhere] sm:text-base lg:text-[17px]">
          {prompt}
        </p>
        <button
          type="button"
          onClick={copyPrompt}
          className="inline-flex min-h-11 shrink-0 cursor-pointer items-center justify-center gap-2 self-end bg-[#151611] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#373832] focus-visible:outline-2 focus-visible:outline-offset-2 sm:min-h-12 sm:self-center sm:px-5"
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
      <p role="status" className={status === 'error' ? 'mt-2 text-sm' : 'sr-only'}>
        {status === 'error' && 'Select the prompt and copy it manually.'}
        {status === 'copied' && 'Prompt copied to clipboard.'}
      </p>
    </div>
  )
}
