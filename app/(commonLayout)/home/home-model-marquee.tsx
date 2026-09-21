'use client'

import { useEffect, useRef, useState } from 'react'
import { HomeMarqueeTrack } from './home-motion'

const providerWidth = 160

const providers = [
  ['GPT', 'gpt'],
  ['Claude', 'claude'],
  ['Grok', 'grok'],
  ['DeepSeek', 'deepseek'],
  ['Qwen', 'qwen'],
  ['GLM', 'glm'],
  ['Kimi', 'kimi'],
  ['MiniMax', 'minimax'],
  ['StepFun', 'stepfun']
] as const

export const HomeModelMarquee = () => {
  const containerRef = useRef<HTMLDivElement>(null)
  const [copiesPerGroup, setCopiesPerGroup] = useState(1)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    // Each half of the animated track must cover the viewport throughout the loop.
    const updateCopies = () =>
      setCopiesPerGroup(
        Math.max(1, Math.ceil(container.clientWidth / (providers.length * providerWidth)))
      )
    updateCopies()
    const observer = new ResizeObserver(updateCopies)
    observer.observe(container)
    return () => observer.disconnect()
  }, [])

  return (
    <div
      ref={containerRef}
      data-testid="home-model-marquee"
      className="relative z-20 h-[74px] overflow-hidden border-y border-[#e8e8e3] bg-[#f7f7f5]"
    >
      <HomeMarqueeTrack key={copiesPerGroup} duration={42 * copiesPerGroup}>
        {[false, true].map((duplicate) => (
          <div
            key={String(duplicate)}
            className="flex h-[72px] shrink-0 items-center"
            aria-hidden={duplicate || undefined}
          >
            {Array.from({ length: copiesPerGroup }, (_, copy) =>
              providers.map(([name, icon]) => (
                <span
                  key={`${copy}-${icon}`}
                  aria-hidden={copy > 0 || undefined}
                  style={{ width: providerWidth }}
                  className="flex shrink-0 items-center justify-center gap-2 text-xs text-[#777]"
                >
                  {/* biome-ignore lint/performance/noImgElement: Exact official monochrome marks exported from Figma. */}
                  <img
                    src={`/figma/landing/provider-${icon}.svg`}
                    alt=""
                    width={20}
                    height={20}
                    className="size-5 object-contain"
                  />
                  {name}
                </span>
              ))
            )}
          </div>
        ))}
      </HomeMarqueeTrack>
    </div>
  )
}
