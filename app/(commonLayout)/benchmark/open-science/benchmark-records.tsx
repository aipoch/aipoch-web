import {
  type BenchmarkRecord,
  coreBench,
  discovery,
  filterRecords,
  litqa,
  litqaFull,
  replayLabel,
  sqa,
  suiteAgents,
  suiteResults,
  suiteTasks,
  tbScience
} from './benchmark-results'

const officialLogs =
  'https://huggingface.co/datasets/allenai/asta-bench-submissions/tree/main/1.0.0-dev1/test/'

export function RecordsTable({ kind }: { kind: 'litqa' | 'sqa' }) {
  const isLitqa = kind === 'litqa'
  const records = filterRecords(isLitqa ? litqa : sqa, isLitqa ? 'test' : 'all')
  return (
    <table className="tbl" id={`tbl-${kind}`}>
      <caption className="sr-only">
        {isLitqa ? 'LitQA2 official test records' : 'ScholarQA-CS2 all records'}
      </caption>
      <thead>
        <tr>
          {(isLitqa
            ? ['Rank', 'Agent', 'Models', 'Recall@30', 'USD / question', 'Date', 'Source']
            : ['#', 'Agent', 'Model', 'Score', 'Split']
          ).map((label) => (
            <th key={label} scope="col">
              {label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {records.map((record, index) => {
          const rank = 1 + records.filter((other) => other.score - record.score > 0.000001).length
          const tied =
            records.filter((other) => Math.abs(other.score - record.score) < 0.000001).length > 1
          return (
            <tr key={record.id} className={record.group === 'aipoch' ? 'me' : undefined}>
              <td>{isLitqa ? `${tied ? 'T' : ''}${rank}` : index + 1}</td>
              <td>{record.system}</td>
              <td className="mdl">{record.model}</td>
              <td className="num">
                {record.score.toFixed(isLitqa ? 2 : 4)}
                {isLitqa ? '%' : ''}
                {isLitqa && record.group === 'aipoch' ? ' (68/75)' : ''}
              </td>
              {isLitqa ? (
                <>
                  <td className="num">
                    {record.cost === undefined ? '—' : `$${record.cost.toFixed(3)}`}
                  </td>
                  <td className="num">{record.date ?? '—'}</td>
                  <td>
                    {record.group === 'aipoch' ? (
                      'Local run'
                    ) : record.log ? (
                      <a
                        href={`${officialLogs}${record.log}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Official log
                      </a>
                    ) : (
                      'Official record'
                    )}
                  </td>
                </>
              ) : (
                <td>{record.source === 'val' ? 'Validation, 100 q. · local' : 'Official test'}</td>
              )}
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

const leaderboards: Record<
  'lqf' | 'core' | 'disc' | 'tbs',
  {
    records: BenchmarkRecord[]
    caption: string
    metric: string
    percent: boolean
    ours: string
    official: string
  }
> = {
  lqf: {
    records: litqaFull,
    caption: 'LitQA2-FullText official test records',
    metric: 'Accuracy',
    percent: true,
    ours: 'Local run · 70/75',
    official: 'Official test'
  },
  core: {
    records: coreBench,
    caption: 'CORE-Bench-Hard official test records',
    metric: 'Accuracy',
    percent: true,
    ours: 'Local run · 36/37',
    official: 'Official test'
  },
  disc: {
    records: discovery,
    caption: 'DiscoveryBench records',
    metric: 'Score',
    percent: false,
    ours: 'Local · validation, 25 tasks',
    official: 'Official test'
  },
  tbs: {
    records: tbScience,
    caption: 'Terminal-Bench-Science 0.1 records',
    metric: 'Pass rate',
    percent: true,
    ours: 'Local run · 145/210',
    official: 'Official leaderboard'
  }
}

/** Official ranks are derived among official records only; the local row is never ranked. */
export function LeaderboardTable({ kind }: { kind: keyof typeof leaderboards }) {
  const { records, caption, metric, percent, ours, official } = leaderboards[kind]
  const sorted = filterRecords(records, 'all')
  const others = sorted.filter((record) => record.group !== 'aipoch')
  return (
    <table className="tbl" id={`tbl-${kind}`}>
      <caption className="sr-only">{caption}</caption>
      <thead>
        <tr>
          {['Official rank', 'Agent', 'Model', metric, 'Source'].map((label) => (
            <th key={label} scope="col">
              {label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {sorted.map((record) => {
          const isOurs = record.group === 'aipoch'
          const rank =
            record.rank ??
            1 + others.filter((other) => other.score - record.score > 0.000001).length
          const tied =
            record.rank === undefined &&
            others.filter((other) => Math.abs(other.score - record.score) < 0.000001).length > 1
          return (
            <tr key={record.id} className={isOurs ? 'me' : undefined}>
              <td>{isOurs ? 'Local' : `${tied ? 'T' : ''}${rank}`}</td>
              <td>{record.system}</td>
              <td className="mdl">{record.model}</td>
              <td className="num">
                {record.score.toFixed(percent ? 2 : 4)}
                {percent ? '%' : ''}
              </td>
              <td>{isOurs ? ours : official}</td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

export function SuiteTaskTable() {
  return (
    <table className="tbl" id="tbl-suite">
      <caption className="sr-only">Research tasks, source papers and every score</caption>
      <thead>
        <tr>
          <th scope="col">Task</th>
          <th scope="col">Study</th>
          {suiteAgents.map((agent) => (
            <th scope="col" key={agent.id}>
              {agent.name.replace('AIPOCH ', '')}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {suiteTasks.map((task, index) => (
          <tr key={task.id}>
            <td>
              {task.id}
              <small className="tbl-sub">{task.domain}</small>
            </td>
            <td className="mdl">
              {task.title}
              <small className="tbl-sub">
                <a href={`https://doi.org/${task.doi}`} target="_blank" rel="noopener noreferrer">
                  doi:{task.doi}
                </a>
                {` · task v${task.version}`}
              </small>
            </td>
            {suiteAgents.map((agent) => {
              const [score, replay] = suiteResults[agent.id][index]
              return (
                <td
                  key={agent.id}
                  className={`num${agent.id === 'aipoch' ? ' me-col' : ''}`}
                  title={`Replay: ${replayLabel(replay)}`}
                >
                  {score}
                  <small className="tbl-sub">{replayLabel(replay)}</small>
                </td>
              )
            })}
          </tr>
        ))}
      </tbody>
    </table>
  )
}
