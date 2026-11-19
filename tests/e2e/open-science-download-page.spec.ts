import { expect, test } from '@playwright/test'

test('renders the Open-Science download page inside the shared site shell', async ({ page }) => {
  await page.goto('/open-science/download')

  await expect(
    page.getByRole('heading', {
      level: 1,
      name: 'Download Open-Science for macOS, Windows and Linux'
    })
  ).toBeVisible()
  await expect(page.locator('header[data-nav]')).toBeVisible()
  await expect(page.locator('footer')).toBeVisible()
})

test('copies the visible source install prompt from the first screen', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.goto('/open-science/download')
  await page.getByRole('button', { name: 'Reject non-essential', exact: true }).click()
  const hero = page.locator('main#top > section').first()
  const prompt = hero.getByText(/^Clone https:\/\/github\.com\/aipoch\/open-science/)
  const button = hero.getByRole('button', { name: 'Copy prompt' })

  await expect(button).toBeInViewport({ ratio: 1 })
  const expected = await prompt.innerText()
  await button.click()
  await expect(hero.getByRole('button', { name: 'Copied' })).toBeVisible()
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(expected)
  await hero.getByRole('link', { name: 'Choose an installer' }).click()
  await expect(page).toHaveURL(/#downloads$/)
})

test('reveals the name and color of each coding agent in the prompt footer', async ({ page }) => {
  await page.goto('/open-science/download')
  await page.getByRole('button', { name: 'Reject non-essential', exact: true }).click()
  const agents = page.getByRole('list', { name: 'Coding agents for this prompt' })
  await expect(agents.getByRole('button')).toHaveCount(22)
  await expect(page.getByText('22 coding agents', { exact: true })).toBeVisible()
  const claude = agents.getByRole('button', { name: 'Claude Code', exact: true })
  const mark = claude.locator('span')
  await expect(mark).toHaveCSS('filter', 'grayscale(1)')
  await claude.click()
  await expect(mark).toHaveCSS('filter', 'grayscale(0)')
  await expect(page.getByText('Claude Code', { exact: true })).toBeVisible()
  await page.mouse.move(0, 0)
  await page.keyboard.press('Tab')
  await expect(page.getByText('OpenCode', { exact: true })).toBeVisible()
})

test('matches the supplied hero height while keeping content below the navbar', async ({
  page
}, testInfo) => {
  const isDesktop = testInfo.project.name === 'chromium'
  await page.setViewportSize(
    isDesktop ? { width: 1440, height: 1000 } : { width: 393, height: 1000 }
  )
  await page.goto('/open-science/download')

  const geometry = await page.evaluate(() => {
    const header = document.querySelector<HTMLElement>('header[data-nav]')
    const main = document.querySelector<HTMLElement>('main#top')
    const hero = document.querySelector<HTMLElement>('main#top > section:first-of-type')
    const background = hero?.querySelector<HTMLElement>(':scope > div[aria-hidden="true"]')
    const content = hero?.querySelector<HTMLElement>(':scope > div.relative.z-10')
    if (!header || !main || !hero || !background || !content) {
      throw new Error('Download page shell is missing')
    }

    return {
      backgroundTop: background.getBoundingClientRect().top,
      contentTop: content.getBoundingClientRect().top,
      headerBottom: header.getBoundingClientRect().bottom,
      heroBottom: hero.getBoundingClientRect().bottom,
      heroTop: hero.getBoundingClientRect().top,
      mainTop: main.getBoundingClientRect().top,
      viewportHeight: window.innerHeight
    }
  })

  expect(geometry.mainTop).toBe(0)
  expect(geometry.heroTop).toBe(0)
  expect(geometry.backgroundTop).toBeCloseTo(geometry.headerBottom, 0)
  expect(geometry.contentTop).toBeGreaterThanOrEqual(geometry.headerBottom)
  if (isDesktop) {
    expect(geometry.heroBottom - geometry.headerBottom).toBeCloseTo(600, 0)
  } else {
    expect(geometry.heroBottom).toBeLessThan(geometry.viewportHeight)
  }
})

