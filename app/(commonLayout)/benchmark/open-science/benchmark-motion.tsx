'use client'

import { type ReactNode, useEffect, useRef } from 'react'

const revealTargets = [
  '.hero-content > h1',
  '.hero-content > .tag',
  '.byline',
  '.notice',
  '.hero-cta',
  '.col > .kicker',
  '.col > h2',
  '.col > h3',
  '.callout-block',
  '.records',
  '.headline',
  '.pipeline',
  '.findings',
  '.edge',
  '.col > p',
  '.cell-text > h3',
  '.cell-text > p',
  'figure',
  '.notes > h4',
  '.notes > ol',
  '.notes > pre'
].join(', ')

/** Enhance visible server-rendered content; failed/disabled JavaScript never hides the article. */
export function BenchmarkMotion({ children }: { children: ReactNode }) {
  const root = useRef<HTMLElement>(null)

  useEffect(() => {
    const element = root.current
    if (!element || !('IntersectionObserver' in window) || !element.animate) return

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (reduce.matches) return

    const targets = [...element.querySelectorAll<HTMLElement>(revealTargets)]
    const shown = new Set<Element>()
    const animations = new Set<Animation>()
    let heldEntrance: Animation | undefined
    let releaseFrame = 0
    const finishPointerEntrance = () => {
      cancelAnimationFrame(releaseFrame)
      heldEntrance?.finish()
      heldEntrance = undefined
    }
    const play = (target: Element, frames: Keyframe[], options: KeyframeAnimationOptions) => {
      const animation = target.animate(frames, { fill: 'backwards', ...options })
      animations.add(animation)
      animation.onfinish = () => animations.delete(animation)
    }
    const reveal = (target: HTMLElement, immediate = false) => {
      if (shown.has(target)) return
      shown.add(target)
      target.dataset.benchmarkReveal = 'shown'
      if (immediate || reduce.matches) return

      play(
        target,
        [
          { opacity: 0, transform: 'translateY(14px)' },
          { opacity: 1, transform: 'none' }
        ],
        { duration: 600, easing: 'ease' }
      )
      if (target.tagName !== 'FIGURE') return

      for (const bar of target.querySelectorAll('.bar')) {
        play(bar, [{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], {
          duration: 900,
          easing: 'cubic-bezier(.2,.8,.2,1)'
        })
      }
      for (const ring of target.querySelectorAll('.ring-progress')) {
        const offset = ring.getAttribute('stroke-dashoffset')
        if (offset === null) continue
        play(ring, [{ strokeDashoffset: '1' }, { strokeDashoffset: offset }], {
          duration: 1000,
          easing: 'cubic-bezier(.2,.8,.2,1)'
        })
      }
      target
        .querySelectorAll(
          '.level-row .segment, .point, .point-label, .scholar-dot, .scholar-stem, .scholar-gap'
        )
        .forEach((mark, index) => {
          play(mark, [{ opacity: 0 }, { opacity: 1 }], {
            duration: 600,
            delay: (index % 5) * 80
          })
        })
      for (const mark of target.querySelectorAll('.distractor-row .segment, .dumbbell')) {
        play(mark, [{ opacity: 0 }, { opacity: 1 }], {
          duration: 600,
          delay: mark.matches('.dumbbell:not(.open)') ? 200 : 0
        })
      }
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue
          reveal(entry.target as HTMLElement)
          observer.unobserve(entry.target)
        }
      },
      { threshold: 0.08 }
    )
    for (const target of targets) {
      const bounds = target.getBoundingClientRect()
      // Content in an inactive tab waits until its panel is shown and scrolled into view.
      const inHiddenTab = target.closest('[data-inactive]') !== null
      // Leave initial content and restored scroll positions visible; reveal upcoming blocks.
      if (!inHiddenTab && bounds.top < window.innerHeight) reveal(target, true)
      else {
        target.dataset.benchmarkReveal = 'pending'
        observer.observe(target)
      }
    }

    // Hold the hit target in place from pointer-down through click. Finishing on
    // pointer-induced focus can move a button out from under the release position.
    const holdPointerEntrance = (event: PointerEvent) => {
      if (!(event.target instanceof Element)) return
      finishPointerEntrance()
      const target = event.target.closest<HTMLElement>('[data-benchmark-reveal]')
      heldEntrance = target?.getAnimations().find((animation) => animations.has(animation))
      heldEntrance?.pause()
    }
    const releasePointerEntrance = () => {
      // Click normally settles the animation first; also cover releases outside
      // the article and gestures that produce no click.
      if (heldEntrance) releaseFrame = requestAnimationFrame(finishPointerEntrance)
    }
    // Keyboard focus settles motion immediately without interfering with a tap.
    const revealFocused = (event: FocusEvent) => {
      if (!(event.target instanceof Element)) return
      const target = event.target.closest<HTMLElement>('[data-benchmark-reveal]')
      if (target) {
        reveal(target, true)
        for (const animation of target.getAnimations()) {
          if (animations.has(animation) && animation !== heldEntrance) animation.finish()
        }
        observer.unobserve(target)
      }
    }
    const showAll = () => {
      if (!reduce.matches) return
      observer.disconnect()
      finishPointerEntrance()
      for (const animation of animations) animation.cancel()
      animations.clear()
      for (const target of targets) reveal(target, true)
    }
    element.addEventListener('focusin', revealFocused)
    element.addEventListener('pointerdown', holdPointerEntrance, true)
    element.addEventListener('click', finishPointerEntrance, true)
    window.addEventListener('pointerup', releasePointerEntrance, true)
    window.addEventListener('pointercancel', finishPointerEntrance, true)
    reduce.addEventListener('change', showAll)
    return () => {
      observer.disconnect()
      cancelAnimationFrame(releaseFrame)
      element.removeEventListener('focusin', revealFocused)
      element.removeEventListener('pointerdown', holdPointerEntrance, true)
      element.removeEventListener('click', finishPointerEntrance, true)
      window.removeEventListener('pointerup', releasePointerEntrance, true)
      window.removeEventListener('pointercancel', finishPointerEntrance, true)
      reduce.removeEventListener('change', showAll)
      for (const animation of animations) animation.cancel()
      for (const target of targets) delete target.dataset.benchmarkReveal
    }
  }, [])

  return (
    <main ref={root} className="science-benchmark" id="top">
      {children}
    </main>
  )
}
