import { expect, type Locator, type Page, test } from '@playwright/test'

const tabNames = {
  overview: 'Overview',
  literature: 'Literature',
  reproduction: 'Reproduction & data',
  execution: 'Research execution',
  research: 'Paper-scale research',
  methods: 'Methods & notes'
} as const

async function openTab(page: Page, tab: keyof typeof tabNames) {
  // The indicator is measured on the client, so it also signals that the tabs have hydrated.
  await expect(page.locator('.tab-indicator')).toBeAttached()
  const button = page.getByRole('tab', { name: new RegExp(tabNames[tab]) })
  await button.click()
  await expect(button).toHaveAttribute('aria-selected', 'true')
  await expect(page.locator(`#panel-${tab}`)).toBeVisible()
}

async function expandAll(chart: Locator) {
  const toggle = chart.locator('.expand-toggle')
  if ((await toggle.count()) && (await toggle.getAttribute('aria-expanded')) === 'false')
    await toggle.click()
}

test.describe.configure({ timeout: 60000 })
test.beforeEach(async ({ page }) => {
  await page.goto('/benchmark/open-science')
  const reject = page.getByRole('button', { name: 'Reject non-essential', exact: true })
  // Consent mounts after hydration. A synchronous visibility check can miss it,
  // leaving the mobile banner over the chart when the test starts interacting.
  await reject.click()
  await expect(reject).not.toBeVisible()
})

test('renders the complete article, metadata, hero artwork, and score rings', async ({
  page
}, testInfo) => {
  await expect(page.getByRole('heading', { name: 'Open-Science Benchmarks' })).toBeVisible()
  await expect(page.locator('figure')).toHaveCount(27)
  await expect(page.locator('[role="tab"]')).toHaveCount(6)
  await expect(page.locator('#panel-overview')).toBeVisible()
  for (const tab of ['literature', 'reproduction', 'execution', 'research', 'methods'])
    await expect(page.locator(`#panel-${tab}`)).toBeHidden()
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    'href',
    /\/benchmark\/open-science$/
  )
  // Long fields collapse to the top ten rows and expand in place.
  await openTab(page, 'literature')
  for (const [kind, total] of [
    ['litqa', 31],
    ['pf', 34],
    ['lqf', 29],
    ['sqa', 42]
  ] as const) {
    const chart = page.locator(`#ch-${kind}`)
    await expect(chart.locator('.bar-row')).toHaveCount(10)
    await expect(chart.locator('.bar-row.me').first()).toBeVisible()
    await chart.getByRole('button', { name: `Show all ${total} records` }).click()
    await expect(chart.locator('.bar-row')).toHaveCount(total)
    await expect(chart.locator('.expand-toggle')).toHaveAttribute('aria-expanded', 'true')
  }
  await openTab(page, 'reproduction')
  for (const [kind, total] of [
    ['core', 26],
    ['disc', 31]
  ] as const) {
    await expandAll(page.locator(`#ch-${kind}`))
    await expect(page.locator(`#ch-${kind} .bar-row`)).toHaveCount(total)
  }
  await openTab(page, 'execution')
  await expandAll(page.locator('#ch-b1'))
  await expect(page.locator('#ch-b1 .bar-row')).toHaveCount(24)
  await expect(page.locator('.distractor-row')).toHaveCount(23)
  await expandAll(page.locator('#ch-tbs'))
  await expect(page.locator('#ch-tbs .bar-row')).toHaveCount(18)
  await expect(page.locator('#ch-tbs-attempts .waffle i.on')).toHaveCount(145)
  await openTab(page, 'research')
  await expect(page.locator('#ch-suite-heatmap .heat-cell')).toHaveCount(40)
  await expect(page.locator('#ch-suite-groups .suite-row').first()).toContainText('89.9')
  await expect(page.locator('#ch-suite-h2h .h2h-row').first()).toContainText('7–1–2')
  await expect(page.locator('.edge-card')).toHaveCount(6)
  for (const img of await page.locator('main img').all()) {
    await expect
      .poll(() =>
        img.evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0)
      )
      .toBe(true)
  }
  await expect(page.locator('.benchmark-score-ring svg')).toHaveCount(3)
  await page.screenshot({ path: testInfo.outputPath('benchmark-research.png'), fullPage: true })
  await page.getByRole('link', { name: 'Evaluation details', exact: true }).click()
  await expect(page).toHaveURL(/#method$/)
  await expect(page.getByRole('heading', { name: 'How we ran the evaluation' })).toBeInViewport()
})