test('shows the shared Download navigation action', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'Desktop navigation assertion')
  await page.goto('/open-science/download')

  const navigationActions = page.getByTestId('navbar-actions')
  await expect(
    navigationActions.getByRole('link', { name: 'Download', exact: true })
  ).toHaveAttribute('href', '/open-science/download')
})

test('renders every section and installer from the supplied download design', async ({ page }) => {
  await page.goto('/open-science/download')

  await expect(page.getByRole('heading', { name: 'Choose your installer.' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Know before you install.' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'How automatic updates work' })).toBeVisible()
  await expect(
    page.getByRole('heading', { name: 'Download and installation questions.' })
  ).toBeVisible()
  await expect(
    page.getByRole('heading', {
      name: 'Published releases and older installers are available on GitHub.'
    })
  ).toBeVisible()
  await expect(page.locator('#downloads article')).toHaveCount(4)
  await expect(page.getByRole('heading', { level: 3, name: 'Apple Silicon' })).toBeVisible()
  await expect(page.getByRole('heading', { level: 3, name: 'Intel' })).toBeVisible()
  await expect(page.getByRole('heading', { level: 3, name: 'Windows x64' })).toBeVisible()
  await expect(page.getByRole('heading', { level: 3, name: 'Linux' })).toBeVisible()
  await expect(page.getByText('Which Mac download should I choose?')).toBeVisible()
})

const platformOrders = [
  {
    name: 'macOS',
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    expected: ['mac-arm64', 'mac-x64', 'win-x64', 'linux-x64-deb']
  },
  {
    name: 'Windows',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    expected: ['win-x64', 'mac-arm64', 'mac-x64', 'linux-x64-deb']
  },
  {
    name: 'Linux',
    userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36',
    expected: ['linux-x64-deb', 'mac-arm64', 'mac-x64', 'win-x64']
  }
] as const

for (const platform of platformOrders) {
  test(`orders installers for ${platform.name} and highlights only the first card`, async ({
    browser
  }) => {
    const context = await browser.newContext({ userAgent: platform.userAgent })
    const page = await context.newPage()

    try {
      await page.goto('/open-science/download')

      await expect(page.locator('#downloads article')).toHaveCount(4)
      expect(
        await page
          .locator('#downloads article')
          .evaluateAll((cards) => cards.map((card) => card.getAttribute('data-download-key')))
      ).toEqual([...platform.expected])
      await expect(page.locator('#downloads article[data-recommended="true"]')).toHaveCount(1)
      await expect(page.locator('#downloads article').first()).toHaveAttribute(
        'data-recommended',
        'true'
      )
    } finally {
      await context.close()
    }
  })
}

test('records the selected installer download event through gtag', async ({ page }) => {
  await page.goto('/open-science/download')
  const linuxCard = page.locator('article[data-download-key="linux-x64-deb"]')

  await page.evaluate(() => {
    const trackedWindow = window as Window & { recordedDownloadEvents?: unknown[][] }
    trackedWindow.recordedDownloadEvents = []
    window.gtag = (...args: unknown[]) => trackedWindow.recordedDownloadEvents?.push(args)
    document.addEventListener(
      'click',
      (event) => {
        if ((event.target as Element).closest('[data-analytics-event]')) event.preventDefault()
      },
      { capture: true }
    )
  })
  await linuxCard.getByRole('link', { name: 'Download' }).click()

  expect(
    await page.evaluate(
      () => (window as Window & { recordedDownloadEvents?: unknown[][] }).recordedDownloadEvents
    )
  ).toContainEqual(['event', 'download_linux_deb'])
})

test('matches the desktop alignment from the supplied page design', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'Desktop layout assertions')
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.goto('/open-science/download')

  const articles = page.locator('#downloads article')
  const docsLink = page.getByRole('link', { name: 'Read the Installation Docs' })
  const notesLink = page.getByRole('link', { name: /release notes/ })
  const [firstCard, lastCard, leftLink, rightLink] = await Promise.all([
    articles.first().boundingBox(),
    articles.last().boundingBox(),
    docsLink.boundingBox(),
    notesLink.boundingBox()
  ])
  expect(firstCard).not.toBeNull()
  expect(lastCard).not.toBeNull()
  expect(leftLink).not.toBeNull()
  expect(rightLink).not.toBeNull()
  expect(Math.abs((leftLink?.x ?? 0) - (firstCard?.x ?? 0))).toBeLessThan(2)
  expect(
    Math.abs(
      (rightLink?.x ?? 0) + (rightLink?.width ?? 0) - ((lastCard?.x ?? 0) + (lastCard?.width ?? 0))
    )
  ).toBeLessThan(2)

  const updatesSection = page.locator('section').filter({
    has: page.getByRole('heading', { name: 'How automatic updates work' })
  })
  const updatesHeading = page.getByRole('heading', { name: 'How automatic updates work' })
  const [updatesBox, updatesHeadingBox] = await Promise.all([
    updatesSection.boundingBox(),
    updatesHeading.boundingBox()
  ])
  expect(updatesBox?.width).toBe(1440)
  expect(updatesHeadingBox?.x).toBeCloseTo(1440 * 0.032, 0)

  const faqHeading = page.getByRole('heading', {
    name: 'Download and installation questions.'
  })
  const faqList = page.locator('#faq details').first()
  const [faqHeadingBox, faqListBox] = await Promise.all([
    faqHeading.boundingBox(),
    faqList.boundingBox()
  ])
  expect(
    (faqListBox?.x ?? 0) - ((faqHeadingBox?.x ?? 0) + (faqHeadingBox?.width ?? 0))
  ).toBeGreaterThan(40)
  expect(Math.abs((faqListBox?.y ?? 0) - (faqHeadingBox?.y ?? 0))).toBeLessThan(12)

  const releasesHeading = page.getByRole('heading', {
    name: 'Published releases and older installers are available on GitHub.'
  })
  const releasesButton = page.getByRole('link', { name: 'View all GitHub Releases' })
  for (const element of [releasesHeading, releasesButton]) {
    const box = await element.boundingBox()
    expect((box?.x ?? 0) + (box?.width ?? 0) / 2).toBeCloseTo(720, 0)
  }
})

test('matches the section surfaces from the supplied HTML', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'Desktop visual assertions')
  await page.goto('/open-science/download')

  const updatesSection = page.locator('section').filter({
    has: page.getByRole('heading', { name: 'How automatic updates work' })
  })
  const githubSection = page.locator('section').filter({
    has: page.getByRole('heading', {
      name: 'Published releases and older installers are available on GitHub.'
    })
  })

  await expect(updatesSection).toHaveCSS('background-color', 'rgb(239, 239, 236)')
  await expect(page.locator('#faq')).toHaveCSS('background-color', 'rgb(255, 255, 255)')
  await expect(githubSection).toHaveCSS('background-color', 'rgb(17, 18, 15)')
})

