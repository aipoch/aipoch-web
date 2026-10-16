import { expect, test } from 'bun:test'
import { renderToReadableStream } from 'react-dom/server'
import { ActivityRow } from '../../app/(commonLayout)/open-science/use-cases/_components/activity-row'
import { SessionMessageItem } from '../../app/(commonLayout)/open-science/use-cases/_components/message-item'
import { SessionTranscript } from '../../app/(commonLayout)/open-science/use-cases/_components/session-transcript'
import type { NormalizedActivity, UseCaseSession } from '../../lib/use-case-types'

const render = async (element: React.JSX.Element) =>
  new Response(await renderToReadableStream(element)).text()

const activity = (overrides: Partial<NormalizedActivity>): NormalizedActivity => ({
  id: 'a1',
  title: '',
  status: 'completed',
  createdAt: 1,
  updatedAt: 2,
  ...overrides
})

const planInput = {
  task_summary: 'Backtest the strategy and publish.',
  phases: [
    {
      name: 'P1',
      delegations: [
        { name: 'D1', steps: [{ title: 'Collect inputs', description: 'Gather datasets.' }] }
      ]
    }
  ],
  desired_outputs: [],
  feasibility: { confidence: 'high', rationale: 'Inputs are local.' }
}

test('plan rows start expanded only when the group opts in', async () => {
  const planActivity = activity({
    providerToolName: 'mcp.open-science-plan.generate_plan',
    input: planInput
  })
  const collapsed = await render(<ActivityRow activity={planActivity} assets={{}} />)
  expect(collapsed).toContain('Created execution plan')
  expect(collapsed).not.toContain('Backtest the strategy')
  const expanded = await render(<ActivityRow activity={planActivity} assets={{}} defaultExpanded />)
  expect(expanded).toContain('Backtest the strategy')
  expect(expanded).toContain('Collect inputs')
})

test('notebook figures render outside the collapsed row details', async () => {
  const notebookActivity = activity({
    providerToolName: 'mcp__open-science-notebook__notebook_execute',
    run: {
      runId: 'r1',
      status: 'completed',
      script: 'draw_coverage_figure()',
      outputs: [{ type: 'display', data: { 'image/png': 'blob:coverage-figure' } }]
    }
  })
  // Collapsed row: the figure is still visible, the code stays hidden.
  const html = await render(<ActivityRow activity={notebookActivity} assets={{}} />)
  expect(html).toContain('blob:coverage-figure')
  expect(html).not.toContain('draw_coverage_figure()')
})

test('failed assistant turns show a Failed footer; completed turns keep Completed', async () => {
  const base = {
    type: 'message' as const,
    id: 'm1',
    role: 'assistant' as const,
    content: 'partial answer',
    createdAt: 1788220800000
  }
  // No completedAt on the failed turn: falls back to createdAt.
  const failed = await render(
    <SessionMessageItem message={{ ...base, status: 'failed' }} showTurnCompletion />
  )
  expect(failed).toContain('Failed ·')
  expect(failed).not.toContain('Completed ·')
  const errored = await render(
    <SessionMessageItem message={{ ...base, status: 'error' }} showTurnCompletion />
  )
  expect(errored).toContain('Failed ·')
  const completed = await render(
    <SessionMessageItem
      message={{ ...base, status: 'complete', completedAt: 1788220801000 }}
      showTurnCompletion
    />
  )
  expect(completed).toContain('Completed ·')
  expect(completed).not.toContain('Failed ·')
})

test('notebook outputs collapse behind a closed details toggle while code stays open', async () => {
  const notebookActivity = activity({
    providerToolName: 'mcp__open-science-notebook__notebook_execute',
    run: {
      runId: 'r1',
      status: 'completed',
      script: 'print("coverage line")',
      outputs: [{ type: 'stream', name: 'stdout', text: 'coverage stream output' }]
    }
  })
  const html = await render(<ActivityRow activity={notebookActivity} assets={{}} defaultExpanded />)
  // Code section renders open; the stream output sits in a closed <details>
  // (the browser hides <details> content until opened; SSR HTML includes it).
  expect(html).toContain('print(&quot;coverage line&quot;)')
  expect(html).toContain('<details class=')
  expect(html).toContain('<summary')
  expect(html).not.toContain('<details open')
})

test('notebook code sections carry a line-number gutter', async () => {
  const notebookActivity = activity({
    providerToolName: 'mcp__open-science-notebook__notebook_execute',
    run: { runId: 'r2', status: 'completed', script: 'a = 1\nb = 2', outputs: [] }
  })
  const html = await render(<ActivityRow activity={notebookActivity} assets={{}} defaultExpanded />)
  expect(html.match(/grid grid-cols-\[auto_minmax\(0,1fr\)\]/g)?.length).toBe(2)
})

