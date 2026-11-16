import { HeadlineBand, ResearchPipeline } from './benchmark-overview-hero'
import { TabLink } from './benchmark-tabs'

const findings: { title: string; tab: string; text: string }[] = [
  {
    title: 'Literature retrieval',
    tab: 'literature',
    text: 'Matches the best published LitQA2 score for finding the target paper (90.67%), and answers 70 of 75 LitQA2-FullText questions correctly, 2.67 points above the best official record. Semantic topic search in PaperFinding is the clearest area for improvement.'
  },
  {
    title: 'Literature synthesis',
    tab: 'literature',
    text: 'Cited answers on ScholarQA-CS2 score 0.9289, the highest value among the records we compiled, above SciSpace Deep Review, Elicit, FutureHouse Crow and OpenAI Deep Research. Our run uses the validation split and theirs the test split.'
  },
  {
    title: 'Reproduction and discovery',
    tab: 'reproduction',
    text: 'Reproduces the reported results of 36 of 37 published studies on CORE-Bench-Hard, above every official record. The DiscoveryBench validation-subset mean of 0.7467 uses a different split and judge, so it is not compared.'
  },
  {
    title: 'Research execution',
    tab: 'execution',
    text: 'Ahead of Codex with the same model at all four ASI-Bench levels, most where the work is concrete (B1, +4.57) or cluttered (B4, +4.01), and level on B2 (+0.02). Above the top of the Terminal-Bench-Science leaderboard snapshot by 0.95 points.'
  },
  {
    title: 'Whole studies',
    tab: 'research',
    text: 'Highest overall and clinical means across ten paper-scale studies, the only perfect score in 40 runs, and every submission passed its replay check. EvoScientist leads the bioinformatics group by one point.'
  },
  {
    title: 'Same model, different harness',
    tab: 'methods',
    text: 'On ASI-Bench, Terminal-Bench-Science and the research tasks Open-Science ran the same model as another harness on the same tasks, so its lead, from parity on B2 to +4.57 on B1, comes from the harness.'
  }
]

const tabNames: Record<string, string> = {
  literature: 'Literature',
  reproduction: 'Reproduction & data',
  execution: 'Research execution',
  research: 'Paper-scale research',
  methods: 'Methods'
}

