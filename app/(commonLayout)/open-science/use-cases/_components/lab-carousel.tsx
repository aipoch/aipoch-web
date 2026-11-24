'use client'

import { ArrowUpRight } from 'lucide-react'
import { useReducedMotion } from 'motion/react'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import styles from './lab-carousel.module.css'

type Card = { slug: string; title: string; image: string }

export function LabCarousel({ labs }: { labs: Card[] }) {
  const [position, setPosition] = useState(0)
  const [hovered, setHovered] = useState(false)
  const [keyboardFocus, setKeyboardFocus] = useState(false)
  const reduced = useReducedMotion()
  const count = labs.length
  const wrap = (i: number) => ((i % count) + count) % count
  const active = labs[wrap(position)]

  useEffect(() => {
    if (count < 2 || hovered || keyboardFocus || reduced) return
    const timer = window.setInterval(() => {
      if (!document.hidden) setPosition((p) => p + 1)
    }, 3000)
    return () => window.clearInterval(timer)
  }, [count, hovered, keyboardFocus, reduced])

  if (!active) return null
  const href = `/open-science/use-cases/${active.slug}`
  const radius = Math.min(2, Math.floor(count / 2))
  const right = Math.min(2, count - 1 - radius)
  // Keep neighbors mounted outside the visible slots as the ring crosses either end.
  const slots = Array.from({ length: radius + right + 5 }, (_, i) => i - radius - 2)
  return (
    <section
      aria-label="Guided 3D labs"
      aria-roledescription="carousel"
      className={styles.carousel}
      onPointerEnter={(e) => setHovered(e.pointerType === 'mouse')}
      onPointerLeave={() => setHovered(false)}
      onFocusCapture={(e) => setKeyboardFocus(e.target.matches(':focus-visible'))}
      onBlurCapture={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setKeyboardFocus(false)
      }}
      onKeyDown={(e) => {
        if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
          e.preventDefault()
          setPosition((p) => p + (e.key === 'ArrowLeft' ? -1 : 1))
        }
      }}
    >
      <div className={styles.stage}>
        {slots.map((offset) => {
          const lab = labs[wrap(position + offset)]
          const visible = offset >= -radius && offset <= right
          const depth = Math.min(3, Math.abs(offset))
          const x = [0, 60, 108, 175][depth] * Math.sign(offset)
          const style = {
            transform: `translate(-50%, -50%) translateX(${x}%) perspective(900px) rotateY(${-Math.sign(offset) * (depth ? 12 : 0)}deg) scale(${[1, 0.81, 0.7, 0.6][depth]})`,
            zIndex: 5 - depth,
            opacity: visible ? 1 : 0,
            pointerEvents: visible ? ('auto' as const) : ('none' as const)
          }
          // Keep the same element while it moves so the active card animates too.
          return (
            <a
              key={position + offset}
              href={`/open-science/use-cases/${lab.slug}`}
              target="_blank"
              rel="noopener"
              className={styles.card}
              style={style}
              inert={!visible}
              tabIndex={visible ? 0 : -1}
              data-slot={offset}
              aria-label={
                offset ? `Select ${lab.title}` : `Explore ${lab.title} (opens in a new tab)`
              }
              onClick={(e) => {
                if (offset && !e.metaKey && !e.ctrlKey && !e.shiftKey) {
                  e.preventDefault()
                  setPosition(position + offset)
                }
              }}
            >
              {/* biome-ignore lint/performance/noImgElement: Use the publisher’s original screenshot from the configured asset origin. */}
              <img src={lab.image} alt="" width="1440" height="810" draggable={false} />
              {offset === 0 && (
                <span className={styles.explore} aria-hidden="true">
                  Explore <ArrowUpRight />
                </span>
              )}
            </a>
          )
        })}
      </div>
      <h2 className={styles.caption}>
        <Link href={href} title={active.title} target="_blank" rel="noopener" prefetch={false}>
          <span>{active.title}</span>
          <span className="sr-only"> (opens in a new tab)</span>
        </Link>
      </h2>
    </section>
  )
}