test('chart filters remain independent and preserve reference rows', async ({ page }, testInfo) => {
  await openTab(page, 'execution')
  await expandAll(page.locator('#ch-b1'))
  await expandAll(page.locator('#ch-b2'))
  const b1 = page.locator('#ch-b1'),
    b2 = page.locator('#ch-b2'),
    litqa = page.locator('#ch-litqa')
  await b1.getByRole('button', { name: 'Local runs', exact: true }).click()
  await expect(b1.locator('.bar-row')).toHaveCount(3)
  await expect(b2.locator('.bar-row')).toHaveCount(23)
  await expect(b1.getByRole('button', { name: 'Local runs', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true'
  )
  await b1.screenshot({ path: testInfo.outputPath('benchmark-local.png') })
  await b1.getByRole('button', { name: 'Public leaderboard', exact: true }).click()
  await expect(b1.locator('.bar-row')).toHaveCount(23)
  await expect(b1.locator('.bar-row.me')).toHaveCount(2)
  await b1.screenshot({ path: testInfo.outputPath('benchmark-public.png') })
  await b1.getByRole('button', { name: 'All', exact: true }).click()
  await expect(b1.locator('.bar-row')).toHaveCount(24)
  await openTab(page, 'literature')
  await expandAll(litqa)
  await litqa.getByRole('button', { name: 'Validation', exact: true }).click()
  await expect(litqa.locator('.bar-row')).toHaveCount(4)
  await litqa.getByRole('button', { name: 'Official test', exact: true }).click()
  await expect(litqa.locator('.bar-row')).toHaveCount(27)
  await expect(litqa.locator('.bar-row.me')).toHaveCount(1)
})

test('details work with keyboard, pointer, and tap, and close with Escape', async ({
  page,
  isMobile
}) => {
  await openTab(page, 'literature')
  const row = page.locator('#ch-pf .bar-row').first()
  await row.scrollIntoViewIfNeeded()
  if (isMobile) await row.tap()
  else await row.focus()
  await expect(page.getByRole('tooltip')).toContainText('deepseek-v4-flash')
  await expect(page.getByRole('tooltip')).toContainText('0.4554')
  await page.keyboard.press('Escape')
  await expect(page.getByRole('tooltip')).toHaveCount(0)
  if (!isMobile) {
    await page.locator('h1').hover()
    await row.hover()
    await expect(page.getByRole('tooltip')).toContainText('Local validation, 66 questions')
  }
})

test('keeps responsive layouts inside the viewport and the submenu hidden', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await expect(page.locator('.notice')).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)')
  const select = (tab: keyof typeof tabNames) =>
    page.evaluate((id) => {
      window.location.hash = id
    }, tab)
  for (const width of [2880, 1920, 1440, 1024, 981, 980, 768, 640, 390, 360, 320]) {
    await page.setViewportSize({ width, height: 900 })
    for (const tab of Object.keys(tabNames) as (keyof typeof tabNames)[]) {
      await select(tab)
      await expect(page.locator(`#panel-${tab}`)).toBeVisible()
      await expect
        .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
        .toBe(true)
    }
    const artwork = await page.locator('.hero-backdrop img').boundingBox()
    if (!artwork) throw new Error('Hero artwork must have a rendered box')
    expect(artwork.x).toBeCloseTo(0, 0)
    expect(artwork.width).toBeCloseTo(width, 0)
    expect(artwork.width / artwork.height).toBeCloseTo(1672 / 941, 2)
    for (const tab of ['literature', 'reproduction', 'execution', 'research'] as const) {
      await select(tab)
      await expect(page.locator(`#panel-${tab}`)).toBeVisible()
      const layout = await page.evaluate(() => {
        const panel = document.querySelector('[data-tab-panel]:not([data-inactive])')
        if (!panel) throw new Error('No visible panel')
        const bounds = (root: ParentNode, selector: string) => {
          const element = root.querySelector(selector)
          if (!element) throw new Error(`Missing layout element: ${selector}`)
          return element.getBoundingClientRect()
        }
        const tagsFit = [...panel.querySelectorAll('.bar-row .tg')].every((tag) => {
          const box = tag.getBoundingClientRect()
          const labelElement = tag.closest('.lab')
          const row = tag.closest('.bar-row')
          if (!labelElement || !row) return false
          const label = labelElement.getBoundingClientRect()
          const plot = bounds(row, '.track')
          return (
            getComputedStyle(tag).display !== 'none' &&
            box.left >= label.left - 1 &&
            box.right <= label.right + 1 &&
            box.bottom <= label.bottom + 1 &&
            box.right < plot.left
          )
        })
        // Side-by-side chart boxes share their top and bottom edges.
        const rows = [...panel.querySelectorAll('.split2, .pair')].flatMap((group) => {
          const boxes = [...group.querySelectorAll('.chart')]
            .filter((chart) => !chart.parentElement?.closest('.chart'))
            .map((chart) => chart.getBoundingClientRect())
          const lines = new Map<number, number[]>()
          for (const box of boxes) {
            const top = Math.round(box.top)
            lines.set(top, [...(lines.get(top) ?? []), Math.round(box.bottom)])
          }
          return [...lines.values()].filter((bottoms) => bottoms.length > 1)
        })
        const ticksApart = ['#ch-sqa-zoom', '#ch-sqa-prod'].every((id) => {
          const chart = panel.querySelector(id)
          if (!chart) return true
          const ticks = [...chart.querySelectorAll('.ticks span')]
            .filter((label) => getComputedStyle(label).display !== 'none')
            .map((label) => label.getBoundingClientRect())
          return (
            ticks.length >= 2 && ticks.every((box, i) => i === 0 || box.left >= ticks[i - 1].right)
          )
        })
        const cards = [...panel.querySelectorAll('.ladder .step')].map((card) => ({
          top: card.getBoundingClientRect().top,
          score: bounds(card, '.s').top
        }))
        const b1 = panel.querySelector('#ch-b1')?.getBoundingClientRect()
        const b2 = panel.querySelector('#ch-b2')?.getBoundingClientRect()
        return {
          tagsFit,
          ticksApart,
          aligned: rows.every((bottoms) => Math.max(...bottoms) - Math.min(...bottoms) <= 1),
          scoresAlign: cards.every((a) =>
            cards.every((b) => Math.abs(a.top - b.top) > 1 || Math.abs(a.score - b.score) < 1)
          ),
          pairAligns: !b1 || !b2 || (Math.abs(b1.top - b2.top) < 1 && b2.left > b1.right)
        }
      })
      expect(layout.tagsFit, `source badges on ${tab} at ${width}px`).toBe(true)
      expect(layout.ticksApart, `scholar ticks at ${width}px`).toBe(true)
      expect(layout.scoresAlign, `guidance scores at ${width}px`).toBe(true)
      if (width > 980) {
        expect(layout.aligned, `paired charts on ${tab} at ${width}px`).toBe(true)
        expect(layout.pairAligns, `chart pair at ${width}px`).toBe(true)
      }
    }
  }
  await expect(page.locator('header a[href="/benchmark/medskillaudit"]')).toHaveCount(0)
  await expect(page.locator('header [data-testid="desktop-nav-trigger-benchmark"]')).toHaveCount(0)
})

