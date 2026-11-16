import { SuiteGroupChart, SuiteHeadToHead, SuiteHeatmap } from './benchmark-charts'
import { SuiteTaskTable } from './benchmark-records'
import { suiteHeadToHead, suiteHighlights, suiteMeans } from './benchmark-results'

/** Open-Science's strengths on the research tasks, all derived from the score matrix. */
function SuiteEdge() {
  const ours = suiteMeans('aipoch')
  const codex = suiteMeans('codex')
  const evo = suiteMeans('evo')
  const claude = suiteMeans('claude')
  const vsCodex = suiteHeadToHead('codex')
  const vsEvo = suiteHeadToHead('evo')
  const evoClinical = vsEvo.outcomes.slice(5).filter((outcome) => outcome === 'win').length
  const { floors, clinicalOutright, replaysPassed, perfect } = suiteHighlights()
  const cards = [
    {
      value: ours.overall.toFixed(1),
      title: 'Highest overall mean',
      text: `Ahead of Codex (${codex.overall.toFixed(1)}), EvoScientist (${evo.overall.toFixed(1)}) and Claude Science (${claude.overall.toFixed(1)}).`
    },
    {
      value: ours.clinical.toFixed(1),
      title: 'Leads clinical research',
      text: `+${(ours.clinical - codex.clinical).toFixed(1)} over Codex and +${(ours.clinical - evo.clinical).toFixed(1)} over EvoScientist; best outright on ${clinicalOutright} of 5 clinical studies.`
    },
    {
      value: `${vsCodex.wins}–${vsCodex.ties}–${vsCodex.losses}`,
      title: 'Against Codex, same model',
      text: `Higher on ${vsCodex.wins} of 10 tasks and tied on ${vsCodex.ties}, with GPT-6.1 Sol in both harnesses.`
    },
    {
      value: `${vsEvo.wins}–${vsEvo.ties}–${vsEvo.losses}`,
      title: 'Against EvoScientist, same model',
      text: `Higher on all ${evoClinical} clinical studies; EvoScientist's edge is confined to bioinformatics.`
    },
    {
      value: String(floors.aipoch),
      title: 'Highest floor',
      text: `Its weakest task still beats every rival's weakest: Codex ${floors.codex}, EvoScientist ${floors.evo}, Claude Science ${floors.claude}.`
    },
    {
      value: `${replaysPassed}/10`,
      title: 'Every replay passed',
      text: `All submissions re-ran from released inputs or passed consistency checks. The only perfect score in 40 runs: ${perfect.map((item) => item.task).join(', ')}.`
    }
  ]
  return (
    <section className="edge" aria-labelledby="edge-title">
      <div className="edge-head">
        <span className="kicker">{'Why it matters'}</span>
        <h3 id="edge-title">{'Where Open-Science stands out'}</h3>
      </div>
      <div className="edge-grid">
        {cards.map((card) => (
          <div className="edge-card" key={card.title}>
            <div className="edge-v">{card.value}</div>
            <div className="edge-t">{card.title}</div>
            <p>{card.text}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

export function ResearchPanel() {
  return (
    <>
      <div className="col" id="suite">
        <span className="kicker">{'New · November 2026'}</span>
        <h2>{'Paper-scale research: four agents, ten published studies'}</h2>
        <p>
          {
            'Public leaderboards rarely ask an agent to carry a whole study. For that we built ten research tasks from recently published papers: '
          }
          <strong>{'five in bioinformatics (B) and five in clinical research (C)'}</strong>
          {
            '. Each task releases the study data, a scientific question and an output contract. The agent must freeze an analysis plan before seeing the measurements, then deliver a research report, a key-results index, figures and a run_all.py that regenerates the principal results from the inputs in a clean directory, with scientific internet access disabled. Each submission is scored out of 100 on its scientific content; producing the right files earns no credit by itself. Every submission was then replayed independently.'
          }
        </p>
        <p>
          {
            'We ran four agents on the same ten tasks, one sealed run each. Open-Science, Codex and EvoScientist all used '
          }
          <strong>{'GPT-6.1 Sol at high effort'}</strong>
          {
            ', so their differences come from the harness. Claude Science ran with the model its interface displays as Opus 5.5; the backend model has not been independently verified.'
          }
        </p>
      </div>
      <SuiteEdge />
      <div className="split2">
        <figure>
          <SuiteGroupChart />
          <figcaption>
            <b>{'Figure 24.'}</b>
            {
              'Mean score by task group, each group weighted equally over its five tasks. The right column is the mean over all ten tasks. Hover a row for the harness and model.'
            }
          </figcaption>
        </figure>
        <figure>
          <SuiteHeadToHead />
          <figcaption>
            <b>{'Figure 25.'}</b>
            {
              'Each square is one task, compared with the same task for the named agent. Codex and EvoScientist ran the same model as Open-Science. Hover a square for both scores.'
            }
          </figcaption>
        </figure>
      </div>
      <figure>
        <SuiteHeatmap />
        <figcaption>
          <b>{'Figure 26.'}</b>
          {
            'All 40 scores. Rows are ordered by overall mean; a black outline marks the best score on a task, ties included. Corner marks show the independent replay: amber where it ran with table or auxiliary-file differences, red where it failed or produced no outputs. Hover a cell for the study and replay status.'
          }
        </figcaption>
      </figure>
      <div className="col">
        <p>
          <strong>{'Reading the matrix.'}</strong>
          {
            ' Open-Science is strongest where a study has to be carried through to a clinical conclusion: it wins four of the five clinical tasks outright, including the only perfect score (C04) and the widest single margin (C34, 90 against 83 and 76). The three GPT-6.1 Sol harnesses are close on bioinformatics, where EvoScientist leads the group by 1.0 point; single-cell and multi-omics workflows are where we are improving next. Claude Science trails by about fifty points, and seven of its ten replays failed or produced no outputs.'
          }
        </p>
        <p>
          <strong>{'Replays.'}</strong>
          {
            ' All ten Open-Science submissions passed their replay checks: seven re-executed from released inputs, two of them (B13 and B21) with some table differences, and C33 to C35 passed consistency checks. All ten Codex replays passed, three with minor differences: auxiliary files not rebuilt on B13 and C34 and a timing table on C33. All ten EvoScientist replays reproduced the main scientific results. For Claude Science, five replays exited with errors, one skipped seven steps because scripts were missing, one produced no new files, and three regenerated all or part of their outputs.'
          }
        </p>
      </div>
      <details className="records">
        <summary>
          {'Research tasks · studies and every score '}
          <small>{'10 tasks with source papers, task versions, scores and replay status'}</small>
        </summary>
        <div className="tbl-wrap">
          <SuiteTaskTable />
        </div>
        <div className="tnote">
          {
            'Scores are out of 100. Open-Science used version 1.0.3 except on B19, which used 0.37.1; seven of its runs come from an earlier sealed batch and C33 to C35 were run on Windows. Task versions are those of the released task statements.'
          }
        </div>
      </details>
    </>
  )
}
