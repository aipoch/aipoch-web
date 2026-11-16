export function MethodsPanel() {
  return (
    <>
      <div className="col" id="method">
        <h2>{'How we ran the evaluation'}</h2>
        <p>
          {
            'Each benchmark runs with its own tasks, grader and metric, and we report each in that metric rather than converting to a common scale. AIPOCH runs were repeated where noted and the reported value is the stated mean or result; the table below lists the exact scope of each run.'
          }
        </p>
      </div>
      <figure>
        <div className="tbl-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>{'Test'}</th>
                <th>{'Model'}</th>
                <th>{'Split / scope'}</th>
                <th>{'Runs'}</th>
                <th>{'Metric'}</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>{'LitQA2 · official test'}</td>
                <td>{'GPT-6 Astra, literature-retrieval agent'}</td>
                <td>{'Official test, 75 questions'}</td>
                <td>{'Local, 23 Oct 2026'}</td>
                <td>{'recall@30'}</td>
              </tr>
              <tr>
                <td>{'LitQA2 · validation'}</td>
                <td>{'DeepSeek v4-flash'}</td>
                <td>{'Validation, 10 questions'}</td>
                <td>{'3 local'}</td>
                <td>{'recall@30'}</td>
              </tr>
              <tr>
                <td>{'LitQA2-FullText'}</td>
                <td>{'DeepSeek Flash (deepseek-flash), Max'}</td>
                <td>{'Official test, 75 questions'}</td>
                <td>{'Local, 2 Nov 2026'}</td>
                <td>{'Accuracy, official score_litqa2'}</td>
              </tr>
              <tr>
                <td>{'PaperFinding'}</td>
                <td>{'DeepSeek v4-flash'}</td>
                <td>{'Validation, 66 questions (48 / 10 / 8)'}</td>
                <td>{'Local'}</td>
                <td>{'Combined score, 0–1'}</td>
              </tr>
              <tr>
                <td>{'ScholarQA-CS2'}</td>
                <td>{'DeepSeek v4-flash'}</td>
                <td>{'Validation, 100 questions'}</td>
                <td>{'Local'}</td>
                <td>{'Composite quality score, 0–1'}</td>
              </tr>
              <tr>
                <td>{'CORE-Bench-Hard'}</td>
                <td>{'DeepSeek Flash (deepseek-flash), max'}</td>
                <td>{'Official test, 37 tasks'}</td>
                <td>{'Local with re-runs, 6 Nov 2026'}</td>
                <td>{'Accuracy, official grader, 0 or 1 per task'}</td>
              </tr>
              <tr>
                <td>{'DiscoveryBench'}</td>
                <td>{'DeepSeek v4-flash, data-analysis specialist'}</td>
                <td>{'Validation subset, 25 tasks'}</td>
                <td>{'Local, 7 batches, 9 Nov 2026'}</td>
                <td>{'Hypothesis score 0–1, deepseek-v4-flash judge'}</td>
              </tr>
              <tr>
                <td>{'ASI-Bench B1'}</td>
                <td>{'GPT-6 Astra'}</td>
                <td>{'59 of 60 tasks scored'}</td>
                <td>{'3 local'}</td>
                <td>{'Task quality, 0–100'}</td>
              </tr>
              <tr>
                <td>{'ASI-Bench B2'}</td>
                <td>{'GPT-6 Astra'}</td>
                <td>{'Local task set'}</td>
                <td>{'3 local'}</td>
                <td>{'Task quality, 0–100'}</td>
              </tr>
              <tr>
                <td>{'ASI-Bench B3'}</td>
                <td>{'GPT-6 Astra'}</td>
                <td>{'60 tasks per run'}</td>
                <td>{'3 local, mean'}</td>
                <td>{'Task quality, 0–100'}</td>
              </tr>
              <tr>
                <td>{'ASI-Bench B4'}</td>
                <td>{'GPT-6 Astra'}</td>
                <td>{'60 tasks per run'}</td>
                <td>{'3 local, mean'}</td>
                <td>{'Task quality, 0–100'}</td>
              </tr>
              <tr>
                <td>{'Terminal-Bench-Science 0.1'}</td>
                <td>{'GPT-6 Astra, max'}</td>
                <td>{'70 tasks'}</td>
                <td>{'210 local attempts, 13 Nov 2026'}</td>
                <td>{'Pass rate, task verifiers'}</td>
              </tr>
              <tr>
                <td>{'Research tasks'}</td>
                <td>{'GPT-6.1 Sol, high (all but Claude Science)'}</td>
                <td>{'10 tasks: 5 B, 5 C'}</td>
                <td>{'1 sealed run each + replay'}</td>
                <td>{'Task score, 0–100'}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <figcaption>
          <b>{'Figure 27.'}</b>
          {
            'Scope of every AIPOCH run reported on this page. Local Codex baselines on ASI-Bench B1–B4 used the same model and task set; on the research tasks Codex and EvoScientist used the same model as Open-Science.'
          }
        </figcaption>
      </figure>
      <div className="col">
        <h2>{'Availability'}</h2>
        <p>
          {
            "Open-Science is AIPOCH's open-source harness for scientific research: model-agnostic, auditable and yours to run. Install the "
          }
          <a href="/open-science/download">{'desktop app'}</a>
          {', read the '}
          <a href="/docs/">{'documentation'}</a>
          {', or browse the source on '}
          <a href="https://github.com/aipoch/open-science">{'GitHub'}</a>
          {'. Medical research skills for the agent are available in the '}
          <a href="/agent-skills/list">{'Skills Hub'}</a>
          {', and every skill can be audited before deployment with '}
          <a href="/benchmark/medskillaudit">{'MedSkillAudit'}</a>
          {'.'}
        </p>
        <div className="notes">
          <h4>{'Notes'}</h4>
          <ol>
            <li id="n1">
              {
                'All AIPOCH Open-Science scores are local evaluation results, compiled on 19 October 2026 (PaperFinding, ASI-Bench, LitQA2 validation), 26 October 2026 (LitQA2-FullText-Search test, ScholarQA-CS2), 2 November 2026 (LitQA2-FullText), 6 November 2026 (CORE-Bench-Hard), 9 November 2026 (DiscoveryBench) and 13 November 2026 (Terminal-Bench-Science, research tasks). None has been submitted to an official leaderboard. The order of rows in each chart follows the listed scores and is not an official ranking. Comparison records are reproduced as compiled in our internal summaries, including separate submissions from the same system.'
              }
            </li>
            <li id="n2">
              {
                "AstaBench: the LitQA2-FullText-Search test run (23 October 2026) used Open-Science's literature-retrieval agent with GPT-6 Astra on the official 75-question test split and is compared with the 26 published test records. Validation runs: LitQA2 (10 questions, three local repeats), PaperFinding (66 questions) and ScholarQA-CS2 (100 questions). Published PaperFinding and ScholarQA-CS2 references mostly use test splits, so cross-split differences are for reference only. Best public validation results cited: LitQA2-FullText-Search 0.80 (Asta Paper Finder); PaperFinding 0.3862. The cost of local runs was not standardized, so no cost-efficiency comparison is made. LitQA2-FullText (AstaBench v0.5.4, official 75-question test split) is compared with the 28 official records in the 28 October 2026 snapshot; percentage gaps use unrounded question counts. CORE-Bench-Hard, labelled CORE-Bench-Hard⁻ in our internal summary, was run through Inspect on Windows with WSL Ubuntu 24.04 and Docker, using the official python_session tool and grader; the reported 36/37 includes re-runs of some tasks. DiscoveryBench used 25 tasks from the official validation split in seven batches, with notebook-based Python (pandas, statsmodels, pyreadstat), no internet access and no package installation; the official new_eval.py procedure was replicated locally with its original prompts and a deepseek-v4-flash judge."
              }
            </li>
            <li id="n3">
              {
                'ASI-Bench: AIPOCH and the local Codex baseline use the locally available task set; public leaderboard records use the official evaluation set. B1 excludes one task after a grader fault (59 scored). B3 and B4 report three-run means over 60 tasks for both agents.'
              }
            </li>
            <li id="n4">
              {
                'Terminal-Bench-Science 0.1: 210 local attempts over the 70 tasks with GPT-6 Astra at max effort; pass rate is passed attempts divided by all attempts. Official records come from the Harbor v0-1-eval leaderboard, snapshot of 13 November 2026, 10:55 Beijing time.'
              }
            </li>
            <li id="n5">
              {
                "Research tasks: ten tasks built from published studies (DOIs in the records table), one sealed run per agent per task, each followed by an independent replay. Open-Science 1.0.3 (0.37.1 on B19), Codex CLI 0.158.0 and EvoScientist v0.4.2 used GPT-6.1 Sol at high effort. Claude Science displayed Opus 5.5 (request alias claude-opus-4-8) with high effort and thinking enabled; the backend model was not independently verified. Group means weight the five tasks of each group equally. The tasks and scoring are AIPOCH's own and are not a public leaderboard."
              }
            </li>
          </ol>
          <h4>{'Citation'}</h4>
          <pre>
            {
              '@misc{aipoch2026openscience,\n  title        = {AIPOCH Open-Science: Benchmark Results on AstaBench, ASI-Bench and Terminal-Bench-Science},\n  author       = {{AIPOCH Research}},\n  year         = {2026},\n  month        = nov,\n  organization = {AIPOCH},\n  howpublished = {\\url{https://github.com/aipoch/open-science}}\n}'
            }
          </pre>
        </div>
      </div>
    </>
  )
}
