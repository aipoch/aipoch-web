'use client'

import { type CSSProperties, type ReactNode, useEffect, useRef, useState } from 'react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import {
  type AgentGroup,
  type BenchmarkRecord,
  b1,
  b2,
  b3,
  b4,
  coreBench,
  discovery,
  discoveryDistribution,
  filterRecords,
  litqa,
  litqaFull,
  matchDistractorRecords,
  pf,
  replayClass,
  replayLabel,
  type SourceFilter,
  type SuiteAgentId,
  sqa,
  suiteAgents,
  suiteHeadToHead,
  suiteMeans,
  suiteResults,
  suiteTasks,
  tbScience,
  tbScienceAttempts
} from './benchmark-results'

const colors: Record<AgentGroup, string> = {
  aipoch: 'var(--bench-green)',
  codex: 'var(--bench-codex)',
  claude: 'var(--bench-claude)',
  react: 'var(--bench-react)',
  smol: 'var(--bench-smol)',
  asta: 'var(--bench-asta)',
  robo: 'var(--bench-robo)',
  prod: 'var(--bench-robo)',
  evo: 'var(--bench-evo)',
  other: 'var(--bench-other)'
}
const names: Record<AgentGroup, string> = {
  aipoch: 'AIPOCH Open-Science',
  codex: 'Codex',
  claude: 'Claude Code',
  react: 'ReAct',
  smol: 'Smolagents Coder',
  asta: 'Asta',
  robo: 'RoboPhD',
  prod: 'research assistants',
  evo: 'EvoScientist',
  other: 'other agents'
}
const levels = [
  { id: 'B1', name: 'Full protocol', rows: b1, description: 'execute a complete, given protocol' },
  {
    id: 'B2',
    name: 'Methods only',
    rows: b2,
    description: 'organise specified methods into a pipeline'
  },
  { id: 'B3', name: 'Autonomous', rows: b3, description: 'choose and run methods autonomously' },
  {
    id: 'B4',
    name: 'With distractors',
    rows: b4,
    description: 'autonomous research with distractors'
  }
]

const newSourceLabels: Record<string, [ours: string, theirs: string]> = {
  lqf: ['Local run on official test split, 75 questions', 'Official test, 75 questions'],
  core: ['Local run on official test split, 37 tasks', 'Official test, 37 tasks'],
  disc: [
    'Local validation subset, 25 tasks · deepseek-v4-flash judge',
    'Official test · gpt-4-1106-preview judge'
  ],
  tbs: ['Local run, 145 of 210 attempts passed', 'Official leaderboard · 13 Nov 2026 snapshot']
}

function sourceLabel(record: BenchmarkRecord) {
  const labels = newSourceLabels[record.id.split('-')[0]]
  if (labels) return labels[record.group === 'aipoch' ? 0 : 1]
  if (record.source === 'local') return 'Local run'
  if (record.source === 'public') return 'Public leaderboard'
  if (record.id.startsWith('sqa-'))
    return record.source === 'val' ? 'Local validation, 100 questions' : 'Official test'
  if (record.source === 'test' && record.group === 'aipoch')
    return 'Local run on official test split, 75 questions'
  if (record.source === 'test')
    return `Public test, ${record.id.startsWith('pf-') ? 267 : 75} questions`
  return record.group === 'aipoch'
    ? `Local validation, ${record.id.startsWith('pf-') ? 66 : 10} questions`
    : 'Public validation'
}

function Detail({
  record,
  children,
  className,
  style,
  extra
}: {
  record: BenchmarkRecord
  children?: ReactNode
  className?: string
  style?: CSSProperties
  extra?: string
}) {
  const [open, setOpen] = useState(false)
  const label = `${record.system} · ${record.model}, score ${record.score}, ${sourceLabel(record)}${extra ? `, ${extra}` : ''}`
  return (
    <Tooltip open={open} onOpenChange={setOpen}>
      <TooltipTrigger asChild>
        <button
          type="button"
          className={className}
          style={style}
          aria-label={label}
          onClick={() => setOpen(true)}
          onKeyDown={(event) => {
            if (event.key === 'Escape') setOpen(false)
          }}
        >
          {children}
        </button>
      </TooltipTrigger>
      <TooltipContent
        sideOffset={12}
        collisionPadding={8}
        className="benchmark-tooltip max-w-[min(320px,calc(100vw-16px))] rounded-none bg-[#111] p-3 text-xs text-[#d8d5cc]"
      >
        <strong className="text-white">{record.system}</strong>
        <div className="my-1 break-words font-mono text-[11px] text-[#b5b3ac]">{record.model}</div>
        <div>
          Score: <b className="font-mono text-[#afd670]">{record.score}</b>
        </div>
        <div>{sourceLabel(record)}</div>
        {record.cost !== undefined && <div>Cost per question: ${record.cost.toFixed(3)}</div>}
        {record.date && (
          <div>
            {record.group === 'aipoch' ? 'Run' : 'Submitted'}: {record.date}
          </div>
        )}
        {extra && <div>{extra}</div>}
      </TooltipContent>
    </Tooltip>
  )
}

