import { describe, expect, test } from 'bun:test'
import { renderToStaticMarkup } from 'react-dom/server'
import {
  EvaluationOverview,
  EvaluationScoreWidget,
  type SkillEvaluation
} from '../../app/(commonLayout)/agent-skills/components/evaluation-overview'

function renderOverview(evaluation: SkillEvaluation) {
  return renderToStaticMarkup(<EvaluationOverview evaluation={evaluation} />)
}

describe('evaluation overview', () => {
  test('rounds the overall score shown inside the score circle', () => {
    const html = renderOverview({
      overallScore: 86.6,
      overallTotal: 100,
      staticScore: 70,
      staticTotal: 100,
      dynamicPassed: 3,
      dynamicTotal: 5,
      evaluationReportUrl: '/agent-skills/demo/eval-result'
    })

    expect(html).toContain('>87</span>')
    expect(html).not.toContain('>86.6</span>')
  })

  test('uses the skill detail palette while preserving score thresholds', () => {
    const html = renderOverview({
      overallScore: 86,
      overallTotal: 100,
      staticScore: 70,
      staticTotal: 100,
      dynamicPassed: 3,
      dynamicTotal: 5,
      medicalTasks: [{ label: 'Demo task', score: 30, passed: 3, total: 5 }],
      evaluationReportUrl: '/agent-skills/demo/eval-result'
    })

    expect(html).toContain('bg-[#edb732]')
    expect(html).toContain('bg-[#b42318]')
    expect(html).not.toContain('bg-[#FB923C]')
    expect(html).not.toContain('bg-[#FBBF24]')
  })
  test('retains the existing palette for the shared leaderboard report widget', () => {
    const html = renderToStaticMarkup(
      <EvaluationScoreWidget
        evaluation={{
          overallScore: 86,
          overallTotal: 100,
          staticScore: 70,
          staticTotal: 100,
          medicalTasks: [{ label: 'Demo task', score: 30, passed: 3, total: 5 }]
        }}
      />
    )
    expect(html).toContain('bg-[#F59E0B]')
    expect(html).toContain('bg-[#EF4444]')
    expect(html).not.toContain('bg-[#afd670]')
    expect(html).not.toContain('min-h-[106px]')
  })
})
