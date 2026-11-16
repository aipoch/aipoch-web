import type { ReactNode } from 'react'
import {
  type BenchmarkRecord,
  b1,
  b2,
  b3,
  b4,
  coreBench,
  filterRecords,
  litqa,
  litqaFull,
  suiteAgents,
  suiteHeadToHead,
  suiteMeans,
  tbScience
} from './benchmark-results'
import { TabLink } from './benchmark-tabs'

type Basis = 'same' | 'model' | 'cross' | 'na'

const basisText: Record<Basis, string> = {
  same: 'Same questions as the leaderboard',
  model: 'Same model, same tasks, run locally',
  cross: 'Cross-split reference',
  na: 'Not comparable'
}

/** Every test in research-stage order, with the outcome against its comparable reference. */
const tests: { name: string; result: string; basis: Basis; stage: number }[] = [
  { name: 'LitQA2 search', result: 'Tied 1st', basis: 'same', stage: 1 },
  { name: 'PaperFinding', result: '1st', basis: 'same', stage: 1 },
  { name: 'LitQA2 QA', result: '1st', basis: 'same', stage: 2 },
  { name: 'ScholarQA-CS2', result: 'Highest', basis: 'cross', stage: 2 },
  { name: 'CORE-Bench-Hard', result: '1st', basis: 'same', stage: 3 },
  // The soft hyphen lets the long name wrap cleanly inside a narrow tile.
  { name: 'Discovery\u00adBench', result: 'Not ranked', basis: 'na', stage: 3 },
  { name: 'TB-Science', result: '1st', basis: 'same', stage: 4 },
  { name: 'ASI-Bench B1', result: '1st', basis: 'model', stage: 4 },
  { name: 'ASI-Bench B2', result: '1st', basis: 'model', stage: 4 },
  { name: 'ASI-Bench B3', result: '1st', basis: 'model', stage: 4 },
  { name: 'ASI-Bench B4', result: '1st', basis: 'model', stage: 4 },
  { name: 'Paper-scale', result: '1st of 4', basis: 'model', stage: 5 }
]

