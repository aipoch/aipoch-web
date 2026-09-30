import { expect, test } from '@playwright/test'
import {
  COVERAGE_FIXTURE_SLUG,
  coverageFixtureIndexEntry,
  coverageFixtureSession
} from '../../mocks/fixtures/use-case-coverage'

const envelope = (data: unknown) => JSON.stringify({ code: 20000, msg: 'Success', data })

// Renderer coverage matrix: every dedicated renderer branch, elicitation
// state, artifact state, and edge case must leave a visible marker in the DOM.
// A silently dropped component turns into an explicit failure here.
// The first page hit pays the dev compile cost, so give the test headroom.
test.setTimeout(240000)

test.beforeEach(async ({ page }) => {
  // The replay page is fully client-rendered, so browser-level route
  // interception is enough — no MSW required.
  await page.route('**/api/v1/open-science/use-cases', (route) => {
    if (route.request().url().endsWith('/open-science/use-cases')) {
      return route.fulfill({
        contentType: 'application/json',
        body: envelope([coverageFixtureIndexEntry])
      })
    }
    return route.continue()
  })
  await page.route(
    `**/api/v1/open-science/use-cases/${COVERAGE_FIXTURE_SLUG}/transcript`,
    (route) =>
      route.fulfill({ contentType: 'application/json', body: envelope(coverageFixtureSession) })
  )
})