export function OverviewPanel() {
  return (
    <>
      <HeadlineBand />
      <ResearchPipeline />
      <figure>
        <div className="chart">
          <div className="ch-top">
            <div>
              <div className="ch-title">{'Twelve tests at a glance'}</div>
              <div className="ch-sub">
                {'what each test asks, and what our number is compared against'}
              </div>
            </div>
          </div>
          <div className="tbl-wrap" style={{ border: 0, padding: 0, background: 'none' }}>
            <table className="tbl glance">
              <thead>
                <tr>
                  <th>{'Test'}</th>
                  <th>{'Capability'}</th>
                  <th>{'Open-Science'}</th>
                  <th>{'Compared with'}</th>
                  <th>{'Margin'}</th>
                  <th>{'Basis'}</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>{'LitQA2 · official test'}</td>
                  <td>{'Find the paper that answers a research question'}</td>
                  <td className="m">{'90.67% (68/75)'}</td>
                  <td>{'Asta Paper Finder, Asta v0 · 90.67%'}</td>
                  <td className="tie">{'Tied 1st'}</td>
                  <td>
                    <span className="bdg same">{'Same split'}</span>
                  </td>
                </tr>
                <tr>
                  <td>{'LitQA2 · validation'}</td>
                  <td>{'Same task, 10-question validation split'}</td>
                  <td className="m">{'100% (10/10)'}</td>
                  <td>{'Asta Paper Finder · 80%'}</td>
                  <td className="tie">{'+20.0 pts'}</td>
                  <td>
                    <span className="bdg same">{'Same split'}</span>
                  </td>
                </tr>
                <tr>
                  <td>
                    {'LitQA2-FullText · official test'}
                    <span className="bdg new">{'New'}</span>
                  </td>
                  <td>{'Answer a research question from the literature'}</td>
                  <td className="m">{'93.33% (70/75)'}</td>
                  <td>{'ReAct · claude-opus-4-6 · 90.67%'}</td>
                  <td className="tie">{'+2.67 pts'}</td>
                  <td>
                    <span className="bdg same">{'Same split'}</span>
                  </td>
                </tr>
                <tr>
                  <td>{'PaperFinding'}</td>
                  <td>{'Retrieve an accurate, complete set of papers for a request'}</td>
                  <td className="m">{'0.4554 (66 q.)'}</td>
                  <td>{'Best public validation · 0.3862'}</td>
                  <td className="tie">{'+0.0692'}</td>
                  <td>
                    <span className="bdg same">{'Same split'}</span>
                  </td>
                </tr>
                <tr>
                  <td>{'ScholarQA-CS2'}</td>
                  <td>{'Answer a research question with a cited synthesis of the literature'}</td>
                  <td className="m">{'0.9289 (100 q.)'}</td>
                  <td>{'Asta Scholar QA (w/ tables) · 0.9192'}</td>
                  <td className="tie">{'+0.0097'}</td>
                  <td>
                    <span className="bdg cross">{'Cross-split'}</span>
                  </td>
                </tr>
                <tr>
                  <td>
                    {'CORE-Bench-Hard · official test'}
                    <span className="bdg new">{'New'}</span>
                  </td>
                  <td>{"Reproduce a published study's results from its code and data"}</td>
                  <td className="m">{'97.30% (36/37)'}</td>
                  <td>{'ReAct · gpt-5.4 · 94.59%'}</td>
                  <td className="tie">{'+2.70 pts'}</td>
                  <td>
                    <span className="bdg same">{'Same split'}</span>
                  </td>
                </tr>
                <tr>
                  <td>
                    {'DiscoveryBench · validation'}
                    <span className="bdg new">{'New'}</span>
                  </td>
                  <td>{'Derive a testable hypothesis from a real dataset'}</td>
                  <td className="m">{'0.7467 (25 tasks)'}</td>
                  <td>{'Best official test · 0.3893'}</td>
                  <td className="neutral">{'—'}</td>
                  <td>
                    <span className="bdg na">{'Not comparable'}</span>
                  </td>
                </tr>
                <tr>
                  <td>{'ASI-Bench B1'}</td>
                  <td>{'Execute a complete, given research protocol'}</td>
                  <td className="m">{'79.35'}</td>
                  <td>{'Codex · GPT-6 Astra · 74.78'}</td>
                  <td className="tie">{'+4.57'}</td>
                  <td>
                    <span className="bdg model">{'Same model · local'}</span>
                  </td>
                </tr>
                <tr>
                  <td>{'ASI-Bench B2'}</td>
                  <td>{'Turn specified methods into a working pipeline'}</td>
                  <td className="m">{'56.11'}</td>
                  <td>{'Codex · GPT-6 Astra · 56.09'}</td>
                  <td className="tie">{'+0.02'}</td>
                  <td>
                    <span className="bdg model">{'Same model · local'}</span>
                  </td>
                </tr>
                <tr>
                  <td>{'ASI-Bench B3'}</td>
                  <td>{'Choose and run research methods autonomously'}</td>
                  <td className="m">{'59.67'}</td>
                  <td>{'Codex · GPT-6 Astra · 58.12'}</td>
                  <td className="tie">{'+1.55'}</td>
                  <td>
                    <span className="bdg model">{'Same model · local'}</span>
                  </td>
                </tr>
                <tr>
                  <td>{'ASI-Bench B4'}</td>
                  <td>{'Research autonomously despite distracting information'}</td>
                  <td className="m">{'59.46'}</td>
                  <td>{'Codex · GPT-6 Astra · 55.45'}</td>
                  <td className="tie">{'+4.01'}</td>
                  <td>
                    <span className="bdg model">{'Same model · local'}</span>
                  </td>
                </tr>
                <tr>
                  <td>
                    {'Terminal-Bench-Science 0.1'}
                    <span className="bdg new">{'New'}</span>
                  </td>
                  <td>{'Complete expert-designed scientific workflows'}</td>
                  <td className="m">{'69.05% (145/210)'}</td>
                  <td>{'Codex · GPT-6 Astra · 68.10%'}</td>
                  <td className="tie">{'+0.95 pts'}</td>
                  <td>
                    <span className="bdg same">{'Same split'}</span>
                  </td>
                </tr>
                <tr>
                  <td>
                    {'Research tasks · 10 studies'}
                    <span className="bdg new">{'New'}</span>
                  </td>
                  <td>{'Carry a published bioinformatics or clinical analysis end to end'}</td>
                  <td className="m">{'89.9 (B 88.6 · C 91.2)'}</td>
                  <td>{'Codex · GPT-6.1 Sol · 88.3'}</td>
                  <td className="tie">{'+1.6'}</td>
                  <td>
                    <span className="bdg model">{'Same model · local'}</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div className="basis-key">
            <span>
              <span className="bdg same">{'Same split'}</span>
              {' our run and the comparison answer the same questions'}
            </span>
            <span>
              <span className="bdg cross">{'Cross-split'}</span>
              {' our validation run against official test records; a reference comparison'}
            </span>
            <span>
              <span className="bdg model">{'Same model · local'}</span>
              {' other agents run locally with the same model on the same tasks'}
            </span>
            <span>
              <span className="bdg na">{'Not comparable'}</span>
              {' different split and judge model; shown for context only'}
            </span>
          </div>
        </div>
        <figcaption>
          <b>{'Figure 1.'}</b>
          {
            'Twelve tests, thirteen results. Each row names the record we compare against and the basis of that comparison; rows marked New were added in November 2026.'
          }
        </figcaption>
      </figure>
      <div className="col">
        <h2>{'What the results say'}</h2>
      </div>
      <div className="findings">
        {findings.map((finding) => (
          <TabLink key={finding.title} to={finding.tab} className="finding">
            <span className="finding-k">{tabNames[finding.tab]}</span>
            <strong>{finding.title}</strong>
            <span className="finding-t">{finding.text}</span>
            <span className="finding-go">{'Explore →'}</span>
          </TabLink>
        ))}
      </div>
    </>
  )
}