function Legend({
  groups,
  children,
  round = false
}: {
  groups: AgentGroup[]
  children?: ReactNode
  round?: boolean
}) {
  return (
    <div className={`legend${round ? ' legend-round' : ''}`}>
      {groups.map((group) => (
        <span key={group}>
          <i style={{ background: colors[group] }} />
          {names[group]}
        </span>
      ))}
      {children}
    </div>
  )
}
function ChartHeading({
  title,
  subtitle,
  children
}: {
  title: string
  subtitle: string
  children?: ReactNode
}) {
  return (
    <div className="ch-top">
      <div className="ch-title">{title}</div>
      <div className="ch-sub">{subtitle}</div>
      {children}
    </div>
  )
}
function Ticks({ max = 100, ticks = [0, 25, 50, 75, 100] }: { max?: number; ticks?: number[] }) {
  return (
    <div className="ticks" aria-hidden="true">
      {ticks.map((tick) => (
        <span key={tick} style={{ left: `${(tick / max) * 100}%` }}>
          {max < 1 ? tick.toFixed(1) : tick}
        </span>
      ))}
    </div>
  )
}

type SingleSplitKind = 'lqf' | 'core' | 'disc' | 'tbs'
const singleSplit: Record<
  SingleSplitKind,
  { records: BenchmarkRecord[]; title: string; subtitle: string; max: number }
> = {
  lqf: {
    records: litqaFull,
    title: 'LitQA2-FullText',
    subtitle: 'multiple-choice accuracy, % of 75 official test questions answered correctly',
    max: 100
  },
  core: {
    records: coreBench,
    title: 'CORE-Bench-Hard',
    subtitle: 'accuracy, % of 37 official test tasks fully reproduced',
    max: 100
  },
  disc: {
    records: discovery,
    title: 'DiscoveryBench',
    subtitle: 'hypothesis-match score, 0 to 1 · local validation subset vs official test',
    max: 1
  },
  tbs: {
    records: tbScience,
    title: 'Terminal-Bench-Science 0.1',
    subtitle: 'pass rate, % of attempts whose deliverables pass the task verifier',
    max: 100
  }
}

/**
 * Leaderboard bar chart. Long fields collapse to the top `limit` rows (Open-Science rows are
 * always kept) so side-by-side charts stay a similar height; "Show all" expands in place.
 */
export function BarChart({
  kind,
  limit = 10
}: {
  kind: 'litqa' | 'pf' | 'sqa' | 'b1' | 'b2' | 'b3' | 'b4' | SingleSplitKind
  limit?: number
}) {
  const [filter, setFilter] = useState<SourceFilter>('all')
  const [expanded, setExpanded] = useState(false)
  const level = levels.find((level) => level.id.toLowerCase() === kind)
  const single = kind in singleSplit ? singleSplit[kind as SingleSplitKind] : undefined
  const records = single
    ? single.records
    : kind === 'litqa'
      ? litqa
      : kind === 'pf'
        ? pf
        : kind === 'sqa'
          ? sqa
          : (level?.rows ?? [])
  const title = single
    ? single.title
    : level
      ? `ASI-Bench ${level.id}`
      : kind === 'litqa'
        ? 'LitQA2-FullText-Search'
        : kind === 'sqa'
          ? 'ScholarQA-CS2'
          : 'PaperFinding'
  const subtitle = single
    ? single.subtitle
    : level
      ? `${level.description} · score out of 100`
      : kind === 'litqa'
        ? 'recall@30, % of questions whose target paper is returned in the top 30'
        : kind === 'sqa'
          ? 'cited research answers · composite quality score, 0 to 1'
          : 'combined precision and coverage score, 0 to 1'
  const filters: [SourceFilter, string][] = single
    ? []
    : level
      ? [
          ['all', 'All'],
          ['local', 'Local runs'],
          ['public', 'Public leaderboard']
        ]
      : [
          ['all', `All ${records.length}`],
          ['test', 'Official test'],
          ['val', 'Validation']
        ]
  const max = single ? single.max : kind === 'pf' ? 0.5 : kind === 'sqa' ? 1 : 100
  const groups = [...new Set(records.map((record) => record.group))]
  return (
    <TooltipProvider>
      <section id={`ch-${kind}`} className="chart bar-chart" aria-label={`${title} comparison`}>
        <ChartHeading title={title} subtitle={subtitle}>
          <Legend groups={groups} />
          {filters.length > 0 && (
            <fieldset className="chips" aria-label={`${title} sources`}>
              {filters.map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={filter === value}
                  onClick={() => setFilter(value)}
                >
                  {label}
                </button>
              ))}
            </fieldset>
          )}
        </ChartHeading>
        <div className="axis">
          <span />
          <Ticks
            max={max}
            ticks={
              kind === 'pf'
                ? [0, 0.1, 0.2, 0.3, 0.4, 0.5]
                : kind === 'sqa' || kind === 'disc'
                  ? [0, 0.25, 0.5, 0.75, 1]
                  : undefined
            }
          />
          <span />
        </div>
        <div className="rows" id={`rows-${kind}`}>
          {visibleRows(filterRecords(records, filter), limit, expanded).map((record) => (
            <Detail
              key={record.id}
              record={record}
              className={`bar-row ${record.group === 'aipoch' ? 'me' : ''}`}
            >
              <span className="lab">
                <span className="agent-name">{record.system}</span>
                <em>
                  {kind === 'litqa'
                    ? record.model.split('/').at(-1)
                    : kind === 'pf' || kind === 'lqf'
                      ? record.model.split(' / ')[0] + (record.model.includes(' / ') ? ' +' : '')
                      : record.model}
                </em>
                {(record.source === 'local' ||
                  record.source === 'val' ||
                  record.group === 'aipoch') && <span className="tg">{record.source}</span>}
              </span>
              <span
                className="track"
                style={{ backgroundSize: `${kind === 'pf' ? 20 : 25}% 100%` }}
              >
                <span
                  className="bar"
                  style={{
                    width: `${(record.score / max) * 100}%`,
                    background: colors[record.group]
                  }}
                />
              </span>
              <span className="val">{record.score.toFixed(max <= 1 ? 4 : 2)}</span>
            </Detail>
          ))}
        </div>
        <ExpandToggle
          total={filterRecords(records, filter).length}
          limit={limit}
          expanded={expanded}
          onToggle={() => setExpanded((value) => !value)}
          controls={`rows-${kind}`}
        />
      </section>
    </TooltipProvider>
  )
}

