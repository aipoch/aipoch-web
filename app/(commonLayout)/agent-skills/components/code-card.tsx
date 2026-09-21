'use client'

import copy from 'clipboard-copy'
import { Bot, Check, Copy, Info, User } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { CdnImage as Image } from '@/components/cdn-image'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { SITE_DOMAIN } from '@/lib/config'
import { staticAsset } from '@/lib/staticAsset'
import { cn } from '@/lib/utils'

type Identity = 'human' | 'agent'

const contentData = {
  agent: {
    content: `Read ${SITE_DOMAIN}/skill.md and follow the instructions to join Aipoch`,
    steps: [
      'Download the integration guide',
      "Manually configure your agent's skill path",
      'Verify the connection in your dashboard'
    ]
  },
  human: {
    content: `curl -sL ${SITE_DOMAIN}/skill.md > ./skills/aipoch.md`,
    steps: [
      'Run the command to initialize setup',
      "Select 'OpenClaw' as your target agent",
      'Follow the prompts to link your library'
    ]
  }
}

const OpenClawInteractionCard = () => {
  const [identity, setIdentity] = useState<Identity>('agent')
  const [copied, setCopied] = useState(false)

  const currentContent = contentData[identity]

  useEffect(() => {
    if (copied) {
      const timer = setTimeout(() => setCopied(false), 3000)
      return () => clearTimeout(timer)
    }
  }, [copied])

  const handleCopy = async () => {
    await copy(currentContent.content)
    setCopied(true)
  }

  return (
    <div className="border-2 border-black bg-white shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
      {/* Header Section */}
      <div className="flex flex-col items-center pt-8 pb-6 px-6">
        <div className="w-16 h-16 rounded-full overflow-hidden bg-black flex items-center justify-center mb-4">
          <Image
            src={staticAsset('robot-81481448.webp')}
            alt="Robot"
            width={100}
            height={100}
            className="w-16 h-16 object-contain"
            unoptimized
            priority
          />
        </div>
        <h2 className="text-xl font-medium text-black mb-2">Connect with OpenClaw</h2>
        <div className="flex items-center gap-1.5 text-xs text-black/50">
          <Info className="w-3.5 h-3.5" />
          <span>Enable your agent to access 100+ medical research skills.</span>
        </div>
      </div>

      {/* Identity Toggle Group */}
      <div className="border-y-2 border-black">
        <ToggleGroup
          type="single"
          value={identity}
          onValueChange={(value) => value && setIdentity(value as Identity)}
          className="grid grid-cols-2 w-full rounded-none"
          spacing={0}
        >
          <ToggleGroupItem
            value="human"
            className={cn(
              'flex items-center justify-center gap-2 py-6 text-xs font-medium uppercase tracking-wider rounded-none ',
              'data-[state=off]:bg-white data-[state=off]:text-black/50 data-[state=off]:hover:text-black/70',
              'data-[state=on]:bg-[#ecd44c] data-[state=on]:text-black'
            )}
          >
            <User className="w-4 h-4" />
            I'm a Human
          </ToggleGroupItem>
          <ToggleGroupItem
            value="agent"
            className={cn(
              'flex items-center justify-center gap-2 py-6 text-xs font-medium uppercase tracking-wider rounded-none border-l-2 border-black',
              'data-[state=off]:bg-white data-[state=off]:text-black/50 data-[state=off]:hover:text-black/70',
              'data-[state=on]:bg-[#ecd44c] data-[state=on]:text-black'
            )}
          >
            <Bot className="w-4 h-4" />
            I'm an Agent
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      {/* Content Section */}
      <div className="px-6 py-10">
        {/* Title Row */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-lg">🦞</span>
            <span className="font-medium text-black">Join Aipoch</span>
          </div>
        </div>

        {/* Content Block */}
        <div className="relative mb-6">
          <div className="bg-black text-white p-4 pr-12 font-mono text-sm break-all">
            {currentContent.content}
            <button
              type="button"
              onClick={handleCopy}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white transition-colors"
            >
              {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Steps */}
        <div className="space-y-3">
          {currentContent.steps.map((step, index) => (
            <div key={index} className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-[#ecd44c] flex items-center justify-center shrink-0 text-xs font-medium text-black">
                {index + 1}
              </div>
              <span className="text-sm text-black/70 leading-relaxed pt-0.5">{step}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="bg-gray-50 border-t border-black py-4 px-6">
        <Link
          href="/guides/get-started-with-skills"
          type="button"
          className="flex items-center justify-center gap-2 text-[10px] uppercase tracking-wider text-black/50 hover:text-black transition-colors cursor-pointer"
        >
          <span>New to research skills?</span>
          <span className="underline underline-offset-2">Get started</span>
          <span>→</span>
        </Link>
      </div>
    </div>
  )
}

// Keep backward compatibility export
const CodeCard = OpenClawInteractionCard

export { CodeCard, OpenClawInteractionCard }
