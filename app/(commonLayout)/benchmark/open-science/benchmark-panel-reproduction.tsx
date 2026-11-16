import { BarChart, DiscoveryDistribution, SwarmChart } from './benchmark-charts'
import { LeaderboardTable } from './benchmark-records'

export function ReproductionPanel() {
  return (
    <>
      <div className="col" id="astabench-more">
        <span className="kicker">{'New · November 2026'}</span>
        <h2>{'AstaBench: from reading to running'}</h2>
        <p>
          {
            'Two further AstaBench sub-benchmarks leave the literature behind. CORE-Bench-Hard asks whether an agent can reproduce the computational results of a published study; DiscoveryBench asks whether it can find a real pattern in a dataset it has never seen. Both runs use Open-Science with DeepSeek Flash.'
          }
        </p>
      </div>
      <div className="pair">
        <section className="cell">
          <div className="cell-text">
            <h3>{'CORE-Bench-Hard: reproduce a published result'}</h3>
            <p>
              {
                'The agent receives the code, data and README that accompany a published study. Inside a container it installs the dependencies, runs the analysis, reads the result off the generated tables or figures and writes it to report.json. The official programmatic grader checks every numeric, text or list answer; a task with several sub-questions earns its point only when all of them are right. We ran the '
              }
              <strong>{'official 37-task test split'}</strong>
              {' and every task has an official score.'}
            </p>
            <p>
              {'Open-Science answers '}
              <strong>{'36 of 37 tasks correctly (97.30%)'}</strong>
              {
                '. That is about 2.70 points above the best of the 25 scored official records, ReAct with gpt-5.4 (94.59%). The local figure is the per-task summary after re-running some tasks, which official submissions may not do; it has not been submitted to the leaderboard.'
              }
            </p>
          </div>
          <figure>
            <BarChart kind="core" />
            <figcaption>
              <b>{'Figure 9.'}</b>
              {
                "Open-Science's local run and the 25 scored official CORE-Bench-Hard test records. Four records score 0."
              }
            </figcaption>
          </figure>
        </section>
        <section className="cell">
          <div className="cell-text">
            <h3>{'DiscoveryBench: find the pattern in the data'}</h3>
            <p>
              {
                'Each task pairs a research goal in plain language with a real dataset and its column descriptions. The agent must read and clean the data, construct variables, fit models and state a testable hypothesis together with the workflow it actually ran. Nothing is retrieved and there are no options to choose from: the hypothesis is judged against the gold one.'
              }
            </p>
            <p>
              {'On '}
              <strong>{'25 tasks from the official validation split'}</strong>
              {', Open-Science scores a mean of '}
              <strong>{'0.7467'}</strong>
              {
                ', with 18 full scores and 5 zeros. We replicated the official five-step evaluation with its original prompts but used deepseek-v4-flash as the judge, while the leaderboard uses the full test split and gpt-4-1106-preview. '
              }
              <strong>{'The two are not directly comparable'}</strong>
              {', so the official records are shown for context only.'}
            </p>
          </div>
          <figure>
            <BarChart kind="disc" />
            <figcaption>
              <b>{'Figure 10.'}</b>
              {
                "Open-Science's validation-subset result beside the 30 official DiscoveryBench test records. Different split and judge: not a ranking."
              }
            </figcaption>
          </figure>
        </section>
      </div>
      <div className="split2">
        <figure>
          <DiscoveryDistribution />
          <figcaption>
            <b>{'Figure 11.'}</b>
            {
              'Per-task DiscoveryBench scores in the local run. Two tasks received partial credit (25 − 18 − 5); together the 25 scores average 0.7467.'
            }
          </figcaption>
        </figure>
        <div className="callout-block">
          <div className="chart callout">
            <div className="ch-title">{'Why 0.7467 is not a leaderboard position'}</div>
            <dl>
              <dt>{'Different questions'}</dt>
              <dd>
                {
                  '25 validation tasks drawn from four dataset groups, including NLSY79 body-mass index, immigration and offshoring effects on employment, and body-length evolution in South American freshwater fish. The leaderboard uses the full test split.'
                }
              </dd>
              <dt>{'A different judge'}</dt>
              <dd>
                {
                  'Hypotheses were judged by deepseek-v4-flash following the official new_eval.py procedure and prompts; official records use gpt-4-1106-preview.'
                }
              </dd>
              <dt>{'What it does show'}</dt>
              <dd>
                {
                  'A dedicated data-analysis specialist with seven skills, from exploratory analysis to statsmodels and JSON validation, completes most tasks fully with internet access and package installs disabled. A full-test run with the official judge is the next step.'
                }
              </dd>
            </dl>
          </div>
        </div>
      </div>
      <figure>
        <SwarmChart kind="asta" />
        <figcaption>
          <b>{'Figure 12.'}</b>
          {
            'Where Open-Science sits in each of the six AstaBench fields. Every dot is one listed record; open dots use the validation split, filled dots the test split. The LitQA2 search row shows both Open-Science runs: 90.67% on the official test split and 100% on validation. The DiscoveryBench row is not comparable (different split and judge). Hover a dot for details.'
          }
        </figcaption>
      </figure>
      <details className="records">
        <summary>
          {'CORE-Bench-Hard · official test records '}
          <small>{'26 records: Open-Science and the 25 scored official records'}</small>
        </summary>
        <div className="tbl-wrap">
          <LeaderboardTable kind="core" />
        </div>
        <div className="tnote">
          {
            'All official records were submitted by Ai2 except EvoScientist-Code, submitted by EvoScientist. The Open-Science figure includes re-runs of some tasks and has not been submitted.'
          }
        </div>
      </details>
      <details className="records">
        <summary>
          {'DiscoveryBench · all records '}
          <small>{'31 records: Open-Science validation subset and 30 official test records'}</small>
        </summary>
        <div className="tbl-wrap">
          <LeaderboardTable kind="disc" />
        </div>
        <div className="tnote">
          {
            'Official ranks are kept as published; rank 3 does not appear in the compiled snapshot. Official records use the full test split and the gpt-4-1106-preview judge; Open-Science uses 25 validation tasks and the deepseek-v4-flash judge, so the rows are not comparable.'
          }
        </div>
      </details>
    </>
  )
}
