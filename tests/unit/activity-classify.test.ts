import { expect, test } from 'bun:test'
import {
  ALL_ACTIVITY_RENDERERS,
  classifyActivityRenderer
} from '../../app/(commonLayout)/open-science/use-cases/_components/activity-classify'
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