test('truncated activities disclose it below the expanded sections', async () => {
  const truncated = activity({
    providerToolName: 'mcp__acme__truncated_tool',
    essentialTruncated: true,
    input: { payload: 'x' }
  })
  const html = await render(<ActivityRow activity={truncated} assets={{}} defaultExpanded />)
  expect(html).toContain('Output truncated')
})

test('user messages render collapsed with the clamp applied', async () => {
  const longMessage = {
    type: 'message' as const,
    id: 'u1',
    role: 'user' as const,
    content: Array.from({ length: 20 }, (_, i) => `coverage line ${i + 1}`).join('\n'),
    status: 'complete',
    createdAt: 1788220800000
  }
  const html = await render(<SessionMessageItem message={longMessage} />)
  expect(html).toContain('line-clamp-[12]')
  expect(html).toContain('coverage line 20')
})

test('plan card starts compact: clamped summary, five steps, collapsed descriptions', async () => {
  const sevenSteps = {
    task_summary: 'Backtest the strategy and publish the report with all artifacts attached.',
    phases: [
      {
        name: 'P1',
        delegations: [
          {
            name: 'D1',
            steps: Array.from({ length: 7 }, (_, i) => ({
              title: `Coverage step ${i + 1}`,
              description: `Coverage step ${i + 1} description.`
            }))
          }
        ]
      }
    ],
    desired_outputs: [],
    feasibility: { confidence: 'high', rationale: 'Coverage rationale.' }
  }
  const planActivity = activity({
    providerToolName: 'mcp.open-science-plan.generate_plan',
    input: sevenSteps
  })
  const html = await render(<ActivityRow activity={planActivity} assets={{}} defaultExpanded />)
  // The summary clamp applies only after measurement proves overflow, so SSR
  // renders unclamped without the toggle; steps still start at five.
  expect(html).not.toContain('line-clamp-3')
  expect(html).not.toContain('Show full task')
  expect(html).toContain('Coverage step 5')
  expect(html).not.toContain('Coverage step 6')
  // React SSR splits text nodes with <!-- --> markers; strip them to assert prose.
  expect(html.replace(/<!-- -->/g, '')).toContain('+ 2 more steps')
  expect(html).toContain('Expand all')
  // Descriptions start collapsed behind the step toggle.
  expect(html).not.toContain('Coverage step 1 description.')
  expect(html).toContain('High confidence')
})

test('generate_plan renders as a standalone plan card without group chrome', async () => {
  // App parity: the plan card is its own transcript item — no collapsible
  // group header ("N steps · elapsed") wraps it.
  const planActivity = activity({
    providerToolName: 'mcp.open-science-plan.generate_plan',
    input: planInput
  })
  const session = {
    schemaVersion: 1,
    slug: 'plan-card',
    title: 'Plan card',
    projectName: 'Plan card',
    exportedAt: 1,
    sessionCreatedAt: 1,
    items: [{ type: 'plan', id: planActivity.id, activity: planActivity }],
    assets: {},
    omissions: [],
    excludedFiles: []
  } satisfies UseCaseSession
  const html = await render(<SessionTranscript session={session} />)
  expect(html).toContain('Created execution plan')
  expect(html).toContain('Backtest the strategy and publish.')
  expect(html).not.toContain('1 step ·')
})

test('failed package installs render the app ledger table with per-package status', async () => {
  const failedInstall = activity({
    providerToolName: 'mcp__open-science-notebook__manage_packages',
    status: 'failed',
    input: {
      server: 'open-science-notebook',
      tool: 'manage_packages',
      arguments: { packages: ['pandas', 'yfinance'], language: 'python' }
    },
    output: JSON.stringify({
      ok: false,
      method: 'conda',
      error: 'conda install failed.',
      packageChanges: [
        { name: 'pandas', relationship: 'requested' },
        { name: 'yfinance', relationship: 'requested' }
      ]
    })
  })
  const html = await render(<ActivityRow activity={failedInstall} assets={{}} defaultExpanded />)
  // Ledger header and rows (app: WorkspaceManagePackagesActivityRow grid).
  expect(html).toContain('Package')
  expect(html).toContain('Status')
  expect(html).toContain('Version')
  expect(html).toContain('pandas')
  expect(html).toContain('yfinance')
  // Failed rows carry the failure color and label; missing versions show a dash.
  expect(html.match(/text-status-failure-foreground/g)?.length).toBeGreaterThanOrEqual(2)
  expect(html.replace(/<!-- -->/g, '')).toContain('Failed')
  expect(html).toContain('—')
  // The failure message renders as red prose below the table, not a code block.
  expect(html).toContain('conda install failed.')
})

