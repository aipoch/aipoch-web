'use client'

import {
  medicalScoreBadgeClass,
  medicalScoreSummarySquareClass,
  medicalToneFromScore
} from '@/lib/evaluation-styles'
import { coreCapabilityBarStyle, scoreRatioBandFromParts } from '@/lib/score-ratio-bands'
import { cn } from '@/lib/utils'
import type { SkillEvaluation } from '@/types/skill-evaluation'
import { ScoreHero } from './score-hero'

export type { SkillEvaluation }

const staticHeaderFillClass = {
  green: 'bg-[#22C55E]',
  orange: 'bg-[#F59E0B]',
  red: 'bg-[#EF4444]'
} as const

// The skill page opts into Figma colors; shared leaderboard report widgets keep their defaults.
const editorialColors = {
  green: { fill: '#afd670', text: '#607a32' },
  orange: { fill: '#edb732', text: '#915600' },
  red: { fill: '#b42318', text: '#b42318' }
} as const
const editorialFills = {
  green: 'bg-[#afd670]',
  orange: 'bg-[#edb732]',
  red: 'bg-[#b42318]'
} as const
const editorialBadges = {
  green: 'bg-[#afd670] text-[#607a32]',
  orange: 'bg-[#edb732]/25 text-[#915600]',
  red: 'bg-[#b42318]/10 text-[#b42318]'
} as const

/** A single Medical Task assertion: green for PASS, red otherwise. */
function isMedicalAssertionPass(result: string | undefined): boolean {
  return result?.trim().toUpperCase() === 'PASS'
}

type EvaluationPanels = {
  staticScore: number
  staticTotal: number
  staticPct: number
  staticHeaderTone: 'green' | 'orange' | 'red'
  coreRows: Array<{
    rowKey: string
    label: string
    score: number
    max: number
    widthPct: number
    fill: string
    text: string
  }>
  passedDisplay: number
  totalDisplay: number
  medicalRows: Array<{
    label: string
    score: number
    passed: number
    total: number
    assertions?: Array<{ result?: string }>
  }>
}

function buildEvaluationPanels(evaluation: SkillEvaluation): EvaluationPanels {
  const {
    staticScore,
    staticTotal,
    dynamicPassed,
    dynamicTotal,
    coreCategories: coreOverride,
    medicalTasks: medicalOverride
  } = evaluation

  const staticPct = staticTotal > 0 ? (staticScore / staticTotal) * 100 : 0
  const staticHeaderTone = scoreRatioBandFromParts(staticScore, staticTotal)

  const coreRows = (coreOverride ?? []).map((c, index) => {
    const ratio = c.max > 0 ? c.score / c.max : 0
    const rowKey = (c.key && String(c.key).trim()) || `core-${index}`
    return {
      rowKey,
      label: c.label,
      score: c.score,
      max: c.max,
      ...coreCapabilityBarStyle(ratio)
    }
  })

  const passedDisplay = dynamicPassed ?? 0
  const totalDisplay = dynamicTotal ?? 0

  const medicalRows = medicalOverride ?? []

  return {
    staticScore,
    staticTotal,
    staticPct,
    staticHeaderTone,
    coreRows,
    passedDisplay,
    totalDisplay,
    medicalRows
  }
}

