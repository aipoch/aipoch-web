import type { UseCaseSession } from '@/lib/use-case-types'
import type { ActivityRenderer } from '../../app/(commonLayout)/open-science/use-cases/_components/activity-classify'

/**
 * Deterministic coverage corpus for the use-case replay renderer.
 *
 * Every renderer branch and edge state the web UI supports appears here at
 * least once, each with a unique marker string so the Playwright spec can
 * assert presence. When a new renderer is added to activity-classify.ts,
 * extend this fixture (and the Playwright assertions) — the audit script
 * fails if a renderer has no fixture coverage.
 */

export const COVERAGE_FIXTURE_SLUG = 'coverage-fixture'

/** Renderers this fixture exercises. The audit cross-check diffs this against
 * the classifier's renderer list. */
export const COVERAGE_FIXTURE_RENDERERS: ActivityRenderer[] = [
  'skill',
  'notebook',
  'notebook-control',
  'read',
  'packages',
  'artifact-write',
  'library-inbox',
  'websearch',
  'generic-fallback'
]

const asset = (storageKey: string, filename: string, url: string, sizeBytes: number) => ({
  storageKey,
  entry: { url, filename, sizeBytes, kind: 'file' }
})

const assetEntries = [
  asset(
    'artifacts/p/s/.provenance/a1/versions/v1/content',
    'coverage_chart.png',
    '/use-cases/coverage-fixture/objects/chart.png',
    111392
  ),
  asset(
    'artifacts/p/s/.provenance/a2/versions/v2/content',
    'coverage_report.md',
    '/use-cases/coverage-fixture/objects/report.md',
    5320
  ),
  asset(
    'extra/coverage_dataset.zip',
    'coverage_dataset.zip',
    '/use-cases/coverage-fixture/objects/dataset.zip',
    2210
  )
]

