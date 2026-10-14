import { expect, test } from 'bun:test'
import {
  ALL_ACTIVITY_RENDERERS,
  classifyActivityRenderer
} from '../../app/(commonLayout)/open-science/use-cases/_components/activity-classify'
import {
  formatStaticGroupTitle,
  formatStepCount
} from '../../app/(commonLayout)/open-science/use-cases/_components/activity-group-title'
import { buildActivityDetails } from '../../app/(commonLayout)/open-science/use-cases/_components/activity-row'
import type { NormalizedActivity } from '../../lib/use-case-types'
import { COVERAGE_FIXTURE_RENDERERS } from '../../mocks/fixtures/use-case-coverage'

const activity = (overrides: Partial<NormalizedActivity>): NormalizedActivity => ({
  id: 'a1',
  title: '',
  status: 'completed',
  createdAt: 1,
  updatedAt: 2,
  ...overrides
})

test('classifies dotted and underscored notebook tool forms', () => {
  expect(
    classifyActivityRenderer(
      activity({ providerToolName: 'mcp.open-science-notebook.notebook_execute' })
    )
  ).toBe('notebook')
  expect(
    classifyActivityRenderer(
      activity({ providerToolName: 'mcp__open-science-notebook__notebook_execute' })
    )
  ).toBe('notebook')
  // Providers that keep the identity in the title instead of providerToolName.
  expect(
    classifyActivityRenderer(
      activity({ title: 'mcp.open-science-notebook.notebook_execute', providerToolName: undefined })
    )
  ).toBe('notebook')
  expect(
    classifyActivityRenderer(
      activity({ providerToolName: 'mcp.open-science-notebook.notebook_restart' })
    )
  ).toBe('notebook-control')
  expect(
    classifyActivityRenderer(
      activity({ providerToolName: 'mcp__open-science-notebook__notebook_state' })
    )
  ).toBe('notebook-control')
  expect(classifyActivityRenderer(activity({ providerToolName: 'mcp__acme__mystery_tool' }))).toBe(
    'generic-fallback'
  )
  // A lookalike server must not land in the notebook renderers.
  expect(
    classifyActivityRenderer(
      activity({ providerToolName: 'mcp.open-science-notebook-staging.notebook_execute' })
    )
  ).toBe('generic-fallback')
})

test('fixture corpus covers every shipped renderer', () => {
  expect([...COVERAGE_FIXTURE_RENDERERS].sort()).toEqual([...ALL_ACTIVITY_RENDERERS].sort())
})

test('kernel-run display names follow the resolved language', () => {
  const python = buildActivityDetails(
    activity({
      providerToolName: 'mcp.open-science-notebook.notebook_execute',
      input: { language: 'python', code: 'print("hi")' }
    }),
    {}
  )
  expect(python.displayName).toBe('Notebook run')
  expect(python.sections[0]).toMatchObject({ kind: 'code', label: 'Code', language: 'python' })

  const repl = buildActivityDetails(
    activity({
      providerToolName: 'mcp__open-science-notebook__repl_execute',
      input: { code: 'console.log(1)' }
    }),
    {}
  )
  expect(repl.displayName).toBe('Agent SDK')
  expect(repl.sections[0]).toMatchObject({ kind: 'code', language: 'javascript' })

  const bash = buildActivityDetails(
    activity({ providerToolName: 'mcp.open-science-notebook.bash_execute', input: { code: 'ls' } }),
    {}
  )
  expect(bash.displayName).toBe('Shell')
  expect(bash.sections[0]).toMatchObject({ kind: 'code', label: 'Command', language: 'bash' })

  // No explicit kernel field: the R heuristic picks up `<-`.
  const rCell = buildActivityDetails(
    activity({
      providerToolName: 'mcp.open-science-notebook.notebook_execute',
      input: { code: 'x <- c(1, 2)' }
    }),
    {}
  )
  expect(rCell.sections[0]).toMatchObject({ kind: 'code', language: 'r' })
})

