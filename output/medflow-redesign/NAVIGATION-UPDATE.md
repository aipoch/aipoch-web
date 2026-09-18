# Shared navigation: remove shadows

The shared `components/navbar/index.tsx` no longer applies shadows to the header,
its background pseudo-element, desktop dropdowns, or mobile menu. The change covers
light/dark themes and top-of-page/scrolled states. All routes using the common
layout, plus the shared not-found navigation, inherit it. The HTML artifact was
rebuilt from this same component. No production deployment was performed.

## Sitemap scope and persistent date

`lib/common-layout-metadata.ts` records `COMMON_LAYOUT_LAST_MODIFIED = '2026-09-17'`.
Local page sitemap entries use the later of this date and their existing reliable
content date. The following concrete static and locally sourced guide URLs are
covered:

- https://aipoch.com
- https://aipoch.com/open-science
- https://aipoch.com/open-science/download
- https://aipoch.com/medflow
- https://aipoch.com/agent-skills
- https://aipoch.com/agent-skills/list
- https://aipoch.com/medskillaudit
- https://aipoch.com/blog
- https://aipoch.com/guides/openclaw-local-deployment
- https://aipoch.com/guides/build-your-own-skill
- https://aipoch.com/guides/openclaw-cloud-deployment
- https://aipoch.com/guides/what-is-a-skill
- https://aipoch.com/guides/get-started-with-skills

Dynamic skill and blog detail entries are mapped using each API entry's actual
`item.url`; no placeholder routes or fabricated production content entries are
added. Newer API timestamps are retained. The complete live URL inventory could
not be retrieved: the public sitemap returned HTTP 403, and the browser request
was blocked by its client. The sitemap integration tests validate both dynamic
sources with concrete fixture URLs, including preservation of a newer date.

Wiki entries are appended unchanged because they use their own navigation.
Redirects, private/noindex pages, excluded routes, and presentations remain
excluded. Home and Open-Science WebPage JSON-LD dates use the same shared date
source; product release dates, article dates, video upload dates, and release
labels are preserved.

## Verification

- Browser: header/pseudo-element `box-shadow` is `none` at the top, after scrolling,
  and over the dark footer. Desktop dropdown and expanded 390 px mobile menu have
  no shadowed descendants. The existing menu interactions continue to work.
- `bun run test:unit`: 235 passed, 0 failed, including sitemap and page-metadata tests.
- `bun run typecheck`: passed.
- Biome lint on all eight changed/new application and test files: passed.
- `git diff --check`: passed.
- `bun run lint`: still fails on full-repository diagnostics, including bundled
  third-party code in the generated HTML and existing project diagnostics. No
  lint rules or configuration were changed to suppress them.

The final diff contains the shared navigation change, its required sitemap and
page-metadata date handling, corresponding test updates, and standalone preview
artifacts. No protected operational configuration was changed.

## Download button corners

The later button correction sets the emphasized Download action to `rounded-none`
in both desktop and mobile navigation. Other navigation items retain their existing
corner styles. Browser checks confirmed a computed 0 px border radius on each
visible version. The existing desktop style assertion now expects square corners.
The artifact was rebuilt, TypeScript and changed-file lint passed, and the same
shared-navigation sitemap scope/date (`2026-09-17`) remains valid because both
changes occurred on that date. No additional operational configuration changes
or deployment were made.