test('tabs follow the URL hash, keyboard and in-page anchors', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/benchmark/open-science#%E0%A4%A')
  await expect(page.locator('#panel-overview')).toBeVisible()
  await page.getByRole('tab', { name: /Paper-scale research/ }).click()
  await expect(page.locator('#panel-research')).toBeVisible()
  expect(errors).toEqual([])
  await page.goto('/benchmark/open-science#research')
  await expect(page.getByRole('tab', { name: /Paper-scale research/ })).toHaveAttribute(
    'aria-selected',
    'true'
  )
  await expect(page.locator('#panel-research')).toBeVisible()
  await expect(page.locator('#panel-overview')).toBeHidden()
  const tab = page.getByRole('tab', { name: /Paper-scale research/ })
  await tab.focus()
  await page.keyboard.press('ArrowRight')
  await expect(page.getByRole('tab', { name: /Methods/ })).toBeFocused()
  await expect(page.locator('#panel-methods')).toBeVisible()
  await expect(page).toHaveURL(/#methods$/)
  await page.goBack()
  await expect(page.locator('#panel-research')).toBeVisible()
  // An element id inside another tab opens that tab and scrolls to the element.
  await page.evaluate(() => {
    window.location.hash = 'astabench-more'
  })
  await expect(page.locator('#panel-reproduction')).toBeVisible()
  await expect(
    page.getByRole('heading', { name: 'AstaBench: from reading to running' })
  ).toBeInViewport()
  await openTab(page, 'overview')
  await page.locator('.stage').filter({ hasText: 'Reproduce' }).locator('a.stage-go').click()
  await expect(page.locator('#panel-reproduction')).toBeVisible()
  await openTab(page, 'overview')
  await page.locator('.stage.highlight a.stage-go').click()
  await expect(page.locator('#panel-research')).toBeVisible()
  await page.locator('#panel-research .tab-pager button.next').click()
  await expect(page.locator('#panel-methods')).toBeVisible()
})