test('notebook control tools render friendly summary cards', () => {
  const restart = buildActivityDetails(
    activity({
      providerToolName: 'mcp.open-science-notebook.notebook_restart',
      output: [
        { type: 'text', text: '{"status": "restarted", "kernelStatus": "idle", "cells": 3}' }
      ]
    }),
    {}
  )
  expect(restart.displayName).toBe('Restart notebook')
  const restartSummary = restart.sections[0]
  if (restartSummary.kind !== 'summary') throw new Error('expected a summary section')
  expect(restartSummary.summary.fields).toEqual([
    { label: 'Status', value: 'Restarted' },
    { label: 'Kernel', value: 'Idle' },
    { label: 'Cells', value: '3' }
  ])
  expect(restartSummary.summary.note).toBe('In-memory variables cleared. Run history preserved.')

  const state = buildActivityDetails(
    activity({
      providerToolName: 'mcp__open-science-notebook__notebook_state',
      output: '{"kernelStatus": "active", "cellCount": 2, "runCount": 1, "environmentCount": 1}'
    }),
    {}
  )
  expect(state.displayName).toBe('Notebook state')
  const stateSummary = state.sections[0]
  if (stateSummary.kind !== 'summary') throw new Error('expected a summary section')
  expect(stateSummary.summary.fields).toEqual([
    { label: 'Kernel', value: 'Active' },
    { label: 'Cells', value: '2' },
    { label: 'Runs', value: '1' },
    { label: 'Environments', value: '1' }
  ])
})

test('unknown tools keep their raw provider identity', () => {
  const details = buildActivityDetails(
    activity({ providerToolName: 'mcp__acme__mystery_tool', input: { a: 1 } }),
    {}
  )
  expect(details.displayName).toBe('mcp__acme__mystery_tool')
  // Without a provider name, fall back to the tool-kind label, then "Tool".
  expect(buildActivityDetails(activity({ toolKind: 'execute' }), {}).displayName).toBe('Terminal')
  expect(buildActivityDetails(activity({}), {}).displayName).toBe('Tool')
})

test('websearch query falls back from structured payloads to text to the title', () => {
  const websearch = { providerToolName: 'WebSearch' }
  // 1. Structured payload, including nested containers and alias keys.
  expect(
    buildActivityDetails(activity({ ...websearch, input: { query: 'GLP-1 microbiome' } }), {})
      .subtitle
  ).toBe('GLP-1 microbiome')
  expect(
    buildActivityDetails(
      activity({ ...websearch, input: { request: { search_query: '"nested query"' } } }),
      {}
    ).subtitle
  ).toBe('nested query')
  // 2. Plain-text result summary.
  expect(
    buildActivityDetails(
      activity({
        ...websearch,
        input: {},
        output:
          'Web search results for query: "GLP-1 drugs"\n\nCoverage Result One (https://example.com/r1)'
      }),
      {}
    ).subtitle
  ).toBe('GLP-1 drugs')
  // 3. Activity title, quotes stripped.
  expect(
    buildActivityDetails(
      activity({ ...websearch, title: '"title fallback query"', input: {}, output: '' }),
      {}
    ).subtitle
  ).toBe('title fallback query')
})

test('generic tools subtitle from the first location path or the raw title', () => {
  // A path location wins over the title.
  const withPath = buildActivityDetails(
    activity({
      providerToolName: 'mcp__acme__mystery_tool',
      title: 'Some other label',
      locations: [{ path: '$DATA/results/summary.md' }]
    }),
    {}
  )
  expect(withPath.subtitle).toBe('$DATA/results/summary.md')
  // Otherwise the raw title, dropped when it just repeats the display name.
  const withTitle = buildActivityDetails(
    activity({ providerToolName: 'Search', title: 'Open page: https://example.com/x' }),
    {}
  )
  expect(withTitle.displayName).toBe('Search')
  expect(withTitle.subtitle).toBe('Open page: https://example.com/x')
  const repeated = buildActivityDetails(
    activity({
      providerToolName: 'mcp__acme__mystery_tool',
      title: 'mcp__acme__mystery_tool'
    }),
    {}
  )
  expect(repeated.subtitle).toBeUndefined()
})

