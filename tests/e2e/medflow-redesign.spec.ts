import { expect, test } from '@playwright/test'

test('renders the MedFlow redesign at its production route', async ({ page }) => {
  await page.goto('/medflow-redesign')

  await expect(page).toHaveURL(/\/medflow-redesign$/)
  await expect(page.getByRole('heading', { name: 'MedFlow' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Be first in line.' })).toBeVisible()
  await expect(page.getByLabel('Your name')).toBeVisible()
  await expect(page.getByLabel('Email address')).toBeVisible()
  await expect(page.getByRole('button', { name: /Request early access/ })).toBeVisible()
})

test('supports the original preview state query parameters', async ({ page }) => {
  test.setTimeout(60_000)

  await page.goto('/medflow-redesign?state=typing')
  await expect(page.getByLabel('Your name')).toHaveValue('Dr. Maya Ch')
  await expect(page.getByLabel('Email address')).toHaveValue('maya.chen@research.')

  await page.goto('/medflow-redesign?state=completed')
  await expect(page.getByRole('button', { name: /Request early access/ })).toBeEnabled()

  await page.goto('/medflow-redesign?state=error')
  await expect(page.locator('#mf-redesign-form-message')).toHaveText('Enter a valid email address.')

  await page.goto('/medflow-redesign?state=submitting')
  await expect(page.getByRole('button', { name: 'Requesting…' })).toBeDisabled()

  await page.goto('/medflow-redesign?state=server')
  await expect(page.locator('#mf-redesign-form-message')).toHaveText(
    'We couldn’t submit your request. Please try again.'
  )

  await page.goto('/medflow-redesign?state=duplicate')
  await expect(page.locator('#mf-redesign-form-message')).toHaveText(
    'This email is already on the waitlist.'
  )
})

test('submits to the requested demonstration result', async ({ page }) => {
  await page.goto('/medflow-redesign?result=duplicate')
  await page.getByLabel('Your name').fill('Dr. Maya Chen')
  await page.getByLabel('Email address').fill('maya.chen@research.org')
  await page
    .getByLabel('I agree to the processing of my data described in the Privacy Policy')
    .check()
  await page.getByRole('button', { name: /Request early access/ }).click()

  await expect(page.getByRole('button', { name: 'Requesting…' })).toBeDisabled()
  await expect(page.locator('#mf-redesign-form-message')).toHaveText(
    'This email is already on the waitlist.'
  )
})

test('validates email before showing the requested server result', async ({ page }) => {
  await page.goto('/medflow-redesign?result=server')
  await page.getByLabel('Your name').fill('Dr. Maya Chen')
  await page.getByLabel('Email address').fill('maya.chen@')
  await page
    .getByLabel('I agree to the processing of my data described in the Privacy Policy')
    .check()
  await page.getByRole('button', { name: /Request early access/ }).click()
  await expect(page.locator('#mf-redesign-form-message')).toHaveText('Enter a valid email address.')

  await page.getByLabel('Email address').fill('maya.chen@research.org')
  await page.getByRole('button', { name: /Request early access/ }).click()
  await expect(page.getByRole('button', { name: 'Requesting…' })).toBeDisabled()
  await expect(page.locator('#mf-redesign-form-message')).toHaveText(
    'We couldn’t submit your request. Please try again.'
  )
})

test('announces success and lets the hero action return focus to the form', async ({ page }) => {
  await page.goto('/medflow-redesign?state=success')

  const success = page.locator('.mf-redesign-success')
  await expect(success).toBeFocused()
  await expect(success).toContainText("You're in, Dr. Maya Chen!")
  await expect(success).toContainText('While you wait — join the community and follow along:')
  await expect(success).toContainText('SIGNAL RECEIVED')
  await expect(success.getByRole('link', { name: 'Explore AIPOCH' })).toBeVisible()

  await page
    .locator('.mf-redesign-intro')
    .getByRole('button', { name: 'Join the waitlist' })
    .click()
  await expect(page.getByLabel('Your name')).toBeFocused()
  await expect(page.getByLabel('Your name')).toHaveValue('Dr. Maya Chen')
})

test('keeps a long success name inside the mobile card', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/medflow-redesign')
  await page.getByLabel('Your name').fill(`Dr. ${'Longname'.repeat(30)}`)
  await page.getByLabel('Email address').fill('long.name@example.com')
  await page
    .getByLabel('I agree to the processing of my data described in the Privacy Policy')
    .check()
  await page.getByRole('button', { name: /Request early access/ }).click()

  const success = page.locator('.mf-redesign-success')
  await expect(success).toBeVisible()
  const bounds = await success.evaluate((element) => {
    const card = element.getBoundingClientRect()
    const title = element.querySelector('h2')?.getBoundingClientRect()
    return {
      cardRight: card.right,
      documentWidth: document.documentElement.scrollWidth,
      titleRight: title?.right ?? Number.POSITIVE_INFINITY,
      viewportWidth: document.documentElement.clientWidth
    }
  })

  expect(bounds.titleRight).toBeLessThanOrEqual(bounds.cardRight + 1)
  expect(bounds.documentWidth).toBeLessThanOrEqual(bounds.viewportWidth)
})