/** Collapsing is skipped when it would hide only one or two rows. */
function visibleRows(rows: BenchmarkRecord[], limit: number, expanded: boolean) {
  if (expanded || rows.length <= limit + 2) return rows
  return rows.filter((row, index) => index < limit || row.group === 'aipoch')
}

function ExpandToggle({
  total,
  limit,
  expanded,
  onToggle,
  controls
}: {
  total: number
  limit: number
  expanded: boolean
  onToggle: () => void
  controls: string
}) {
  if (total <= limit + 2) return null
  return (
    <button
      type="button"
      className={`expand-toggle${expanded ? ' open' : ''}`}
      aria-expanded={expanded}
      aria-controls={controls}
      onClick={onToggle}
    >
      {expanded ? `Show top ${limit}` : `Show all ${total} records`}
      <span aria-hidden="true">{expanded ? '↑' : '↓'}</span>
    </button>
  )
}

export function QueryTypes() {
  return (
    <div className="types">
      {[
        [
          'Semantic',
          48,
          0.3308,
          'Understands a research topic and finds papers whose content matches it.'
        ],
        ['Specific paper', 10, 0.8286, 'Pins down one particular paper from the clues given.'],
        ['Metadata', 8, 0.7359, 'Finds papers by author, year and other bibliographic fields.']
      ].map(([name, count, score, description]) => (
        <div className="type" key={name}>
          <div className="benchmark-score-ring">
            <svg width={84} height={84} viewBox="0 0 84 84" fill="none" aria-hidden="true">
              <circle cx={42} cy={42} r={36} stroke="var(--bench-line)" strokeWidth={7} />
              <circle
                className="ring-progress"
                cx={42}
                cy={42}
                r={36}
                pathLength={1}
                stroke="var(--bench-green)"
                strokeWidth={7}
                strokeLinecap="round"
                strokeDasharray={1}
                strokeDashoffset={1 - Number(score)}
                transform="rotate(-90 42 42)"
              />
            </svg>
            <span>{Number(score).toFixed(4).slice(1)}</span>
          </div>
          <div className="nm">{name}</div>
          <div className="ct">
            {count} questions · {Number(score).toFixed(4)}
          </div>
          <p>{description}</p>
        </div>
      ))}
    </div>
  )
}

export function GuidanceLadder() {
  return (
    <div className="ladder">
      {levels.map((level, index) => (
        <div className="step" key={level.id}>
          <div className="k">{level.id}</div>
          <div className="t">{level.name}</div>
          <ul>
            <li className="given">
              {index < 2 ? 'Background & goal' : 'Goal, data & constraints'}
            </li>
            <li className={index < 2 ? 'given' : 'withheld'}>Specified method</li>
            <li className={index === 0 ? 'given' : index === 3 ? 'added' : 'withheld'}>
              {index === 3 ? 'Irrelevant but true facts' : 'Formulas & full steps'}
            </li>
          </ul>
          <div className="s">
            {level.rows[0].score.toFixed(2)}
            <small>Open-Science score</small>
          </div>
        </div>
      ))}
    </div>
  )
}