test('execute tools subtitle with the command text', () => {
  const details = buildActivityDetails(
    activity({ toolKind: 'execute', input: { command: '  ls -la  ' } }),
    {}
  )
  expect(details.displayName).toBe('Terminal')
  expect(details.subtitle).toBe('ls -la')
  // Without a command field the title carries it.
  const titled = buildActivityDetails(
    activity({ toolKind: 'execute', title: 'python analyze.py' }),
    {}
  )
  expect(titled.subtitle).toBe('python analyze.py')
})

test('dot-form artifact, library, and skill tools hit their dedicated renderers', () => {
  const artifactWrite = buildActivityDetails(
    activity({
      providerToolName: 'mcp.open-science-artifacts.write_artifact_file',
      input: { filename: 'euler_fifth_power_searches.py', mimeType: 'text/x-python' },
      output: [
        {
          type: 'text',
          text: '{"artifact": {"filename": "euler_fifth_power_searches.py", "size_bytes": 120}}'
        }
      ]
    }),
    {}
  )
  expect(artifactWrite.displayName).toBe('Write file')
  expect(artifactWrite.subtitle).toBe('euler_fifth_power_searches.py')

  const skill = buildActivityDetails(
    activity({
      providerToolName: 'mcp.skills.load_skill',
      input: { skill: 'mcp-literature' },
      contentBlocks: [{ type: 'content', content: { type: 'text', text: '# Skill doc' } }]
    }),
    {}
  )
  expect(skill.displayName).toBe('Skill')
  expect(skill.subtitle).toBe('mcp-literature')

  const inbox = buildActivityDetails(
    activity({
      providerToolName: 'mcp.open-science-library.save_to_inbox',
      input: { refs: ['pmid:12345678'] }
    }),
    {}
  )
  expect(inbox.displayName).toBe('Save to library inbox')
  expect(inbox.subtitle).toBe('1 refs')

  // Lookalike servers stay on the generic fallback with their raw identity.
  for (const providerToolName of [
    'mcp.open-science-artifacts-other.write_artifact_file',
    'mcp.skills-other.load_skill',
    'mcp.open-science-library-staging.save_to_inbox'
  ]) {
    expect(classifyActivityRenderer(activity({ providerToolName }))).toBe('generic-fallback')
  }
})

test('tools whose identity lives only in the title still hit their renderers', () => {
  // Some packages carry no providerToolName at all; the raw tool id sits in
  // the activity title (e.g. mcp.open-science-artifacts.write_artifact_file).
  const artifactWrite = buildActivityDetails(
    activity({
      toolKind: 'execute',
      title: 'mcp.open-science-artifacts.write_artifact_file',
      input: { filename: 'euler_fifth_power_searches.py' }
    }),
    {}
  )
  expect(artifactWrite.displayName).toBe('Write file')
  expect(artifactWrite.subtitle).toBe('euler_fifth_power_searches.py')

  const skill = buildActivityDetails(
    activity({
      title: 'mcp.skills.load_skill',
      input: { skill: 'mcp-literature' },
      contentBlocks: [{ type: 'content', content: { type: 'text', text: '# Skill doc' } }]
    }),
    {}
  )
  expect(skill.displayName).toBe('Skill')
  expect(skill.subtitle).toBe('mcp-literature')
})

test('reads fields through the MCP envelope in exported packages', () => {
  // Exported packages wrap inputs as { server, tool, arguments }; field
  // readers must see the arguments object.
  const envelope = {
    server: 'open-science-artifacts',
    tool: 'write_artifact_file',
    arguments: { filename: 'euler_fifth_power_searches.py' }
  }
  const artifactWrite = buildActivityDetails(
    activity({
      title: 'mcp.open-science-artifacts.write_artifact_file',
      input: envelope
    }),
    {}
  )
  expect(artifactWrite.displayName).toBe('Write file')
  expect(artifactWrite.subtitle).toBe('euler_fifth_power_searches.py')

  const skill = buildActivityDetails(
    activity({
      title: 'mcp.skills.load_skill',
      input: { server: 'skills', tool: 'load_skill', arguments: { skill: 'mcp-literature' } },
      contentBlocks: [{ type: 'content', content: { type: 'text', text: '# Skill doc' } }]
    }),
    {}
  )
  expect(skill.subtitle).toBe('mcp-literature')

  // A payload that merely looks like an envelope but has no tool string is
  // not unwrapped.
  const lookalike = buildActivityDetails(activity({ input: { arguments: { command: 'ls' } } }), {})
  expect(lookalike.displayName).toBe('Tool')
})

