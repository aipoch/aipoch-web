# Leaderboard and Agent Skills UI review

Review date: 2026-09-23. Baseline: PR #17 (`17a282ff864b61a9da3caf6d864722b80e671196`),
which includes PR #16. This review covers the final scope with the original Product navigation.

## Scope

- Apply the [Leaderboard design](https://www.figma.com/design/6zS3GvT25svG6reU1oFKVi/AIPOCH-Website-Hi-F?node-id=1675-13746)
  to `/leaderboard`: hero statistics, summary strip, filters, continuous rows and score visuals.
  Preserve search, filtering, pagination, API-controlled period visibility and existing links.
  Hover changes row backgrounds without adding shadows.
- Apply the [Abstract Summarizer detail design](https://www.figma.com/design/6zS3GvT25svG6reU1oFKVi/AIPOCH-Website-Hi-F?node-id=2046-34056)
  to skill detail pages: hero, download action, file tree, evaluation, Markdown, contents sidebar
  and metadata. Core and Medical Task content align vertically; task rows share available height.
  Medical Task labels use single-line ellipses with full-text hover titles.
- Skill-list titles wrap naturally; descriptions use three lines. Cards size to content, share
  a height within each grid row and align their bottom arrows.
- Preserve Product, including MedFlow and the disabled Evova entry. Navigation highlights follow
  hover rather than the current route or expanded desktop menu. Accessible current-page markers,
  keyboard controls and mobile navigation remain functional.
- Scope the content footer and navbar spacing/background to the redesigned pages. Period
  leaderboard pages and report content retain their existing presentation. Shared navigation
  hover behavior applies throughout the common layout.
- The deferred Use Cases page, its entry, assets and tests are absent from this change.

No production API contract, dependency, environment file, runtime/build setting, container,
proxy or deployment configuration changed. The existing real-data preview uses temporary process
environment settings authorized for local verification; none are committed.

## Validation

Checks run on this final scope:

- `bun run typecheck`: passed.
- `bun run test:unit`: 241 passed, 0 failed across 47 files.
- Biome check on all 32 changed TypeScript/TSX/CSS files: passed.
- `bun test ./tests/integration/mock-development.test.ts --test-name-pattern 'redesigned|Back restores loaded skills|stops both ports|renders server data'`:
  8 passed, 0 failed. Covers SSR, browser interception, search, empty results, category/rank filters,
  reset, infinite loading, list state restoration, files, mocked downloads, report navigation,
  evaluation alignment, sitemap and launcher shutdown on desktop/mobile.
- `bun run test:e2e tests/e2e/medskillaudit.spec.ts --grep 'navigation opens MedSkillAudit' --reporter line`:
  2 passed, 2 expected device-mismatch skips. Includes desktop hover reset and mobile navigation.
- Default leaderboard report widgets match the baseline markup across three score bands after
  normalizing class-token order.
- `git diff --check`: passed; protected configuration reviewed with no changes.

The complete mock suite did not pass: 15 passed and 3 failed. One failure is the existing Blog
reading-time-parent assertion (`tests/integration/mock-development.test.ts:115`). The full run
also timed out in the mobile skill-detail test, followed by launcher exit code 143 in cleanup.
Both latter paths passed in the focused rerun above; the full-suite failure is still recorded.
Repository-wide lint also remains failing with 14 errors, 39 warnings and one schema notice in
unchanged files. Validation settings and unrelated Blog code were not changed.

## Real API browser verification

The local preview on port 3302 was verified with production data at 1440px desktop and 393px
Pixel 5 widths. Leaderboard visibility, keyword search, categories and skills requests returned
HTTP 200 without service-worker interception. The API currently disables all period links, and
the UI follows those values. Hero values were 537 evaluated skills, 97 top score and 87 average.

Product navigation and hover reset, skill-list sizing/truncation, Discussion Section Architect
detail content, evaluation alignment and no document-level horizontal overflow were verified.
No browser page errors occurred. The deferred route returned 404. Real-data checks did not submit
forms or request downloads; ordinary detail page views retain the existing view-count behavior.

## Sitemap and structured dates

Persistent sources `COMMON_LAYOUT_LAST_MODIFIED`, `AGENT_SKILLS_LIST_LAST_MODIFIED` and
`AGENT_SKILL_DETAIL_LAST_MODIFIED` record `2026-09-23`. Later authoritative API dates win over
local template dates. Skill WebPage and Blog WebPage modification dates follow the same rule;
software release dates and article publication dates remain unchanged.

The shared navigation affects all eligible common-layout pages. The verified local sitemap has
716 concrete canonical URLs: 8 static pages, 597 skill details, 108 Blog details and 3 guides.
All currently resolve to `2026-09-23T00:00:00.000Z`; see
[affected-sitemap-urls.json](affected-sitemap-urls.json) for every URL and observed date.
Static URLs are `/`, `/open-science`, `/open-science/download`, `/medflow`, `/agent-skills`,
`/agent-skills/list`, `/medskillaudit` and `/blog`, under `https://aipoch.com`.

Unit tests preserve newer API dates, unchanged Wiki timestamps and existing route exclusions.
The local real-data session has no Wiki backend, so Wiki behavior is covered by the sitemap
fixture. Leaderboards, redirects, private pages and the deferred page remain excluded.

## Screenshots

| Page | Desktop | Mobile |
| --- | --- | --- |
| Leaderboard | [Screenshot](leaderboard-desktop.png) | [Screenshot](leaderboard-mobile.png) |
| Skills list | [Screenshot](list-desktop.png) | [Screenshot](list-mobile.png) |
| Discussion Section Architect | [Screenshot](skill-desktop.png) | [Screenshot](skill-mobile.png) |
| Evaluation alignment | [Screenshot](evaluation-desktop.png) | [Screenshot](evaluation-mobile.png) |
