import { expect, test } from '@playwright/test'

test('serves the standalone Open-Science overview at the clean route', async ({ page }) => {
  const consoleErrors: string[] = []
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text())
  })

  const response = await page.goto('/open-science/overview?lang=zh')

  expect(response?.status()).toBe(200)
  expect(response?.headers()['content-security-policy']).toContain("default-src 'self'")
  expect(response?.headers()['referrer-policy']).toBe('strict-origin-when-cross-origin')
  await expect(page).toHaveTitle(/AIPOCH.*Open-Science/i)
  await expect(page.locator('iframe')).toHaveCount(2)
  await expect(page.locator('nav')).toHaveCount(0)
  await expect(page.locator('footer')).toHaveCount(0)

  const chineseDeck = page.frameLocator('#deck-zh')
  await expect(chineseDeck.getByText('01 / 18', { exact: true })).toBeVisible()
  await expect(chineseDeck.locator('.slide.active')).toBeVisible()

  // Keep the hyphenated brand visible in the hero and community diagram, retaining the hero's yellow highlight.
  const highlightedBrand = chineseDeck.locator('.hero-title .highlight-text')
  await expect(highlightedBrand).toHaveText('Open-')
  await expect(highlightedBrand).toHaveCSS('background-color', 'rgb(241, 221, 103)')
  await expect(chineseDeck.locator('.hero-title')).toContainText('Open-Science')
  await expect(chineseDeck.locator('.community-core strong')).toHaveText('Open-Science')

  await expect(chineseDeck.locator('img')).not.toHaveCount(0)
  await chineseDeck.locator('#nextBtn').click({ force: true })
  await expect(chineseDeck.getByText('02 / 18', { exact: true })).toBeVisible()
  expect(consoleErrors).toEqual([])
})

test('plays the research film inline and pauses when leaving or switching language', async ({
  page
}, testInfo) => {
  await page.goto('/open-science/overview?lang=zh#slide-14')
  const chineseDeck = page.frameLocator('#deck-zh')
  const englishDeck = page.frameLocator('#deck-en')
  const chineseVideo = chineseDeck.locator('.research-film video')
  const englishVideo = englishDeck.locator('.research-film video')
  await expect(chineseDeck.locator('.research-film')).toHaveClass(/active/)

  await chineseVideo.evaluate(async (video: HTMLVideoElement) => {
    video.muted = true
    await video.play()
  })
  await expect
    .poll(() => chineseVideo.evaluate((v: HTMLVideoElement) => v.currentTime))
    .toBeGreaterThan(0)
  await chineseDeck.locator('#nextBtn').click()
  await expect(chineseDeck.locator('.architecture')).toHaveClass(/active/)
  expect(await chineseVideo.evaluate((v: HTMLVideoElement) => v.paused)).toBe(true)
  const pausedTime = await chineseVideo.evaluate((v: HTMLVideoElement) => v.currentTime)
  await chineseDeck.locator('#prevBtn').click()
  expect(await chineseVideo.evaluate((v: HTMLVideoElement) => v.paused)).toBe(true)
  expect(await chineseVideo.evaluate((v: HTMLVideoElement) => v.currentTime)).toBeCloseTo(
    pausedTime,
    1
  )

  await chineseVideo.evaluate((v: HTMLVideoElement) => v.play())
  await chineseDeck.locator('[data-deck-language="en"]').click()
  await expect(page.locator('#deck-en')).toBeVisible()
  await expect(englishDeck.locator('.research-film')).toHaveClass(/active/)
  expect(await chineseVideo.evaluate((v: HTMLVideoElement) => v.paused)).toBe(true)
  expect(await englishVideo.evaluate((v: HTMLVideoElement) => v.paused)).toBe(true)
  await englishVideo.evaluate(async (v: HTMLVideoElement) => {
    v.muted = true
    await v.play()
  })
  await expect
    .poll(() => englishVideo.evaluate((v: HTMLVideoElement) => v.currentTime))
    .toBeGreaterThan(0)
  expect(
    await englishVideo.evaluate((v: HTMLVideoElement) => [v.videoWidth, v.videoHeight])
  ).toEqual([3840, 2160])
  await page.screenshot({ path: testInfo.outputPath('research-film.png') })
  await englishDeck.locator('#nextBtn').focus()
  await page.keyboard.press('ArrowRight')
  await expect(englishDeck.locator('.architecture')).toHaveClass(/active/)
  expect(await englishVideo.evaluate((v: HTMLVideoElement) => v.paused)).toBe(true)
})

test('loads the distinct workspace captures and live package animation in both languages', async ({
  page
}, testInfo) => {
  for (const lang of ['zh', 'en']) {
    await page.goto(`/open-science/overview?lang=${lang}#slide-07`)
    const deck = page.frameLocator(`#deck-${lang}`)
    await expect(deck.locator('.workspace')).toHaveClass(/active/)
    const sources = new Set<string>()
    for (let index = 0; index < 6; index++) {
      await deck.locator('.workspace-tab').nth(index).click()
      const image = deck.locator('.workspace .gallery-panel.active img')
      await expect
        .poll(() => image.evaluate((img: HTMLImageElement) => img.naturalWidth))
        .toBeGreaterThan(0)
      sources.add((await image.getAttribute('src')) || '')
    }
    expect(sources.size).toBe(6)
    await deck.locator('.workspace-tab').nth(2).click()
    await page.screenshot({ path: testInfo.outputPath(`workspace-${lang}.png`) })
    await deck.locator('#overviewBtn').click()
    await deck.locator('#overviewGrid .overview-item').nth(12).click()
    await expect(deck.locator('.science-package')).toHaveClass(/active/)
    await expect(
      deck.frameLocator('.science-code-frame').locator('svg[viewBox="0 0 400 320"]')
    ).toBeVisible()
  }
})
