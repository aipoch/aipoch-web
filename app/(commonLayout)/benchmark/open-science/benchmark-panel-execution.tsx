import {
  AttemptWaffle,
  BarChart,
  DistractorChart,
  GuidanceChart,
  GuidanceLadder,
  SwarmChart
} from './benchmark-charts'
import { LeaderboardTable } from './benchmark-records'

export function ExecutionPanel() {
  return (
    <>
      <div className="col">
        <h2>{'ASI-Bench: research execution'}</h2>
        <p>
          {
            'ASI-Bench contains 60 project-level research tasks across 11 disciplines. Each task is a small research project: the agent has to process data, write and run code, and deliver results that can be checked. Levels B1 to B4 keep the same task and progressively withdraw guidance, so the gap between levels shows how much an agent depends on being told what to do.'
          }
        </p>
        <p>
          {
            'All ASI-Bench scores are task-quality scores out of 100, not the share of tasks fully correct. Our runs use the locally available task set while the public leaderboard uses the official one, so our '
          }
          <strong>
            {'primary comparison is Codex run locally with the same model (GPT-6 Astra)'}
          </strong>
          {', with public leaderboard records as secondary context.'}
        </p>
      </div>
      <figure>
        <div className="chart">
          <div className="ch-top">
            <div className="ch-title">Four levels of guidance</div>
            <div className="ch-sub">what the task statement gives the agent at each level</div>
          </div>
          <GuidanceLadder />
        </div>
        <figcaption>
          <b>{'Figure 13.'}</b>
          {
            "The ASI-Bench guidance levels. Blue squares are given, open squares are withheld, orange squares are distractors added. Scores are Open-Science's."
          }
        </figcaption>
      </figure>
      <figure>
        <GuidanceChart />
        <figcaption>
          <b>{'Figure 14.'}</b>
          {
            "Open-Science, Codex run locally with the same model, and the best public leaderboard record at each level. Numbers to the right are Open-Science's lead over local Codex."
          }
        </figcaption>
      </figure>
      <figure>
        <SwarmChart kind="asi" />
        <figcaption>
          <b>{'Figure 15.'}</b>
          {
            'The full ASI-Bench field at each level. Every dot is one record; the dashed line marks local Codex with GPT-6 Astra. Hover a dot for details.'
          }
        </figcaption>
      </figure>
      <div className="pair quad">
        <section className="cell">
          <div className="cell-text">
            <h3>{'B1: execute a complete protocol'}</h3>
            <p>
              {
                'The task gives the research background, the specified method, the formulas and every step. The agent has to implement the protocol as a running program, compute the results and deliver them. B1 asks whether an agent can actually do the work once the route is fully mapped out. We ran three local repetitions; the reported score covers 59 scored tasks, since one of the 60 standard tasks was excluded after a grader fault.'
              }
            </p>
            <p>
              {'Open-Science with GPT-6 Astra scores '}
              <strong>{'79.35'}</strong>
              {
                ', 4.57 above Codex with the same model (74.78) and 7.06 above the best public record (Claude Code with Claude Opus 5, 72.29). A second Open-Science run with DeepSeek v4-flash scores 69.64 and is kept in the chart.'
              }
            </p>
          </div>
          <figure>
            <BarChart kind="b1" />
            <figcaption>
              <b>{'Figure 16.'}</b>
              {
                'All 24 B1 records. Repeated records for the same system and model are labelled record 1 and record 2.'
              }
            </figcaption>
          </figure>
        </section>
        <section className="cell">
          <div className="cell-text">
            <h3>{'B2: organise specified methods into a pipeline'}</h3>
            <p>
              {
                'The methods and constraints stay in the task, but the step-by-step plan is removed. The agent decides what to do first, how the methods connect and which implementation details to fill in, and must end with a pipeline that runs. We ran three local repetitions; the number of scored tasks was not recorded separately for this level.'
              }
            </p>
            <p>
              {'Open-Science scores '}
              <strong>{'56.11'}</strong>
              {' against 56.09 for local Codex, effectively '}
              <strong>{'parity'}</strong>
              {'. Both sit well above the best public record, Codex with GPT-5.6 Sol at 49.57.'}
            </p>
          </div>
          <figure>
            <BarChart kind="b2" />
            <figcaption>
              <b>{'Figure 17.'}</b>
              {'All 23 B2 records.'}
            </figcaption>
          </figure>
        </section>
        <section className="cell">
          <div className="cell-text">
            <h3>{'B3: choose the research method'}</h3>
            <p>
              {
                'Only the research goal, input data, constraints and deliverables remain; no method is specified. The agent must select an appropriate approach, design the workflow, run the analysis and validate the results. Open-Science and local Codex each completed three runs over all 60 tasks, and both scores are three-run means.'
              }
            </p>
            <p>
              {'Open-Science scores '}
              <strong>{'59.67'}</strong>
              {
                ', 1.55 above local Codex (58.12) and 8.07 above the best public record (51.60). It is also higher than our own B2 score: without being told the method, the agent did slightly better than when handed one.'
              }
            </p>
          </div>
          <figure>
            <BarChart kind="b3" />
            <figcaption>
              <b>{'Figure 18.'}</b>
              {'All 23 B3 records.'}
            </figcaption>
          </figure>
        </section>
        <section className="cell">
          <div className="cell-text">
            <h3>{'B4: autonomous research with distractors'}</h3>
            <p>
              {
                'B4 takes the B3 task and adds information that is factually correct but not needed to complete it. The agent must pick out what matters and keep the extra background from pulling the research off course. As in B3, both agents completed three runs over 60 tasks and we report the means.'
              }
            </p>
            <p>
              {'Open-Science scores '}
              <strong>{'59.46'}</strong>
              {', 4.01 above local Codex (55.45) and 9.05 above the best public record (50.41).'}
            </p>
          </div>
          <figure>
            <BarChart kind="b4" />
            <figcaption>
              <b>{'Figure 19.'}</b>
              {'All 23 B4 records.'}
            </figcaption>
          </figure>
        </section>
      </div>
      <div className="col">
        <p>
          {'Adding distractors cost Open-Science '}
          <strong>{'0.21 points'}</strong>
          {
            ' on average (59.67 to 59.46), against 2.67 points for local Codex (58.12 to 55.45). Across the field, most entries move by a few points in either direction. A near-flat mean says the two levels behave alike on average in this run; it does not mean that no individual task was affected.'
          }
        </p>
      </div>
      <figure>
        <DistractorChart />
        <figcaption>
          <b>{'Figure 20.'}</b>
          {
            'B3 to B4 for every entry that appears at both levels, ordered by B4 score. Open circles are B3, filled circles B4; the right column is the change.'
          }
        </figcaption>
      </figure>
      <div className="col" id="tbs">
        <span className="kicker">{'New · November 2026'}</span>
        <h2>{'Terminal-Bench-Science: scientific workflows in the terminal'}</h2>
        <p>
          {
            'Terminal-Bench-Science (TB-Science) is a benchmark of research workflows for AI agents, with tasks designed and reviewed by domain experts. Version 0.1 has '
          }
          <strong>{'70 tasks'}</strong>
          {
            ' across the life, physical, earth, mathematical and engineering sciences. The agent works with the data and tools it is given, carries out the computation and analysis, and must deliver a result that each task can verify on its own terms.'
          }
        </p>
        <p>
          {'Open-Science with GPT-6 Astra at max effort passes '}
          <strong>{'145 of 210 attempts (69.05%)'}</strong>
          {
            '. In the official leaderboard snapshot of 13 November 2026, the top entry is Codex with the same model at 68.10%, so the gap is '
          }
          <strong>{'0.95 points'}</strong>
          {
            ', and 5.72 points above Claude Code with Opus 5.5. With the model held constant, the difference reflects the harness, and on this benchmark it is small. Our run is local and has not been submitted.'
          }
        </p>
      </div>
      <figure>
        <div className="chart">
          <div className="ch-top">
            <div className="ch-title">{'What a TB-Science task asks for'}</div>
            <div className="ch-sub">{'five capabilities exercised across the 70 tasks'}</div>
          </div>
          <div className="skills">
            {[
              [
                '01',
                'Problem framing',
                'Understand the research goal and its constraints; choose a suitable analysis or solution method.'
              ],
              [
                '02',
                'Scientific programming',
                'Write and run code, using scientific computing tools to carry out the analysis.'
              ],
              [
                '03',
                'Data and inference',
                'Process research data, extract the signal and reach a justified statistical judgement.'
              ],
              [
                '04',
                'Modelling and simulation',
                'Fit models, run numerical simulations, calibrate parameters and solve optimisation problems.'
              ],
              [
                '05',
                'Verified delivery',
                'Check the computed results and hand over complete deliverables that the task can verify.'
              ]
            ].map(([key, title, text]) => (
              <div className="step" key={key}>
                <div className="k">{key}</div>
                <div className="t">{title}</div>
                <p>{text}</p>
              </div>
            ))}
          </div>
        </div>
        <figcaption>
          <b>{'Figure 21.'}</b>
          {'The scientific capabilities TB-Science tasks are designed to exercise.'}
        </figcaption>
      </figure>
      <div className="split2">
        <figure>
          <BarChart kind="tbs" />
          <figcaption>
            <b>{'Figure 22.'}</b>
            {
              "Open-Science's local run and all 17 official v0-1-eval leaderboard entries, snapshot of 13 November 2026, 10:55 Beijing time."
            }
          </figcaption>
        </figure>
        <figure>
          <AttemptWaffle />
          <figcaption>
            <b>{'Figure 23.'}</b>
            {
              'The 210 local attempts as counts. Squares are not mapped to individual tasks; the pass rate is passed attempts divided by all attempts.'
            }
          </figcaption>
        </figure>
      </div>
      <details className="records">
        <summary>
          {'Terminal-Bench-Science 0.1 · all records '}
          <small>{'18 records: Open-Science and 17 official leaderboard entries'}</small>
        </summary>
        <div className="tbl-wrap">
          <LeaderboardTable kind="tbs" />
        </div>
        <div className="tnote">
          {
            'Leaderboard ranks as published in the v0-1-eval snapshot; tied pass rates share a rank. Open-Science is a local run of the same 70 tasks and has not been submitted.'
          }
        </div>
      </details>
    </>
  )
}
