import { JsonLd } from '@/components/json-ld'
import { BenchmarkHero } from './benchmark-hero'
import { benchmarkMetadata, benchmarkStructuredData } from './benchmark-metadata'
import { BenchmarkMotion } from './benchmark-motion'
import { ExecutionPanel } from './benchmark-panel-execution'
import { LiteraturePanel } from './benchmark-panel-literature'
import { MethodsPanel } from './benchmark-panel-methods'
import { OverviewPanel } from './benchmark-panel-overview'
import { ReproductionPanel } from './benchmark-panel-reproduction'
import { ResearchPanel } from './benchmark-panel-research'
import { type BenchmarkTab, BenchmarkTabs, TabPanel } from './benchmark-tabs'
import './benchmark.css'

export const metadata = benchmarkMetadata

const tabs: BenchmarkTab[] = [
  { id: 'overview', label: 'Overview', meta: 'All 12 tests' },
  { id: 'literature', label: 'Literature', meta: '4 tests · AstaBench' },
  { id: 'reproduction', label: 'Reproduction & data', meta: '2 tests · AstaBench' },
  { id: 'execution', label: 'Research execution', meta: '5 tests · ASI · TB-Science' },
  { id: 'research', label: 'Paper-scale research', meta: '4 agents · 10 studies', highlight: true },
  { id: 'methods', label: 'Methods & notes', meta: 'Scope · citation' }
]

const panels = {
  overview: OverviewPanel,
  literature: LiteraturePanel,
  reproduction: ReproductionPanel,
  execution: ExecutionPanel,
  research: ResearchPanel,
  methods: MethodsPanel
}

export default function OpenScienceBenchmarkPage() {
  return (
    <BenchmarkMotion>
      <JsonLd data={benchmarkStructuredData()} />
      <article>
        <BenchmarkHero />
        <BenchmarkTabs tabs={tabs}>
          {tabs.map((tab) => {
            const Panel = panels[tab.id as keyof typeof panels]
            return (
              <TabPanel key={tab.id} id={tab.id}>
                <Panel />
              </TabPanel>
            )
          })}
        </BenchmarkTabs>
      </article>
    </BenchmarkMotion>
  )
}
