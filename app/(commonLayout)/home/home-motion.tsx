'use client'

import { motion, useInView, useReducedMotion } from 'motion/react'
import { type ReactNode, useRef, useState } from 'react'

export const homeEase = [0.2, 0.7, 0.2, 1] as const

const revealViewport = { amount: 0.12, once: true, margin: '0px 0px -6% 0px' } as const

export const resolveHomeRevealAnimate = ({
  reduce,
  shown,
  settled,
  offset = false
}: {
  reduce: boolean
  shown: boolean
  settled: boolean
  offset?: boolean
}) => {
  // After settle, omit `y` so re-renders cannot put translateY(0) back on the layer.
  if (reduce || (shown && settled)) return { opacity: 1 }
  if (!offset) return { opacity: shown ? 1 : 0 }
  if (shown) return { opacity: 1, y: 0 }
  return { opacity: 0, y: 20 }
}

export const HomeReveal = ({
  children,
  className,
  delay = 0,
  visibleInitially = false,
  offset = false
}: {
  children: ReactNode
  className?: string
  delay?: number
  visibleInitially?: boolean
  offset?: boolean
}) => {
  const reduce = useReducedMotion()
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, revealViewport)
  const shown = visibleInitially || Boolean(reduce) || inView
  const [settled, setSettled] = useState(false)
  const mountInitial = reduce
    ? false
    : visibleInitially
      ? offset
        ? { opacity: 1, y: 20 }
        : { opacity: 1 }
      : offset
        ? { opacity: 0, y: 20 }
        : { opacity: 0 }

  return (
    <motion.div
      ref={ref}
      className={className}
      initial={mountInitial}
      animate={resolveHomeRevealAnimate({ reduce: Boolean(reduce), shown, settled, offset })}
      transition={{
        duration: reduce ? 0 : visibleInitially ? 0.85 : 0.7,
        delay: reduce ? 0 : delay,
        ease: homeEase
      }}
      onAnimationComplete={() => shown && setSettled(true)}
      // Opacity alone still allows focus; inert keeps unrevealed blocks out of tab order.
      inert={shown ? undefined : true}
    >
      {children}
    </motion.div>
  )
}

export const MotionPulseDot = ({ className }: { className?: string }) => {
  const reduce = useReducedMotion()
  return (
    <motion.i
      className={className}
      aria-hidden
      animate={
        reduce
          ? undefined
          : {
              opacity: [0.35, 1, 0.35],
              scale: [0.85, 1, 0.85]
            }
      }
      transition={reduce ? undefined : { duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
    />
  )
}

export const HomeMarqueeTrack = ({
  children,
  reverse = false,
  duration = 38
}: {
  children: ReactNode
  reverse?: boolean
  duration?: number
}) => {
  const reduce = useReducedMotion()
  if (reduce) return <div className="flex w-max">{children}</div>
  return (
    <motion.div
      className="flex w-max will-change-transform"
      animate={reduce ? undefined : reverse ? { x: ['-50%', '0%'] } : { x: ['0%', '-50%'] }}
      transition={reduce ? undefined : { duration, ease: 'linear', repeat: Infinity }}
    >
      {children}
    </motion.div>
  )
}