export function HeadlineBand() {
  const comparable = tests.filter((test) => test.basis !== 'na')
  const leads = comparable.filter((test) => test.result !== 'Not ranked')
  const bases = (['same', 'model', 'cross', 'na'] as const).map((basis) => ({
    basis,
    count: tests.filter((test) => test.basis === basis).length
  }))
  return (
    <section className="headline" aria-labelledby="headline-title">
      <div className="headline-claim">
        <span className="kicker">{'At a glance · 12 tests'}</span>
        <h2 id="headline-title">{'One research agent, first across the research process'}</h2>
        <div className="headline-score">
          <span className="headline-big">
            {leads.length}
            <small>{`/ ${comparable.length}`}</small>
          </span>
          <p>
            {
              'tests with a comparable reference where Open-Science scores highest or ties for highest among the records we compiled.'
            }
            <sup>
              <a href="#n1">{'1'}</a>
            </sup>
          </p>
        </div>
      </div>
      <div className="headline-evidence">
        <ol className="verdicts" aria-label="Result of each test, in research-stage order">
          {tests.map((test) => (
            <li
              key={test.name}
              className={`verdict ${test.basis}`}
              title={`${test.name.replace('\u00ad', '')}: ${test.result} · ${basisText[test.basis]}`}
            >
              <span className="verdict-r">{test.result}</span>
              <span className="verdict-n">{test.name}</span>
            </li>
          ))}
        </ol>
        <ul className="verdict-key">
          {bases.map(({ basis, count }) => (
            <li key={basis}>
              <i className={`verdict-swatch ${basis}`} />
              <b>{count}</b> {basisText[basis].toLowerCase()}
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

/** Every listed record as a dot on one axis; Open-Science is the large green dot. */
function FieldStrip({
  records,
  max,
  label
}: {
  records: { score: number; ours: boolean }[]
  max: number
  label: string
}) {
  return (
    <div className="field-strip" role="img" aria-label={label}>
      {records.map((record, index) => (
        <i
          key={index}
          className={record.ours ? 'ours' : undefined}
          style={{
            left: `${(record.score / max) * 100}%`,
            top: record.ours ? '50%' : `${50 + ((index % 3) - 1) * 22}%`
          }}
        />
      ))}
    </div>
  )
}

function rankOf(records: BenchmarkRecord[]) {
  const ours = records.find((record) => record.group === 'aipoch')
  const others = records.filter((record) => record.group !== 'aipoch')
  if (!ours) throw new Error('Missing Open-Science record')
  const above = others.filter((record) => record.score - ours.score > 0.000001).length
  const tied = others.some((record) => Math.abs(record.score - ours.score) < 0.000001)
  return {
    ours,
    total: records.length,
    label: `${tied ? 'Tied ' : ''}${above === 0 ? '1st' : `#${above + 1}`} of ${records.length}`,
    strip: records.map((record) => ({ score: record.score, ours: record === ours }))
  }
}

type Stage = {
  verb: string
  question: string
  tab: string
  tabLabel: string
  metric: string
  value: string
  rank: ReturnType<typeof rankOf>
  max: number
  lead: string
  note?: string
  secondary: ReactNode
  highlight?: boolean
}

function AsiLevels() {
  return (
    <span className="asi-levels">
      {[b1, b2, b3, b4].map((rows, index) => {
        const ours = rows[0].score
        const codex = rows[1].score
        return (
          <span key={rows[0].id}>
            <small>{`B${index + 1}`}</small>
            <b>{ours.toFixed(2)}</b>
            <em>{`+${(ours - codex).toFixed(2)}`}</em>
          </span>
        )
      })}
    </span>
  )
}

export function ResearchPipeline() {
  const suite = suiteAgents.map((agent) => ({
    ...agent,
    score: suiteMeans(agent.id).overall
  }))
  const suiteRecords: BenchmarkRecord[] = suite.map((agent) => ({
    id: `suite-${agent.id}`,
    system: agent.name,
    model: agent.model,
    score: agent.score,
    source: 'local',
    group: agent.id === 'aipoch' ? 'aipoch' : 'other'
  }))
  const vsCodex = suiteHeadToHead('codex')
  const clinical = suiteMeans('aipoch').clinical
  const stages: Stage[] = [
    {
      verb: 'Find',
      question: 'Can it locate the papers a research question depends on?',
      tab: 'literature',
      tabLabel: 'Literature',
      metric: 'LitQA2 search · official test',
      value: '90.67%',
      rank: rankOf(filterRecords(litqa, 'test')),
      max: 100,
      lead: 'ties Asta Paper Finder',
      note: '100% on the validation split',
      secondary: (
        <>
          <span className="sec-n">{'PaperFinding'}</span>
          <b>{'0.4554'}</b>
          <em>{'+0.069 vs best public val.'}</em>
        </>
      )
    },
    {
      verb: 'Read',
      question: 'Can it answer from the papers and write a cited synthesis?',
      tab: 'literature',
      tabLabel: 'Literature',
      metric: 'LitQA2-FullText · official test',
      value: '93.33%',
      rank: rankOf(litqaFull),
      max: 100,
      lead: '+2.67 over best official',
      secondary: (
        <>
          <span className="sec-n">{'ScholarQA-CS2'}</span>
          <b>{'0.9289'}</b>
          <em>{'+0.0097, cross-split'}</em>
        </>
      )
    },
    {
      verb: 'Reproduce',
      question: 'Can it rerun a published study and recover its results?',
      tab: 'reproduction',
      tabLabel: 'Reproduction & data',
      metric: 'CORE-Bench-Hard · official test',
      value: '97.30%',
      rank: rankOf(coreBench),
      max: 100,
      lead: '+2.70 over best official',
      secondary: (
        <>
          <span className="sec-n">{'DiscoveryBench'}</span>
          <b>{'0.7467'}</b>
          <em>{'validation subset, not ranked'}</em>
        </>
      )
    },
    {
      verb: 'Execute',
      question: 'Can it carry out a research workflow with less and less guidance?',
      tab: 'execution',
      tabLabel: 'Research execution',
      metric: 'Terminal-Bench-Science 0.1',
      value: '69.05%',
      rank: rankOf(tbScience),
      max: 100,
      lead: '+0.95 over Codex, same model',
      secondary: (
        <>
          <span className="sec-n">{'ASI-Bench B1–B4 vs Codex, same model'}</span>
          <AsiLevels />
        </>
      )
    },
    {
      verb: 'Complete',
      question: 'Can it take a published study from data to conclusion, end to end?',
      tab: 'research',
      tabLabel: 'Paper-scale research',
      metric: 'Ten published studies · mean of 100',
      value: suiteMeans('aipoch').overall.toFixed(1),
      rank: rankOf(suiteRecords),
      max: 100,
      lead: '+1.6 over Codex, same model',
      secondary: (
        <>
          <span className="sec-n">{'Clinical mean · vs Codex by task'}</span>
          <b>{clinical.toFixed(1)}</b>
          <em>{`${vsCodex.wins} wins, ${vsCodex.ties} tie, ${vsCodex.losses} losses`}</em>
        </>
      ),
      highlight: true
    }
  ]
  return (
    <section className="pipeline" aria-labelledby="pipeline-title">
      <div className="pipeline-head">
        <h3 id="pipeline-title">{'Across the research process'}</h3>
        <p>
          {
            'Each stage leads with its headline test. Dots are every record on that leaderboard; the green dot is Open-Science.'
          }
        </p>
      </div>
      <ol className="stages">
        {stages.map((stage, index) => (
          <li key={stage.verb} className={`stage${stage.highlight ? ' highlight' : ''}`}>
            <span className="stage-node" aria-hidden="true">
              {String(index + 1).padStart(2, '0')}
            </span>
            <div className="stage-verb">{stage.verb}</div>
            <p className="stage-q">{stage.question}</p>
            <div className="stage-primary">
              <span className="stage-metric">{stage.metric}</span>
              <span className="stage-value">{stage.value}</span>
              <span className="stage-rank">{stage.rank.label}</span>
              <FieldStrip
                records={stage.rank.strip}
                max={stage.max}
                label={`${stage.metric}: Open-Science ${stage.value}, ${stage.rank.label}`}
              />
              <span className="stage-lead">{stage.lead}</span>
              {stage.note && <span className="stage-note">{stage.note}</span>}
            </div>
            <div className="stage-secondary">{stage.secondary}</div>
            <TabLink to={stage.tab} className="stage-go">
              {`${stage.tabLabel} →`}
            </TabLink>
          </li>
        ))}
      </ol>
    </section>
  )
}
