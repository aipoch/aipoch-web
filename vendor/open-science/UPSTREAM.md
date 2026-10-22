# Open-Science browser import SDK source dependency

The public npm registry returned HTTP 404 for `@aipoch/open-science` on 2026-10-20.
PR [aipoch/open-science#3493](https://github.com/aipoch/open-science/pull/3493)
was merged on 2026-10-19 and provides the source entry point. This directory contains
the browser entry point, public types and Apache-2.0 license from its pinned source commit,
with the reviewed local changes below. The original hashes remain recorded for upstream comparison.

- Repository: https://github.com/aipoch/open-science
- Commit: `121f459f5a85b04156b40c235dbfefba25a126bc`
- Directory: `packages/open-science/`
- Package version at that commit: `0.1.0` (not a claim of npm availability)
- Integration contract: https://github.com/aipoch/open-science/blob/121f459f5a85b04156b40c235dbfefba25a126bc/packages/open-science/BROWSER_IMPORT.md

| Original file (before the local lint comment) | SHA-256 |
| --- | --- |
| browser-import.mjs | 21d513281aff4bc30366c8e749b4ac3613ce5c761685269a13e5221450fa07eb |
| browser-import.d.ts | 84b70c2b26f8792d141184065b6ae4ded8b2a97ed2903be5be230e20f64e794d |
| LICENSE | b038148f912bdd6e61e33e56214d02c4d8a9640f7a637e21dfcf939332816979 |

Website code imports official interfaces and types only through
`@/lib/science-package/sdk`. That module forwards the vendored implementation
and pairs it with the matching declaration types; it adds no protocol behavior.
The SDK is bundled as a source dependency; no protocol code is reimplemented.
This also keeps the existing Docker dependency-install layer usable without
introducing a local `file:` package that the layer cannot access.

## Local changes (2026-10-22)

The browser flow requires 30 attempts with three-second request deadlines and gaps.
The pinned SDK only allowed five count-based attempts and clamped launch waiting to
120 seconds, two-second requests and one-second gaps. The local SDK now:

- Accepts up to 30 count-based attempts and `readinessIntervalMs` (0–30,000 ms).
  Existing defaults and legacy `wait-for-launch` behavior remain compatible.
- Allows `readyTimeoutMs: null` only in `attempts` mode to disable the overall
  readiness deadline. Attempt count, per-request timeouts, and cancellation still
  apply after page suspension. Numeric budgets and defaults retain their existing
  caps; `wait-for-launch` continues to require a finite positive deadline.
- Exposes idempotent `cancel()` to abort the transfer lifetime and best-effort send
  the secret-authenticated DELETE, including during readiness. A canceled transfer
  cannot be reused. The cancellation request has its own two-second cleanup budget.
- Clears per-request timers after response bodies finish, including on cancellation.
- Retains the existing HMAC identity and receipt verification, AES-GCM encryption,
  filename validation, and receipt-only completion semantics.

The website selects 30 attempts, 3,000 ms per request, 3,000 ms gaps, and
`readyTimeoutMs: null`. An elapsed wall-clock deadline must not discard remaining
attempts when the browser pauses the page. Without suspension, thirty fully timed-out
attempts take 177 seconds; suspension can extend that duration.
The existing Biome control-character regex comment is also retained.

| Local file (excluding the lint comment) | SHA-256 |
| --- | --- |
| browser-import.mjs | 26313c4e91d41323f78543cf2d730e9aa0d89dd75909b36a48e7144cd76db806 |
| browser-import.d.ts | f6892ef966030dd5375b429847db36f9acedefda5ee8da26f84f5ba6402dcb7c |

The provenance test pins these reviewed local bytes and the unchanged license.
When upgrading, reconcile these local changes with the upstream source and run the
SDK contract, browser lifecycle, and mock integration tests.

TODO(open-science-sdk): After npm publishes a version verified to include discovery,
standalone launch, wait-for-launch readiness, phase notifications and authenticated
`cancelled` semantics plus the local retry and cancellation API, pin that exact version. Switch only `lib/science-package/sdk.ts`
to `@aipoch/open-science/browser-import`, then remove this directory and its provenance
test. Retain the SDK contract, website lifecycle, mock launch and browser flow tests.
Dependency/configuration changes require their own authorization under AGENTS.md.
No install-time patch or dynamic dependency fallback is used.
