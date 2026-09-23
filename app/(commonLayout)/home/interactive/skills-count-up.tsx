'use client'

import { animate, useInView, useReducedMotion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'

export function SkillsCountUp({ skillsCount }: { skillsCount: number }) {
  const ref = useRef<HTMLParagraphElement>(null)
  const reduce = useReducedMotion()
  const inView = useInView(ref, { amount: 0.5, once: true })
  // Keep the API value in server-rendered HTML and for assistive technology.
  const [count, setCount] = useState(skillsCount)

  useEffect(() => {
    if (!inView || reduce) return
    const controls = animate(0, skillsCount, {
      duration: 1.1,
      ease: (progress) => 1 - (1 - progress) ** 3,
      onUpdate: (value) => setCount(Math.round(value))
    })
    return () => controls.stop()
  }, [inView, reduce, skillsCount])

  return (
    <p
      ref={ref}
      className="mt-8 font-[Georgia] text-[80px] leading-none tracking-[-.06em] sm:text-[96px]"
    >
      <span className="sr-only">{skillsCount} skills</span>
      <span data-testid="skills-count" aria-hidden>
        {reduce ? skillsCount : count}
      </span>
    </p>
  )
}
