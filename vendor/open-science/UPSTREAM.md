# Open-Science browser import SDK source dependency

The public npm registry returned HTTP 404 for `@aipoch/open-science` on 2026-10-15.
PR [aipoch/open-science#3493](https://github.com/aipoch/open-science/pull/3493)
provides the source entry point. This directory contains the original browser entry point,
public types and Apache-2.0 license from its pinned source commit. The only local
addition is one Biome suppression comment for the intentional control-character
rejection regex. Executable source, types and license are otherwise unchanged:

- Repository: https://github.com/roxi3906/open-science
- Commit: `49848625912937bb5050d061d71966a42cf4b4e0`
- Directory: `packages/open-science/`
- Package version at that commit: `0.1.0` (not a claim of npm availability)
- Integration contract: https://github.com/roxi3906/open-science/blob/49848625912937bb5050d061d71966a42cf4b4e0/packages/open-science/BROWSER_IMPORT.md

| Original file (before the local lint comment) | SHA-256 |
| --- | --- |
| browser-import.mjs | 62dabc102ed38fbd70988abd6f1de08b631f2bcc68e9a57e395b6b4862fe722c |
| browser-import.d.ts | 9294310ac24722c0b24a4fb98efed5723c2e51281303dc42f77ab828170f0996 |
| LICENSE | b038148f912bdd6e61e33e56214d02c4d8a9640f7a637e21dfcf939332816979 |

Import `checkBrowserImportAvailability` and `prepareBrowserImport` from
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
