/**
 * Coverage audit for the use-case renderer.
 *
 * Scans every generated transcript in public/use-cases/ and reports, per tool,
 * which renderer the web UI will use (via the same classifier the components
 * use). Tools landing in `generic-fallback` are the ones to eyeball manually;
 * anything unexpected there means a missing dedicated renderer.
 *
 * Usage:
 *   bun run scripts/audit-use-cases.ts           report for all cases
 *   bun run scripts/audit-use-cases.ts <slug>    report for one case
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  ALL_ACTIVITY_RENDERERS,
  classifyActivityRenderer
} from '../app/(commonLayout)/open-science/use-cases/_components/activity-classify'
import type { NormalizedActivity, TranscriptItem } from '../lib/use-case-types'
import { COVERAGE_FIXTURE_RENDERERS } from '../mocks/fixtures/use-case-coverage'

const CASES_ROOT = join('public', 'use-cases')

interface Row {
  tool: string
  renderer: string
  count: number
  statuses: Set<string>
}

const auditItems = (items: TranscriptItem[], rows: Map<string, Row>) => {
  for (const item of items) {
    if (item.type !== 'activity-group') continue
    for (const activity of item.activities as NormalizedActivity[]) {
      const tool = activity.providerToolName ?? '(unnamed)'
      const renderer = classifyActivityRenderer(activity)
      const key = `${tool}${renderer}`
      const row = rows.get(key) ?? { tool, renderer, count: 0, statuses: new Set<string>() }
      row.count += 1
      row.statuses.add(activity.status)
      if (activity.toolDisposition) row.statuses.add(activity.toolDisposition)
      rows.set(key, row)
    }
  }
}

const main = () => {
  const [, , slugArg] = process.argv
  const slugs = slugArg
    ? [slugArg]
    : readdirSync(CASES_ROOT, { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .map((entry) => entry.name)
        .sort()

  const rows = new Map<string, Row>()
  let transcripts = 0
  for (const slug of slugs) {
    for (const tier of ['essential', 'full'] as const) {
      const path = join(CASES_ROOT, slug, `${tier}.json`)
      if (!existsSync(path)) continue
      transcripts += 1
      const model = JSON.parse(readFileSync(path, 'utf8')) as { items: TranscriptItem[] }
      auditItems(model.items, rows)
    }
  }

  const sorted = [...rows.values()].sort((a, b) =>
    a.renderer === b.renderer ? a.tool.localeCompare(b.tool) : a.renderer.localeCompare(b.renderer)
  )
  let fallbackCount = 0
  console.log(`audited ${slugs.length} case(s), ${transcripts} transcript file(s)\n`)
  console.log(`${'renderer'.padEnd(18)} ${'activities'.padStart(10)}  statuses      tool`)
  for (const row of sorted) {
    if (row.renderer === 'generic-fallback') fallbackCount += row.count
    console.log(
      `${row.renderer.padEnd(18)} ${String(row.count).padStart(10)}  ${[...row.statuses]
        .sort()
        .join(',')
        .padEnd(13)} ${row.tool}`
    )
  }
  console.log(
    `\n${fallbackCount} activities use generic-fallback — expand them on the replay page to verify they read well.`
  )

  // Cross-check: every renderer the UI ships must be exercised by the
  // coverage fixture, otherwise regressions in that renderer go unnoticed.
  const missingCoverage = ALL_ACTIVITY_RENDERERS.filter(
    (renderer) => !COVERAGE_FIXTURE_RENDERERS.includes(renderer)
  )
  if (missingCoverage.length > 0) {
    console.error(
      `\nFAIL: renderer(s) without coverage fixture: ${missingCoverage.join(', ')}\n` +
        'Add a matching entry to mocks/fixtures/use-case-coverage.ts and the Playwright assertions.'
    )
    process.exit(1)
  }
  console.log('coverage cross-check: all renderers have fixture entries')
}

main()
