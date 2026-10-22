'use client'

import { Minus, Plus } from 'lucide-react'
import { useAnimate } from 'motion/react'
import { type MouseEvent, type ReactNode, useRef } from 'react'
import { openScienceFaqItems } from './open-science-faq-data'
import { openScienceContainer, openScienceHeading } from './open-science-section'

const renderFaqAnswer = (item: (typeof openScienceFaqItems)[number]): ReactNode => {
  const links =
    'answerLinks' in item
      ? item.answerLinks
      : 'answerHref' in item
        ? [{ label: item.answerLinkLabel, href: item.answerHref }]
        : []
  if (links.length === 0) return item.answer

  const parts: ReactNode[] = []
  let remaining: string = item.answer
  for (const link of links) {
    const position = remaining.indexOf(link.label)
    if (position === -1) continue
    parts.push(remaining.slice(0, position))
    parts.push(
      <a
        key={link.href}
        href={link.href}
        className="underline underline-offset-4 hover:text-[#111]"
      >
        {link.label}
      </a>
    )
    remaining = remaining.slice(position + link.label.length)
  }
  parts.push(remaining)
  return <>{parts}</>
}

const FaqItem = ({
  question,
  answer,
  defaultOpen
}: {
  question: string
  answer: ReactNode
  defaultOpen: boolean
}) => {
  const [scope, animate] = useAnimate<HTMLDetailsElement>()
  const contentRef = useRef<HTMLDivElement>(null)
  const targetOpen = useRef(defaultOpen)
  const animation = useRef<ReturnType<typeof animate> | null>(null)

  const toggle = (event: MouseEvent<HTMLElement>) => {
    const details = scope.current
    const content = contentRef.current
    const summary = event.currentTarget
    if (!details || !content) return
    event.preventDefault()

    // Measure the current frame before interrupting, so rapid toggles reverse smoothly.
    const height = details.open ? content.getBoundingClientRect().height : 0
    const opacity = details.open ? Number(getComputedStyle(content).opacity) : 0
    animation.current?.stop()
    const expanded = !(animation.current ? targetOpen.current : details.open)
    targetOpen.current = expanded
    details.open = true
    details.toggleAttribute('data-closing', !expanded)
    summary.setAttribute('aria-expanded', String(expanded))
    content.inert = !expanded
    content.style.height = 'auto'
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const controls = animate(
      content,
      {
        height: [height, expanded ? content.scrollHeight : 0],
        opacity: [opacity, expanded ? 1 : 0]
      },
      { duration: reduceMotion ? 0 : 0.3, ease: 'easeOut' }
    )
    animation.current = controls
    void controls.then(() => {
      if (animation.current !== controls || !scope.current) return
      // Native details must stay open until the exit animation completes, including in Safari.
      details.open = expanded
      details.removeAttribute('data-closing')
      summary.removeAttribute('aria-expanded')
      content.inert = false
      controls.cancel()
      content.style.height = ''
      content.style.opacity = ''
      animation.current = null
    })
  }

  return (
    <details
      ref={scope}
      open={defaultOpen}
      data-open-science-reveal="0.08"
      className="group border-b border-[#e7e5de]"
    >
      {/* biome-ignore lint/a11y/noStaticElementInteractions: summary has native pointer and keyboard activation. */}
      <summary
        onClick={toggle}
        className="flex min-h-[68px] cursor-pointer list-none items-center justify-between gap-5 py-5 focus-visible:outline-2 focus-visible:outline-offset-4 [&::-webkit-details-marker]:hidden"
      >
        <h3 className="text-base font-normal leading-6">{question}</h3>
        <span
          className="relative flex size-7 shrink-0 items-center justify-center"
          aria-hidden="true"
        >
          <Minus className="absolute size-4" />
          <Plus className="size-4 transition-[rotate,opacity] duration-300 ease-out group-open:rotate-90 group-open:opacity-0 group-data-closing:rotate-0! group-data-closing:opacity-100! motion-reduce:transition-none" />
        </span>
      </summary>
      <div ref={contentRef} className="overflow-hidden">
        <p className="pb-6 text-base leading-[26px] text-[#6b6b66]">{answer}</p>
      </div>
    </details>
  )
}

export function OpenScienceFaq() {
  return (
    <section
      className={`${openScienceContainer} grid gap-10 py-16 lg:grid-cols-[0.48fr_1fr] lg:gap-16 lg:py-32`}
    >
      <h2 data-open-science-reveal="" className={openScienceHeading}>
        Get to know
        <br /> Open-Science
      </h2>
      <div className="border-t border-[#e7e5de]">
        {openScienceFaqItems.map((item, index) => (
          <FaqItem
            key={item.question}
            question={item.question}
            answer={renderFaqAnswer(item)}
            defaultOpen={index === 0}
          />
        ))}
      </div>
    </section>
  )
}
