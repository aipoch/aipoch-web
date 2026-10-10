// Port of the Open-Science app's notebook-tool-names.ts reduced to what the
// static replay needs: run/control tool matching and language resolution.
// Memory tools are dropped — the web renderer has no memory surface.

// Provider tool suffixes (under the notebook MCP server) whose input/result is one kernel run.
const NOTEBOOK_RUN_TOOL_SUFFIXES = ['notebook_execute', 'repl_execute', 'bash_execute'] as const
const NOTEBOOK_CONTROL_TOOL_SUFFIXES = [
  'notebook_state',
  'list_notebook_runtimes',
  'notebook_bind_runtime',
  'notebook_switch_runtime',
  'notebook_restart',
  'notebook_shutdown',
  'inspect_packages',
  'manage_packages',
  'manage_environments'
] as const

// The notebook MCP server segment, hyphenated. The responses bridge sanitizes it to
// open_science_notebook; we normalize `_`→`-` before the exact comparison so both forms match.
const NOTEBOOK_SERVER_SEGMENT = 'open-science-notebook'

// Returns the matched suffix when a tool name belongs to the given server, else undefined.
// Frameworks namespace tools as mcp__<server>__<tool> (Claude Code / responses bridge),
// <server>.<tool> or mcp.<server>.<tool> (dotted), or the broker-projected <server>/<tool>
// identity, so only `__`, `.`, and `/` are treated as segment delimiters — single underscores
// occur inside both tool suffixes (notebook_execute) and sanitized server names
// (open_science_notebook) and must not split. The segment immediately before the suffix must
// equal the server exactly after normalizing `_`→`-`, so a lookalike (…-staging) or an
// unrelated server that merely contains the phrase is rejected, and a bare leaf name too.
const matchServerTool = (
  toolName: string | undefined | null,
  server: string,
  suffixes: readonly string[]
): string | undefined => {
  const name = toolName?.trim().toLowerCase() ?? ''
  if (!name) return undefined

  const segments = name.split(/__|\.|\//u)
  if (segments.length >= 2) {
    const suffix = segments[segments.length - 1]
    if (suffixes.some((known) => known === suffix)) {
      const serverSegment = segments[segments.length - 2].replace(/_/gu, '-')
      if (serverSegment === server) return suffix
    }
  }

  // opencode joins server and tool with a single `_` (<server>_<tool>). A single `_` also occurs
  // inside the server name and the suffix, so it can't be used as a split delimiter — instead match
  // the exact known server spellings (hyphenated or sanitized) concatenated with each known suffix.
  const sanitizedServer = server.replace(/-/gu, '_')
  for (const suffix of suffixes) {
    if (name === `${server}_${suffix}` || name === `${sanitizedServer}_${suffix}`) {
      return suffix
    }
  }
  return undefined
}

// True when a tool name is exactly <server>'s <tool> in any provider namespacing form
// (mcp__server__tool / mcp.server.tool / server/tool / server_tool).
const matchToolName = (
  toolName: string | undefined | null,
  server: string,
  tool: string
): boolean => matchServerTool(toolName, server, [tool]) !== undefined

const matchNotebookTool = (
  toolName: string | undefined | null,
  suffixes: readonly string[]
): string | undefined => matchServerTool(toolName, NOTEBOOK_SERVER_SEGMENT, suffixes)

const matchNotebookRunTool = (toolName: string | undefined | null): string | undefined =>
  matchNotebookTool(toolName, NOTEBOOK_RUN_TOOL_SUFFIXES)

const matchNotebookControlTool = (toolName: string | undefined | null): string | undefined =>
  matchNotebookTool(toolName, NOTEBOOK_CONTROL_TOOL_SUFFIXES)

// Control tools with a dedicated summary card (mirrors the app's isNotebookSummaryTool).
const NOTEBOOK_SUMMARY_TOOL_SUFFIXES = [
  'notebook_state',
  'list_notebook_runtimes',
  'notebook_bind_runtime',
  'notebook_switch_runtime',
  'notebook_restart'
] as const

const isNotebookSummaryToolName = (toolName: string | undefined | null): boolean =>
  (NOTEBOOK_SUMMARY_TOOL_SUFFIXES as readonly string[]).includes(
    matchNotebookControlTool(toolName) ?? ''
  )

// Resolves a notebook/kernel execute call's language, for display naming and syntax highlighting
// (Shiki language id). Priority: explicit kernel field on input → tool-name suffix → code
// heuristics → python.
const resolveNotebookLanguage = (
  toolName: string | undefined | null,
  input: Record<string, unknown> | undefined,
  code: string | undefined
): string => {
  // 1. Explicit kernel field (kernelKind, kernel, or language) in the input.
  const explicit = ['kernelKind', 'kernel', 'language'].reduce<string | undefined>(
    (found, key) =>
      found ?? (typeof input?.[key] === 'string' ? (input[key] as string) : undefined),
    undefined
  )
  if (explicit) {
    const kernelMap: Record<string, string> = {
      python: 'python',
      r: 'r',
      repl: 'javascript',
      bash: 'bash'
    }
    const mapped = kernelMap[explicit.toLowerCase()]
    if (mapped) return mapped
  }

  // 2. Tool-name suffix: repl_execute → javascript, bash_execute → bash.
  const suffix = matchNotebookRunTool(toolName)
  if (suffix === 'repl_execute') return 'javascript'
  if (suffix === 'bash_execute') return 'bash'

  // 3. Code heuristics when the notebook server left kernelKind blank (infer R cells, etc).
  if (code) {
    const heuristic = detectCellLanguage(code)
    if (heuristic !== 'python') return heuristic
  }

  // 4. Default to Python (the most common notebook kernel).
  return 'python'
}

// Heuristics to infer a notebook cell's language when the kernel field is absent. R cells have a
// signature that's unambiguous enough to recognize; everything else defaults to Python.
const detectCellLanguage = (code: string): string => {
  const trimmed = code.trim()
  // R assignment operators and common R functions that rarely appear in Python.
  if (
    /<-/.test(trimmed) ||
    /\blibrary\(/.test(trimmed) ||
    /\bdata\.frame\(/.test(trimmed) ||
    /\b(ggplot|dplyr|tidyr)\(/.test(trimmed)
  ) {
    return 'r'
  }
  return 'python'
}

export {
  isNotebookSummaryToolName,
  matchNotebookControlTool,
  matchNotebookRunTool,
  matchNotebookTool,
  matchToolName,
  resolveNotebookLanguage
}