function CoreCapabilityPanel({
  p,
  editorial = false,
  className
}: {
  p: EvaluationPanels
  editorial?: boolean
  className?: string
}) {
  return (
    <div className={className}>
      <div className={cn('mb-3 flex items-center justify-between gap-2', editorial && 'flex-wrap')}>
        <div className="text-[13px] font-bold text-[#111111]">Core Capability</div>
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="whitespace-nowrap text-[12.5px] font-bold text-[#111111]">
            {Number.isInteger(p.staticScore) ? p.staticScore : p.staticScore.toFixed(1)} /{' '}
            {p.staticTotal}
          </span>
          <div className="h-1.5 w-[110px] shrink-0 overflow-hidden rounded-full bg-[#EEEEEE]">
            <div
              className={cn(
                'h-full rounded-full',
                editorial
                  ? editorialFills[p.staticHeaderTone]
                  : staticHeaderFillClass[p.staticHeaderTone]
              )}
              style={{ width: `${Math.min(100, p.staticPct)}%` }}
            />
          </div>
        </div>
      </div>
      <div className={cn('grid grid-cols-2 gap-[7px]', editorial && 'flex-1')}>
        {p.coreRows.map((row) => (
          <div
            key={row.rowKey}
            className={cn(
              'rounded-[3px] border border-[#E2E2E2] bg-white px-[11px] py-[9px]',
              editorial && 'border-[#e7e5de] px-3 py-3'
            )}
          >
            <div className="mb-1.5 text-[10px] font-semibold text-[#555555]">{row.label}</div>
            <div className="mb-[5px] h-1 overflow-hidden rounded-[3px] bg-[#EEEEEE]">
              <div
                className="h-full rounded-[3px]"
                style={{
                  width: `${row.widthPct}%`,
                  background: editorial
                    ? editorialColors[scoreRatioBandFromParts(row.score, row.max)].fill
                    : row.fill
                }}
              />
            </div>
            <div
              className="text-[11px] font-bold"
              style={{
                color: editorial
                  ? editorialColors[scoreRatioBandFromParts(row.score, row.max)].text
                  : row.text
              }}
            >
              {row.score} / {row.max}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function MedicalTaskPanel({
  p,
  editorial = false,
  className
}: {
  p: EvaluationPanels
  editorial?: boolean
  className?: string
}) {
  return (
    <div className={className}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="text-[13px] font-bold text-[#111111]">Medical Task</div>
        <div className="flex items-center gap-2.5">
          <span className="whitespace-nowrap text-[12.5px] font-bold text-[#111111]">
            {p.passedDisplay} / {p.totalDisplay} Passed
          </span>
          <div className="flex gap-1">
            {p.medicalRows.slice(0, 8).map((row, i) => (
              <span
                key={i}
                className={cn(
                  'h-[15px] w-[15px] shrink-0 rounded-[2px]',
                  editorial
                    ? editorialFills[medicalToneFromScore(row.score)]
                    : medicalScoreSummarySquareClass(row.score)
                )}
              />
            ))}
          </div>
        </div>
      </div>

      <div
        className={cn(
          'flex flex-1 flex-col rounded-[3px] border border-black/[0.07] bg-black/3 p-1.5',
          editorial && 'rounded-none bg-[#f7f7f7] p-2.5'
        )}
      >
        {p.medicalRows.map((row, idx) => (
          <div
            key={`${row.label}-${idx}`}
            className={cn(
              'flex min-h-0 flex-1 items-center justify-between gap-3 px-1 py-0',
              idx < p.medicalRows.length - 1 && 'border-b border-black/6',
              editorial && 'py-3'
            )}
          >
            <div className="flex min-w-0 flex-1 items-center gap-[7px]">
              <span
                className={cn(
                  'flex h-[19px] w-7 shrink-0 items-center justify-center rounded-[3px] text-[10px] font-bold',
                  editorial
                    ? editorialBadges[medicalToneFromScore(row.score)]
                    : medicalScoreBadgeClass(row.score)
                )}
              >
                {row.score}
              </span>
              <span
                className={cn(
                  'min-w-0 flex-1 truncate text-[10.5px] text-[#555555]',
                  editorial && 'leading-4 text-[#6b6b66]'
                )}
                title={row.label}
              >
                {row.label}
              </span>
            </div>
            <div className="flex shrink-0 items-center gap-1.5 pl-0.5">
              {(row.assertions && row.assertions.length > 0
                ? row.assertions
                : Array.from({ length: row.total }, (_, i) => ({
                    result: i < row.passed ? 'PASS' : 'FAIL'
                  }))
              ).map((item, i) => (
                <span
                  key={i}
                  className={cn(
                    'inline-block size-3 rounded-full transition-transform hover:scale-[1.3]',
                    isMedicalAssertionPass(item.result)
                      ? editorial
                        ? 'bg-[#afd670]'
                        : 'bg-[#22C55E]'
                      : editorial
                        ? 'bg-[#b42318]'
                        : 'bg-[#EF4444]'
                  )}
                />
              ))}
              <span className="ml-[3px] text-[9.5px] font-bold text-[#888888]">
                {row.passed}/{row.total}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

const scoreWidgetCoreClassName =
  'min-w-0 flex-1 border-b border-[#E2E2E2] bg-white p-5 lg:border-b-0 lg:border-r lg:px-6 lg:py-5'

const scoreWidgetMedicalClassName = 'flex min-w-0 flex-1 flex-col bg-white p-5 lg:px-6 lg:py-5'

export interface EvaluationScoreWidgetProps {
  evaluation: SkillEvaluation
  /** `full` uses two columns; `core` and `medical` use one each within the skill page's three-column layout. */
  segment?: 'full' | 'core' | 'medical'
}

export function EvaluationScoreWidget({
  evaluation,
  segment = 'full'
}: EvaluationScoreWidgetProps) {
  const p = buildEvaluationPanels(evaluation)

  if (segment === 'core') {
    return <CoreCapabilityPanel p={p} className={scoreWidgetCoreClassName} />
  }

  if (segment === 'medical') {
    return <MedicalTaskPanel p={p} className={scoreWidgetMedicalClassName} />
  }

  return (
    <div className="flex flex-col overflow-hidden rounded-[3px] border border-[#E2E2E2] bg-white md:flex-row">
      <CoreCapabilityPanel
        p={p}
        className="min-w-0 flex-1 border-b border-[#E2E2E2] p-5 md:border-b-0 md:border-r md:px-6 md:py-5"
      />
      <MedicalTaskPanel p={p} className="flex min-w-0 flex-1 flex-col p-5 md:px-6 md:py-5" />
    </div>
  )
}

export interface EvaluationOverviewProps {
  evaluation: SkillEvaluation
  className?: string
}

export function EvaluationOverview({ evaluation, className }: EvaluationOverviewProps) {
  const { overallScore, overallTotal, evaluationReportUrl } = evaluation
  const panels = buildEvaluationPanels(evaluation)

  return (
    <section
      aria-label="Skill evaluation summary"
      className={cn(
        'grid w-full min-w-0 border border-[#e7e5de] bg-white lg:grid-cols-[240px_minmax(0,1fr)_minmax(0,1fr)]',
        className
      )}
    >
      <div className="flex items-center justify-center px-5 py-8">
        <ScoreHero
          score={overallScore}
          total={overallTotal}
          evaluationReportUrl={evaluationReportUrl}
          appearance="skill"
          className="justify-center"
        />
      </div>
      <CoreCapabilityPanel
        p={panels}
        editorial
        className="flex min-w-0 flex-col border-t border-[#e7e5de] p-5 lg:border-r lg:border-t-0 lg:px-6 lg:py-6"
      />
      <MedicalTaskPanel
        p={panels}
        editorial
        className="flex min-w-0 flex-col border-t border-[#e7e5de] p-5 lg:border-t-0 lg:px-6 lg:py-6"
      />
    </section>
  )
}
