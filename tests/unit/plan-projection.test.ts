import { expect, test } from 'bun:test'
import {
  parsePlanDocument,
  parsePlanStepUpdate,
  projectGeneratePlanActivity
} from '../../app/(commonLayout)/open-science/use-cases/_components/plan-projection'
import type { NormalizedActivity } from '../../lib/use-case-types'

const activity = (overrides: Partial<NormalizedActivity>): NormalizedActivity => ({
  id: 'a1',
  title: '',
  status: 'completed',
  createdAt: 1,
  updatedAt: 2,
  ...overrides
})

const validPlanInput = {
  task_summary: 'Backtest the strategy and publish the report.',
  phases: [
    {
      name: 'Phase one',
      delegations: [
        {
          name: 'Data track',
          steps: [
            { title: 'Collect inputs', description: 'Gather and verify the datasets.' },
            { title: 'Run backtest', description: 'Execute the backtest and capture metrics.' }
          ]
        }
      ]
    },
    {
      name: 'Phase two',
      delegations: [
        {
          name: 'Report track',
          steps: [{ title: 'Publish report', description: 'Write and link the final report.' }]
        }
      ]
    }
  ],
  desired_outputs: ['backtest report'],
  feasibility: { confidence: 'high', rationale: 'All inputs are available locally.' }
}

test('parsePlanDocument flattens phases into numbered steps', () => {
  const document = parsePlanDocument(validPlanInput)
  expect(document?.taskSummary).toBe(validPlanInput.task_summary)
  expect(document?.steps).toEqual([
    { number: 1, title: 'Collect inputs', description: 'Gather and verify the datasets.' },
    { number: 2, title: 'Run backtest', description: 'Execute the backtest and capture metrics.' },
    { number: 3, title: 'Publish report', description: 'Write and link the final report.' }
  ])
  expect(document?.feasibility).toEqual({
    confidence: 'high',
    summary: 'All inputs are available locally.'
  })
})

test('parsePlanDocument rejects malformed documents instead of throwing', () => {
  expect(parsePlanDocument(undefined)).toBeUndefined()
  expect(parsePlanDocument({})).toBeUndefined()
  expect(parsePlanDocument({ ...validPlanInput, task_summary: '  ' })).toBeUndefined()
  expect(parsePlanDocument({ ...validPlanInput, schema_version: 2 })).toBeUndefined()
  expect(parsePlanDocument({ ...validPlanInput, phases: [] })).toBeUndefined()
  expect(
    parsePlanDocument({
      ...validPlanInput,
      phases: [{ name: 'P', delegations: [{ name: 'D', steps: [] }] }]
    })
  ).toBeUndefined()
  // Duplicate step titles are a contract violation.
  const duplicated = structuredClone(validPlanInput)
  duplicated.phases[1].delegations[0].steps[0] = { ...duplicated.phases[0].delegations[0].steps[0] }
  expect(parsePlanDocument(duplicated)).toBeUndefined()
  expect(
    parsePlanDocument({
      ...validPlanInput,
      feasibility: { confidence: 'certain', rationale: 'x' }
    })
  ).toBeUndefined()
  expect(parsePlanDocument({ ...validPlanInput, desired_outputs: 'report' })).toBeUndefined()
})

test('projects a completed plan document into the content card', () => {
  const projection = projectGeneratePlanActivity(
    activity({ providerToolName: 'mcp.open-science-plan.generate_plan', input: validPlanInput })
  )
  expect(projection).toMatchObject({
    kind: 'content',
    heading: 'Created execution plan',
    taskSummary: validPlanInput.task_summary
  })
  // The MCP arguments envelope unwraps to the same document.
  const enveloped = projectGeneratePlanActivity(
    activity({
      providerToolName: 'mcp__open-science-plan__generate_plan',
      input: { arguments: validPlanInput }
    })
  )
  expect(enveloped.kind).toBe('content')
})

test('projects pending, decision, error, and malformed shapes', () => {
  const tool = { providerToolName: 'mcp.open-science-plan.generate_plan' }
  expect(
    projectGeneratePlanActivity(activity({ ...tool, status: 'in_progress', input: validPlanInput }))
      .heading
  ).toBe('Creating execution plan')
  expect(
    projectGeneratePlanActivity(activity({ ...tool, input: { decision: 'approved' } })).heading
  ).toBe('Approved execution plan')
  expect(
    projectGeneratePlanActivity(activity({ ...tool, input: { decision: 'rejected' } })).heading
  ).toBe('Dismissed execution plan')
  expect(
    projectGeneratePlanActivity(activity({ ...tool, status: 'failed', input: validPlanInput }))
  ).toEqual({ kind: 'failed', heading: 'Failed to create execution plan' })
  // Legacy plain-text "already awaiting approval" reply.
  expect(
    projectGeneratePlanActivity(
      activity({ ...tool, output: 'A Session Plan is already awaiting approval.' })
    ).kind
  ).toBe('already-pending')
  // Structured error codes in the MCP envelope.
  expect(
    projectGeneratePlanActivity(
      activity({
        ...tool,
        output: { structuredContent: { error: { code: 'approval-already-pending' } } }
      })
    ).kind
  ).toBe('already-pending')
  expect(
    projectGeneratePlanActivity(
      activity({
        ...tool,
        output: { structuredContent: { error: { code: 'plan-review-pending' } } }
      })
    )
  ).toMatchObject({ kind: 'revision-conflict', heading: 'Plan revision not submitted' })
  // Decision mixed with content is ambiguous; malformed input likewise.
  expect(
    projectGeneratePlanActivity(
      activity({ ...tool, input: { ...validPlanInput, decision: 'approved' } })
    ).kind
  ).toBe('unavailable')
  expect(projectGeneratePlanActivity(activity({ ...tool, input: { foo: 1 } })).kind).toBe(
    'unavailable'
  )
})

test('parsePlanStepUpdate extracts step info and degrades on bad input', () => {
  expect(
    parsePlanStepUpdate(
      activity({ input: { title: 'Run backtest', status: 'completed', notes: 'done' } })
    )
  ).toEqual({ title: 'Run backtest', status: 'completed', notes: 'done' })
  expect(parsePlanStepUpdate(activity({ input: { arguments: { title: 'Step one' } } }))).toEqual({
    title: 'Step one',
    status: undefined,
    notes: undefined
  })
  expect(parsePlanStepUpdate(activity({ input: { status: 'completed' } }))).toBeUndefined()
  expect(parsePlanStepUpdate(activity({ input: 'nope' }))).toBeUndefined()
})

test('planSummaryOverflows compares against a fixed 3-line preview height', async () => {
  const { planSummaryOverflows } = await import(
    '../../app/(commonLayout)/open-science/use-cases/_components/plan-card'
  )
  // 20px line height → 60px preview. Expanded content (scrollHeight ===
  // clientHeight at 200) still reports overflow, so the toggle stays mounted.
  expect(planSummaryOverflows(200, 20, 200)).toBe(true)
  expect(planSummaryOverflows(62, 20, 61)).toBe(true)
  expect(planSummaryOverflows(61, 20, 61)).toBe(false)
  expect(planSummaryOverflows(59, 20, 20)).toBe(false)
  // Without a resolvable line height the measured height is the fallback.
  expect(planSummaryOverflows(100, undefined, 50)).toBe(true)
  expect(planSummaryOverflows(50, undefined, 50)).toBe(false)
})
