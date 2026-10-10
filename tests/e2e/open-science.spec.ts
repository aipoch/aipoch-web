import { expect, test } from '@playwright/test'

test('publishes SoftwareApplication data on the canonical Open-Science page', async ({ page }) => {
  await page.goto('/open-science')

  const softwareApplication = await page
    .locator('script[type="application/ld+json"]')
    .evaluateAll((scripts) =>
      scripts
        .flatMap((script) => {
          const value = JSON.parse(script.textContent || 'null') as
            | Record<string, unknown>
            | Record<string, unknown>[]
            | null
          if (!value) return []
          if (Array.isArray(value)) return value
          if (Array.isArray(value['@graph'])) return value['@graph'] as Record<string, unknown>[]
          return [value]
        })
        .find((schema) => schema['@type'] === 'SoftwareApplication')
    )

  expect(softwareApplication).toMatchObject({
    '@id': 'https://aipoch.com/#open-science',
    url: 'https://aipoch.com/open-science',
    softwareVersion: 'v1.0.0',
    downloadUrl: [
      'https://cdn.example.com/open-science-intel.dmg',
      'https://cdn.example.com/open-science-arm.dmg',
      'https://cdn.example.com/open-science.exe',
      'https://cdn.example.com/open-science.deb',
      'https://cdn.example.com/open-science-arm64.deb'
    ],
    license: 'https://www.apache.org/licenses/LICENSE-2.0',
    dateModified: '2026-09-07',
    sameAs: ['https://github.com/aipoch/open-science'],
    mainEntityOfPage: { '@id': 'https://aipoch.com/open-science#webpage' }
  })
})

const manifest = {
  version: '1.0.0',
  releaseDate: '2026-09-07T01:13:01Z',
  downloads: {
    'win-x64': { url: 'https://cdn.example.com/open-science.exe' },
    'mac-arm64': { url: 'https://cdn.example.com/open-science-arm.dmg' },
    'mac-x64': { url: 'https://cdn.example.com/open-science-intel.dmg' },
    'linux-x64-deb': { url: 'https://cdn.example.com/open-science.deb' },
    'linux-arm64-deb': { url: 'https://cdn.example.com/open-science-arm64.deb' }
  }
}

const placeholderImagePath = 'public/open-science/og-science-open-to-all.jpg'

test.beforeEach(async ({ page }) => {
  // Keep visual assertions deterministic; production asset availability is not an app E2E concern.
  await page.route(/\/_next\/image\?/, (route) => {
    const source = new URL(route.request().url()).searchParams.get('url')
    if (
      source?.startsWith('/figma/open-science/') ||
      source?.startsWith('/_next/static/media/workflow-share.')
    )
      return route.continue()
    return route.fulfill({ contentType: 'image/jpeg', path: placeholderImagePath })
  })
  await page.route(/^https:\/\/statics\.aipoch\.com\/public\/f\/image\/open-science-/, (route) =>
    route.fulfill({ contentType: 'image/jpeg', path: placeholderImagePath })
  )
  await page.route('**/open-science/app/stable/version.json', (route) =>
    route.fulfill({ json: manifest })
  )
})

test('keeps the server manifest snapshot for Schema and hydrated download links', async ({
  page
}) => {
  let clientManifestRequests = 0
  await page.route('**/open-science/app/stable/version.json', (route) => {
    clientManifestRequests += 1
    return route.fulfill({
      json: {
        version: '9.9.9',
        downloads: {
          'mac-arm64': { url: 'https://cdn.example.com/drifted-open-science.dmg' }
        }
      }
    })
  })

  await page.goto('/open-science')
  await page.waitForLoadState('networkidle')
  await page.getByRole('button', { name: 'Download Open-Science', exact: true }).click()

  await expect(page.getByRole('menuitem', { name: /Apple Silicon/ })).toHaveAttribute(
    'href',
    manifest.downloads['mac-arm64'].url
  )
  expect(clientManifestRequests).toBe(0)
})