test('replay renders every component type in the coverage fixture', async ({ page }) => {
  const pageErrors: string[] = []
  page.on('pageerror', (error) => pageErrors.push(error.message))

  await page.goto(`/open-science/use-cases/${COVERAGE_FIXTURE_SLUG}/replay`, {
    timeout: 180000,
    waitUntil: 'domcontentloaded'
  })

  // -- user bubble -------------------------------------------------------------
  await expect(page.getByText('Run the renderer coverage scenario.')).toBeVisible()

  // -- markdown surface ---------------------------------------------------------
  await expect(page.getByRole('heading', { name: 'Coverage Markdown Heading' })).toBeVisible()
  await expect(page.getByText('bold coverage')).toBeVisible()
  await expect(page.getByText('italic coverage')).toBeVisible()
  await expect(page.getByText('inline-code-coverage')).toBeVisible()
  await expect(page.getByRole('link', { name: 'coverage-link' })).toHaveAttribute(
    'href',
    'https://example.com/coverage'
  )
  await expect(page.getByText('Blockquote coverage line.')).toBeVisible()
  await expect(page.getByText('Ordered coverage item', { exact: true })).toBeVisible()
  await expect(page.getByText('Unordered coverage item', { exact: true })).toBeVisible()
  await expect(page.getByRole('cell', { name: 'coverage-cell-1' })).toBeVisible()
  await expect(page.locator('pre').filter({ hasText: 'coverageCode' })).toBeVisible()
  await expect(
    page.locator('pre').filter({ hasText: 'plain fence coverage without a language' })
  ).toBeVisible()
  await expect(page.getByText(/🧪✅/)).toBeVisible()
  await expect(page.getByText(/覆盖渲染测试/)).toBeVisible()

  // -- elicitations --------------------------------------------------------------
  // Answered via a listed option: that option carries data-selected + a check.
  const answeredOption = page.locator('[data-selected="true"]', { hasText: 'Markdown summary' })
  await expect(answeredOption).toBeVisible()
  // Answered with free-form text.
  await expect(page.getByText('Include the appendix tables')).toBeVisible()
  // Unanswered: dashed free-form placeholder.
  await expect(page.getByText('Free-form answer')).toBeVisible()

  // -- expand both activity groups ------------------------------------------------
  for (const groupButton of await page.getByRole('button', { name: /steps ·/ }).all()) {
    await groupButton.click()
  }

  // -- per-renderer rows + detail sections -----------------------------------------
  const expandRow = async (name: string | RegExp) => {
    const row = page.getByRole('button', { name }).first()
    // Rows animate (height tween) and the dev-tools overlay can sit over the
    // click point on narrow viewports — retry until the row reports expanded.
    for (let attempt = 0; attempt < 4; attempt++) {
      await row.scrollIntoViewIfNeeded()
      if ((await row.getAttribute('aria-expanded')) === 'true') return
      // dispatchEvent bypasses hit-testing entirely: overlays and the
      // expand/collapse height animation cannot swallow the click.
      await row.dispatchEvent('click')
      await page.waitForTimeout(300)
    }
    await expect(row).toHaveAttribute('aria-expanded', 'true')
  }

  await expandRow(/^Skill\b.*mcp-literature/)
  await expect(page.getByText(/Coverage skill document body|Coverage Skill/).first()).toBeVisible()

  // The first "Notebook run" row is the repl execution; its accessible name
  // ends with the "done" meta label.
  await expandRow(/^Notebook run done$/)
  await expect(page.getByText('coverage stdout line')).toBeVisible()
  await expect(page.getByText('coverage stderr warning')).toBeVisible()
  await expect(
    page.locator('img[src*="/use-cases/coverage-fixture/figures/figure-01.png"]')
  ).toBeVisible()

  await expandRow(/^Notebook run\b.*coverage_cell/)
  await expect(page.getByText(/coverage_auc/)).toBeVisible()

  await expandRow(/^Read\b.*coverage_notes/)
  await expect(page.getByText(/read-file body line/)).toBeVisible()

  await expandRow('Manage packages')
  await expect(page.getByText('pandas')).toBeVisible()
  await expect(page.getByText('scikit-learn')).toBeVisible()

  await expandRow('Inspect packages')
  await expect(page.getByText(/installed/)).toBeVisible()

  await expandRow(/^Write file\b.*coverage_report/)
  await expect(page.locator('section[aria-label="coverage_report.md"]')).toBeVisible()

  await expandRow(/^Save to library inbox\b.*2 refs/)
  await expect(page.getByText(/pmid:11111111/)).toBeVisible()

  await expandRow(/^Web Search\b.*GLP-1/)
  await expect(page.getByText('2 results')).toBeVisible()
  await expect(page.getByRole('link', { name: 'Coverage Result One' })).toHaveAttribute(
    'href',
    'https://example.com/result-1'
  )

  // -- generic fallback + edge states -----------------------------------------------
  await expandRow('Mystery tool')
  await expect(page.getByText(/coverage_input/)).toBeVisible()

  await expandRow('Failing tool')
  await expect(page.getByText('failed', { exact: true })).toBeVisible()

  await expandRow('Declined tool')
  await expect(page.getByRole('button', { name: 'Declined tool' })).toBeVisible()

  await expandRow('Truncated tool')
  await expect(page.getByText(/shortened in the essential view/)).toBeVisible()

  // A tool with no payload renders as a one-line row with expansion disabled.
  await expect(page.getByRole('button', { name: 'Empty tool' })).toBeDisabled()

  // -- artifact gallery: 4 states -----------------------------------------------------
  // content-visibility renders offscreen rows lazily — bring the gallery into view first.
  await page.getByText('GENERATED · 4').scrollIntoViewIfNeeded()
  await expect(page.getByText('GENERATED · 4')).toBeVisible()
  await expect(page.getByTitle('Preview coverage_chart.png')).toBeVisible()
  await expect(page.getByTitle('Preview coverage_report.md')).toBeVisible()
  await expect(page.getByTitle(/Download coverage_dataset\.zip/)).toBeVisible()
  await expect(page.getByText('Full only')).toBeVisible()

  // -- inline asset link in message content ---------------------------------------------
  await expect(page.getByRole('link', { name: 'coverage_report.md' }).first()).toHaveAttribute(
    'href',
    '/use-cases/coverage-fixture/objects/report.md'
  )

  // -- global hygiene ----------------------------------------------------------------------
  const bodyText = await page.locator('body').innerText()
  expect(bodyText).not.toContain('[object Object]')
  expect(bodyText).not.toContain('Could not render')
  expect(pageErrors).toEqual([])
})