test('plan tools classify and render friendly plan details', () => {
  // Both namespacing forms hit the plan renderer; lookalikes do not.
  for (const providerToolName of [
    'mcp.open-science-plan.generate_plan',
    'mcp__open-science-plan__generate_plan',
    'mcp.open-science-plan.update_step_status',
    'open_science_plan_update_step_status'
  ]) {
    expect(classifyActivityRenderer(activity({ providerToolName }))).toBe('plan')
  }
  expect(
    classifyActivityRenderer(
      activity({ providerToolName: 'mcp.open-science-plan-staging.generate_plan' })
    )
  ).toBe('generic-fallback')

  const generated = buildActivityDetails(
    activity({
      providerToolName: 'mcp.open-science-plan.generate_plan',
      input: {
        task_summary: 'Backtest the strategy.',
        phases: [
          {
            name: 'P1',
            delegations: [
              {
                name: 'D1',
                steps: [
                  { title: 'Collect inputs', description: 'Gather datasets.' },
                  { title: 'Run backtest', description: 'Capture metrics.' }
                ]
              }
            ]
          }
        ],
        desired_outputs: [],
        feasibility: { confidence: 'medium', rationale: 'Some data may be missing.' }
      }
    }),
    {}
  )
  expect(generated.displayName).toBe('Created execution plan')
  expect(generated.metaLabel).toBe('2 steps')
  expect(generated.sections[0].kind).toBe('plan')

  // Malformed plan input degrades to the generic input/output sections.
  const malformed = buildActivityDetails(
    activity({ providerToolName: 'mcp.open-science-plan.generate_plan', input: { foo: 1 } }),
    {}
  )
  expect(malformed.displayName).toBe('Created execution plan')
  expect(malformed.sections.every((section) => section.kind === 'code')).toBe(true)

  const failed = buildActivityDetails(
    activity({
      providerToolName: 'mcp__open-science-plan__generate_plan',
      status: 'failed',
      input: { foo: 1 }
    }),
    {}
  )
  expect(failed.displayName).toBe('Failed to create execution plan')
  expect(failed.metaLabel).toBe('failed')

  const stepUpdate = buildActivityDetails(
    activity({
      providerToolName: 'mcp.open-science-plan.update_step_status',
      input: { title: 'Collect inputs', status: 'completed', notes: 'checksums verified' }
    }),
    {}
  )
  expect(stepUpdate.displayName).toBe('Plan step update')
  expect(stepUpdate.subtitle).toBe('Collect inputs')
  const stepSection = stepUpdate.sections[0]
  if (stepSection.kind !== 'summary') throw new Error('expected a summary section')
  expect(stepSection.summary.fields).toEqual([
    { label: 'Step', value: 'Collect inputs' },
    { label: 'Status', value: 'Completed' },
    { label: 'Notes', value: 'checksums verified' }
  ])

  // Malformed update input degrades to generic sections under the same name.
  const badUpdate = buildActivityDetails(
    activity({ providerToolName: 'mcp.open-science-plan.update_step_status', input: {} }),
    {}
  )
  expect(badUpdate.displayName).toBe('Plan step update')
  expect(badUpdate.sections.every((section) => section.kind === 'code')).toBe(true)
})

