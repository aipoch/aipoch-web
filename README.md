# AIPOCH Web

Standalone Next.js 16 application using React, TypeScript, Tailwind CSS and Bun.
The repository root is the application root. UI primitives are local source files
in `components/ui`; all dependencies are declared in one `package.json`.

## Local development

Use Bun 1.3.14 (the same version used by the Docker image):

```sh
bun install --frozen-lockfile
cp .env.example .env.local
bun run dev
```

Fill the runtime settings for your environment. Development runs at
[http://localhost:3202](http://localhost:3202). The browser API URL must be reachable
from the browser; `INTERNAL_API_URL` can use a separate server-accessible address.
The API is an external service and is not shipped in this repository.
Optional analytics settings may remain empty.

```sh
bun run test:unit
bun run typecheck
bun run lint
bunx playwright install chromium
bun run test:e2e
bun run build
bun run start
```

Playwright starts an isolated development server on port 3212 and covers desktop
and mobile Chromium. Production `start` uses port 3000 by default (`PORT` overrides it).

## Mock development

Run the application with MSW 2.x and local sample data:

```sh
bun install --frozen-lockfile
bun run dev:mock
# Optional dedicated ports:
bun run dev:mock --port 3302 --mock-port 3303
bun run dev:mock --help
```

Next.js runs at `http://127.0.0.1:3202`. Shared MSW handlers intercept read-only
requests in both environments: `setupServer` starts through `instrumentation.ts`
for SSR, and `setupWorker` starts through `instrumentation-client.ts` in the
browser. Browser API entry points await worker readiness without hiding the SSR
HTML or deferring the entire component tree. Mocking is enabled explicitly by the
launcher and disabled when `NODE_ENV=production`.

The second loopback port, `http://127.0.0.1:3203`, is a **state adapter**, powered
by `@mswjs/http-middleware`. Only stateful claim/waitlist requests, health checks,
and downloadable sample files use it. This gives browser requests and server
requests one in-memory state owner. Read-only business requests to that port
return 404 when made outside an MSW-enabled runtime; this prevents a working
HTTP fallback from concealing broken SSR or browser interception.

Editing TypeScript or JSON files in `mocks/` automatically restarts the complete
session after a short debounce, keeping SSR, browser handlers, and the adapter in
sync. This resets reservations and claims. Reload the browser if it does not
refresh automatically. Application source edits still use Next.js Fast Refresh. If a mock edit causes a
session failure, the launcher waits for the next edit and retries after saving a
correction. Ctrl+C also stops it while waiting. Initial startup failures still exit.

Press Ctrl+C to stop Next and the adapter. Occupied ports fail without terminating
existing services. No `.env`
files are edited. The launcher supplies child-only API URLs, the
`NEXT_PUBLIC_API_MOCKING=enabled` switch, disabled analytics, and the local Wiki
sitemap origin. The download manifest is intercepted by MSW instead of being
injected as a separate JSON environment variable.

Mock builds use the existing `.next/e2e` directory. Do not run this command,
`test:mock`, and the existing Playwright suite concurrently in the same worktree.
Normal `dev`, `build`, and `start` commands retain their existing settings.

### Fixtures and scenarios

`mocks/fixtures.ts` holds deterministic sample data. `mocks/handlers/` groups the
MSW handlers by business area; browser, server, adapter, and contract tests reuse
these definitions. Mutable state belongs only to `handlers/state.ts` instances
owned by the adapter, not to separate browser and SSR stores.

| Area | Coverage | Sample page |
| --- | --- | --- |
| Homepage | Release summary, read/watch links, skill count and GitHub stars | `/` |
| Skills | 30 skills, categories, search, sorting, pagination, details, download URL and sitemap | `/agent-skills/list`, `/agent-skills/literature-review` |
| Leaderboards | Overall filters, statistics, daily/weekly/monthly, evaluation results | `/leaderboard`, `/leaderboard/items/literature-review-result` |
| Comparison | Two linked skill evaluations | `/compare/literature-review-vs-clinical-trials` |
| Blog | 24 articles, pagination, details and sitemap | `/blog`, `/blog/release-notes` |
| Community | 24 discussions, search, sorting, pagination, details and comments | API handlers only; existing community pages intentionally return 404 |
| MedFlow | Figma redesign with responsive layout, real waitlist submission, validation, success and API errors | `/medflow` |
| Agent claim | Valid, invalid and already-claimed tokens, shared in-memory verification | `/claim/demo-claim`, `/claim/already-claimed` |
| Open-Science | Intercepted release manifest and local text downloads | `/open-science/download` |

Business responses preserve `{ code: 20000, msg, data }`. Unknown GET routes and
missing details return 404, unsupported API methods return 405, and malformed
input returns 400. Pagination accepts positive `page` and `page_size`, with at
most 100 entries per page. Community `hot` uses score order and `shuffle` uses a
stable demo order. Unmatched requests to the configured business API are rejected;
unrelated external assets pass through.

For MedFlow, use any valid name and email for success; repeat the email for an
already-reserved success. Use `rate-limit@example.test` for HTTP 429 or
`error@example.test` for HTTP 500. For local claiming, use `demo-claim`, code
`MOCK-1234`, and a URL such as `https://x.com/demo/status/123`. Select
“I've posted the tweet” to skip the external posting step. No tweet is checked or
published. Reloading the page after verification shows “Already Claimed”.

CDN images/media, fonts, external navigation, and Wiki pages may still require
network access. The Skills UI opens the real GitHub repository after its mocked
download API call; the API itself returns a local Markdown sample. Open-Science
mock downloads are text samples, not installers. No real email reservations,
account claims, or downloadable releases are created.

### Validation

```sh
bun run test:unit
bunx playwright install chromium
bun run test:mock
bun run typecheck
bun run lint
```

`test:mock` starts the real launcher on ephemeral ports. It checks SSR pages,
sitemap entries, JavaScript-disabled rendering, client navigation, claim state
across reloads, desktop/mobile Skills search and MedFlow submission, worker
interception, shutdown, and port conflicts. Stop existing mock or Playwright
instances before running it. Test data is held only in memory.

`public/mockServiceWorker.js` is generated by MSW and must stay in sync with the
locked MSW package. After upgrading MSW, regenerate it using:

```sh
bunx msw init public --no-save
```

## Use-case replay assets

The catalog at `/open-science/usecases/manifest.json` defines each case. Replay
loads from `<manifest directory>/<case name>/extracted/`.

- **Publish:** Preserve `session.json` and restore archive objects to their inventory
  `storageKey` paths. Enable CORS for JSON and assets.
- **Load:** Fetch `session.json` and optional `notebooks/<projectId>/<sessionId>/run.json`.
  Extracted `manifest.json` and `records.json` are not required.
- **Resolve:** Map `$DATA/<storageKey>` to `<extracted root>/<encoded storageKey>`.
  Assets load on demand; previews recover PDF/SVG MIME types and downloads retain
  original filenames. SVG remains image-only.
- **Fallback:** An initial session 403/404 loads the size- and SHA-256-verified
  `.science` archive. Other errors remain retryable. Extracted metadata has size
  limits and schema checks; asset integrity relies on the CDN.
- **Verify:** `bun run test:mock` covers restored directories, previews, downloads,
  retries and archive fallback on desktop and mobile.

### Import a replay into Open-Science

Browser import is desktop-only. On phones and tablets (including desktop-mode
iPads), clicking **Continue in Open-Science** shows the warning **Please continue
on a desktop computer.** beneath the composer, without discovery, download or
protocol launch. Device detection is shared with the desktop installer recommendations;
a narrow desktop window remains supported. Ordinary package downloads remain available.

The composer below each replay first calls the official
`checkBrowserImportAvailability({ signal, timeoutMs: 5000 })` on the SDK default
discovery port with a five-second probe budget when **Continue in Open-Science** is clicked.
Discovery checks one local endpoint; it does not launch the app or prove that it is
installed. Local-network access may trigger a browser permission prompt. On
`unavailable`, `timeout`, `incompatible` or `unsupported-browser`, the composer
keeps the original page open, offers **Try again** and an inline **download it first**
link to the site’s download page, and does not download the package. Cancellation is retryable.
The guidance asks users with an existing installation to update to Open-Science
1.1.0 or later, then open the app and check again. There is no automatic popup.

Ordinary downloads retain the manifest `release_url` when provided. Browser import
uses a separate `importUrl` under `<manifest directory>/<case name>/<encoded file name>`
so it does not fetch GitHub release redirects. The static host must allow browser CORS.

After discovery succeeds, the website downloads the full `.science` Blob, prepares
an SDK transfer, sets `window.location.href = transfer.url`, then calls `send()`.
Automatic launch after an asynchronous download is best effort. A direct-click
**Open Open-Science** fallback reuses the held Blob, without another download.
**Checking Open-Science…** and **Waiting for Open-Science…** are separate states.
The SDK's `onPhase('transferring')` switches to sending only after this transfer's
identity handshake succeeds. Until its first acknowledged-byte callback, the
button says **Sending to Open-Science…** without a percentage. Download/send
percentages then appear in the compact button, without progress bars; unknown
download totals show **—%**. The composer keeps its 42px upper spacing.

`send()` explicitly uses `readinessMode: 'wait-for-launch'`, `readyTimeoutMs: 120000`
and `attemptTimeoutMs: 2000`. The official SDK waits 1,000ms between failed
attempts and continues beyond the default five-attempt limit. Its 120-second
budget covers readiness headers, body and retry gaps, but ends once identity is
verified and does not limit the subsequent file transfer. There is no website
retry loop, transfer rotation or repeated protocol navigation while waiting.

The website cannot detect an external-protocol permission prompt or its outcome.
It does not use focus, blur, visibility or a timer to infer consent. Waiting copy
below the input reads: **If your browser asks to open Open-Science, choose Open.
You may also need to allow local network access.** Generic availability never
substitutes for this transfer's authenticated handshake.

On readiness timeout, keep the Blob and transfer and show **Open-Science has not
connected yet. Open the app, allow any browser prompts, then continue.**
**I’ve opened Open-Science** calls `send()` again with a fresh cancellation signal
on that same transfer, without navigation or download. The separate **Open
Open-Science** action explicitly requests the protocol launch again. A readiness
timeout does not establish that the app is absent or the user rejected a prompt.
Below the timeout message, a direct package-download link explains how to double-click
the `.science` file or choose **Open with → Open-Science**. An app-download link
lets users install Open-Science first if needed.

Receipt means only that the desktop received the file.
The received-state **Open Open-Science** button remains clickable and synchronously
calls the official `launchOpenScience()` entry point. It does not download,
prepare a transfer or send the file again; the receipt confirmation remains visible.
Only after receipt, **Clicked Cancel by mistake? Retry the import.** follows the
receipt confirmation beneath the composer. Its underlined retry button reuses the
downloaded Blob to prepare a fresh transfer, launch and send without another
download. The Blob stays in page memory after receipt and is released when the
page refreshes or the composer unmounts.
The retry hint is hidden while the new attempt runs; the main app-launch button
continues to open the app without resending.
The pinned desktop source automatically receives and validates it before destination selection; the user
must still confirm import there. The website only reports **File sent to
Open-Science. Please confirm the import in the app.** The composer text area and
research tools remain disabled; no prompt text is sent.

- Keep ordinary package downloads available. Browser transfer requires a nonempty
  `.science` file no larger than 2 GiB, HTTPS (or loopback for development), Web
  Crypto and `AbortSignal.any/timeout`. Downloads check HTTP status and size, have
  a two-minute budget and can be canceled. File names are normalized before
  download to the SDK's 160 UTF-16 code unit / 255 UTF-8 byte limits, retaining
  `.science`, avoiding Windows device names and truncating only at code points.
- Discovery and downloads await MSW readiness. In mock development the official
  discovery request is intercepted; adapter-owned `discoveryMode` selects
  `available`, `unavailable`, `incompatible` or `timeout`. Package scenarios cover
  HTTP 503, empty, oversized and delayed responses. Transport HTTP calls are
  rejected in mock development so they cannot reach a real receiver. Both transfer
  launch and standalone app launch are no-ops at the website call boundary when
  the existing development mock switch is enabled; MSW cannot block OS protocol
  navigation. Production ignores that switch.
- Package hosts must permit cross-origin fetches. On 2026-10-19 a HEAD request to
  the First Flight static archive with `Origin: https://aipoch.com` returned 200
  and `Access-Control-Allow-Origin: *`. A complete production browser download
  was not exercised. The replay route has no repository-defined CSP. If deployment
  adds CSP, retain other restrictions and allow the download origins and
  `http://127.0.0.1:*` in `connect-src`; this change does not modify deployment policy.
- Retain the Blob for retry. Transient failures and readiness timeouts reuse the same
  transfer. Cancellation and identity mismatch require a new transfer on the next
  explicit launch. If the receiver actually expired, use **Start a new transfer**;
  the website does not infer expiry from elapsed time or silently rotate secrets.
  Transfer-creation errors retain bytes and
  are distinct from download failures. Unmount aborts work and releases references.
  Transfer URLs contain secrets and are never rendered, logged or persisted.
- The public npm registry returned 404 on 2026-10-16. The official SDK is vendored
  from commit `157a8676ca341612bd1f918a5e3a1f942629e2f4`; source, types and hashes
  are documented in [`vendor/open-science/UPSTREAM.md`](vendor/open-science/UPSTREAM.md).
  The website does not implement or modify its crypto, authentication or transport.
  An installed desktop build supporting discovery and automatic receipt is required.
  The waiting mode is compatible with the existing v1 receiver. This flow uses
  only the transfer-specific protocol URL; after a failed initial availability
  check, users can open the app manually and check again. Only committed SDK APIs
  are used.

Run `bun test --isolate tests/unit/browser-science-import.test.ts
 tests/unit/browser-import-sdk-contract.test.ts tests/unit/browser-import-provenance.test.ts`
for lifecycle, filename, size, provenance and actual SDK HTTP/timing contract checks.
The contract tests execute the pinned SDK with deterministic HTTP responses,
including backward-compatible five-attempt behavior, deadlines, cancellation,
authenticated receipt and transfer continuing beyond readiness time.
`bun test tests/integration/browser-import-wait-contract.test.ts` executes the
actual SDK in Chromium with an accelerated clock and a deterministic HTTP peer.
It verifies waiting past 15 seconds, the 120-second deadline across headers/body/gaps,
cancellation and same-transfer reconnection. No real receiver is contacted.
Run `bun test tests/integration/browser-science-import.test.ts` for the React
composer in Chromium desktop/mobile with a test-only SDK substitute and harmless
hash navigation. `bun run test:mock` exercises Next SSR/browser interception,
probe failures/recovery, completed downloads from static URLs distinct from regular
release downloads, suppressed protocol navigation, cancellation/retry and sitemap output.
`tests/unit/browser-import-launch.test.ts` covers both launch boundaries and the production guard.
These checks do **not** constitute desktop integration: installed OS protocol
registration, native permissions, real desktop import and complete production
browser downloads are not verified. No desktop instance or shared Open-Science data is used.

## Docker Compose

```sh
cp .env.example .env
# Fill the API, site, asset and public Wiki addresses for your deployment.
docker compose config --quiet
docker compose pull
docker compose up -d
docker compose ps
```

Compose fixes `web` to `ghcr.io/aipoch/aipoch-web:latest` on port 3060 and
`openscience-wiki` to `ghcr.io/aipoch/openscience-wiki:latest` on port 3062.
Images and host ports are defined directly in `compose.yaml`. The Web service reaches
Wiki through `http://openscience-wiki`; the public Wiki prefix must be reachable
from visitors' browsers. Wiki routes live below `/docs`. Reverse proxy and TLS
configuration are deployment responsibilities.

The multi-stage Dockerfile installs with the frozen Bun lockfile and runs the
Next.js standalone server as the non-root `bun` user. It includes `public` and
`.next/static`; local environment files and agent artifacts are excluded from
the build context. Public settings are injected at container startup via
`next-runtime-env`, allowing the same image to run in different environments.
Wiki uses the `aipoch` image namespace and retains its `linux/amd64` platform.

### Local image validation

Build Web explicitly with the same tag used by Compose. Ensure the Wiki image is
already cached locally, then prevent registry pulls and force container recreation:

```sh
docker build --platform linux/amd64 -t ghcr.io/aipoch/aipoch-web:latest .
docker compose up -d --pull never --no-build --force-recreate --wait
```

Compose contains no build configuration. These command options make local
validation use the locally built Web image and the cached Wiki image.

## Image publishing

`.github/workflows/build-push-web.yml` builds the root Dockerfile on every push
to `main` and publishes `ghcr.io/aipoch/aipoch-web` with `latest`, `main`, and
`sha-<full-commit>` tags. It uses `GITHUB_TOKEN` with `packages: write`; private
packages require registry authentication when pulled. The workflow can also be
run manually on `main`. It builds Linux AMD64 images and uses the GitHub Actions
build cache. The workflow takes effect once this change is present on `main`;
creating or renaming that branch is outside this migration.

## Migration from the previous layout

Run commands from the repository root instead of `web` or `web/apps/user`.
The former shared UI and TypeScript packages are now local source and root
configuration. The API, CLI, Admin application, standalone Skills admin page,
and AWS deployment workflows have been removed. Existing Web routes and
external API contracts are preserved. Deployment automation must use the root
`Dockerfile`, `compose.yaml` and new `web` service name.
