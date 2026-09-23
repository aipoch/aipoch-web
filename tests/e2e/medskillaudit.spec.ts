import { expect, test } from '@playwright/test'

test.describe.configure({ timeout: 60000 })

test('desktop mega navigation opens MedSkillAudit from the Benchmark menu', async ({
  page,
  isMobile
}) => {
  test.skip(isMobile, 'desktop navigation order is covered by the desktop project')

  await page.goto('/')

  const headerNav = page.locator('header nav')

  await expect(headerNav.getByRole('button', { name: 'Product' })).toBeVisible()
  await expect(headerNav.getByRole('button', { name: 'Agent Skills' })).toBeVisible()
  await expect(headerNav.getByRole('button', { name: 'Benchmark' })).toBeVisible()
  await expect(headerNav.getByRole('link', { name: 'Blog' })).toBeVisible()
  await expect(headerNav.getByRole('link', { name: 'Community' })).toHaveCount(0)

  await headerNav.getByRole('button', { name: 'Benchmark' }).click()
  const medSkillAuditLink = headerNav.getByRole('link', { name: /MedSkillAudit/ })
  await expect(medSkillAuditLink).toBeVisible()
  await expect(medSkillAuditLink).toHaveAttribute('href', '/medskillaudit')
  await Promise.all([
    page.waitForURL(/\/medskillaudit$/, { timeout: 30000 }),
    medSkillAuditLink.click()
  ])
  await expect(headerNav.getByRole('button', { name: 'Benchmark' })).toHaveAttribute(
    'aria-expanded',
    'false'
  )
  await expect(page.getByRole('heading', { name: 'What is MedSkillAudit?' })).toBeVisible()

  const benchmarkTrigger = headerNav.getByRole('button', { name: 'Benchmark' })
  await benchmarkTrigger.hover()
  await medSkillAuditLink.hover()
  await expect(medSkillAuditLink).not.toHaveCSS('background-color', 'rgba(0, 0, 0, 0)')
  await expect(benchmarkTrigger).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)')
  await headerNav.getByText('Workflow benchmark suite', { exact: true }).hover()
  await expect(medSkillAuditLink).toHaveAttribute('aria-current', 'page')
  await expect(medSkillAuditLink).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)')
  await page.mouse.move(0, 500)
  await expect(benchmarkTrigger).toHaveAttribute('aria-expanded', 'false')
  await expect(benchmarkTrigger).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)')
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
  await expect(page.getByText('Runtime · 60%')).toHaveCSS('background-color', 'rgb(43, 111, 176)')
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

test('mobile navigation opens MedSkillAudit and closes the menu', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'mobile menu behavior is covered by the Mobile Chrome project')

  await page.goto('/')
  await page.getByRole('button', { name: 'Open menu' }).click()
  await expect(page.getByRole('dialog', { name: 'Mobile navigation' })).toBeVisible()

  const mobileNav = page.getByRole('dialog', { name: 'Mobile navigation' })
  await mobileNav.getByRole('button', { name: 'Benchmark' }).click()
  const medSkillAuditLink = mobileNav.getByRole('link', { name: /MedSkillAudit/ })
  await expect(medSkillAuditLink).toBeVisible()
  await Promise.all([
    page.waitForURL(/\/medskillaudit$/, { timeout: 30000 }),
    medSkillAuditLink.click()
  ])
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
