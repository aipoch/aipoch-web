# Guide retirement and MedFlow metadata

The two OpenClaw deployment guides now return HTTP 404. `/guides` redirects to
`/guides/what-is-a-skill`, and the module directory contains only these entries:

1. What Is a Skill?
2. Get Started with Skills
3. Build Your Own Skill

The getting-started guide now introduces the AIPOCH Open-Science research
workbench, removes the OpenClaw installation step, and renumbers the remaining
steps. Its visible summary, search and sharing descriptions, Article schema,
and recommendation cards share the revised description. MedFlow uses the new
biomedical research workflow title and private-beta description.

## Page dates

| Canonical path | Persistent source | Last modified |
| --- | --- | --- |
| `/guides/what-is-a-skill` | Guide frontmatter | 2026-09-20 |
| `/guides/get-started-with-skills` | Guide frontmatter | 2026-09-20 |
| `/guides/build-your-own-skill` | Guide frontmatter | 2026-09-20 |
| `/medflow` | `MEDFLOW_PAGE_LAST_MODIFIED` | 2026-09-20 |

The guide dates also drive Article `dateModified`. The MedFlow date already
matched the modification date and remains unchanged. Retired guides are excluded
from the sitemap, as is the redirecting `/guides` index. Tests preserve unrelated
page dates and authoritative API and Wiki dates. The updated legacy setup card
is not rendered by any current route and does not require another page date.

## Validation

- Unit tests: 256 passed, 0 failed.
- TypeScript check and production build: passed with Bun 1.3.14.
- Local HTTP checks: guide index destination, both retired routes returning 404
  with a noindex directive, surviving guide and MedFlow responses, metadata,
  recommendation summaries, Article schema, and sitemap URLs/dates passed.
- Browser inspection: revised module directory and getting-started content;
  MedFlow title and description confirmed in the rendered document.
- Full repository lint: 22 existing errors, 40 warnings, and one schema-version
  diagnostic, matching the baseline. No lint settings were changed.
- No runtime, dependency, environment, build, or deployment configuration changed.

## Screenshot

The local development screenshot includes the Next.js development indicator.

![Updated guide directory and getting-started content](get-started-desktop.png)