export function GuidanceChart() {
  return (
    <TooltipProvider>
      <section className="chart" aria-label="ASI-Bench by guidance level">
        <ChartHeading title="ASI-Bench by guidance level" subtitle="task-quality score out of 100">
          <div className="legend legend-round">
            <span>
              <i style={{ background: colors.aipoch }} />
              AIPOCH Open-Science · GPT-6 Astra
            </span>
            <span>
              <i style={{ background: colors.codex }} />
              Codex · GPT-6 Astra (local)
            </span>
            <span>
              <i style={{ background: colors.other }} />
              best public record
            </span>
          </div>
        </ChartHeading>
        {levels.map((level) => {
          const ours = level.rows[0],
            codex = level.rows[1],
            best = level.rows.find((row) => row.source === 'public')
          if (!best) return null
          return (
            <div className="level-row" key={level.id}>
              <div className="gl">
                {level.id}
                <small>{level.name}</small>
              </div>
              <div className="track">
                <span
                  className="segment"
                  style={{ left: `${best.score}%`, width: `${ours.score - best.score}%` }}
                />
                {[best, codex, ours].map((record) => (
                  <Detail
                    key={record.id}
                    record={record}
                    className={`point ${record.group === 'aipoch' ? 'me' : ''}`}
                    style={{
                      left: `${record.score}%`,
                      background: record === best ? colors.other : colors[record.group]
                    }}
                  />
                ))}
                <span className="point-label" style={{ left: `${ours.score}%` }}>
                  {ours.score.toFixed(2)}
                </span>
              </div>
              <div className="delta">
                +{(ours.score - codex.score).toFixed(2)} <small>vs Codex</small>
              </div>
            </div>
          )
        })}
        <div className="level-axis">
          <span />
          <Ticks />
          <span />
        </div>
      </section>
    </TooltipProvider>
  )
}

/** Pack nearby points into alternating lanes, using the actual available plot width. */
function SwarmRow({
  records,
  label,
  subtitle,
  max,
  ticks,
  reference,
  showSplit = false
}: {
  records: BenchmarkRecord[]
  label: string
  subtitle: string
  max: number
  ticks?: number[]
  reference?: number
  showSplit?: boolean
}) {
  const plot = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(740)
  useEffect(() => {
    if (!plot.current) return
    const observer = new ResizeObserver((entries) => setWidth(entries[0].contentRect.width))
    observer.observe(plot.current)
    return () => observer.disconnect()
  }, [])
  const placed: { record: BenchmarkRecord; x: number; y: number }[] = []
  for (const record of [...records].sort((a, b) => a.score - b.score)) {
    const x = (record.score / max) * width
    let lane = 0,
      y = 0
    while (placed.some((point) => Math.abs(point.x - x) < 13 && Math.abs(point.y - y) < 13)) {
      lane += 1
      y = (lane % 2 ? 1 : -1) * Math.ceil(lane / 2) * 13
    }
    placed.push({ record, x, y })
  }
  const height = Math.max(54, 2 * Math.max(...placed.map((point) => Math.abs(point.y))) + 32)
  const ours = records.find((record) => record.group === 'aipoch')
  if (!ours) return null
  return (
    <div className="swarm-row">
      <div className="gl">
        {label}
        <small>{subtitle}</small>
      </div>
      <div
        ref={plot}
        className="swarm-area"
        style={{ height, backgroundSize: `${ticks ? 100 / (ticks.length - 1) : 25}% 100%` }}
      >
        {reference !== undefined && (
          <span className="reference-line" style={{ left: `${(reference / max) * 100}%` }} />
        )}
        {placed.map(({ record, y }) => (
          <Detail
            key={record.id}
            record={record}
            className={`swarm-dot ${record.group === 'aipoch' ? 'me' : ''}`}
            style={{
              left: `${(record.score / max) * 100}%`,
              top: height / 2 + y,
              background:
                record.source === 'val'
                  ? record.group === 'aipoch'
                    ? 'var(--bench-validation)'
                    : '#fff'
                  : colors[record.group],
              borderColor:
                record.source === 'val'
                  ? record.group === 'aipoch'
                    ? 'var(--bench-green-ink)'
                    : record.group === 'other'
                      ? 'var(--bench-muted)'
                      : colors[record.group]
                  : '#fff'
            }}
          />
        ))}
      </div>
      <div className="val">
        {records
          .filter((record) => record.group === 'aipoch')
          .map((record) => (
            <span className="swarm-score" key={record.id}>
              {record.score.toFixed(max <= 1 ? 4 : 2)}
              {showSplit && <small>{record.source === 'test' ? 'test' : 'validation'}</small>}
            </span>
          ))}
        <small>{records.length} records</small>
      </div>
      {ticks && (
        <>
          <span />
          <Ticks max={max} ticks={ticks} />
          <span />
        </>
      )}
    </div>
  )
}

