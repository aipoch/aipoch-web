import { expect, test } from '@playwright/test'

const providerNames = [
  'GPT',
  'Claude',
  'Grok',
  'DeepSeek',
  'Qwen',
  'GLM',
  'Kimi',
  'MiniMax',
  'StepFun'
]

for (const width of [390, 1440, 2560, 3840]) {
  test(`keeps the model marquee continuous through the loop at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 })
    await page.clock.install()
    await page.route('https://api.github.com/**', (route) =>
      route.fulfill({ json: { stargazers_count: 3600 } })
    )
    await page.goto('/')
    const marquee = page.getByTestId('home-model-marquee')
    await marquee.scrollIntoViewIfNeeded()
    await page.clock.runFor(100)

    const readTrack = () =>
      marquee.evaluate((element) => {
        const viewport = element.getBoundingClientRect()
        const track = element.firstElementChild
        const group = track?.firstElementChild
        if (!track || !group) throw new Error('Missing marquee track')
        return {
          x: track.getBoundingClientRect().left - viewport.left,
          groupWidth: group.getBoundingClientRect().width,
          viewportWidth: viewport.width,
          cells: Array.from(track.querySelectorAll('span'))
            .map((cell) => {
              const box = cell.getBoundingClientRect()
              return {
                name: cell.textContent,
                left: box.left - viewport.left,
                right: box.right - viewport.left
              }
            })
            .filter((cell) => cell.right > 0 && cell.left < viewport.width)
        }
      })

    const assertContinuous = (state: Awaited<ReturnType<typeof readTrack>>) => {
      expect(state.cells.length).toBeGreaterThan(1)
      expect(state.cells[0].left).toBeLessThanOrEqual(0)
      expect(state.cells.at(-1)?.right).toBeGreaterThanOrEqual(state.viewportWidth)
      for (let index = 1; index < state.cells.length; index++) {
        const previous = state.cells[index - 1]
        const current = state.cells[index]
        expect(Math.abs(current.left - previous.right)).toBeLessThan(1)
        expect(current.name).toBe(
          providerNames[(providerNames.indexOf(previous.name ?? '') + 1) % providerNames.length]
        )
      }
    }

    const start = await readTrack()
    assertContinuous(start)
    await page.clock.fastForward(1000)
    await page.clock.runFor(32)
    const moving = await readTrack()
    // Keep the existing pace (one 160px cell in about 4.67 seconds) on wide screens.
    expect(start.x - moving.x).toBeGreaterThan(30)
    expect(start.x - moving.x).toBeLessThan(40)

    const pixelsPerSecond = (160 * providerNames.length) / 42
    const timeUntilWrap = ((moving.groupWidth + moving.x) / pixelsPerSecond) * 1000
    await page.clock.fastForward(Math.floor(timeUntilWrap - 100))
    await page.clock.runFor(32)
    const beforeWrap = await readTrack()
    assertContinuous(beforeWrap)
    expect(beforeWrap.x + beforeWrap.groupWidth).toBeLessThan(10)

    await page.clock.fastForward(200)
    await page.clock.runFor(32)
    const afterWrap = await readTrack()
    assertContinuous(afterWrap)
    expect(afterWrap.x).toBeGreaterThan(-10)

    // Repeated visual copies must not repeat the provider list for screen readers.
    const accessibleList = await marquee.ariaSnapshot()
    for (const name of providerNames) {
      expect(accessibleList.split(name)).toHaveLength(2)
    }
  })
}