test('extends only the page canvas under the navbar without shifting hero artwork or content', async ({
  page
}) => {
  await page.goto('/open-science')

  const geometry = await page.evaluate(() => {
    const header = document.querySelector<HTMLElement>('header[data-nav]')
    const main = document.querySelector<HTMLElement>('main#top')
    const hero = main?.querySelector<HTMLElement>(':scope > section')
    const background = hero?.querySelector<HTMLElement>(':scope > div[aria-hidden="true"]')
    if (!header || !main || !hero || !background) {
      throw new Error('Open-Science page shell is missing.')
    }

    return {
      desktop: matchMedia('(min-width: 1024px)').matches,
      headerHeight: header.getBoundingClientRect().height,
      mainTop: main.getBoundingClientRect().top,
      mainBackground: getComputedStyle(main).backgroundColor,
      heroHeight: hero.getBoundingClientRect().height,
      heroPaddingTop: Number.parseFloat(getComputedStyle(hero).paddingTop),
      backgroundTop: background.getBoundingClientRect().top,
      backgroundHeight: background.getBoundingClientRect().height
    }
  })

  expect(geometry.mainTop).toBe(0)
  expect(geometry.mainBackground).toBe('rgb(246, 246, 244)')
  expect(geometry.backgroundTop).toBe(geometry.headerHeight)
  expect(geometry.mainTop + geometry.heroPaddingTop).toBe(
    geometry.headerHeight + (geometry.desktop ? 64 : 40)
  )
  if (geometry.desktop) {
    expect(geometry.mainTop + geometry.heroHeight).toBe(geometry.headerHeight + 1043)
    expect(geometry.backgroundHeight).toBe(1043)
  }
})

test('renders every design section, retains shared navigation and loads all marketing images', async ({
  page
}) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto('/open-science')
  await expect(page.locator('h1')).toHaveText('Open-Science AI Research Workbench')
  await expect(page.locator('header')).toBeVisible()
  await expect(
    page.getByRole('heading', {
      name: 'One workspace from research question to traceable artifact'
    })
  ).toBeVisible()
  await expect(
    page.getByRole('heading', {
      name: 'Run, inspect, and share research with .science'
    })
  ).toBeVisible()
  await expect(
    page.getByRole('heading', { name: 'Can Open-Science use the latest AI models?' })
  ).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Get to know Open-Science' })).toBeVisible()
  await expect(
    page.getByRole('heading', { name: 'Local-first research with explicit external access' })
  ).toBeVisible()
  await expect(page.getByRole('heading', { name: 'What is Open-Science?', level: 3 })).toBeVisible()
  await expect(
    page.getByRole('heading', {
      name: 'Start building inspectable research workflows with Open-Science.'
    })
  ).toBeVisible()
  await expect(page.locator('main article')).toHaveCount(8)
  await expect(page.getByRole('navigation', { name: 'Open-Science sections' })).toHaveCount(0)
  await expect(page.getByRole('link', { name: 'Read the documentation' })).toHaveAttribute(
    'href',
    'https://aipoch.com/docs/'
  )
  await expect(page.getByRole('link', { name: 'Star on GitHub', exact: true })).toHaveAttribute(
    'href',
    'https://github.com/aipoch/open-science'
  )
  await expect(page.getByRole('link', { name: 'Join the Discord', exact: true })).toHaveAttribute(
    'href',
    'https://discord.gg/zxQAYjReRv'
  )
  for (const image of await page.locator('main img').all()) {
    await image.scrollIntoViewIfNeeded()
    const source = await image.getAttribute('src')
    await expect
      .poll(
        () => image.evaluate((node: HTMLImageElement) => node.complete && node.naturalWidth > 0),
        { message: `image should load: ${source}` }
      )
      .toBe(true)
    const currentSrc = await image.evaluate((node: HTMLImageElement) => node.currentSrc)
    const imageUrl = new URL(currentSrc, page.url())
    expect(imageUrl.searchParams.get('url') ?? imageUrl.href).toMatch(
      /^(https:\/\/statics\.aipoch\.com\/public\/f\/image\/open-science-.+\.(webp|svg)|(?:https?:\/\/[^/]+)?\/figma\/open-science\/workflow-.+\.(png|svg)|\/_next\/static\/media\/workflow-share\.[\w-]+\.png)$/
    )
  }
  await page.locator('footer').scrollIntoViewIfNeeded()
  await expect(page.getByRole('link', { name: 'Privacy Policy', exact: true })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  expect(errors).toEqual([])
})

