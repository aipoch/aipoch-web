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