export const coverageFixtureSession: UseCaseSession = {
  schemaVersion: 1,
  slug: COVERAGE_FIXTURE_SLUG,
  title: 'Renderer coverage fixture',
  description: 'Deterministic corpus exercising every replay renderer branch.',
  projectName: 'coverage',
  exportedAt: 1790133043410,
  sessionCreatedAt: 1790133043410,
  items: [
    // -- user message ---------------------------------------------------------
    {
      type: 'message',
      id: 'cov-user-1',
      role: 'user',
      content: 'Run the renderer coverage scenario.',
      status: 'complete',
      createdAt: 1790133045296,
      parts: [{ type: 'text', text: 'Run the renderer coverage scenario.' }]
    },

    // -- elicitation: answered via a listed option -----------------------------
    {
      type: 'elicitation',
      id: 'cov-eli-option',
      message: 'Which output format should I use for the coverage report?',
      fields: [
        {
          id: 'q_format',
          label: 'Output format',
          kind: 'single-select',
          options: [
            { value: 'Markdown summary', label: 'Markdown summary' },
            { value: 'CSV table', label: 'CSV table' }
          ]
        }
      ],
      status: 'completed',
      createdAt: 1790133049000,
      state: 'answered',
      answers: [{ fieldId: 'q_format', value: 'Markdown summary' }]
    },

    // -- elicitation: answered with free-form text ------------------------------
    {
      type: 'elicitation',
      id: 'cov-eli-custom',
      message: 'Anything else to include in the report?',
      fields: [{ id: 'q_custom', label: 'Other', kind: 'text' }],
      status: 'completed',
      createdAt: 1790133050000,
      state: 'answered',
      answers: [{ fieldId: 'q_custom', value: 'Include the appendix tables' }]
    },

    // -- elicitation: never answered ---------------------------------------------
    {
      type: 'elicitation',
      id: 'cov-eli-pending',
      message: 'Pick a follow-up analysis (left unanswered in the original session).',
      fields: [{ id: 'q_pending', label: 'Other', kind: 'text' }],
      status: 'completed',
      createdAt: 1790133051000
    },

    // -- assistant message: full markdown surface --------------------------------
    {
      type: 'message',
      id: 'cov-md-1',
      role: 'assistant',
      content: [
        '## Coverage Markdown Heading',
        '',
        'Paragraph with **bold coverage** and *italic coverage*, plus `inline-code-coverage` and a [coverage-link](https://example.com/coverage).',
        '',
        '> Blockquote coverage line.',
        '',
        '1. Ordered coverage item',
        '2. Second ordered coverage item',
        '',
        '- Unordered coverage item',
        '',
        '| CoverageColA | CoverageColB |',
        '| --- | --- |',
        '| coverage-cell-1 | coverage-cell-2 |',
        '',
        '```js',
        'const coverageCode = \'<escaped> & "quoted"\'',
        '```',
        '',
        '```',
        'plain fence coverage without a language',
        '```',
        '',
        'Emoji coverage 🧪✅ and CJK coverage 覆盖渲染测试。'
      ].join('\n'),
      status: 'complete',
      createdAt: 1790133052000,
      completedAt: 1790133053000
    },

    // -- activity group: every dedicated renderer --------------------------------
    {
      type: 'activity-group',
      id: 'cov-group-main',
      activities: [
        {
          id: 'cov-act-skill',
          title: 'mcp__skills__load_skill',
          providerToolName: 'mcp__skills__load_skill',
          toolKind: 'other',
          status: 'completed',
          createdAt: 1790133054000,
          updatedAt: 1790133055000,
          input: { skill: 'mcp-literature' },
          contentBlocks: [
            {
              type: 'content',
              content: {
                type: 'text',
                text: '---\nname: mcp-literature\ndescription: Coverage skill document body.\n---\n\n# Coverage Skill'
              }
            }
          ]
        },
        {
          id: 'cov-act-repl',
          title: 'mcp__open-science-notebook__repl_execute',
          providerToolName: 'mcp__open-science-notebook__repl_execute',
          toolKind: 'other',
          status: 'completed',
          createdAt: 1790133056000,
          updatedAt: 1790133058000,
          input: { code: 'print("coverage stdout")' },
          run: {
            runId: 'cov-run-1',
            status: 'completed',
            script: 'print("coverage stdout")',
            outputs: [
              { type: 'stream', name: 'stdout', text: 'coverage stdout line' },
              { type: 'stream', name: 'stderr', text: 'coverage stderr warning' },
              {
                type: 'display',
                data: { 'image/png': '/use-cases/coverage-fixture/figures/figure-01.png' }
              }
            ]
          }
        },
        {
          id: 'cov-act-notebook',
          title: 'mcp__open-science-notebook__notebook_execute',
          providerToolName: 'mcp__open-science-notebook__notebook_execute',
          toolKind: 'other',
          status: 'completed',
          createdAt: 1790133059000,
          updatedAt: 1790133061000,
          input: { language: 'python', cellId: 'coverage_cell' },
          run: {
            runId: 'cov-run-2',
            status: 'completed',
            cellId: 'coverage_cell',
            script: 'auc = 0.83',
            outputs: [{ type: 'display', data: { 'text/plain': '{"coverage_auc": 0.83}' } }]
          }
        },
        {
          id: 'cov-act-notebook-restart',
          // Dotted provider form on purpose: exercises the multi-form tool
          // matching (mcp.server.tool) for the notebook-control renderer.
          title: 'mcp.open-science-notebook.notebook_restart',
          providerToolName: 'mcp.open-science-notebook.notebook_restart',
          toolKind: 'other',
          status: 'completed',
          createdAt: 1790133061500,
          updatedAt: 1790133061800,
          input: {},
          output: [
            { type: 'text', text: '{"status": "restarted", "kernelStatus": "idle", "cells": 3}' }
          ]
        },
        {
          id: 'cov-act-read',
          title: 'Read',
          providerToolName: 'Read',
          toolKind: 'read',
          status: 'completed',
          createdAt: 1790133062000,
          updatedAt: 1790133063000,
          input: { file_path: '$DATA/notebooks/coverage_notes.md' },
          locations: [{ path: '$DATA/notebooks/coverage_notes.md', line: 1 }],
          contentBlocks: [
            {
              type: 'content',
              content: {
                type: 'text',
                text: '```\n1\t# Coverage notes\n2\tread-file body line\n```'
              }
            }
          ]
        },
        {
          id: 'cov-act-manage',
          title: 'mcp__open-science-notebook__manage_packages',
          providerToolName: 'mcp__open-science-notebook__manage_packages',
          toolKind: 'other',
          status: 'completed',
          createdAt: 1790133064000,
          updatedAt: 1790133065000,
          input: { language: 'python', packages: ['pandas', 'scikit-learn'] },
          output: [{ type: 'text', text: '{"ok": true}' }]
        },
        {
          id: 'cov-act-inspect',
          title: 'mcp__open-science-notebook__inspect_packages',
          providerToolName: 'mcp__open-science-notebook__inspect_packages',
          toolKind: 'other',
          status: 'completed',
          createdAt: 1790133066000,
          updatedAt: 1790133067000,
          input: { language: 'python' },
          output: [{ type: 'text', text: '{"installed": ["numpy"]}' }]
        },
        {
          id: 'cov-act-artifact',
          title: 'mcp__open-science-artifacts__write_artifact_file',
          providerToolName: 'mcp__open-science-artifacts__write_artifact_file',
          toolKind: 'other',
          status: 'completed',
          createdAt: 1790133068000,
          updatedAt: 1790133069000,
          input: { filename: 'coverage_report.md', mimeType: 'text/markdown' },
          output: [
            {
              type: 'text',
              text: '{"artifact": {"artifact_id": "a2", "version_id": "v2", "filename": "coverage_report.md", "size_bytes": 5320}}'
            }
          ]
        },
        {
          id: 'cov-act-inbox',
          title: 'mcp__open-science-library__save_to_inbox',
          providerToolName: 'mcp__open-science-library__save_to_inbox',
          toolKind: 'other',
          status: 'completed',
          createdAt: 1790133070000,
          updatedAt: 1790133071000,
          input: { refs: ['pmid:11111111', 'pmid:22222222'] },
          output: '{"results": []}'
        },
        {
          id: 'cov-act-websearch',
          title: 'WebSearch',
          providerToolName: 'WebSearch',
          toolKind: 'other',
          status: 'completed',
          createdAt: 1790133072000,
          updatedAt: 1790133073000,
          input: { query: 'GLP-1 microbiome coverage query' },
          output:
            'Web search results for query: "GLP-1 microbiome coverage query"\n\n' +
            'Coverage Result One (https://example.com/result-1)\n' +
            'Coverage Result Two (https://example.com/result-2)'
        }
      ]
    },

    // -- activity group: edge states ---------------------------------------------
    {
      type: 'activity-group',
      id: 'cov-group-edge',
      activities: [
        {
          id: 'cov-act-generic',
          title: 'mcp__acme__mystery_tool',
          providerToolName: 'mcp__acme__mystery_tool',
          toolKind: 'other',
          status: 'completed',
          createdAt: 1790133074000,
          updatedAt: 1790133075000,
          input: { coverage_input: true },
          output: [{ type: 'text', text: '{"coverage_output": "mystery"}' }]
        },
        {
          id: 'cov-act-failed',
          title: 'mcp__acme__failing_tool',
          providerToolName: 'mcp__acme__failing_tool',
          toolKind: 'other',
          status: 'failed',
          createdAt: 1790133076000,
          updatedAt: 1790133077000,
          input: { should_fail: true },
          output: [{ type: 'text', text: 'coverage failure detail' }]
        },
        {
          id: 'cov-act-declined',
          title: 'mcp__acme__declined_tool',
          providerToolName: 'mcp__acme__declined_tool',
          toolKind: 'other',
          status: 'completed',
          toolDisposition: 'declined',
          createdAt: 1790133078000,
          updatedAt: 1790133079000,
          input: { needs_permission: true }
        },
        {
          id: 'cov-act-truncated',
          title: 'mcp__acme__truncated_tool',
          providerToolName: 'mcp__acme__truncated_tool',
          toolKind: 'other',
          status: 'completed',
          createdAt: 1790133080000,
          updatedAt: 1790133081000,
          input: { payload: 'x'.repeat(120) },
          essentialTruncated: true
        },
        {
          id: 'cov-act-empty',
          title: 'mcp__acme__empty_tool',
          providerToolName: 'mcp__acme__empty_tool',
          toolKind: 'other',
          status: 'completed',
          createdAt: 1790133082000,
          updatedAt: 1790133083000
        }
      ]
    },

    // -- assistant message: artifact gallery (including a PDF) ---------------------------
    {
      type: 'message',
      id: 'cov-md-artifacts',
      role: 'assistant',
      content:
        'Deliverables are ready, including the [coverage_report.md](/use-cases/coverage-fixture/objects/report.md) inline link. Download the [ZIP archive](coverage_dataset.zip) or [Word document](coverage_document.docx). Preview [closing parenthesis](report%29.md) and [opening parenthesis](report%28.md). ![Inline vector chart](coverage_vector.svg)',
      status: 'complete',
      createdAt: 1790133084000,
      completedAt: 1790133085000,
      artifacts: [
        {
          name: 'coverage_chart.png',
          mimeType: 'image/png',
          size: 111392,
          url: '/use-cases/coverage-fixture/objects/chart.png'
        },
        {
          name: 'coverage_report.md',
          mimeType: 'text/markdown',
          size: 5320,
          url: '/use-cases/coverage-fixture/objects/report.md'
        },
        {
          name: 'coverage_dataset.zip',
          mimeType: 'application/zip',
          size: 2210,
          url: '/use-cases/coverage-fixture/objects/dataset.zip'
        },
        {
          name: 'coverage_paper.pdf',
          mimeType: 'application/pdf',
          size: 600,
          url: '/use-cases/coverage-fixture/objects/paper.pdf'
        },
        {
          name: 'coverage_huge.bin',
          mimeType: 'application/octet-stream',
          size: 52428800,
          fullOnly: true
        },
        {
          name: 'coverage_document.docx',
          mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          size: 100
        },
        { name: 'report).md', mimeType: 'text/markdown', size: 100 },
        { name: 'report(.md', mimeType: 'text/markdown', size: 100 },
        { name: 'coverage_vector.svg', mimeType: 'image/svg+xml', size: 100 }
      ]
    }
  ],
  assets: Object.fromEntries(assetEntries.map((entry) => [entry.storageKey, entry.entry])),
  omissions: ['Coverage fixture omission note.'],
  excludedFiles: []
}
