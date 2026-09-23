import { homeSection } from '../home-styles'
import { ResearchWorkbench } from '../interactive/research-workbench'

export const HomeWorkbenchSection = () => (
  <section id="open-science" className={`${homeSection} px-6`}>
    <div className="mx-auto max-w-[1096px]">
      <div className="text-center">
        <p className="font-mono text-[10px] uppercase tracking-[.06em] text-[#61615c]">
          The Workbench <span className="text-[#989894]">/ Workflow</span>
        </p>
        <h2
          data-testid="workbench-title"
          className="mt-8 font-[Georgia] text-[36px] leading-[1.03] tracking-[-.04em] sm:text-[56px]"
        >
          Run and Review Research <br />
          in Open-Science
        </h2>
        <p className="mx-auto mt-5 max-w-[912px] text-base leading-[26px] text-[#6b6b66]">
          Create a project, add your research files, and describe the task. Use AI agents to run
          analysis and create reports, tables, and figures, then inspect the outputs alongside
          available execution records and provenance.
        </p>
      </div>
      <ResearchWorkbench />
    </div>
  </section>
)
