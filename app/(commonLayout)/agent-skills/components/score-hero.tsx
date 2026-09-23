'use client'

import { ExternalLink } from 'lucide-react'
import Link from 'next/link'
import { scoreRatioBandFromParts } from '@/lib/score-ratio-bands'
import { cn } from '@/lib/utils'

export interface ScoreHeroProps {
  score: number
  total: number
  evaluationReportUrl?: string | null
  showReportLink?: boolean
  className?: string
  appearance?: 'default' | 'skill'
  scoreTooltip?: string
}

const bandStyles = {
  green: {
    ring: 'border-[#B8DFC9] bg-[#E6F4ED]',
    text: 'text-[#1A6B3C]',
    line: 'bg-[#1A6B3C]'
  },
  orange: {
    ring: 'border-[#F6D860] bg-[#FEF3C7]',
    text: 'text-[#92400E]',
    line: 'bg-[#92400E]'
  },
  red: {
    ring: 'border-[#FCA5A5] bg-[#FEE2E2]',
    text: 'text-[#991B1B]',
    line: 'bg-[#991B1B]'
  }
} as const

function EvaluationReportLink({
  evaluationReportUrl,
  className
}: {
  evaluationReportUrl?: string | null
  className?: string
}) {
  return (
    <Link
      href={evaluationReportUrl ?? '#'}
      aria-label="View Evaluation Report"
      className={cn(
        'inline-flex items-center gap-[5px] text-[11px] font-semibold text-[#909090] transition-colors hover:text-[#111111]',
        !evaluationReportUrl && 'pointer-events-none opacity-50',
        className
      )}
    >
      View Evaluation Report
      <ExternalLink className="size-[11px] shrink-0" strokeWidth={2} />
    </Link>
  )
}

export function ScoreHero({
  score,
  total,
  evaluationReportUrl,
  showReportLink = true,
  className,
  appearance = 'default',
  scoreTooltip
}: ScoreHeroProps) {
  const rounded = Math.round(score)
  const band = scoreRatioBandFromParts(score, total)
  const b =
    appearance === 'skill'
      ? {
          ring: 'border-transparent bg-[#f7f7f5]',
          text:
            band === 'green'
              ? 'text-[#607a32]'
              : band === 'orange'
                ? 'text-[#915600]'
                : 'text-[#b42318]',
          line: 'bg-[#111]'
        }
      : bandStyles[band]

  return (
    <div className={cn('flex flex-col items-center gap-1.5', className)}>
      <div
        className={cn(
          'flex h-[140px] w-[140px] shrink-0 flex-col items-center justify-center rounded-full border-2',
          b.ring
        )}
        title={scoreTooltip}
      >
        <span className={cn('text-[42px] font-extrabold leading-none tracking-[-2px]', b.text)}>
          {rounded}
        </span>
        <span className={cn('my-0.5 h-[2px] w-[22px]', b.line)} />
        <span
          className={cn(
            'text-[11px] font-semibold leading-none',
            appearance === 'skill' ? 'text-[#111]' : b.text
          )}
        >
          {total}
        </span>
        <span
          className={cn(
            'mt-1 text-[11px]',
            appearance === 'skill' ? 'font-normal text-[#6b6b66]' : cn('font-bold', b.text)
          )}
        >
          Total Score
        </span>
      </div>
      {showReportLink ? (
        <EvaluationReportLink
          evaluationReportUrl={evaluationReportUrl}
          className={cn(
            'mt-0.5',
            appearance === 'skill' &&
              'mt-1.5 min-h-8 font-normal text-[#6b6b66] hover:text-[#111] hover:underline'
          )}
        />
      ) : null}
    </div>
  )
}