export function SwarmChart({ kind }: { kind: 'asta' | 'asi' }) {
  return (
    <TooltipProvider>
      <section
        className="chart"
        aria-label={`${kind === 'asta' ? 'AstaBench' : 'ASI-Bench'}: the whole field`}
      >
        <ChartHeading
          title={`${kind === 'asta' ? 'AstaBench' : 'ASI-Bench'}: the whole field`}
          subtitle={
            kind === 'asta'
              ? 'each dot is one record; each row has its own scale'
              : 'task-quality score out of 100; each dot is one record'
          }
        >
          <Legend
            round
            groups={
              kind === 'asta'
                ? ['aipoch', 'asta', 'react', 'smol', 'evo', 'robo', 'prod', 'other']
                : ['aipoch', 'codex', 'claude', 'other']
            }
          >
            <span>
              <i className={kind === 'asta' ? 'legend-open' : 'legend-reference'} />
              {kind === 'asta' ? 'validation split' : 'local Codex · GPT-6 Astra'}
            </span>
          </Legend>
        </ChartHeading>
        {kind === 'asta' ? (
          <>
            <SwarmRow
              records={litqa}
              label="LitQA2 search"
              subtitle="recall@30, %"
              max={100}
              ticks={[0, 25, 50, 75, 100]}
              showSplit
            />
            <SwarmRow
              records={litqaFull}
              label="LitQA2 QA"
              subtitle="accuracy, %"
              max={100}
              ticks={[0, 25, 50, 75, 100]}
            />
            <SwarmRow
              records={pf}
              label="PaperFinding"
              subtitle="score, 0–1"
              max={0.5}
              ticks={[0, 0.1, 0.2, 0.3, 0.4, 0.5]}
            />
            <SwarmRow
              records={sqa}
              label="ScholarQA-CS2"
              subtitle="score, 0–1"
              max={1}
              ticks={[0, 0.25, 0.5, 0.75, 1]}
            />
            <SwarmRow
              records={coreBench}
              label="CORE-Bench-Hard"
              subtitle="accuracy, %"
              max={100}
              ticks={[0, 25, 50, 75, 100]}
            />
            <SwarmRow
              records={discovery}
              label="DiscoveryBench"
              subtitle="score, 0–1 · not comparable"
              max={1}
              ticks={[0, 0.25, 0.5, 0.75, 1]}
            />
          </>
        ) : (
          levels.map((level, index) => (
            <SwarmRow
              key={level.id}
              records={level.rows}
              label={level.id}
              subtitle={level.name}
              max={100}
              reference={level.rows[1].score}
              ticks={index === 3 ? [0, 25, 50, 75, 100] : undefined}
            />
          ))
        )}
      </section>
    </TooltipProvider>
  )
}

export function DistractorChart() {
  return (
    <TooltipProvider>
      <section className="chart" aria-label="Effect of distractors, B3 to B4">
        <ChartHeading
          title="Effect of distractors, B3 → B4"
          subtitle="score out of 100; change on the right"
        >
          <div className="legend legend-round">
            <span>
              <i className="legend-open" />
              B3 autonomous
            </span>
            <span>
              <i style={{ background: '#6b6b66' }} />
              B4 with distractors
            </span>
            <span>
              <i style={{ background: colors.aipoch }} />
              AIPOCH Open-Science
            </span>
          </div>
        </ChartHeading>
        <div className="axis distractor-axis">
          <span />
          <Ticks max={70} ticks={[0, 10, 20, 30, 40, 50, 60, 70]} />
          <span />
        </div>
        {matchDistractorRecords().map((record) => (
          <Detail
            key={record.id}
            record={record}
            extra={`B3: ${record.previousScore.toFixed(2)}; change: ${record.delta.toFixed(2)}`}
            className={`distractor-row ${record.group === 'aipoch' ? 'me' : ''}`}
          >
            <span className="lab">
              {record.system}
              <em> · {record.model}</em>
            </span>
            <span className="track" style={{ backgroundSize: `${100 / 7}% 100%` }}>
              <span
                className="segment"
                style={{
                  left: `${(Math.min(record.previousScore, record.score) / 70) * 100}%`,
                  width: `${(Math.abs(record.delta) / 70) * 100}%`
                }}
              />
              <span
                className="dumbbell open"
                style={{ left: `${(record.previousScore / 70) * 100}%` }}
              />
              <span className="dumbbell" style={{ left: `${(record.score / 70) * 100}%` }} />
            </span>
            <span className={`val ${record.delta < 0 ? 'negative' : 'positive'}`}>
              {record.delta > 0 ? '+' : ''}
              {record.delta.toFixed(2)}
            </span>
          </Detail>
        ))}
      </section>
    </TooltipProvider>
  )
}

