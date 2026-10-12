# Open-Science browser import SDK source dependency

The public npm registry returned HTTP 404 for `@aipoch/open-science` on 2026-10-12.
PR [aipoch/open-science#3493](https://github.com/aipoch/open-science/pull/3493) was
still a draft. This directory contains the original browser entry point,
public types and Apache-2.0 license from its pinned source commit. The only local
addition is one Biome suppression comment for the intentional control-character
rejection regex. Executable source, types and license are otherwise unchanged:

- Repository: https://github.com/roxi3906/open-science
- Commit: `578a35846751a3326e5d26aa2eaf3d600e1c473b`
- Directory: `packages/open-science/`
- Package version at that commit: `0.1.0` (not a claim of npm availability)
- Integration contract: https://github.com/roxi3906/open-science/blob/578a35846751a3326e5d26aa2eaf3d600e1c473b/packages/open-science/BROWSER_IMPORT.md

| Original file (before the local lint comment) | SHA-256 |
| --- | --- |
| browser-import.mjs | e79eae7534187fc3b3cf5bfcb80778dda1e2636361a44b728c422afdca2ff037 |
| browser-import.d.ts | e13fc0620bd2c5bd863b3cf7b00b7c4e2a23def786f0d84f6431570ffe8cf7d7 |
| LICENSE | b038148f912bdd6e61e33e56214d02c4d8a9640f7a637e21dfcf939332816979 |

Import `prepareBrowserImport` from `@/vendor/open-science/browser-import.mjs`.
The SDK is bundled as a source dependency; no protocol code is reimplemented.
This also keeps the existing Docker dependency-install layer usable without
introducing a local `file:` package that the layer cannot access.

Do not format or edit the upstream implementation. The provenance unit test
removes exactly the documented lint comment before checking the source hash.
For an upgrade, verify the official
published export or pin a new reviewed source commit, refresh all originals and
their hashes, and run the browser import tests. Once published, replace the
source import with `@aipoch/open-science/browser-import` at a verified exact version.
