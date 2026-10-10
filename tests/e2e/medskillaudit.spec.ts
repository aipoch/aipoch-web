import { expect, test } from '@playwright/test'

test.describe.configure({ timeout: 60000 })

test('desktop navigation links directly to Use Cases and MedSkillAudit', async ({
  page,
  isMobile
}, testInfo) => {
  test.skip(isMobile, 'desktop navigation order is covered by the desktop project')

  await page.goto('/')

  const headerNav = page.locator('header nav')

  await expect(headerNav.getByRole('button', { name: 'Product' })).toHaveCount(0)
  await expect(headerNav.getByRole('button', { name: 'Agent Skills' })).toBeVisible()
  await expect(headerNav.getByRole('button', { name: 'Benchmark' })).toHaveCount(0)
  await expect(headerNav.getByRole('link', { name: 'Blog' })).toBeVisible()
  await expect(headerNav.getByRole('link', { name: 'Community' })).toHaveCount(0)

  const useCasesLink = headerNav.getByRole('link', { name: 'Use Cases', exact: true })
  await expect(useCasesLink).toHaveAttribute('href', '/open-science/use-cases')
  await useCasesLink.hover()
  await expect(headerNav.locator('[data-desktop-nav-panel]')).not.toBeVisible()
  await useCasesLink.click()
  await expect(page).toHaveURL(/\/open-science\/use-cases$/)
  await expect(page.getByRole('heading', { name: 'Use Case Gallery' })).toBeVisible()
  await expect(useCasesLink).toHaveAttribute('aria-current', 'page')
  await expect(
    headerNav.getByRole('link', { name: 'Open-Science', exact: true })
  ).not.toHaveAttribute('aria-current', 'page')
  await headerNav.screenshot({
    path: testInfo.outputPath('desktop-navigation.png'),
    animations: 'disabled'
  })

  const benchmarkLink = headerNav.getByRole('link', { name: 'Benchmark', exact: true })
  await expect(benchmarkLink).toHaveAttribute('href', '/medskillaudit')
  await benchmarkLink.hover()
  await expect(headerNav.locator('[data-desktop-nav-panel]')).not.toBeVisible()
  await Promise.all([
    page.waitForURL(/\/medskillaudit$/, { timeout: 30000 }),
    benchmarkLink.click()
  ])
  await expect(benchmarkLink).toHaveAttribute('aria-current', 'page')
  await expect(page.getByRole('heading', { name: 'What is MedSkillAudit?' })).toBeVisible()
})

test('MedSkillAudit page presents framework content and assets', async ({ page }) => {
  await page.goto('/medskillaudit')

  await expect(page.getByRole('heading', { name: 'What is MedSkillAudit?' })).toBeVisible()
  await expect(page.getByText('aipoch audit ./skills/my-skill').first()).toBeVisible()
  await expect(page.locator('video source')).toHaveAttribute(
    'src',
    'https://statics.aipoch.com/public/f/video/medskillaudit-l9s0f.mp4'
  )
  await expect(page.locator('video')).not.toHaveAttribute('poster')
  await expect(
    page
      .locator('p strong')
      .getByText('domain-specific audit framework for medical research agent skills')
  ).toHaveCSS('font-weight', '700')

  for (const text of [
    '75',
    '5',
    '25',
    '0.449 ICC',
    'Veto Gates',
    'Static evaluation',
    'Dynamic evaluation',
    'Final Score',
    'Eight sequential steps',
    'Five categories',
    'Two artifacts',
    'arXiv:2604.20441'
  ]) {
    await expect(page.getByText(text, { exact: false }).first()).toBeVisible()
  }

  await expect(page.getByRole('link', { name: 'How it works' })).toHaveAttribute('href', '#how')
  await expect(page.getByText('Design · 40%')).toHaveCSS('background-color', 'rgb(17, 17, 17)')
  await expect(page.getByText('Runtime · 60%')).toHaveCSS('background-color', 'rgb(230, 230, 230)')
  const scoreSection = page.locator('#score')
  await expect(scoreSection.getByText('Score', { exact: true })).toBeVisible()
  await expect(scoreSection.getByText('Grade', { exact: true })).toBeVisible()
  await expect(scoreSection.getByText('Disposition', { exact: true })).toBeVisible()
  const thresholdCard = scoreSection.locator('article[aria-label="Release disposition thresholds"]')
  await expect(thresholdCard.getByText('Production Ready')).toBeVisible()
  await expect(thresholdCard.getByText(/Release thresholds map/)).toHaveCount(0)
  await expect(page.getByText('Skill Complexity Classification')).toBeVisible()
  await expect(page.getByText('ICC(2,1) = 0.449')).toHaveCSS('color', 'rgb(236, 212, 76)')
  await expect(page.getByText('aipoch audit ./skills/my-skill --report json')).toBeVisible()

  await expect(page.getByRole('link', { name: /View on GitHub/i }).first()).toHaveAttribute(
    'href',
    'https://github.com/aipoch/medical-research-skills/tree/main/skill-auditor'
  )
  await expect(page.getByRole('link', { name: /Read the Paper/i }).first()).toHaveAttribute(
    'href',
    'https://arxiv.org/abs/2604.20441'
  )
  await expect(page.getByText(/Auto-Improvement/i)).toHaveCount(0)
  await expect(page.getByText(/Hard gate/i)).toHaveCount(0)
  await expect(page.getByText('Veto', { exact: true })).toHaveCount(0)
})

