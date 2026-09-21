import { expect, type Page, test } from '@playwright/test'

const scrollY = (page: Page) => page.evaluate(() => window.scrollY)
const expectScroll = async (page: Page, y: number) => {
  await expect.poll(async () => Math.abs((await scrollY(page)) - y)).toBeLessThan(3)
}

test.beforeEach(async ({ page }) => {
  await page.route('https://api.github.com/**', (route) =>
    route.fulfill({ json: { stargazers_count: 3600 } })
  )
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/')
  const reject = page.getByRole('button', { name: 'Reject Non-Essential' })
  if (await reject.isVisible()) await reject.click()
})

test('restores independent Back and Forward positions after in-app links', async ({ page }) => {
  const explore = page.getByRole('link', { name: 'Explore MedSkillAudit', exact: true })
  await explore.scrollIntoViewIfNeeded()
  const homeY = await scrollY(page)
  expect(homeY).toBeGreaterThan(2000)
  await explore.click()
  await expect(page).toHaveURL(/\/medskillaudit$/)
  await page.evaluate(() => window.scrollTo(0, 800))
  await expectScroll(page, 800)
  await page.goBack()
  await expect(page).toHaveURL(/\/$/)
  await expectScroll(page, homeY)
  await page.goForward()
  await expect(page).toHaveURL(/\/medskillaudit$/)
  await expectScroll(page, 800)
})

test('keeps separate positions for two visits to the same URL and leaves new visits at the top', async ({
  page
}) => {
  await page
    .getByRole('link', { name: 'Explore MedSkillAudit', exact: true })
    .scrollIntoViewIfNeeded()
  const firstHomeY = await scrollY(page)
  await page.getByRole('link', { name: 'Explore MedSkillAudit', exact: true }).click()
  await expect(page).toHaveURL(/\/medskillaudit$/)
  await page.getByRole('banner').locator('a[href="/"]').first().click()
  await expect(page).toHaveURL(/\/$/)
  await expect.poll(() => scrollY(page)).toBeLessThan(100)
  await page.evaluate(() => window.scrollTo(0, 500))
  await expectScroll(page, 500)
  await page.goBack()
  await expect(page).toHaveURL(/\/medskillaudit$/)
  await page.goBack()
  await expect(page).toHaveURL(/\/$/)
  await expectScroll(page, firstHomeY)
  await page.goForward()
  await page.goForward()
  await expectScroll(page, 500)
})

test('restores a full-document Back navigation after reload and asynchronous assets', async ({
  page
}) => {
  await page.locator('#skills').scrollIntoViewIfNeeded()
  const homeY = await scrollY(page)
  await page.goto('/guides/get-started-with-skills')
  await expect(
    page.getByRole('heading', { name: 'Get Started with Skills', exact: true }).first()
  ).toBeVisible()
  await page.reload()
  await page.goBack()
  await expect(page).toHaveURL(/\/$/)
  await expectScroll(page, homeY)
})

test('restores positions for native table-of-contents anchors', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'The guide table of contents is desktop only.')
  await page.goto('/guides/get-started-with-skills')
  const links = page.getByRole('navigation', { name: 'On this page' }).locator('a')
  await expect(links.first()).toBeVisible()
  await page.evaluate(() => window.scrollTo(0, 200))
  const original = await scrollY(page)
  await links.last().click()
  await expect(page).toHaveURL(/#.+/)
  const anchorY = await scrollY(page)
  await page.goBack()
  await expectScroll(page, original)
  await page.goForward()
  await expectScroll(page, anchorY)
})