test('edit tools render per-file diff sections with +A −R meta', () => {
  const details = buildActivityDetails(
    activity({
      providerToolName: 'Edit',
      toolKind: 'edit',
      contentBlocks: [
        {
          type: 'diff',
          path: '$DATA/src/analyze.py',
          oldText: 'a = 1\nb = 2',
          newText: 'a = 1\nb = 3\nc = 4'
        },
        { type: 'diff', path: '$DATA/notes.md', oldText: null, newText: '# Notes' }
      ]
    }),
    {}
  )
  expect(details.displayName).toBe('Edit')
  expect(details.subtitle).toBe('2 files')
  expect(details.metaLabel).toBe('+4 −2')
  expect(details.sections.map((section) => section.kind)).toEqual(['diff', 'diff'])
  expect(details.sections[0]).toMatchObject({
    label: 'analyze.py',
    language: 'python',
    oldText: 'a = 1\nb = 2',
    newText: 'a = 1\nb = 3\nc = 4'
  })

  // A single diff shows its full path; a Write by name only is also an edit.
  const single = buildActivityDetails(
    activity({
      providerToolName: 'Write',
      contentBlocks: [{ type: 'diff', path: '$DATA/new.py', oldText: null, newText: 'x = 1' }]
    }),
    {}
  )
  expect(single.displayName).toBe('Write')
  expect(single.subtitle).toBe('$DATA/new.py')
  expect(single.metaLabel).toBe('+1')

  // Edit tools without diff payloads keep the generic input/output view.
  const noDiff = buildActivityDetails(
    activity({ providerToolName: 'Edit', toolKind: 'edit', input: { file_path: 'a.py' } }),
    {}
  )
  expect(noDiff.sections.every((section) => section.kind === 'code')).toBe(true)
})

test('execute tools show Command/Output sections and exit-code meta', () => {
  const details = buildActivityDetails(
    activity({
      toolKind: 'execute',
      input: { command: 'python analyze.py' },
      output: [{ type: 'text', text: '{"exitCode": 2, "stdout": "boom"}' }]
    }),
    {}
  )
  expect(details.displayName).toBe('Terminal')
  expect(details.subtitle).toBe('python analyze.py')
  expect(details.metaLabel).toBe('exit 2')
  expect(details.sections).toEqual([
    { kind: 'code', label: 'Command', text: 'python analyze.py', language: 'bash' },
    { kind: 'code', label: 'Output', text: '{"exitCode": 2, "stdout": "boom"}' }
  ])

  // Exit code buried in an MCP-style envelope is still found.
  const enveloped = buildActivityDetails(
    activity({
      toolKind: 'execute',
      input: { command: 'make test' },
      output: { result: { structuredContent: { exit_code: 0 } } }
    }),
    {}
  )
  expect(enveloped.metaLabel).toBe('exit 0')

  // No exit code anywhere: no meta label.
  const plain = buildActivityDetails(
    activity({ toolKind: 'execute', input: { command: 'ls' }, output: 'file1\nfile2' }),
    {}
  )
  expect(plain.metaLabel).toBeUndefined()
  expect(plain.sections.map((section) => section.kind)).toEqual(['code', 'code'])

  // Nothing to show at all: generic input/output fallback.
  const empty = buildActivityDetails(activity({ toolKind: 'execute', input: { a: 1 } }), {})
  expect(empty.subtitle).toBeUndefined()
})

test('notebook meta counts figures and output lines; completed adds no status word', () => {
  const details = buildActivityDetails(
    activity({
      providerToolName: 'mcp__open-science-notebook__notebook_execute',
      input: { language: 'python' },
      run: {
        runId: 'r1',
        status: 'completed',
        script: 'a = 1\nb = 2\nplot(a, b)',
        outputs: [
          { type: 'stream', name: 'stdout', text: 'hello' },
          { type: 'display', data: { 'image/png': 'blob:fig-1' } },
          { type: 'display', data: { 'image/jpeg': 'blob:fig-2' } }
        ]
      }
    }),
    {}
  )
  // App semantics: output lines (not script lines), no "done" when completed.
  expect(details.metaLabel).toBe('2 figures · 1 line')
  // Code keeps line numbers; stream output collapses; figures never collapse.
  expect(details.sections[0]).toMatchObject({ kind: 'code', label: 'Code', lineNumbers: true })
  expect(details.sections[1]).toMatchObject({ kind: 'code', label: 'stdout', collapsible: true })
  expect(details.sections[2]).toMatchObject({ kind: 'image' })
  expect('collapsible' in details.sections[2]).toBe(false)

  // Result payloads already covered by the stream text are not double-counted,
  // trailing newlines do not inflate the count, and failed keeps its label.
  const single = buildActivityDetails(
    activity({
      providerToolName: 'mcp__open-science-notebook__notebook_execute',
      run: {
        runId: 'r2',
        status: 'failed',
        script: 'x = 1',
        outputs: [
          { type: 'stream', name: 'stdout', text: '42\n' },
          { type: 'execute_result', data: { 'text/plain': '42', 'image/png': 'blob:fig' } }
        ]
      }
    }),
    {}
  )
  expect(single.metaLabel).toBe('1 figure · 1 line · failed')

  // No figures and no output: a completed run shows no meta at all.
  const quiet = buildActivityDetails(
    activity({
      providerToolName: 'mcp__open-science-notebook__notebook_execute',
      run: { runId: 'r3', status: 'completed', script: 'x = 1', outputs: [] }
    }),
    {}
  )
  expect(quiet.metaLabel).toBeUndefined()
})