test('mobile navigation links directly to Use Cases and MedSkillAudit and closes the menu', async ({
  page,
  isMobile
}, testInfo) => {
  test.skip(!isMobile, 'mobile menu behavior is covered by the Mobile Chrome project')

  await page.goto('/')
  await page.getByRole('button', { name: 'Reject non-essential', exact: true }).click()
  await page.getByRole('button', { name: 'Open menu' }).click()
  await expect(page.getByRole('dialog', { name: 'Mobile navigation' })).toBeVisible()

  const mobileNav = page.getByRole('dialog', { name: 'Mobile navigation' })
  await expect(mobileNav.getByRole('button', { name: 'Product' })).toHaveCount(0)
  await expect(mobileNav.getByRole('button', { name: 'Benchmark' })).toHaveCount(0)
  await expect(mobileNav.getByRole('button', { name: 'Use Cases' })).toHaveCount(0)
  const useCasesLink = mobileNav.getByRole('link', { name: 'Use Cases', exact: true })
  await expect(useCasesLink).toHaveAttribute('href', '/open-science/use-cases')
  await useCasesLink.click()
  await expect(page).toHaveURL(/\/open-science\/use-cases$/)
  await expect(mobileNav).not.toBeVisible()
  await expect(page.getByRole('heading', { name: 'Use Case Gallery' })).toBeVisible()
  await page.getByRole('button', { name: 'Open menu' }).click()
  await expect(useCasesLink).toHaveAttribute('aria-current', 'page')
  await page.screenshot({
    path: testInfo.outputPath('mobile-navigation.png'),
    animations: 'disabled'
  })
  const benchmarkLink = mobileNav.getByRole('link', { name: 'Benchmark', exact: true })
  await expect(benchmarkLink).toHaveAttribute('href', '/medskillaudit')
  await Promise.all([
    page.waitForURL(/\/medskillaudit$/, { timeout: 30000 }),
    benchmarkLink.click()
  ])
  await expect(mobileNav).not.toBeVisible()
  await expect(page.getByRole('button', { name: 'Open menu' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'What is MedSkillAudit?' })).toBeVisible()
})

test('MedSkillAudit keeps footer legal regression intact', async ({ page }) => {
  await page.goto('/medskillaudit')

  const footer = page.locator('footer')
  await expect(footer.getByRole('link', { name: 'Cookie Policy' })).toHaveAttribute(
    'href',
    '/cookie-policy'
  )
  await expect(footer.getByRole('link', { name: 'Privacy Policy' })).toHaveAttribute(
    'href',
    '/privacy-policy'
  )
  await expect(footer.getByRole('link', { name: 'Terms of Service' })).toHaveAttribute(
    'href',
    '/terms-of-service'
  )
})

test('legacy benchmark URL redirects to MedSkillAudit', async ({ page }) => {
  await page.goto('/benchmark')

  await expect(page).toHaveURL(/\/medskillaudit$/)
  await expect(page.getByRole('heading', { name: 'What is MedSkillAudit?' })).toBeVisible()
})