test('keeps the automatic updates description to three lines on a wide desktop', async ({
  page
}, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'Desktop visual assertions')
  await page.setViewportSize({ width: 2048, height: 1000 })
  await page.goto('/open-science/download')

  const updatesDescription = page
    .locator('section')
    .filter({ has: page.getByRole('heading', { name: 'How automatic updates work' }) })
    .locator('p')
    .last()
  const metrics = await updatesDescription.evaluate((element) => {
    const styles = getComputedStyle(element)
    const lineHeight = Number.parseFloat(styles.lineHeight)
    return {
      lines: Math.round(element.getBoundingClientRect().height / lineHeight),
      width: element.getBoundingClientRect().width
    }
  })

  expect(metrics.lines).toBe(3)
  expect(metrics.width).toBeLessThanOrEqual(650)
})

test('renders compact yellow FAQ disclosure symbols', async ({ page }) => {
  await page.goto('/open-science/download')

  const symbol = page.locator('#faq summary span').first()
  await expect(symbol).toHaveCSS('color', 'rgb(220, 165, 16)')
  expect(
    Number.parseFloat(await symbol.evaluate((element) => getComputedStyle(element).fontSize))
  ).toBeLessThanOrEqual(16)
})

test('uses the supplied FAQ divider color', async ({ page }) => {
  await page.goto('/open-science/download')

  const faqList = page.locator('#faq > div > div').last()
  await expect(faqList).toHaveCSS('border-top-color', 'rgb(231, 229, 222)')
  await expect(faqList.locator('details').first()).toHaveCSS(
    'border-bottom-color',
    'rgb(231, 229, 222)'
  )
})

