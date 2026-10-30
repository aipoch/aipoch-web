# Ordered replay v1

The user authorized optional ordered replay data and publisher integration on 2026-10-30.
Raw session and archive bytes remain unchanged. Existing publications fall back to the
complete-session reader. Only newly published/re-published packages gain early rendering.

The publisher verifies the complete archive and inventory first. Under
`extracted/replay-v1/<archive-sha256>/` it derives `index.json` and `blocks.ndjson`.
The index binds the archive identity, original session SHA-256, and the byte length and
SHA-256 of every NDJSON record (excluding LF). Record zero contains session/asset metadata,
Notebook path roots and final turn/reviewer-response markers. Following records contain one
complete message, standalone activity or finalized consecutive activity group, with all
associated Notebook runs. Sorting uses the existing Web timestamp/tie rules. Compaction
snapshots are deduplicated and reduced to lifecycle fields before serialization.

The browser verifies each record against its index slot before normalization with the
existing renderer projection. Sequence gaps, unexpected block shape, digest mismatches,
extra records or premature EOF stop the stream. Only a contiguous verified prefix is
published; previously rendered items keep identity, grouping and final turn markers.
The index is bounded metadata; its HTTP origin remains the existing publication trust
boundary. Per-record hashes detect mixed/corrupt transfers, not a compromised publisher.

The raw session and Reviewer records download independently for full review association
and scope checks. The original session hash must match the stream index before attaching
reviews. Missing legacy records retain the verified archive fallback. All transport uses
the existing 30-second first-nonempty-chunk/idle deadline and cancellation cleanup.

Publisher changes are limited to deterministic derivation, staging, integrity read-back
and upload-inventory validation. No manifest schema, workflow, runtime, CDN, credentials or
live publication changes are required. Derived bytes are regenerated during publication
validation; a forged plan cannot introduce unrelated uploads. The existing all-files-before-
manifest publication order remains intact.

Implementation: generator and publisher tests; Web integrity reader and worker events;
stable incremental UI rows and independent reviews; shared golden fixture parity;
slow-stream browser assertions before EOF, interruption/cancellation and legacy fallback.

## Compatibility and rollout

The header also carries upload associations from all messages, including references to an
upload introduced in a different block. A shared golden fixture in the Web and publisher
repositories checks generation and full-session projection parity. Nullable optional graphs
and empty elicitation objects follow the existing Web semantics; incomplete legacy records
without stable IDs/finite timestamps remain on the old path. Indices are limited to 4 MiB,
individual records to 128 MiB, and the complete projection to 256 MiB.

Deploy the Web consumer and merge the publisher companion change in either order. Existing
packages remain readable. Regenerating/re-publishing a selected case through the normal
publication path adds the sidecar files; neither a Web deploy alone nor an unchanged-case
publication automatically migrates old cases. No live publication was performed for this
change. A missing index (403/404) selects legacy loading; a present but corrupt/mismatched
index fails explicitly instead of silently rendering an unverified stream.

The stream remains append-only. A corrupt, truncated or out-of-sequence record stops further
rendering and preserves the visible prefix with the incomplete-loading message. Per-block
normalization receives complete Notebook runs and global upload/asset context. Raw session
failure only fails the independent reviews; review retry can re-fetch that source and must
match the index's session SHA before attaching cards.

Sitemap scope is unchanged: the 128 canonical replay URLs in `sitemap-impact.csv` retain the
same actual modification date, 2026-10-30. Gallery/overview dates are unchanged.

## Verified results (2026-10-30)

- Web: 193 focused replay/package/mock-contract unit tests passed, including before-EOF
  emission, one-byte boundaries, corrupt/reordered/truncated records, complete Markdown,
  cross-message uploads, source retry, continuous activity beyond 30 seconds, initial/idle
  deadlines and cancellation cleanup. Typecheck passed; scoped Biome has only the existing
  `load.ts` console warning.
- Browser: desktop and mobile each displayed the first block while both the ordered stream
  and original session were unfinished; streams stayed active beyond 30 seconds, and the
  original session was still unfinished when all ordered blocks completed. Original DOM
  identity, Markdown/code/table/math completeness and compact filtering were checked.
- Interruption, body retry, independent review failure/retry and route-unmount Worker
  termination passed. Four legacy compact/math browser cases also passed (seven targeted
  browser cases in total across the final runs). The initial cancellation assertion used
  the mock adapter's stream-cancel counter, which does not observe client disconnects;
  the test now observes actual Worker termination and route removal. Underlying reader/
  timer cancellation is verified separately in unit tests. Mock response timers are cleaned
  up between scenarios; no runtime settings were changed.
- Publisher: all 242 tests passed with Python 3.12 and the repository-pinned SDK in a task
  virtualenv. Six focused tests cover the shared golden output, grouping, compact omission,
  Notebook dependencies, optional field compatibility, extraction read-back, unchanged raw
  bytes, re-derived verification inventory and corrupt archive rejection. Schema and package
  filename checks passed. The system Python 3.9 cannot run the existing suite; no shared
  Python environment was changed.
- Nine sitemap snapshot tests passed, covering the existing 128 canonical replay URLs and
  unaffected timestamps. Screenshots were uploaded as GitHub attachments, never committed.
- Full Web unit/mock suites were not rerun; earlier unrelated environment/baseline failures
  remain documented in README.md. No production publication or deployed-page claim is made.
