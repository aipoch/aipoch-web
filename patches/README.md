# Open-Science SDK patch

`@aipoch/open-science@1.0.1` needs this temporary patch for 30 connection attempts,
configurable retry gaps, count-only waiting across page suspension, and reliable
cancellation/timer cleanup. Runtime code and types match
[upstream draft PR #3770](https://github.com/aipoch/open-science/pull/3770).
Bun applies the patch automatically during `bun install --frozen-lockfile`.

Keep the committed lockfile: its SDK/runtime entries were generated through npm's
lockfile and imported by Bun. Direct resolution in Bun 1.3.14 incorrectly fetches
bundled runtime dependencies from npm and fails with 404s.

## Upgrade and remove

1. Check the released npm package against PR #3770, including types and cancellation.
2. Remove the old `patchedDependencies` entry and patch file, then pin the candidate
   with `bun add --exact @aipoch/open-science@<version>`. Regenerate and commit `bun.lock`.
3. Test the unpatched version:
   ```sh
   bun run typecheck
   bun test tests/unit/browser-import-sdk-contract.test.ts tests/unit/browser-science-import.test.ts
   bun test tests/integration/browser-import-wait-contract.test.ts tests/integration/browser-science-import.test.ts
   bun run test:mock --test-name-pattern 'prepares (replay|detail)'
   ```
4. Verify a clean `bun install --frozen-lockfile`. Remove this note and its README link
   only after all checks pass; otherwise retain or refresh the patch for that version.
   If no patches remain, also remove `COPY patches ./patches` from `Dockerfile`.

Keep these behavior tests after removing the patch. Confirm all 30 attempts survive
suspension, cancellation stops requests, and retries reuse the Blob with click-only relaunch.
