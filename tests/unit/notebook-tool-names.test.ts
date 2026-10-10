import { expect, test } from 'bun:test'
import {
  isNotebookSummaryToolName,
  matchNotebookControlTool,
  matchNotebookRunTool,
  matchToolName,
  resolveNotebookLanguage
} from '../../app/(commonLayout)/open-science/use-cases/_components/notebook-tool-names'

test('matches kernel-run tools across every provider namespacing form', () => {
  for (const name of [
    'mcp__open-science-notebook__notebook_execute',
    'mcp.open-science-notebook.notebook_execute',
    'open-science-notebook/notebook_execute',
    'open-science-notebook_notebook_execute',
    'open_science_notebook_notebook_execute',
    'open_science_notebook__notebook_execute',
    'MCP.OPEN-SCIENCE-NOTEBOOK.NOTEBOOK_EXECUTE',
    '  mcp__open-science-notebook__repl_execute  '
  ]) {
    expect(matchNotebookRunTool(name)).toBe(
      name.includes('repl_execute') ? 'repl_execute' : 'notebook_execute'
    )
  }
})

test('rejects lookalike servers, bare leaf names, and empty input', () => {
  for (const name of [
    'mcp.open-science-notebook-staging.notebook_execute',
    'my-open-science-notebook.notebook_execute',
    'mcp__other-server__notebook_execute',
    'notebook_execute',
    'open-science-notebook_notebook_execute_extra',
    '',
    '   '
  ]) {
    expect(matchNotebookRunTool(name)).toBeUndefined()
  }
  expect(matchNotebookRunTool(undefined)).toBeUndefined()
  expect(matchNotebookRunTool(null)).toBeUndefined()
})

test('matches control tools and separates the summary-card subset', () => {
  expect(matchNotebookControlTool('mcp.open-science-notebook.notebook_restart')).toBe(
    'notebook_restart'
  )
  expect(matchNotebookControlTool('mcp__open-science-notebook__notebook_state')).toBe(
    'notebook_state'
  )
  // Run tools are not control tools, and shutdown has no summary card.
  expect(matchNotebookControlTool('mcp.open-science-notebook.notebook_execute')).toBeUndefined()
  expect(isNotebookSummaryToolName('mcp.open-science-notebook.notebook_restart')).toBe(true)
  expect(isNotebookSummaryToolName('mcp.open-science-notebook.notebook_shutdown')).toBe(false)
})

test('resolves the kernel language by explicit field, suffix, heuristic, then python', () => {
  const run = 'mcp.open-science-notebook.notebook_execute'
  // Explicit input field wins over the tool-name suffix.
  expect(resolveNotebookLanguage(run, { kernelKind: 'r' }, 'print(1)')).toBe('r')
  expect(resolveNotebookLanguage(run, { language: 'python' }, undefined)).toBe('python')
  expect(
    resolveNotebookLanguage('mcp__open-science-notebook__repl_execute', { kernel: 'r' }, 'x')
  ).toBe('r')
  // Tool-name suffix.
  expect(resolveNotebookLanguage('mcp__open-science-notebook__repl_execute', {}, 'x')).toBe(
    'javascript'
  )
  expect(resolveNotebookLanguage('open-science-notebook/bash_execute', {}, 'ls')).toBe('bash')
  // Code heuristics for R cells.
  expect(resolveNotebookLanguage(run, {}, 'x <- c(1, 2)')).toBe('r')
  expect(resolveNotebookLanguage(run, {}, 'library(ggplot2)')).toBe('r')
  expect(resolveNotebookLanguage(run, {}, 'data.frame(a = 1)')).toBe('r')
  // Default.
  expect(resolveNotebookLanguage(run, {}, 'print("hello")')).toBe('python')
  expect(resolveNotebookLanguage(undefined, undefined, undefined)).toBe('python')
})

test('matchToolName matches a single server tool across all namespacing forms', () => {
  for (const name of [
    'mcp__open-science-artifacts__write_artifact_file',
    'mcp.open-science-artifacts.write_artifact_file',
    'open-science-artifacts/write_artifact_file',
    'open-science-artifacts_write_artifact_file',
    'open_science_artifacts__write_artifact_file',
    'MCP.OPEN-SCIENCE-ARTIFACTS.WRITE_ARTIFACT_FILE'
  ]) {
    expect(matchToolName(name, 'open-science-artifacts', 'write_artifact_file')).toBe(true)
  }
  // Wrong tool on the right server, and vice versa.
  expect(
    matchToolName(
      'mcp.open-science-artifacts.read_artifact_file',
      'open-science-artifacts',
      'write_artifact_file'
    )
  ).toBe(false)
  expect(
    matchToolName(
      'mcp.open-science-library.write_artifact_file',
      'open-science-artifacts',
      'write_artifact_file'
    )
  ).toBe(false)
})

test('matchToolName rejects lookalike servers and bare leaf names', () => {
  for (const name of [
    'mcp.open-science-artifacts-other.write_artifact_file',
    'mcp__open-science-artifacts-staging__write_artifact_file',
    'my-skills.load_skill',
    'write_artifact_file',
    'load_skill'
  ]) {
    expect(matchToolName(name, 'open-science-artifacts', 'write_artifact_file')).toBe(false)
    expect(matchToolName(name, 'skills', 'load_skill')).toBe(false)
  }
})