test('shows the five-step workflow artwork and portable Share package across screen sizes', async ({
  page
}, testInfo) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/open-science')
  const reject = page.getByRole('button', { name: 'Reject Non-Essential' })
  if (await reject.isVisible()) await reject.click()
  const workflow = page.getByTestId('open-science-workflow')
  await expect(workflow.getByRole('heading', { level: 3 })).toHaveText([
    'Define',
    'Plan',
    'Execute',
    'Inspect',
    'Share'
  ])
  await expect(workflow.locator('li').last()).toContainText(
    'Export selected research records as a .science package for review, handoff, or continuation on another project or computer.'
  )
  for (const image of await workflow.locator('img').all()) {
    await image.scrollIntoViewIfNeeded()
    await expect
      .poll(() =>
        image.evaluate((node: HTMLImageElement) => node.complete && node.naturalWidth > 0)
      )
      .toBe(true)
  }
  for (const width of [390, 768, 1440]) {
    await page.setViewportSize({ width, height: 1400 })
    await workflow.scrollIntoViewIfNeeded()
    const geometry = await workflow.evaluate((element) => {
      const picture = element.querySelector('img')?.getBoundingClientRect()
      const cards = Array.from(element.querySelectorAll('li')).map((card) =>
        card.getBoundingClientRect()
      )
      const icons = Array.from(element.querySelectorAll('li img')).map((icon) => {
        const rect = icon.getBoundingClientRect()
        return { width: rect.width, height: rect.height }
      })
      return {
        ratio: picture ? picture.width / picture.height : 0,
        columns: new Set(cards.map((card) => Math.round(card.x))).size,
        shareWidth: cards.at(-1)?.width,
        rowWidth: element.querySelector('ol')?.getBoundingClientRect().width,
        icons,
        overflow: document.documentElement.scrollWidth > innerWidth
      }
    })
    expect(geometry.ratio).toBeCloseTo(2223 / 1162, 2)
    expect(geometry.columns).toBe(width === 1440 ? 5 : width === 768 ? 2 : 1)
    if (width === 768) expect(geometry.shareWidth).toBeCloseTo(geometry.rowWidth ?? 0, 0)
    expect(geometry.icons).toEqual(Array(5).fill({ width: 21, height: 21 }))
    expect(geometry.overflow).toBe(false)
    await workflow.screenshot({
      path: `.codex/open-science-share/workflow-${width}-${testInfo.project.name}.png`
    })
  }
})

test('downloads the selected platform and supports keyboard dismissal', async ({ page }) => {
  await page.goto('/open-science')
  const trigger = page.getByRole('button', { name: 'Download Open-Science', exact: true })
  await trigger.click()
  const menu = page.getByRole('menu')
  await expect(menu).toBeVisible()
  for (const [label, url] of [
    ['Windows', manifest.downloads['win-x64'].url],
    ['Apple Silicon', manifest.downloads['mac-arm64'].url],
    ['macOS Intel', manifest.downloads['mac-x64'].url],
    ['Linux x64', manifest.downloads['linux-x64-deb'].url],
    ['Linux ARM64', manifest.downloads['linux-arm64-deb'].url]
  ])
    await expect(menu.getByRole('menuitem', { name: new RegExp(`^${label}`) })).toHaveAttribute(
      'href',
      url
    )
  await page.keyboard.press('Escape')
  await expect(menu).toBeHidden()
  await expect(trigger).toBeFocused()
  await trigger.press('ArrowDown')
  await expect(menu.getByRole('menuitem').first()).toBeFocused()
  await page.keyboard.press('ArrowDown')
  await expect(menu.getByRole('menuitem').nth(1)).toBeFocused()
  const appleSilicon = menu.getByRole('menuitem', { name: /Apple Silicon/ })
  await appleSilicon.focus()
  const focusedIcon = appleSilicon.locator('svg')
  expect(
    await focusedIcon.evaluate(
      (icon) =>
        icon.parentElement &&
        getComputedStyle(icon).color === getComputedStyle(icon.parentElement).color
    )
  ).toBe(true)
  const download = page.waitForEvent('download')
  await page.route('https://cdn.example.com/open-science-arm.dmg', (route) =>
    route.fulfill({
      contentType: 'application/octet-stream',
      headers: { 'content-disposition': 'attachment; filename="OpenScience.dmg"' },
      body: 'test installer'
    })
  )
  await page.keyboard.press('Enter')
  expect((await download).suggestedFilename()).toBe('OpenScience.dmg')
})