test('manage_packages resolves from the title and renders the install row', () => {
  // Real export shape: providerToolName null, identity in the dotted title,
  // input is an MCP envelope.
  const installResult = JSON.stringify({
    ok: true,
    method: 'conda',
    environmentName: 'coverage-env',
    log: 'trace libmamba loading\n\n\nInstalling pandas'
  })
  const details = buildActivityDetails(
    activity({
      providerToolName: undefined,
      title: 'mcp.open-science-notebook.manage_packages',
      input: {
        server: 'open-science-notebook',
        tool: 'manage_packages',
        arguments: { packages: ['pandas', 'scikit-learn'], language: 'python' }
      },
      output: {
        result: { content: [{ type: 'text', text: installResult }], structuredContent: null },
        error: null
      }
    }),
    {}
  )
  expect(details.displayName).toBe('Installed 2 packages')
  expect(details.subtitle).toBe('Python · coverage-env · conda')
  expect(details.metaLabel).toBeUndefined()
  // No packageChanges in the result: ledger rows fall back to the requested specs.
  expect(details.sections[0]).toMatchObject({
    kind: 'packageLedger',
    packages: [{ name: 'pandas' }, { name: 'scikit-learn' }],
    related: [],
    failed: false,
    warning: false
  })
  // The log is cleaned (libmamba trace dropped, blank runs collapsed) and collapsed.
  const logSection = details.sections.find((s) => s.kind === 'code' && s.label === 'Log')
  expect(logSection).toMatchObject({ collapsible: true })
  if (logSection?.kind !== 'code') throw new Error('expected a code log section')
  expect(logSection.text).toBe('Installing pandas')

  // A failed install keeps the in-progress wording and flags both labels.
  const failed = buildActivityDetails(
    activity({
      providerToolName: 'mcp__open-science-notebook__manage_packages',
      status: 'failed',
      input: {
        server: 'open-science-notebook',
        tool: 'manage_packages',
        arguments: { packages: ['r-ggplot2'], language: 'r' }
      },
      output: '{"ok": false, "error": "Solving environment failed", "needsRestart": true}'
    }),
    {}
  )
  expect(failed.displayName).toBe('Installing 1 package')
  expect(failed.subtitle).toBe('R · conda')
  expect(failed.metaLabel).toBe('failed · restart needed')
  // The failure message sits on the ledger (red text below the table, app-style).
  const failedLedger = failed.sections.find((s) => s.kind === 'packageLedger')
  if (failedLedger?.kind !== 'packageLedger') throw new Error('expected a package ledger')
  expect(failedLedger.error).toBe('Solving environment failed')
  expect(failedLedger.failed).toBe(true)
  expect(failedLedger.warning).toBe(true)
  // R spec prefixes are stripped for display (app: packageNameFromSpec).
  expect(failedLedger.packages[0].name).toBe('ggplot2')

  // inspect_packages keeps its previous shape (Result JSON, "Inspect packages").
  const inspect = buildActivityDetails(
    activity({
      providerToolName: 'mcp.open-science-notebook.inspect_packages',
      input: {
        server: 'open-science-notebook',
        tool: 'inspect_packages',
        arguments: { language: 'python' }
      },
      output: [{ type: 'text', text: '{"installed": ["numpy"]}' }]
    }),
    {}
  )
  expect(inspect.displayName).toBe('Inspect packages')
  expect(inspect.subtitle).toBe('python')

  // Malformed output degrades to generic sections without throwing.
  const degraded = buildActivityDetails(
    activity({
      providerToolName: 'mcp.open-science-notebook.manage_packages',
      input: {},
      output: 42
    }),
    {}
  )
  expect(degraded.displayName).toBe('Installed packages')
  expect(degraded.sections.every((s) => s.kind === 'code')).toBe(true)

  // Classifier: title fallback hits; unrelated servers with a same-named tool miss.
  expect(
    classifyActivityRenderer(
      activity({ providerToolName: undefined, title: 'mcp.open-science-notebook.manage_packages' })
    )
  ).toBe('packages')
  expect(
    classifyActivityRenderer(activity({ providerToolName: 'mcp.other-server.manage_packages' }))
  ).toBe('generic-fallback')
})

