import { BarChart, QueryTypes, ScholarComparison } from './benchmark-charts'
import { LeaderboardTable, RecordsTable } from './benchmark-records'

export function LiteraturePanel() {
  return (
    <>
      <div className="col">
        <h2>{'AstaBench: literature search and synthesis'}</h2>
        <p>
          {
            'AstaBench, from Ai2, spans literature understanding, code execution, data analysis and scientific discovery across 11 sub-benchmarks and more than 2,400 samples. We have now run six of them. Four test literature understanding: two retrieval tasks that test whether an agent can find the work a research question depends on, LitQA2-FullText, which asks it to answer the question itself, and ScholarQA-CS2, which tests whether it can turn that literature into a cited answer. CORE-Bench-Hard and DiscoveryBench, '
          }
          <a href="#astabench-more">{'covered in the next tab'}</a>
          {', move from reading to running code and analysing data.'}
        </p>
        <p>
          {"The LitQA2 test-split run uses Open-Science's "}
          <strong>{'literature-retrieval agent'}</strong>
          {
            ", a plugin built on the workbench's own literature tooling: reference resolution and metadata enrichment, open-access full-text retrieval, full-text search across the papers it reads, and citation discovery through Semantic Scholar. It is the same Literature Library a researcher uses inside the app."
          }
        </p>
      </div>
      <div className="pair">
        <section className="cell">
          <div className="cell-text">
            <h3>{'LitQA2-FullText-Search'}</h3>
            <p>
              {
                'The agent receives a research question and must find the paper that contains the answer. A question counts as solved when the target paper appears among the top 30 results returned, so the metric, recall@30, measures how well the agent locates literature. We report two runs: one on the '
              }
              <strong>{'official 75-question test split'}</strong>
              {
                ', the same questions every published test record answers, and an earlier three-repeat run on the 10-question validation split.'
              }
            </p>
            <p>
              {'On the test split, Open-Science with GPT-6 Astra finds the target paper for '}
              <strong>{'68 of 75 questions (90.67%)'}</strong>
              {'. That '}
              <strong>{'ties the highest score'}</strong>
              {
                " among the 26 published test records, held by Ai2's purpose-built search systems Asta Paper Finder and Asta v0, and is 4 points above the strongest general-purpose agent baseline, ReAct with Claude Opus 4.6 or Sonnet 4.6 (86.67%). On the validation split it finds all 10 targets (100%), 20 points above the best public validation record (80%). Recall@30 measures whether the target paper was found; it is not question-answering accuracy."
              }
            </p>
          </div>
          <figure>
            <BarChart kind="litqa" />
            <figcaption>
              <b>{'Figure 2.'}</b>
              {
                'Every LitQA2-FullText-Search record we compiled. The chart opens on All, ordered by score. The Test view compares Open-Science with the 26 published records on the same 75 questions; Validation shows the four 10-question validation records. Hover a bar for models, cost per question and date.'
              }
            </figcaption>
          </figure>
        </section>
        <section className="cell">
          <div className="cell-text">
            <h3>{'PaperFinding'}</h3>
            <p>
              {
                'PaperFinding asks for a set of papers that satisfies a request: a research topic, clues pointing to a specific paper, or metadata such as author and year. The score combines the precision and coverage of the returned set, which makes it closer to real literature gathering than single-paper lookup. We ran the '
              }
              <strong>{'66-question validation split'}</strong>
              {
                ': 48 semantic, 10 specific-paper and 8 metadata queries. The public records below use a separate 267-question test split.'
              }
            </p>
            <p>
              {'Open-Science scores '}
              <strong>{'0.4554'}</strong>
              {
                ' out of 1. That is about 0.069 above the best public validation result we compiled (0.3862) and 0.015 above the top public test record, RoboPhD (2) at 0.4403. Because the validation and test splits contain different questions, the second gap should not be read as a same-split lead.'
              }
            </p>
          </div>
          <figure>
            <BarChart kind="pf" />
            <figcaption>
              <b>{'Figure 3.'}</b>
              {
                "Open-Science's local validation result and all 33 public test records. Different submissions from the same system are kept as separate rows; hover a bar for models and submission date."
              }
            </figcaption>
          </figure>
        </section>
      </div>
      <div className="col">
        <p>
          {
            'Broken down by query type, specific-paper and metadata queries are already strong. Semantic queries, which make up most of the split, are where the most headroom remains.'
          }
        </p>
      </div>
      <figure>
        <div className="chart">
          <div className="ch-top">
            <div className="ch-title">PaperFinding by query type</div>
            <div className="ch-sub">
              Open-Science score per query type, validation split, 66 questions
            </div>
          </div>
          <QueryTypes />
        </div>
        <figcaption>
          <b>{'Figure 4.'}</b>
          {'Score by query type. Ring fill is the score out of 1.'}
        </figcaption>
      </figure>
      <div className="col" id="litqa-qa">
        <span className="kicker">{'New · November 2026'}</span>
        <h3>{'LitQA2-FullText: answer the question, not only find the paper'}</h3>
        <p>
          {
            'LitQA2-FullText uses the same kind of research question as the search task above, but the agent must go one step further: retrieve and read the literature, tell apart experimental conditions, extract the specific result, and choose the correct option from a fixed set. We ran the '
          }
          <strong>{'official 75-question test split'}</strong>
          {
            ' of AstaBench v0.5.4, and every question has a final score. Answers are scored by the official score_litqa2 program, which parses the chosen option and compares it with the gold answer; no LLM judge is involved.'
          }
        </p>
        <p>
          {'Open-Science with DeepSeek Flash at Max reasoning effort answers '}
          <strong>{'70 of 75 questions correctly (93.33%)'}</strong>
          {
            '. That is 2.67 points above the highest official record in the 28 October 2026 snapshot, ReAct with claude-opus-4-6 (90.67%), and above all 28 official records, including research assistants such as FutureHouse Falcon and Perplexity Sonar Deep Research. Accuracy counts whether the chosen option matches the gold answer; it does not separately score citation quality or the completeness of the evidence.'
          }
        </p>
      </div>
      <div className="split2">
        <figure>
          <BarChart kind="lqf" />
          <figcaption>
            <b>{'Figure 5.'}</b>
            {
              "Open-Science's local run and all 28 official LitQA2-FullText test records, on the same 75 questions. Multi-model systems show their first model; hover a bar for the full list."
            }
          </figcaption>
        </figure>
        <div className="callout-block">
          <div className="chart callout">
            <div className="ch-title">{'Two LitQA2 tasks, two numbers'}</div>
            <div className="big">
              {'93.33%'}
              <small>{'+2.67 pts'}</small>
            </div>
            <dl>
              <dt>{'LitQA2-FullText · answer accuracy'}</dt>
              <dd>
                {
                  'Did the agent pick the right option? 70 of 75 on the official test split, with DeepSeek Flash at Max effort.'
                }
              </dd>
              <dt>{'LitQA2-FullText-Search · recall@30'}</dt>
              <dd>
                {
                  'Did the target paper appear in the top 30 results? 68 of 75 (90.67%) on the same split, with GPT-6 Astra and the literature-retrieval agent.'
                }
              </dd>
              <dt>{'Same questions, different metrics'}</dt>
              <dd>
                {
                  'The two tasks share a question bank but are separate leaderboards with different metrics and models, so the numbers are not added or averaged.'
                }
              </dd>
            </dl>
          </div>
          <div className="chart-caption">
            {
              'Both LitQA2 runs use the official 75-question test split, so each is compared with records that answered the same questions.'
            }
          </div>
        </div>
      </div>
      <div className="col">
        <h3 id="sqa">{'ScholarQA-CS2: a cited answer to a research question'}</h3>
        <p>
          {
            'ScholarQA-CS2 gives the agent a research question and asks for a written answer built from the literature: find the relevant papers, synthesise the evidence, and back each claim with an accurate citation. The grader combines four quality measures into one composite score out of 1, rewarding answers that cover the key points, cite sources that actually support the claims attached to them, and draw no conclusions beyond the evidence. We ran Open-Science with DeepSeek v4-flash locally on the '
          }
          <strong>{'100-question validation split'}</strong>
          {'.'}
        </p>
        <p>
          {'Open-Science scores '}
          <strong>{'0.9289'}</strong>
          {
            ', the highest value among the 42 records we compiled. The best official test record, Asta Scholar QA (w/ tables), scores 0.9192, a numerical gap of 0.0097, just under one point on a 100-point scale. Because our run uses the validation split and the official records use the test split, we present this as a reference comparison rather than a head-to-head ranking. The score is a composite quality measure, not the share of questions answered completely correctly.'
          }
        </p>
      </div>
      <div className="split2">
        <figure>
          <BarChart kind="sqa" />
          <figcaption>
            <b>{'Figure 6.'}</b>
            {
              "Open-Science's validation result and all 41 official ScholarQA-CS2 test records. Separate submissions from the same system are kept as separate rows; hover a bar for the model."
            }
          </figcaption>
        </figure>
        <figure>
          <ScholarComparison zoom />
          <figcaption>
            <b>{'Figure 7.'}</b>
            {
              'The top of the field on a zoomed axis that starts at 0.84, so the gaps between leading records are visible. Two records tie at 0.8663.'
            }
          </figcaption>
        </figure>
      </div>
      <div className="split2">
        <figure>
          <ScholarComparison />
          <figcaption>
            <b>{'Figure 8.'}</b>
            {
              'Open-Science alongside the named research assistants in the official records, on the full 0–1 scale. Open-Science is scored on the validation split, the others on the official test split.'
            }
          </figcaption>
        </figure>
        <div className="callout-block">
          <div className="chart callout">
            <div className="ch-title">{'How to read 0.9289'}</div>
            <div className="big">
              {'0.9289'}
              <small>{'+0.0097'}</small>
            </div>
            <dl>
              <dt>{'A composite quality score'}</dt>
              <dd>
                {
                  'Four quality measures combined into one score out of 1. It is not the percentage of questions answered completely correctly.'
                }
              </dd>
              <dt>{'100 validation questions, local run'}</dt>
              <dd>
                {
                  'Open-Science with DeepSeek v4-flash, evaluated locally and not yet submitted to the official leaderboard.'
                }
              </dd>
              <dt>{'Official records use the test split'}</dt>
              <dd>
                {
                  'Different questions, so the 0.0097 gap over Asta Scholar QA (w/ tables) is a reference comparison.'
                }
              </dd>
            </dl>
          </div>
          <div className="chart-caption">
            ScholarQA-CS2 measures cited-answer quality; the gap to official test records is a
            cross-split reference, not a head-to-head lead.
          </div>
        </div>
      </div>
      <details className="records">
        <summary>
          {'LitQA2-FullText-Search · official test records '}
          <small>{'27 records with models, cost per question, date and official logs'}</small>
        </summary>
        <div className="tbl-wrap">
          <RecordsTable kind="litqa" />
        </div>
        <div className="tnote">
          {
            'Ranks follow the published records; tied scores share a rank. The cost of the local Open-Science run was not standardized against the published setup, so this table does not support a cost-efficiency comparison.'
          }
        </div>
      </details>
      <details className="records">
        <summary>
          {'LitQA2-FullText · official test records '}
          <small>{'29 records: Open-Science and 28 official test records'}</small>
        </summary>
        <div className="tbl-wrap">
          <LeaderboardTable kind="lqf" />
        </div>
        <div className="tnote">
          {
            'Official snapshot of 28 October 2026; accuracy converted to percentages and rounded to two decimals. Official ranks are derived among official records only; tied scores share a rank. The You.com Research API record has no cost data and no disclosed model.'
          }
        </div>
      </details>
      <details className="records">
        <summary>
          {'ScholarQA-CS2 · all records '}
          <small>{'42 records: Open-Science validation and 41 official test records'}</small>
        </summary>
        <div className="tbl-wrap">
          <RecordsTable kind="sqa" />
        </div>
        <div className="tnote">
          {
            'Open-Science is scored on the 100-question validation split; all other records on the official test split. Where the official record leaves the model field empty it is shown as not disclosed.'
          }
        </div>
      </details>
    </>
  )
}
