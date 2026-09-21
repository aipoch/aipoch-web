import { expect, test } from '@playwright/test'
import { homepageSkillsCountFixture } from './homepage-e2e-fixtures'

test.beforeEach(async ({ page }) => {
  await page.route('https://api.github.com/**', (route) =>
    route.fulfill({ json: { stargazers_count: 3600 } })
  )
  await page.goto('/')
  const reject = page.getByRole('button', { name: 'Reject Non-Essential' })
  if (await reject.isVisible()) await reject.click()
})

test('centers the workspace illustration and audit link across viewport sizes', async ({
  page
}) => {
  for (const width of [390, 1440, 1920]) {
    await page.setViewportSize({ width, height: 900 })
    const preview = await page.getByTestId('spotlight-media-full-width').boundingBox()
    const audit = await page
      .getByRole('link', { name: 'Explore MedSkillAudit', exact: true })
      .boundingBox()
    if (!preview || !audit) throw new Error('Missing centered content')
    for (const box of [preview, audit])
      expect(Math.abs(box.x + box.width / 2 - width / 2)).toBeLessThan(1)
  }
  for (let index = 0; index < 4; index++) {
    const icon = await page.getByTestId(`skill-area-${index}`).locator('img').boundingBox()
    expect(icon?.width).toBe(36)
    expect(icon?.height).toBe(36)
  }
})

test('fits all four screenshots inside the exact Figma preview geometry', async ({
  page
}, testInfo) => {
  if (testInfo.project.name === 'chromium') await page.setViewportSize({ width: 1440, height: 900 })
  const preview = page.getByTestId('workflow-preview')
  for (const step of ['Plan', 'Execute', 'Produce', 'Review']) {
    await page.getByRole('button', { name: step, exact: true }).click()
    await preview.scrollIntoViewIfNeeded()
    const image = preview.getByRole('img')
    await expect
      .poll(() => image.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0))
      .toBe(true)
    const geometry = await image.evaluate((img: HTMLImageElement) => {
      const parent = img.parentElement
      if (!parent) throw new Error('Missing workflow frame')
      const frame = parent.getBoundingClientRect()
      const box = img.getBoundingClientRect()
      const scale = Math.min(box.width / img.naturalWidth, box.height / img.naturalHeight)
      return {
        fit: getComputedStyle(img).objectFit,
        bitmapAspect: img.naturalWidth / img.naturalHeight,
        elementAspect: box.width / box.height,
        left: (box.left - frame.left + (box.width - img.naturalWidth * scale) / 2) / frame.width,
        top: (box.top - frame.top) / frame.height
      }
    })
    expect(geometry.fit).toBe('contain')
    // The shadow must surround the bitmap, without a letterboxed strip across the background.
    expect(geometry.elementAspect).toBeCloseTo(geometry.bitmapAspect, 2)
    expect(geometry.left).toBeCloseTo(61.5 / 624, 2)
    expect(geometry.top).toBeCloseTo(50.5 / 468, 2)
    await preview.screenshot({
      path: `.codex/ui-review-2026-09-21/workflow-${step.toLowerCase()}-${testInfo.project.name === 'chromium' ? 'desktop' : 'mobile'}.png`
    })
  }
})

test('aligns the ecosystem columns and keeps homepage sections evenly spaced', async ({
  page
}, testInfo) => {
  const ecosystem = page.locator('#ecosystem')
  await ecosystem.scrollIntoViewIfNeeded()
  const cards = ecosystem.locator('article')
  await expect(cards).toHaveCount(3)
  for (const card of await cards.all()) {
    await expect
      .poll(() =>
        card
          .locator('img')
          .evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)
      )
      .toBe(true)
    await expect(card).toHaveCSS('border-top-width', '0px')
    await expect(card).toHaveCSS('text-align', 'left')
  }
  if (testInfo.project.name === 'chromium') {
    const titles = await cards
      .locator('h3')
      .evaluateAll((nodes) => nodes.map((node) => node.getBoundingClientRect().top))
    expect(Math.max(...titles) - Math.min(...titles)).toBeLessThan(1)
  }
  await ecosystem.screenshot({
    path: `.codex/ui-review-2026-09-21/ecosystem-${testInfo.project.name === 'chromium' ? 'desktop' : 'mobile'}.png`
  })
  const gaps = await page.evaluate(() => {
    const ids = [
      'product-tour',
      'ecosystem',
      'open-science-spotlight',
      'open-science',
      'skills',
      'audit'
    ]
    return ids.slice(1).map((id, index) => {
      const previous = document.getElementById(ids[index])?.lastElementChild
      const next = document.getElementById(id)?.firstElementChild
      if (!previous || !next) throw new Error(`Missing section ${id}`)
      return next.getBoundingClientRect().top - previous.getBoundingClientRect().bottom
    })
  })
  for (const gap of gaps) {
    expect(gap).toBeGreaterThanOrEqual(79)
    expect(gap).toBeLessThanOrEqual(97)
  }
})

test('counts up to the API total on first visibility and respects reduced motion', async ({
  page
}) => {
  const count = page.getByTestId('skills-count')
  const samples = await count.evaluate(
    (element) =>
      new Promise<number[]>((resolve) => {
        const values: number[] = []
        const start = performance.now()
        element.scrollIntoView({ block: 'center', behavior: 'instant' })
        const sample = () => {
          values.push(Number(element.textContent))
          if (performance.now() - start > 1400) resolve(values)
          else requestAnimationFrame(sample)
        }
        requestAnimationFrame(sample)
      })
  )
  expect(samples.some((value) => value > 0 && value < homepageSkillsCountFixture)).toBe(true)
  expect(samples.at(-1)).toBe(homepageSkillsCountFixture)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.reload()
  await count.scrollIntoViewIfNeeded()
  await expect(count).toHaveText(String(homepageSkillsCountFixture))
})