test('manage_packages joins packageChanges into the ledger with versions and related rows', () => {
  const details = buildActivityDetails(
    activity({
      providerToolName: 'mcp__open-science-notebook__manage_packages',
      input: { packages: ['pandas', 'numpy'], language: 'python' },
      output: JSON.stringify({
        ok: true,
        method: 'conda',
        packageChanges: [
          {
            name: 'pandas',
            change: 'updated',
            beforeVersion: '2.1.0',
            afterVersion: '2.2.3',
            relationship: 'requested'
          },
          {
            name: 'numpy',
            change: 'installed',
            afterVersion: '1.26.4',
            relationship: 'requested'
          },
          {
            name: 'tzdata',
            change: 'installed',
            afterVersion: '2024.1',
            relationship: 'dependency'
          },
          { name: 'pip', change: 'unchanged', relationship: 'dependency' }
        ]
      })
    }),
    {}
  )
  const ledger = details.sections.find((s) => s.kind === 'packageLedger')
  if (ledger?.kind !== 'packageLedger') throw new Error('expected a package ledger')
  // Updated packages show the before → after transition; installs the new version.
  expect(ledger.packages).toEqual([
    { name: 'pandas', source: undefined, change: 'updated', version: '2.1.0 → 2.2.3' },
    { name: 'numpy', source: undefined, change: 'installed', version: '1.26.4' }
  ])
  // Dependencies land in Related changes; unchanged entries are dropped.
  expect(ledger.related).toEqual([
    { name: 'tzdata', source: undefined, change: 'installed', version: '2024.1' }
  ])
  expect(ledger.failed).toBe(false)
})

test('manage_packages resolves R GitHub specs to the repository name', () => {
  const details = buildActivityDetails(
    activity({
      providerToolName: 'mcp__open-science-notebook__manage_packages',
      input: { packages: ['tidyverse/ggplot2@v3.5.0'], language: 'r' },
      output: JSON.stringify({
        ok: true,
        method: 'github',
        packageChanges: [
          {
            name: 'ggplot2',
            change: 'installed',
            afterVersion: '3.5.0',
            relationship: 'requested',
            source: { type: 'github', repository: 'tidyverse/ggplot2', ref: 'v3.5.0' }
          }
        ]
      })
    }),
    {}
  )
  const ledger = details.sections.find((s) => s.kind === 'packageLedger')
  if (ledger?.kind !== 'packageLedger') throw new Error('expected a package ledger')
  // The spec matches the change by repository, and the source label keeps repo@ref.
  expect(ledger.packages).toEqual([
    {
      name: 'ggplot2',
      source: 'tidyverse/ggplot2@v3.5.0',
      change: 'installed',
      version: '3.5.0'
    }
  ])
  expect(details.subtitle).toBe('R · GitHub')
})

test('bash_execute falls back to input.command when the run document is absent', () => {
  // Extracted mode can lack run.json; the command must survive as the Command section.
  const details = buildActivityDetails(
    activity({
      providerToolName: 'mcp.open-science-notebook.bash_execute',
      input: {
        server: 'open-science-notebook',
        tool: 'bash_execute',
        arguments: { command: 'tar -xzf coverage.tar.gz' }
      }
    }),
    {}
  )
  expect(details.displayName).toBe('Shell')
  expect(details.sections[0]).toMatchObject({
    kind: 'code',
    label: 'Command',
    text: 'tar -xzf coverage.tar.gz',
    language: 'bash'
  })

  // Field priority: code beats command, command beats script.
  const priority = buildActivityDetails(
    activity({
      providerToolName: 'mcp.open-science-notebook.bash_execute',
      input: { code: 'code-value', command: 'command-value', script: 'script-value' }
    }),
    {}
  )
  const first = priority.sections[0]
  if (first.kind !== 'code') throw new Error('expected a code section')
  expect(first.text).toBe('code-value')
  const second = buildActivityDetails(
    activity({
      providerToolName: 'mcp.open-science-notebook.bash_execute',
      input: { command: 'command-value', script: 'script-value' }
    }),
    {}
  )
  const secondFirst = second.sections[0]
  if (secondFirst.kind !== 'code') throw new Error('expected a code section')
  expect(secondFirst.text).toBe('command-value')
})

