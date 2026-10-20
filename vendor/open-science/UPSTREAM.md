# Open-Science browser import SDK source dependency

The public npm registry returned HTTP 404 for `@aipoch/open-science` on 2026-10-20.
PR [aipoch/open-science#3493](https://github.com/aipoch/open-science/pull/3493)
was merged on 2026-10-19 and provides the source entry point. This directory contains
the original browser entry point, public types and Apache-2.0 license from its pinned source commit. The only local
addition is one Biome suppression comment for the intentional control-character
rejection regex. Executable source, types and license are otherwise unchanged:

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
and pairs it with the original declaration types; it adds no protocol behavior.
The SDK is bundled as a source dependency; no protocol code is reimplemented.
This also keeps the existing Docker dependency-install layer usable without
introducing a local `file:` package that the layer cannot access.

Do not format or edit the upstream implementation. The provenance unit test
removes exactly the documented lint comment before checking the source hash.
For an upgrade, verify the official
published export or pin a new reviewed source commit, refresh all originals and
their hashes, and run the browser import tests.

TODO(open-science-sdk): After npm publishes a version verified to include discovery,
standalone launch, wait-for-launch readiness, phase notifications and authenticated
`cancelled` semantics, pin that exact version. Switch only `lib/science-package/sdk.ts`
to `@aipoch/open-science/browser-import`, then remove this directory and its provenance
test. Retain the SDK contract, website lifecycle, mock launch and browser flow tests.
Dependency/configuration changes require their own authorization under AGENTS.md.
No install-time patch or dynamic dependency fallback is used.