/** Zoomed dots preserve the truncated axis; assistant lollipops use the full score scale. */
export function ScholarComparison({ zoom = false }: { zoom?: boolean }) {
  const records = filterRecords(
    sqa.filter((r) => (zoom ? r.score >= 0.866 : r.group === 'aipoch' || r.group === 'prod')),
    'all'
  )
  const min = zoom ? 0.84 : 0
  const max = zoom ? 0.94 : 1
  const ticks = zoom ? [0.84, 0.86, 0.88, 0.9, 0.92, 0.94] : [0, 0.25, 0.5, 0.75, 1]
  const position = (value: number) => `${((value - min) / (max - min)) * 100}%`
  return (
    <TooltipProvider>
      <section
        id={zoom ? 'ch-sqa-zoom' : 'ch-sqa-prod'}
        className="chart scholar-comparison"
        aria-label={zoom ? 'ScholarQA-CS2: top of the field' : 'ScholarQA-CS2: research assistants'}
      >
        <ChartHeading
          title={zoom ? 'ScholarQA-CS2: top of the field' : 'ScholarQA-CS2: research assistants'}
          subtitle={
            zoom
              ? 'Zoomed axis · 0.84–0.94 · validation vs official test'
              : 'Full scale · 0–1 · validation vs official test'
          }
        >
          <Legend round groups={[...new Set(records.map((r) => r.group))]} />
        </ChartHeading>
        <div className="axis">
          <span />
          <div className="ticks" aria-hidden="true">
            {ticks.map((t) => (
              <span key={t} style={{ left: position(t) }}>
                {t}
              </span>
            ))}
          </div>
          <span />
        </div>
        {records.map((record) => (
          <Detail
            key={record.id}
            record={record}
            className={`bar-row ${record.group === 'aipoch' ? 'me' : ''}`}
            extra={
              zoom && record.group === 'aipoch'
                ? '+0.0097 vs best official test; different question splits'
                : undefined
            }
          >
            <span className="lab">
              <span className="agent-name">{record.system}</span>
              <em>{record.model}</em>
              {record.source === 'val' && <span className="tg">val</span>}
            </span>
            <span className="track" style={{ backgroundSize: `${100 / (ticks.length - 1)}% 100%` }}>
              {!zoom && (
                <span
                  className="scholar-stem"
                  style={{ width: position(record.score), background: colors[record.group] }}
                />
              )}
              {zoom && record.group === 'aipoch' && (
                <span
                  className="scholar-gap"
                  style={{ left: position(0.9192), width: `${(0.0097 / (max - min)) * 100}%` }}
                />
              )}
              <span
                className="scholar-dot"
                style={{
                  left: position(record.score),
                  background:
                    record.source === 'val' ? 'var(--bench-validation)' : colors[record.group],
                  borderColor:
                    record.source === 'val' ? 'var(--bench-green-ink)' : colors[record.group]
                }}
              />
            </span>
            <span className="val">{record.score.toFixed(4)}</span>
          </Detail>
        ))}
      </section>
    </TooltipProvider>
  )
}

/** Generic tap/hover/focus detail for charts whose marks are not single leaderboard records. */
function Tip({
  label,
  content,
  children,
  className,
  style
}: {
  label: string
  content: ReactNode
  children?: ReactNode
  className?: string
  style?: CSSProperties
}) {
  const [open, setOpen] = useState(false)
  return (
    <Tooltip open={open} onOpenChange={setOpen}>
      <TooltipTrigger asChild>
        <button
          type="button"
          className={className}
          style={style}
          aria-label={label}
          onClick={() => setOpen(true)}
          onKeyDown={(event) => {
            if (event.key === 'Escape') setOpen(false)
          }}
        >
          {children}
        </button>
      </TooltipTrigger>
      <TooltipContent
        sideOffset={10}
        collisionPadding={8}
        className="benchmark-tooltip max-w-[min(320px,calc(100vw-16px))] rounded-none bg-[#111] p-3 text-xs text-[#d8d5cc]"
      >
        {content}
      </TooltipContent>
    </Tooltip>
  )
}

/** One square per attempt; counts only, cells are not mapped to individual tasks. */
export function AttemptWaffle() {
  const { tasks, attempts, passed } = tbScienceAttempts
  const codex = tbScience.find((record) => record.system === 'Codex')
  return (
    <section id="ch-tbs-attempts" className="chart waffle-chart" aria-label="TB-Science attempts">
      <ChartHeading
        title="Every attempt, counted"
        subtitle={`${attempts} local attempts over the ${tasks} tasks · one square per attempt`}
      >
        <div className="legend">
          <span>
            <i style={{ background: colors.aipoch }} />
            passed · {passed}
          </span>
          <span>
            <i className="legend-open" />
            not passed · {attempts - passed}
          </span>
        </div>
      </ChartHeading>
      <div className="waffle" role="img" aria-label={`${passed} of ${attempts} attempts passed`}>
        {Array.from({ length: attempts }, (_, index) => (
          <i key={index} className={index < passed ? 'on' : undefined} />
        ))}
      </div>
      <div className="waffle-foot">
        <div>
          <div className="big">
            {((passed / attempts) * 100).toFixed(2)}%<small>{`${passed} / ${attempts}`}</small>
          </div>
          <span>AIPOCH Open-Science · GPT-6 Astra · max</span>
        </div>
        {codex && (
          <div>
            <div className="big muted">{codex.score.toFixed(2)}%</div>
            <span>Codex · GPT-6 Astra · official #1</span>
          </div>
        )}
      </div>
    </section>
  )
}

