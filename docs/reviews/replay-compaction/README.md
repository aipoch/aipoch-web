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

## Idle downloads and conservative progressive rendering

The follow-up keeps the existing export format. A published Wordle session was inspected:
`messages` precedes `artifacts` and `conversationGraph`, and the current viewer merges
messages by `createdAt` with activities by epoch-scale `sortIndex` (falling back to
`createdAt`). Adjacent activities are grouped only after that merge. Notebook runs,
Reviewer records and asset associations must also resolve before blocks are final.
There is no declared streaming order or watermark in the export.

The reader incrementally assembles complete JSON values across byte chunks, but buffers
all records until document EOF and dependencies are complete. Verified archive parsing
remains behind the existing size, SHA-256 and inventory checks. The final display model,
including compaction filtering and group/turn boundaries, is then revealed in batches of
eight complete blocks. Previously displayed block identities and grouping remain stable.
If the worker fails during this phase, visible blocks and their asset URLs remain available
until retry/unmount, with an incomplete-loading warning. A download failure before the
ordering barrier has no safe visible prefix to preserve.

Downloads now use a 30-second first-nonempty-body-chunk deadline and a renewable 30-second
idle deadline. Headers and empty chunks do not extend the wait. EOF, errors and cancellation
clear timers; unmount terminates the worker and clears scheduled rendering and owned URLs.

Follow-up validation on 2026-10-30:

- Full unit suite: 589 passed; focused suite: 110 passed.
- Typecheck passed. Scoped Biome checks passed with one existing console warning.
- Seven targeted mock/browser scenarios passed: desktop/mobile compaction through both
  loading paths, metadata and archive downloads lasting about 36 seconds each, and a worker
  transport failure preserving the rendered prefix and showing the incomplete warning.
- Timeout tests use a controlled clock for first-byte waits, empty chunks, stalled bodies,
  cancellation, errors and EOF cleanup. Byte-by-byte parsing tests cover UTF-8, escapes,
  malformed/truncated records, Markdown/code/tables and deferred out-of-order dependencies.
- The first slow-browser run matched Next.js's empty route-announcer alert in an overly broad
  assertion; the assertion now checks the actual replay error text, and all seven reran successfully.
- After caching finalized row elements to avoid rendering earlier Markdown again in each batch,
  all 589 unit tests, typecheck and the five affected UI scenarios passed again. Follow-up review
  found no remaining actionable issues. The full mock suite and production build were not rerun.
- All affected replay URLs retain the same task date, `2026-10-30`, in the existing sitemap
  inventory. No publishing, dependency, deployment or runtime configuration was changed.

This improves parsing and final rendering responsiveness; it does not promise a first block
before all legacy metadata downloads finish. Supporting that would require a separately
reviewed publisher-generated, version-bound ordered block stream with complete dependencies.