test('notebook rows without run evidence show code shown, never failed', () => {
  // Real export shape (nvda-bitcoin case): the observer failed with a plain
  // artifact error, so no run summary exists — the code never executed.
  const details = buildActivityDetails(
    activity({
      providerToolName: 'mcp.open-science-notebook.notebook_execute',
      status: 'failed',
      executionInvocationId: '46372dcf-62c7-4b8d-ae27-47e4abe3bd07',
      input: { code: 'backtest()' },
      output: {
        result: {
          content: [
            {
              type: 'text',
              text: 'Artifact Version is unavailable in this Project: fc240505'
            }
          ]
        }
      }
    }),
    {}
  )
  expect(details.displayName).toBe('Notebook run')
  expect(details.metaLabel).toBe('code shown')
  // Explicit false: the row must not paint the failure icon from the outer status.
  expect(details.failed).toBe(false)

  // A matching failed run summary in the output keeps the failed label.
  const failedRun = buildActivityDetails(
    activity({
      providerToolName: 'mcp.open-science-notebook.notebook_execute',
      status: 'failed',
      executionInvocationId: 'inv-1',
      input: { code: 'backtest()' },
      output: {
        result: {
          content: [
            {
              type: 'text',
              text: '{"runId": "run-1", "executionInvocationId": "inv-1", "status": "failed"}'
            }
          ]
        }
      }
    }),
    {}
  )
  expect(failedRun.metaLabel).toBe('failed')
  expect(failedRun.failed).toBe(true)

  // A run summary for a different invocation never relabels the row.
  const foreign = buildActivityDetails(
    activity({
      providerToolName: 'mcp.open-science-notebook.notebook_execute',
      status: 'failed',
      executionInvocationId: 'inv-2',
      input: { code: 'backtest()' },
      output: JSON.stringify({ runId: 'run-1', executionInvocationId: 'inv-1', status: 'failed' })
    }),
    {}
  )
  expect(foreign.metaLabel).toBe('code shown')
  expect(foreign.failed).toBe(false)
})

test('group titles and step counts follow notebook run evidence', () => {
  const prepared = activity({
    providerToolName: 'mcp.open-science-notebook.notebook_execute',
    status: 'failed',
    executionInvocationId: 'inv-1',
    input: { code: 'x = 1' },
    output: 'Artifact Version is unavailable in this Project: fc240505'
  })
  const completedRun = activity({
    providerToolName: 'mcp.open-science-notebook.notebook_execute',
    id: 'a2',
    executionInvocationId: 'inv-2',
    input: { code: 'y = 2' },
    output: JSON.stringify({ runId: 'run-2', executionInvocationId: 'inv-2', status: 'completed' })
  })
  // Any prepared notebook run headlines the group (app: Notebook code shown).
  expect(formatStaticGroupTitle([prepared, completedRun])).toBe('Notebook code shown')
  // The prepared row is not a failed step, despite the outer failed status.
  expect(formatStepCount([prepared, completedRun])).toBe('2 steps')

  const failedRun = activity({
    providerToolName: 'mcp.open-science-notebook.notebook_execute',
    status: 'failed',
    executionInvocationId: 'inv-3',
    output: JSON.stringify({ runId: 'run-3', executionInvocationId: 'inv-3', status: 'failed' })
  })
  expect(formatStaticGroupTitle([completedRun, failedRun])).toBe('Failed 2 Notebook runs')
  expect(formatStepCount([completedRun, failedRun])).toBe('2 steps · 1 failed')

  // All-completed groups keep the category clause summary.
  expect(formatStaticGroupTitle([completedRun])).toBe('Completed a Notebook run')
})
