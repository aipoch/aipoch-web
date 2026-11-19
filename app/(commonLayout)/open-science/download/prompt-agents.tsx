'use client'

import { useState } from 'react'

// The marks in the local sprite follow this list from left to right.
const agents = [
  'WorkBuddy',
  'Codex CLI',
  'Claude Code',
  'OpenCode',
  'Hermes',
  'Antigravity',
  'Gemini CLI',
  'Grok Build',
  'Kimi CLI',
  'Cursor Agent',
  'Qwen Code',
  'Qoder CLI',
  'GitHub Copilot',
  'Pi',
  'Kiro CLI',
  'Kilo',
  'Mistral Vibe',
  'DeepSeek TUI',
  'Reasonix',
  'Aider',
  'Devin',
  'Trae CLI'
]

export function PromptAgents() {
  const [hovered, setHovered] = useState<string | null>(null)
  const [focused, setFocused] = useState<string | null>(null)
  const active = hovered ?? focused

  return (
    <div className="flex flex-col gap-2 border border-t-0 border-[#cecec8] bg-[#f4f4ef] px-3 py-2.5 text-left sm:flex-row sm:items-center sm:gap-4 sm:px-5">
      <div className="flex items-center gap-2.5 px-1 sm:w-36 sm:shrink-0 sm:border-r sm:border-[#d7d7d0] sm:pr-3">
        <span aria-hidden="true" className="h-5 w-[3px] shrink-0 bg-[#e8b630]" />
        <div className="flex flex-wrap items-baseline gap-x-2 sm:block">
          <p className="font-mono text-[9px] font-semibold tracking-[0.09em] text-[#64665d] uppercase">
            Paste prompt into
          </p>
          <p className="text-xs font-semibold leading-5 text-[#34362f]">
            {active ?? `${agents.length} coding agents`}
          </p>
        </div>
      </div>
      <ul
        aria-label="Coding agents for this prompt"
        className="grid flex-1 grid-cols-8 gap-y-1 min-[400px]:grid-cols-11 lg:grid-cols-[repeat(22,minmax(0,1fr))]"
      >
        {agents.map((name, index) => (
          <li key={name} className="min-w-0">
            <button
              type="button"
              aria-label={name}
              data-active={active === name}
              onPointerEnter={(event) => {
                if (event.pointerType !== 'touch') setHovered(name)
              }}
              onPointerLeave={() => setHovered(null)}
              onFocus={() => setFocused(name)}
              onBlur={() => setFocused(null)}
              onClick={(event) => event.currentTarget.focus()}
              className="group mx-auto flex h-8 w-full max-w-9 cursor-pointer items-center justify-center rounded-sm transition-colors data-[active=true]:bg-[#f6e8b9] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#755800]"
            >
              <span
                aria-hidden="true"
                className="size-[18px] bg-no-repeat opacity-65 grayscale transition-[filter,opacity] duration-150 group-data-[active=true]:opacity-100 group-data-[active=true]:grayscale-0 motion-reduce:transition-none"
                style={{
                  backgroundImage: 'url(/images/open-science/agent-marks/agents.webp)',
                  backgroundSize: `${agents.length * 100}% 100%`,
                  backgroundPosition: `${(index / (agents.length - 1)) * 100}% center`
                }}
              />
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