/** Discrete per-task strip for the DiscoveryBench subset: full, partial and zero scores. */
export function DiscoveryDistribution() {
  const { tasks, full, partial, zero, mean } = discoveryDistribution
  const parts = [
    { key: 'full', n: full, label: 'full score (1.0)' },
    { key: 'partial', n: partial, label: 'partial credit' },
    { key: 'zero', n: zero, label: 'zero' }
  ]
  return (
    <section className="chart" aria-label="DiscoveryBench score distribution">
      <ChartHeading
        title="25 tasks, scored one by one"
        subtitle={`local validation subset · mean ${mean.toFixed(4)}`}
      />
      <div
        className="strip"
        role="img"
        aria-label={`${full} full, ${partial} partial, ${zero} zero`}
      >
        {parts.flatMap((part) =>
          Array.from({ length: part.n }, (_, index) => (
            <i key={`${part.key}-${index}`} className={part.key} />
          ))
        )}
      </div>
      <div className="strip-key">
        {parts.map((part) => (
          <span key={part.key}>
            <i className={part.key} />
            <b>{part.n}</b> {part.label}
          </span>
        ))}
        <span className="strip-total">{tasks} tasks</span>
      </div>
    </section>
  )
}

const suiteColors: Record<SuiteAgentId, string> = {
  aipoch: colors.aipoch,
  codex: colors.codex,
  evo: colors.evo,
  claude: colors.claude
}

export function SuiteGroupChart() {
  const rows = suiteAgents
    .map((agent) => ({ agent, means: suiteMeans(agent.id) }))
    .sort((a, b) => b.means.overall - a.means.overall)
  return (
    <TooltipProvider>
      <section id="ch-suite-groups" className="chart" aria-label="Research tasks by group">
        <ChartHeading
          title="Ten research tasks, two domains"
          subtitle="mean score out of 100 · five tasks per group, equally weighted"
        >
          <div className="legend">
            <span>
              <i className="legend-solid" />
              Bioinformatics (B)
            </span>
            <span>
              <i className="legend-light" />
              Clinical (C)
            </span>
          </div>
        </ChartHeading>
        <div className="axis suite-axis">
          <span />
          <Ticks />
          <span>Overall</span>
        </div>
        {rows.map(({ agent, means }) => (
          <Tip
            key={agent.id}
            label={`${agent.name}: bioinformatics ${means.bioinformatics.toFixed(1)}, clinical ${means.clinical.toFixed(1)}, overall ${means.overall.toFixed(1)}`}
            className={`suite-row ${agent.id === 'aipoch' ? 'me' : ''}`}
            content={
              <>
                <strong className="text-white">{agent.name}</strong>
                <div className="my-1 font-mono text-[11px] text-[#b5b3ac]">{agent.model}</div>
                <div>{agent.harness}</div>
                <div>
                  Bioinformatics:{' '}
                  <b className="font-mono text-[#afd670]">{means.bioinformatics.toFixed(1)}</b>
                </div>
                <div>
                  Clinical: <b className="font-mono text-[#afd670]">{means.clinical.toFixed(1)}</b>
                </div>
              </>
            }
          >
            <span className="lab">
              <span className="agent-name">{agent.name}</span>
              <em>{agent.model.split(' as displayed')[0].split(' · ')[0]}</em>
            </span>
            <span className="pair-bars">
              {(['bioinformatics', 'clinical'] as const).map((group) => (
                <span className="track" key={group}>
                  <span
                    className={`bar ${group}`}
                    style={{ width: `${means[group]}%`, background: suiteColors[agent.id] }}
                  />
                  <span className="bar-num" style={{ left: `calc(${means[group]}% - 34px)` }}>
                    {means[group].toFixed(1)}
                  </span>
                </span>
              ))}
            </span>
            <span className="val">{means.overall.toFixed(1)}</span>
          </Tip>
        ))}
      </section>
    </TooltipProvider>
  )
}

/** Agents × tasks. Cell shade tracks the score; corner marks flag replay differences or failures. */
export function SuiteHeatmap() {
  const best = suiteTasks.map((_, task) =>
    Math.max(...suiteAgents.map((agent) => suiteResults[agent.id][task][0]))
  )
  const ordered = [...suiteAgents].sort(
    (a, b) => suiteMeans(b.id).overall - suiteMeans(a.id).overall
  )
  return (
    <TooltipProvider>
      <section id="ch-suite-heatmap" className="chart" aria-label="Research tasks: every score">
        <ChartHeading
          title="Every score, task by task"
          subtitle="score out of 100 · darker is higher · outlined cell is the best score on that task"
        >
          <div className="legend">
            <span>
              <i className="legend-ramp" />0 → 100
            </span>
            <span>
              <i className="legend-flag diff" />
              replay ran with differences
            </span>
            <span>
              <i className="legend-flag fail" />
              replay failed or produced no outputs
            </span>
          </div>
        </ChartHeading>
        <div className="heat-scroll">
          <div
            className="heat"
            style={{
              gridTemplateColumns: `minmax(120px, 1.6fr) repeat(10, minmax(40px, 1fr)) minmax(52px, 1fr)`
            }}
          >
            <span className="heat-group" />
            <span className="heat-group" style={{ gridColumn: 'span 5' }}>
              Bioinformatics
            </span>
            <span className="heat-group" style={{ gridColumn: 'span 5' }}>
              Clinical
            </span>
            <span className="heat-group" />
            <span className="heat-head" />
            {suiteTasks.map((task) => (
              <span className="heat-head" key={task.id} title={task.title}>
                {task.id}
              </span>
            ))}
            <span className="heat-head">Mean</span>
            {ordered.map((agent) => (
              <HeatRow key={agent.id} agent={agent} best={best} />
            ))}
          </div>
        </div>
      </section>
    </TooltipProvider>
  )
}

