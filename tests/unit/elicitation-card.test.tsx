import { expect, test } from 'bun:test'
import { renderToReadableStream } from 'react-dom/server'
import { SessionElicitationCard } from '../../app/(commonLayout)/open-science/use-cases/_components/elicitation-card'
import type { TranscriptItem } from '../../lib/use-case-types'

type ElicitationItem = Extract<TranscriptItem, { type: 'elicitation' }>

const render = async (element: React.JSX.Element) =>
  new Response(await renderToReadableStream(element)).text()

// Real export shape (app: resolveAgentUserChoiceQuestions): a select question
// is the `question_N` options field plus its `question_N_custom` text companion.
const pairedFields = [
  {
    id: 'question_1',
    label: 'Output format',
    kind: 'single-select',
    options: [
      { value: 'Markdown', label: 'Markdown' },
      { value: 'CSV', label: 'CSV' }
    ]
  },
  { id: 'question_1_custom', label: 'Other', kind: 'text' }
]

const baseItem: ElicitationItem = {
  type: 'elicitation',
  id: 'e1',
  message: 'Which output format?',
  fields: pairedFields,
  status: 'completed',
  createdAt: 1
}

test('terminal elicitation states prefix the title', async () => {
  const declined = await render(
    <SessionElicitationCard item={{ ...baseItem, state: 'declined' }} />
  )
  expect(declined).toContain('Skipped ·')
  expect(declined).toContain('Which output format?')
  const cancelled = await render(
    <SessionElicitationCard item={{ ...baseItem, state: 'cancelled' }} />
  )
  expect(cancelled).toContain('Cancelled ·')
  const answered = await render(
    <SessionElicitationCard
      item={{ ...baseItem, state: 'answered', answers: [{ fieldId: 'question_1', value: 'CSV' }] }}
    />
  )
  expect(answered).not.toContain('Skipped ·')
  expect(answered).not.toContain('Cancelled ·')
})

test('agent-decide answers live on the custom companion field', async () => {
  // Unanswered: the companion row renders unselected; the companion field
  // itself never renders as a standalone question.
  const unanswered = await render(<SessionElicitationCard item={baseItem} />)
  expect(unanswered).toContain('Let the agent decide')
  expect(unanswered.match(/<fieldset/g)).toHaveLength(1)

  // Recorded under question_1_custom (the app's fixture shape): the agent row
  // is the selected one, and no fake "Other" answer box appears.
  const agentDecided = await render(
    <SessionElicitationCard
      item={{
        ...baseItem,
        state: 'answered',
        answers: [{ fieldId: 'question_1_custom', value: 'Let the agent decide' }]
      }}
    />
  )
  expect(agentDecided.match(/<fieldset/g)).toHaveLength(1)
  const agentRow = agentDecided.split('Let the agent decide')[0]
  expect(agentRow).toContain('data-selected="true"')
  // The option rows stay unselected.
  expect(agentDecided.split('Markdown')[0]).not.toContain('data-selected="true"')

  // A non-sentinel custom answer renders as the selected custom row instead.
  const custom = await render(
    <SessionElicitationCard
      item={{
        ...baseItem,
        state: 'answered',
        answers: [{ fieldId: 'question_1_custom', value: 'CSV with extra columns' }]
      }}
    />
  )
  expect(custom).toContain('CSV with extra columns')
  const customAgentRow = custom.split('Let the agent decide')[0]
  expect(customAgentRow).not.toContain('data-selected="true"')
})

test('select fields without a companion render no agent row', async () => {
  // Legacy exports may carry the options field alone; nothing to pair with.
  const item: ElicitationItem = {
    ...baseItem,
    fields: [pairedFields[0]]
  }
  const html = await render(<SessionElicitationCard item={item} />)
  expect(html).not.toContain('Let the agent decide')
})
