# Open-Science browser import SDK source dependency

The public npm registry returned HTTP 404 for `@aipoch/open-science` on 2026-10-16.
PR [aipoch/open-science#3493](https://github.com/aipoch/open-science/pull/3493)
provides the source entry point. This directory contains the original browser entry point,
public types and Apache-2.0 license from its pinned source commit. The only local
addition is one Biome suppression comment for the intentional control-character
rejection regex. Executable source, types and license are otherwise unchanged:

- Repository: https://github.com/roxi3906/open-science
- Commit: `157a8676ca341612bd1f918a5e3a1f942629e2f4`
- Directory: `packages/open-science/`
- Package version at that commit: `0.1.0` (not a claim of npm availability)
- Integration contract: https://github.com/roxi3906/open-science/blob/157a8676ca341612bd1f918a5e3a1f942629e2f4/packages/open-science/BROWSER_IMPORT.md

| Original file (before the local lint comment) | SHA-256 |
| --- | --- |
| browser-import.mjs | ed92ada586b74c0e4a5e447f7276cfc90139d30d88b8c732a05d2255d0f3e18d |
| browser-import.d.ts | f41624c56001328d04e348975095dd476f6cfd364552f959a312c726c286d07b |
| LICENSE | b038148f912bdd6e61e33e56214d02c4d8a9640f7a637e21dfcf939332816979 |

Import `checkBrowserImportAvailability`, `prepareBrowserImport` and `launchOpenScience` from
`@/vendor/open-science/browser-import.mjs`.
The SDK is bundled as a source dependency; no protocol code is reimplemented.
This also keeps the existing Docker dependency-install layer usable without
introducing a local `file:` package that the layer cannot access.

Do not format or edit the upstream implementation. The provenance unit test
removes exactly the documented lint comment before checking the source hash.
For an upgrade, verify the official
published export or pin a new reviewed source commit, refresh all originals and
their hashes, and run the browser import tests. Once published, replace the
source import with `@aipoch/open-science/browser-import` at a verified exact version.
