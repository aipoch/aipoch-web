# Context compaction replay validation

The replay parser projects structurally identified `ContextCompaction` activities into
status-only rows. Both extracted metadata and verified archives use this projection;
source packages remain unchanged. Unmarked summaries in older ordinary messages are
outside this change because their identity cannot be established safely from prose.

Validation on 2026-10-30:

- `bun run test:unit`: 558 passed.
- `bun run typecheck`: passed.
- `bun test ./tests/integration/mock-development.test.ts --test-name-pattern 'compaction replay'`:
  4 passed, covering desktop/mobile and extracted/archive paths, HTTP 200, copy behavior,
  ordinary messages/assets, safe labels and excluded provider payloads.
- Biome checks on the 11 changed TypeScript/TSX files and `git diff --check`: passed.
- Full-repository lint: 15 errors in untouched files; not a passing check.
- Earlier browser runs encountered an intermittent Shiki external-module SSR error,
  also reproduced in an unmodified `12cb4f6` snapshot with the same installed dependencies.
  Restarting the mock server subsequently returned HTTP 200 and the strict regression
  passed. No runtime, dependency, deployment or environment configuration was changed.

[Sitemap impact](./sitemap-impact.csv) lists all 128 concrete replay URLs from the
published manifest snapshot retrieved on 2026-10-30. Their template date source is
`OPEN_SCIENCE_USE_CASE_REPLAY_LAST_MODIFIED = '2026-10-30'` in `app/sitemap.ts`.
A separate local sitemap run using that snapshot checked every listed URL. Existing
sitemap tests also verify unchanged gallery/overview dates and excluded routes.