function HeatRow({ agent, best }: { agent: (typeof suiteAgents)[number]; best: number[] }) {
  const mean = suiteMeans(agent.id).overall
  return (
    <>
      <span className={`heat-agent ${agent.id === 'aipoch' ? 'me' : ''}`}>
        {agent.name}
        <small>{agent.model.split(' as displayed')[0].split(' · ')[0]}</small>
      </span>
      {suiteResults[agent.id].map(([score, replay], index) => {
        const task = suiteTasks[index]
        const mix = Math.round(score * 0.9)
        return (
          <Tip
            key={task.id}
            label={`${agent.name}, ${task.id}: ${score}. Replay: ${replayLabel(replay)}`}
            className={`heat-cell flag-${replayClass(replay)}${score === best[index] ? ' best' : ''}`}
            style={{
              background: `color-mix(in oklab, var(--bench-green-ink) ${mix}%, #fff)`,
              color: mix > 55 ? '#fff' : 'var(--bench-text)'
            }}
            content={
              <>
                <strong className="text-white">
                  {task.id} · {task.title}
                </strong>
                <div className="my-1 text-[11px] text-[#b5b3ac]">{agent.name}</div>
                <div>
                  Score: <b className="font-mono text-[#afd670]">{score}</b>
                  {score === best[index] ? ' · best on this task' : ''}
                </div>
                <div>Replay: {replayLabel(replay)}</div>
                <div className="font-mono text-[11px] text-[#b5b3ac]">doi:{task.doi}</div>
              </>
            }
          >
            {score}
          </Tip>
        )
      })}
      <span className={`heat-mean ${agent.id === 'aipoch' ? 'me' : ''}`}>{mean.toFixed(1)}</span>
    </>
  )
}

const outcomeText = { win: 'Open-Science higher', tie: 'tied', loss: 'rival higher' } as const

/** Task-by-task win / tie / loss of Open-Science against each rival on the same ten tasks. */
export function SuiteHeadToHead() {
  const rivals = suiteAgents.filter((agent) => agent.id !== 'aipoch')
  return (
    <TooltipProvider>
      <section id="ch-suite-h2h" className="chart h2h-chart" aria-label="Head-to-head by task">
        <ChartHeading
          title="Head to head, task by task"
          subtitle="Open-Science against each agent on the same ten tasks"
        >
          <div className="legend">
            <span>
              <i style={{ background: colors.aipoch }} />
              Open-Science higher
            </span>
            <span>
              <i style={{ background: 'var(--bench-other)' }} />
              tied
            </span>
            <span>
              <i className="legend-open" />
              rival higher
            </span>
          </div>
        </ChartHeading>
        <div className="h2h-head">
          <span />
          <span>Bioinformatics</span>
          <span>Clinical</span>
          <span>W–T–L</span>
        </div>
        {rivals.map((rival) => {
          const result = suiteHeadToHead(rival.id as Exclude<SuiteAgentId, 'aipoch'>)
          return (
            <div className="h2h-row" key={rival.id}>
              <span className="lab">
                <span className="agent-name">vs {rival.name}</span>
                <em>{rival.model.split(' as displayed')[0].split(' · ')[0]}</em>
              </span>
              {[0, 5].map((start) => (
                <span className="h2h-cells" key={start}>
                  {result.outcomes.slice(start, start + 5).map((outcome, offset) => {
                    const index = start + offset
                    const task = suiteTasks[index]
                    const ours = suiteResults.aipoch[index][0]
                    const theirs = suiteResults[rival.id][index][0]
                    return (
                      <Tip
                        key={task.id}
                        label={`${task.id}: Open-Science ${ours}, ${rival.name} ${theirs}, ${outcomeText[outcome]}`}
                        className={`h2h-cell ${outcome}`}
                        content={
                          <>
                            <strong className="text-white">
                              {task.id} · {task.title}
                            </strong>
                            <div className="mt-1">
                              Open-Science <b className="font-mono text-[#afd670]">{ours}</b> ·{' '}
                              {rival.name} <b className="font-mono">{theirs}</b>
                            </div>
                          </>
                        }
                      >
                        {task.id}
                      </Tip>
                    )
                  })}
                </span>
              ))}
              <span className="h2h-score">
                <b>{result.wins}</b>–{result.ties}–{result.losses}
              </span>
            </div>
          )
        })}
      </section>
    </TooltipProvider>
  )
}