for (const device of [
  { name: 'Windows', userAgent: 'Windows NT 10.0; Win64; x64', expected: ['Windows'] },
  { name: 'Linux', userAgent: 'X11; Linux x86_64', expected: ['Linux x64'] },
  { name: 'Linux ARM64', userAgent: 'X11; Linux aarch64', expected: ['Linux ARM64'] },
  {
    name: 'macOS',
    userAgent: 'Macintosh; Intel Mac OS X 10_15_7',
    expected: ['Apple Silicon', 'macOS Intel']
  },
  { name: 'Android', userAgent: 'Linux; Android 14', expected: [] },
  { name: 'iPhone', userAgent: 'iPhone; CPU iPhone OS 17_0 like Mac OS X', expected: [] },
  {
    name: 'desktop-mode iPad',
    userAgent: 'Macintosh; Intel Mac OS X 10_15_7',
    maxTouchPoints: 5,
    expected: []
  },
  { name: 'unknown OS', userAgent: 'unknown', expected: [] }
]) {
  test(`prioritizes available downloads for ${device.name}`, async ({ page }) => {
    await page.addInitScript(
      ({ userAgent, maxTouchPoints }) => {
        Object.defineProperties(navigator, {
          userAgent: { get: () => userAgent },
          maxTouchPoints: { get: () => maxTouchPoints }
        })
      },
      { userAgent: device.userAgent, maxTouchPoints: device.maxTouchPoints ?? 0 }
    )
    await page.goto('/open-science')
    const trigger = page.getByRole('button', { name: 'Download Open-Science', exact: true })
    await trigger.click()
    const menu = page.getByRole('menu')
    const recommendations = menu.locator('[data-recommended="true"]')
    await expect(menu.getByRole('menuitem')).toHaveCount(5)
    await expect(recommendations).toHaveCount(device.expected.length)
    for (const [index, label] of device.expected.entries()) {
      await expect(recommendations.nth(index)).toContainText(label)
      await expect(menu.getByRole('menuitem').nth(index)).toContainText(label)
    }
    await page.keyboard.press('Escape')
    await trigger.press('ArrowDown')
    await expect(menu.getByRole('menuitem').first()).toBeFocused()
    if (device.expected.length > 1) {
      const first = recommendations.first()
      const second = recommendations.nth(1)
      const unfocusedShadow = await second.evaluate((item) => getComputedStyle(item).boxShadow)
      await expect(first).not.toHaveCSS('box-shadow', unfocusedShadow)
      await page.keyboard.press('ArrowDown')
      await expect(second).toBeFocused()
      await expect(second).not.toHaveCSS('box-shadow', unfocusedShadow)
      await expect(first).toHaveCSS('box-shadow', unfocusedShadow)
    }
  })
}

test('FAQ supports pointer and keyboard interaction with server-rendered answers', async ({
  page
}) => {
  await page.goto('/open-science')
  const details = page.locator('main details')
  await expect(details.first()).toHaveAttribute('open', '')
  await expect(details.nth(1)).not.toHaveAttribute('open')
  await details.nth(1).locator('summary').click()
  await expect(details.nth(1).getByText(/Apache License 2.0/)).toBeVisible()
  await details.nth(2).locator('summary').focus()
  await page.keyboard.press('Enter')
  await expect(details.nth(2).getByText(/The workbench supports/)).toBeVisible()
  await details.nth(2).locator('summary').press('Space')
  await expect(details.nth(2)).not.toHaveAttribute('open')
  await details.last().locator('summary').click()
  await expect(details.last().getByRole('link')).toHaveAttribute(
    'href',
    'https://github.com/aipoch/open-science/releases/latest'
  )
})

test('keeps content readable on narrow screens and with reduced motion', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/open-science')
  await expect(page.locator('h1')).toBeVisible()
  await page.getByRole('button', { name: 'Download Open-Science', exact: true }).click()
  const menu = page.getByRole('menu')
  await expect(menu).toBeVisible()
  await expect(menu).toHaveCSS('animation-name', 'none')
  const box = await menu.boundingBox()
  expect(box && box.x >= 0 && box.x + box.width <= 320).toBe(true)
  await page.keyboard.press('Escape')
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})