test('matches the supplied automatic updates text color and right spacing', async ({
  page
}, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'Desktop visual assertions')
  await page.setViewportSize({ width: 2048, height: 1000 })
  await page.goto('/open-science/download')

  const updatesSection = page.locator('section').filter({
    has: page.getByRole('heading', { name: 'How automatic updates work' })
  })
  const description = updatesSection.locator('p').last()
  await expect(description).toHaveCSS('color', 'rgb(16, 17, 15)')

  const [sectionBox, descriptionBox] = await Promise.all([
    updatesSection.boundingBox(),
    description.boundingBox()
  ])
  const rightSpace =
    (sectionBox?.x ?? 0) +
    (sectionBox?.width ?? 0) -
    ((descriptionBox?.x ?? 0) + (descriptionBox?.width ?? 0))
  expect(rightSpace).toBeGreaterThan(120)
  expect(rightSpace).toBeLessThan(170)
})

test('matches the supplied recommended card label and fact layout', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'Desktop visual assertions')
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.goto('/open-science/download')

  const cards = page.locator('#downloads article')
  const recommendedCard = cards.first()
  const nextCard = cards.nth(1)
  const label = recommendedCard.getByText('For your system', { exact: true })
  await expect(label).toBeVisible()

  const [cardBox, labelBox, firstHeadingBox, secondHeadingBox, requirementBox, fileBox, buttonBox] =
    await Promise.all([
      recommendedCard.boundingBox(),
      label.boundingBox(),
      recommendedCard.getByRole('heading', { level: 3 }).boundingBox(),
      nextCard.getByRole('heading', { level: 3 }).boundingBox(),
      recommendedCard.locator('dl > div').first().boundingBox(),
      recommendedCard.locator('dl > div').last().boundingBox(),
      recommendedCard.getByRole('link', { name: 'Download' }).boundingBox()
    ])

  // The one-pixel card border surrounds the label's 62px/28px absolute offsets.
  expect((labelBox?.y ?? 0) - (cardBox?.y ?? 0)).toBeCloseTo(63, 0)
  expect(
    (cardBox?.x ?? 0) + (cardBox?.width ?? 0) - ((labelBox?.x ?? 0) + (labelBox?.width ?? 0))
  ).toBeCloseTo(29, 0)
  expect(Math.abs((firstHeadingBox?.y ?? 0) - (secondHeadingBox?.y ?? 0))).toBeLessThan(2)
  expect(Math.abs((requirementBox?.y ?? 0) - (fileBox?.y ?? 0))).toBeLessThan(2)
  expect(buttonBox?.height).toBeCloseTo(54, 0)
})

test('uses the supplied emphasis for both release links', async ({ page }) => {
  await page.goto('/open-science/download')

  await expect(page.getByRole('link', { name: 'Read the Installation Docs' })).toHaveCSS(
    'font-weight',
    '650'
  )
  await expect(page.getByRole('link', { name: /release notes/ })).toHaveCSS('font-weight', '650')
})

test('loads download artwork from the shared static origin while using the project font stack', async ({
  page,
  request
}) => {
  await page.goto('/open-science/download')

  const [systemMap, socialImage] = await Promise.all([
    request.get('https://statics.aipoch.com/public/f/image/aipoch-system-map-7511f128.png'),
    request.get('https://statics.aipoch.com/public/f/image/og-open-science-download-56121c38.png')
  ])
  expect(systemMap.ok()).toBe(true)
  expect(socialImage.ok()).toBe(true)

  const renderedStyles = await page.evaluate(() => ({
    body: getComputedStyle(document.querySelector('main#top') as HTMLElement).fontFamily,
    heroBackground: getComputedStyle(
      document.querySelector('main#top > section > div[aria-hidden="true"]') as HTMLElement
    ).backgroundImage,
    heading: getComputedStyle(document.querySelector('h1') as HTMLElement).fontFamily
  }))
  expect(renderedStyles.body).toContain('Inter')
  expect(renderedStyles.heading).toContain('Georgia')
  expect(renderedStyles.heroBackground).toContain(
    'https://statics.aipoch.com/public/f/image/aipoch-system-map-7511f128.png'
  )
})