test('the first pointer click works during entrance motion', async ({ page, isMobile }) => {
  await openTab(page, 'execution')
  const figure = page.locator('figure').filter({ has: page.locator('#ch-b1') })
  await expect(figure).toHaveAttribute('data-benchmark-reveal', 'pending')
  // Freeze a real entrance halfway through so this test cannot pass merely by
  // waiting for motion to end, as locator.click()/tap() normally would.
  await figure.evaluate((element) => {
    const observer = new MutationObserver(() => {
      const entrance = element.getAnimations()[0]
      if (!entrance) return
      entrance.pause()
      entrance.currentTime = 300
      observer.disconnect()
    })
    observer.observe(element, { attributes: true, attributeFilter: ['data-benchmark-reveal'] })
  })
  const filter = page.locator('#ch-b1').getByRole('button', { name: 'Local runs', exact: true })
  await filter.evaluate((button) => button.scrollIntoView({ block: 'center' }))
  await expect(figure).toHaveAttribute('data-benchmark-reveal', 'shown')
  expect(await figure.evaluate((element) => element.getAnimations()[0]?.playState)).toBe('paused')
  const box = await filter.boundingBox()
  if (!box) throw new Error('Source filter must have a rendered box')
  const x = box.x + box.width / 2
  const y = box.y + box.height / 2
  if (isMobile) await page.touchscreen.tap(x, y)
  else await page.mouse.click(x, y)
  await expect(filter).toHaveAttribute('aria-pressed', 'true')
  await expect(page.locator('#ch-b1 .bar-row')).toHaveCount(3)
  await expect.poll(() => figure.evaluate((element) => element.getAnimations().length)).toBe(0)
})

test('server renders the benchmark content without JavaScript', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false })
  const page = await context.newPage()
  await page.goto(`${baseURL}/benchmark/open-science`)
  await expect(page.getByRole('heading', { name: 'Open-Science Benchmarks' })).toBeVisible()
  // Without JavaScript every category is shown in order and the tab bar is hidden.
  for (const tab of Object.keys(tabNames)) await expect(page.locator(`#panel-${tab}`)).toBeVisible()
  await expect(page.locator('.tabbar')).toBeHidden()
  await expect(page.locator('#ch-b1 .bar-row')).toHaveCount(10)
  await expect(page.locator('#ch-pf .bar-row').first()).toContainText('0.4554')
  await expect(page.locator('#tbl-core tbody tr')).toHaveCount(26)
  await expect(page.locator('figure').last()).toHaveCSS('opacity', '1')
  await expect(page.locator('.ring-progress').first()).toHaveAttribute(
    'stroke-dashoffset',
    '0.6692'
  )
  await context.close()
})

test('reveals upcoming charts once and draws their bars on entry', async ({ page }) => {
  await openTab(page, 'literature')
  const figure = page.locator('figure').filter({ has: page.locator('#ch-litqa') })
  await expect(figure).toHaveAttribute('data-benchmark-reveal', 'pending')
  await figure.scrollIntoViewIfNeeded()
  await expect(figure).toHaveAttribute('data-benchmark-reveal', 'shown')
  expect(
    await figure
      .locator('.bar')
      .first()
      .evaluate((bar) =>
        bar
          .getAnimations()
          .some((animation) =>
            (animation.effect as KeyframeEffect)
              .getKeyframes()
              .some((frame) => frame.transform === 'scaleX(0)')
          )
      )
  ).toBe(true)
  await expect
    .poll(() => figure.evaluate((node) => node.getAnimations({ subtree: true }).length))
    .toBe(0)
  await page.locator('h1').scrollIntoViewIfNeeded()
  await figure.scrollIntoViewIfNeeded()
  // Hover transitions may run under a stationary pointer after scrolling; only entrance animations must stay finished.
  expect(
    await figure.evaluate(
      (node) =>
        node
          .getAnimations({ subtree: true })
          .filter((animation) => !(animation instanceof CSSTransition)).length
    )
  ).toBe(0)
})

test('uses the v7 palette and gray hover fills', async ({ page, isMobile }) => {
  await expect(
    page.locator('#ch-b1 .legend span').filter({ hasText: 'Claude Code' }).locator('i')
  ).toHaveCSS('background-color', 'rgb(208, 138, 98)')
  await expect(
    page.locator('#ch-pf .legend span').filter({ hasText: 'RoboPhD' }).locator('i')
  ).toHaveCSS('background-color', 'rgb(207, 143, 169)')
  if (!isMobile) {
    for (const [tab, selector] of [
      ['overview', 'a.stage-go'],
      ['literature', '#ch-litqa .bar-row'],
      ['execution', '.level-row'],
      ['execution', '.distractor-row']
    ] as const) {
      await openTab(page, tab)
      const target = page.locator(selector).first()
      await target.hover()
      await expect(target).toHaveCSS('background-color', 'rgb(242, 241, 236)')
    }
  }
})

