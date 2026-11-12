import { expect, test } from 'bun:test'
import { readFile, stat } from 'node:fs/promises'
import { join } from 'node:path'
import { runInNewContext, Script } from 'node:vm'

const overviewDir = join(import.meta.dir, '../../public/open-science')
const overviewPath = join(overviewDir, 'overview.html')

test('shares extracted image assets between the bilingual overview documents', async () => {
  const overview = await readFile(overviewPath, 'utf8')
  const assets = [...new Set(overview.match(/\/open-science\/assets\/[\w.-]+/g))]

  expect(overview).not.toContain('data:image/')
  expect(assets.length).toBeGreaterThan(0)
  for (const asset of assets) {
    expect((await stat(join(overviewDir, '..', asset))).size).toBeGreaterThan(0)
  }
})

test('keeps bilingual Open-Science branding hyphenated across controlled line breaks', async () => {
  const overview = await readFile(overviewPath, 'utf8')
  const highlightedBrand = String.raw`<span class=\"highlight-text en\">Open-</span><br>Science`

  expect(overview.split(highlightedBrand)).toHaveLength(3)
  expect(overview.split('<strong>Open-<br>Science</strong>')).toHaveLength(3)
})

test('reserves footer clearance by keeping architecture layer padding compact', async () => {
  const overview = await readFile(overviewPath, 'utf8')
  const compactLayers = '.architecture-layer{padding:12px 0;border-top:1px solid #d9d4c8}'

  expect(overview.split(compactLayers)).toHaveLength(3)
  expect(overview).not.toContain('.architecture-layer{padding:17px 0;')
})

test('centers the compact English community diagram between the title and support rail', async () => {
  const overview = await readFile(overviewPath, 'utf8')

  expect(overview).toContain(
    '.cobuild .content{grid-template-columns:1fr 260px 1fr;gap:48px;height:260px;flex:0 0 260px;margin-top:91px}'
  )
})

test('serves the 18-slide v1.2.1 product deck with complete Chinese speaker notes', async () => {
  const overview = await readFile(overviewPath, 'utf8')
  const embedded = overview.match(/const documents=(\{zh:[\s\S]*?\});\nconst frames=/)
  expect(embedded).not.toBeNull()
  if (!embedded) throw new Error('Missing bilingual overview documents')
  const documents = runInNewContext(`(${embedded[1]})`) as { zh: string; en: string }

  for (const document of Object.values(documents)) {
    const slides = [...document.matchAll(/<section class="slide[ "][\s\S]*?<\/section>/g)]
    expect(slides).toHaveLength(18)
    expect(slides[17][0]).toContain('v1.2.1')
    expect(slides[13][0]).toContain('CAN WE REPRODUCE CHINCHILLA SCALING?')
    expect(slides[13][0]).toContain('/open-science/assets/f25b88730c7cd12a.mp4')
    expect(slides[13][0]).toContain('controls playsinline')
    expect(document).toContain(
      "if(index!==current)slide.querySelectorAll('video,audio').forEach(media=>media.pause())"
    )
    expect(document).not.toContain('@@ASSET:')
    for (const script of document.matchAll(/<script>([\s\S]*?)<\/script>/g)) {
      expect(() => new Script(script[1])).not.toThrow()
    }
  }

  expect([...documents.zh.matchAll(/<p class="speaker-summary">/g)]).toHaveLength(18)
  expect([...documents.zh.matchAll(/<details class="sources">/g)]).toHaveLength(18)
  expect(documents.zh).not.toMatch(/<details class="sources"[^>]*\bopen\b/)
  for (const script of overview.matchAll(/<script>([\s\S]*?)<\/script>/g)) {
    expect(() => new Script(script[1])).not.toThrow()
  }
})

test('uses distinct real screenshots for workspace and execution features', async () => {
  const overview = await readFile(overviewPath, 'utf8')
  const embedded = overview.match(/const documents=(\{zh:[\s\S]*?\});\nconst frames=/)
  if (!embedded) throw new Error('Missing bilingual overview documents')
  const documents = runInNewContext(`(${embedded[1]})`) as { zh: string; en: string }

  for (const document of Object.values(documents)) {
    for (const [sectionClass, count] of [
      ['workspace', 6],
      ['slide-dark execution', 4]
    ] as const) {
      const section = document.match(
        new RegExp(`<section class="slide ${sectionClass}"[\\s\\S]*?</section>`)
      )?.[0]
      expect(section).toBeDefined()
      const images = [...(section || '').matchAll(/<img\b[^>]*\bsrc="([^"]+)"/g)]
      expect(images).toHaveLength(count)
      expect(new Set(images.map((image) => image[1])).size).toBe(count)
      for (const image of images) expect(image[0]).toContain('data-full-src=')
    }
  }
})