test('pdf annotations render quote and area cards and suppress the empty bubble', async () => {
  const session = {
    schemaVersion: 1,
    slug: 'annotations',
    title: 'Annotations',
    projectName: 'Annotations',
    exportedAt: 1,
    sessionCreatedAt: 1,
    items: [
      {
        type: 'message',
        id: 'u1',
        role: 'user',
        content: '',
        status: 'complete',
        createdAt: 1789473624904,
        annotations: [
          {
            id: 'an1',
            kind: 'quote',
            source: 'StoryScope.pdf · Page 6',
            content: 'Style signals are stronger but narrative features close the gap.',
            note: '解释这段内容。'
          },
          {
            id: 'an2',
            kind: 'area',
            source: 'StoryScope.pdf · Page 23',
            content: 'Rarity percentile by author',
            image: { mimeType: 'image/png', data: 'QUJD' }
          }
        ]
      }
    ],
    assets: {},
    omissions: [],
    excludedFiles: []
  } satisfies UseCaseSession
  const html = await render(<SessionTranscript session={session} />)
  expect(html).toContain('PDF quote')
  expect(html).toContain('PDF area')
  expect(html).toContain('StoryScope.pdf · Page 6')
  expect(html).toContain('Style signals are stronger')
  expect(html).toContain('解释这段内容。')
  expect(html).toContain('data:image/png;base64,QUJD')
  // The cards ride inside the same gray bubble as any user message.
  expect(html).toContain('bg-bg-300 px-3.5 py-2')
})

test('@-mentioned files render inline once with the link color, never as chips', async () => {
  const session = {
    schemaVersion: 1,
    slug: 'mentions',
    title: 'Mentions',
    projectName: 'Mentions',
    exportedAt: 1,
    sessionCreatedAt: 1,
    items: [
      {
        type: 'message',
        id: 'u1',
        role: 'user',
        content: '@coverage-notes.md compare with the draft.',
        status: 'complete',
        createdAt: 1,
        parts: [
          {
            type: 'artifact',
            source: 'upload',
            name: 'coverage-notes.md',
            mimeType: 'text/markdown',
            path: 'upload-version:p/s/f/v',
            versionId: 'v'
          },
          { type: 'text', text: ' compare with the draft.' }
        ],
        uploads: [
          {
            name: 'coverage-notes.md',
            mimeType: 'text/markdown',
            url: 'https://cdn.test/content#coverage-notes.md',
            mention: true
          }
        ]
      }
    ],
    assets: {},
    omissions: [],
    excludedFiles: []
  } satisfies UseCaseSession
  const html = await render(<SessionTranscript session={session} />)
  // Exactly one rendering of the mention: the inline colored link (the name
  // appears once in the link text and once in its preview tooltip).
  expect(html.match(/coverage-notes\.md/g)?.length).toBe(2)
  expect(html).toContain('text-sd-link')
  // And it is the only preview trigger — no duplicate chip above the bubble.
  expect(html.match(/title="Preview coverage-notes\.md"/g)?.length).toBe(1)
})

test('text quote, image point, and budget-omitted area cards render', async () => {
  const session = {
    schemaVersion: 1,
    slug: 'more-annotations',
    title: 'More annotations',
    projectName: 'More annotations',
    exportedAt: 1,
    sessionCreatedAt: 1,
    items: [
      {
        type: 'message',
        id: 'u1',
        role: 'user',
        content: '',
        status: 'complete',
        createdAt: 1,
        annotations: [
          {
            id: 'an1',
            kind: 'text',
            content: 'quoted conversation text',
            note: 'why this?'
          },
          {
            id: 'an2',
            kind: 'image-point',
            number: 2,
            x: 0.42,
            y: 0.18,
            naturalSize: { width: 800, height: 600 },
            source: 'photo.png',
            note: 'what is here'
          },
          {
            id: 'an3',
            kind: 'area',
            source: 'paper.pdf · Page 4',
            content: 'budget area text',
            imageOmitted: true
          }
        ]
      }
    ],
    assets: {},
    omissions: [],
    excludedFiles: []
  } satisfies UseCaseSession
  const html = await render(<SessionTranscript session={session} />)
  expect(html).toContain('Text quote')
  expect(html).toContain('quoted conversation text')
  expect(html).toContain('why this?')
  expect(html).toContain('Image point 2')
  expect(html).toContain('Point 2 at 336, 108')
  expect(html).toContain('photo.png')
  expect(html).toContain('Image not retained: session image budget reached.')
  expect(html).toContain('budget area text')
})