test('reduced motion keeps every section and chart immediately readable', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await expect(page.locator('[data-benchmark-reveal="pending"]')).toHaveCount(0)
  await page.reload()
  await expect(page.locator('figure').last()).toHaveCSS('opacity', '1')
  await openTab(page, 'execution')
  await expect(page.locator('[data-benchmark-reveal="pending"]')).toHaveCount(0)
  const chart = page.locator('#ch-b4')
  await chart.scrollIntoViewIfNeeded()
  await expect(chart.locator('.bar-row').first()).toHaveCSS('transition-duration', '0s')
  expect(await chart.evaluate((node) => node.getAnimations({ subtree: true }).length)).toBe(0)
  await expandAll(chart)
  await expect(chart.locator('.bar-row')).toHaveCount(23)
})

test('v8 rankings default to All, sort by score, and expose complete source records', async ({
  page
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  for (const kind of ['litqa', 'pf', 'sqa', 'b1', 'b2', 'b3', 'b4']) {
    await openTab(page, kind.startsWith('b') ? 'execution' : 'literature')
    const chart = page.locator(`#ch-${kind}`)
    const first = chart.locator('.chips button').first()
    await expect(first).toHaveText(/^All/)
    await expect(first).toHaveAttribute('aria-pressed', 'true')
    const scores = await chart.locator('.bar-row .val').allTextContents()
    expect(scores.map(Number)).toEqual(scores.map(Number).sort((a, b) => b - a))
  }
  await openTab(page, 'literature')
  const scholar = page.locator('#ch-sqa')
  await expandAll(scholar)
  await expect(scholar.locator('.bar-row')).toHaveCount(42)
  await scholar.getByRole('button', { name: 'Official test', exact: true }).click()
  await expect(scholar.locator('.bar-row')).toHaveCount(41)
  await expect(scholar.locator('.bar-row.me')).toHaveCount(0)
  await scholar.getByRole('button', { name: 'Validation', exact: true }).click()
  await expect(scholar.locator('.bar-row')).toHaveCount(1)
  await expect(scholar.locator('.bar-row')).toContainText('0.9289')
  await expect(page.locator('#ch-sqa-zoom .bar-row')).toHaveCount(13)
  await expect(page.locator('#ch-sqa-prod .bar-row')).toHaveCount(10)
  const records = page.locator('#panel-literature details.records')
  await records.first().locator('summary').click()
  await expect(page.locator('#tbl-litqa tbody tr')).toHaveCount(27)
  await expect(page.locator('#tbl-litqa tbody tr').first()).toContainText('T1')
  await expect(page.locator('#tbl-litqa tbody tr').first()).toContainText('68/75')
  await expect(page.locator('#tbl-litqa a').first()).toHaveAttribute(
    'href',
    /^https:\/\/huggingface.co\/datasets\/allenai\/asta-bench-submissions\//
  )
  await records.nth(2).locator('summary').click()
  await expect(page.locator('#tbl-sqa tbody tr')).toHaveCount(42)
  await expect(page.locator('#tbl-sqa tbody tr').first()).toContainText('Validation, 100 q.')
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
    .toBe(true)
})

test('overview leads with one verdict and the five research stages', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await expect(page.locator('.headline-big')).toContainText('11')
  await expect(page.locator('.headline-big')).toContainText('/ 11')
  await expect(page.locator('.verdict')).toHaveCount(12)
  await expect(page.locator('.verdict.na')).toHaveCount(1)
  const stages = page.locator('.stage')
  await expect(stages).toHaveCount(5)
  await expect(stages.locator('.stage-verb')).toHaveText([
    'Find',
    'Read',
    'Reproduce',
    'Execute',
    'Complete'
  ])
  await expect(stages.locator('.stage-rank')).toHaveText([
    'Tied 1st of 27',
    '1st of 29',
    '1st of 26',
    '1st of 18',
    '1st of 4'
  ])
  await expect(page.locator('.field-strip i.ours')).toHaveCount(5)
  for (const [width, inRow] of [
    [1440, true],
    [980, false],
    [390, false]
  ] as const) {
    await page.setViewportSize({ width, height: 900 })
    const tops = await stages.evaluateAll((items) =>
      items.map((item) => Math.round(item.getBoundingClientRect().top))
    )
    if (inRow) expect(new Set(tops).size, `stages share a row at ${width}px`).toBe(1)
    else expect(tops, `stages stack at ${width}px`).toEqual([...tops].sort((a, b) => a - b))
    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
      .toBe(true)
  }
})
