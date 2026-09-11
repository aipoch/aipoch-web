import { expect, test } from '@playwright/test'

test('renders the redesigned Agent Skills hub with existing destinations', async ({
  page
}, testInfo) => {
  if (testInfo.project.name === 'chromium') {
    await page.setViewportSize({ width: 1440, height: 900 })
  }

  const pageErrors: string[] = []
  page.on('pageerror', (error) => pageErrors.push(error.message))

  await page.goto('/agent-skills')

  await expect(
    page.getByRole('heading', { name: 'The Ultimate Skills Hub for Medical Research' })
  ).toBeVisible()
  await expect(page.getByRole('link', { name: 'Explore Skills' })).toHaveAttribute(
    'href',
    '/agent-skills/list'
  )
  await expect(page.getByRole('link', { name: 'aipoch/skill.md' })).toHaveAttribute(
    'href',
    'https://aipoch.com/skill.md'
  )

  // Preserve the three guide routes while removing the former configuration experience.
  await expect(page.getByRole('link', { name: /What are Skills/ })).toHaveAttribute(
    'href',
    '/guides/what-is-a-skill'
  )
  await expect(page.getByRole('link', { name: /Getting Started/ })).toHaveAttribute(
    'href',
    '/guides/get-started-with-skills'
  )
  await expect(page.getByRole('link', { name: /Create a Skill/ })).toHaveAttribute(
    'href',
    '/guides/build-your-own-skill'
  )
  await expect(page.getByText('OpenClaw')).toHaveCount(0)

  const heroImage = page.locator('main img').first()
  await expect
    .poll(() =>
      heroImage.evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth)
    )
    .toBeGreaterThan(0)
  await page.locator('footer').scrollIntoViewIfNeeded()
  await expect(page.locator('header')).toBeVisible()
  await expect(page.locator('footer')).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  expect(pageErrors).toEqual([])

  const rejectCookies = page.getByRole('button', { name: 'Reject Non-Essential' })
  if (await rejectCookies.isVisible()) await rejectCookies.click()
  await page.evaluate(() => window.scrollTo(0, 0))
  await page.screenshot({ path: testInfo.outputPath('agent-skills-page.png'), fullPage: true })
})

test('extends the hero canvas beneath the navbar without shifting page content', async ({
  page
}, testInfo) => {
  if (testInfo.project.name === 'chromium') {
    await page.setViewportSize({ width: 1440, height: 900 })
  }

  await page.goto('/agent-skills')

  const geometry = await page.evaluate(() => {
    const header = document.querySelector<HTMLElement>('header[data-nav]')
    const main = document.querySelector<HTMLElement>('main')
    const hero = main?.querySelector<HTMLElement>(':scope > section')
    const heroContent = hero?.lastElementChild as HTMLElement | null
    const heroImage = hero?.querySelector<HTMLImageElement>('img')
    const intro = hero?.nextElementSibling as HTMLElement | null
    if (!header || !main || !hero || !heroContent || !heroImage || !intro) {
      throw new Error('Agent Skills page geometry is incomplete.')
    }

    return {
      desktop: matchMedia('(min-width: 1024px)').matches,
      headerHeight: header.getBoundingClientRect().height,
      mainTop: main.getBoundingClientRect().top,
      heroTop: hero.getBoundingClientRect().top,
      heroHeight: hero.getBoundingClientRect().height,
      heroMinHeight: Number.parseFloat(getComputedStyle(hero).minHeight),
      heroBorderBottom: Number.parseFloat(getComputedStyle(hero).borderBottomWidth),
      heroBackgroundColor: getComputedStyle(hero).backgroundColor,
      heroPaddingTop: Number.parseFloat(getComputedStyle(heroContent).paddingTop),
      heroImageTop: heroImage.getBoundingClientRect().top,
      heroImageCenter:
        heroImage.getBoundingClientRect().left + heroImage.getBoundingClientRect().width / 2,
      heroImageHeight: heroImage.getBoundingClientRect().height,
      introTop: intro.getBoundingClientRect().top,
      viewportWidth: innerWidth
    }
  })

  const baseHeroHeight = 620
  const baseContentPadding = geometry.desktop ? 123.5 : 80

  expect(geometry.mainTop).toBe(0)
  expect(geometry.heroTop).toBe(0)
  expect(geometry.heroMinHeight).toBe(baseHeroHeight + geometry.headerHeight)
  expect(geometry.heroHeight).toBeGreaterThanOrEqual(geometry.heroMinHeight)
  if (geometry.desktop) expect(geometry.heroHeight - geometry.heroMinHeight).toBeLessThan(1)
  expect(geometry.heroBackgroundColor).toBe('rgb(246, 243, 239)')
  expect(geometry.heroPaddingTop).toBe(geometry.headerHeight + baseContentPadding)
  expect(geometry.heroImageTop).toBe(0)
  const expectedImageCenter = geometry.viewportWidth / 2 + (geometry.desktop ? 124 : 0)
  expect(geometry.heroImageCenter).toBeCloseTo(expectedImageCenter, 5)
  expect(geometry.heroImageHeight + geometry.heroBorderBottom).toBeCloseTo(geometry.heroHeight, 5)
  expect(geometry.introTop).toBeCloseTo(geometry.heroHeight, 5)
})
