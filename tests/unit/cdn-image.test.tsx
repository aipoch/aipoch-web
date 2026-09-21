import { describe, expect, test } from 'bun:test'
import { CdnImage, shouldLoadCdnImageDirectly } from '../../components/cdn-image'

const src = 'https://statics.aipoch.com/public/f/image/open-science-setup-c4dee494.webp'

describe('CDN images in local development', () => {
  test('loads trusted CDN assets directly only in development', () => {
    expect(shouldLoadCdnImageDirectly(src, 'development')).toBe(true)
    expect(shouldLoadCdnImageDirectly(src, 'production')).toBe(false)
    expect(shouldLoadCdnImageDirectly(src, 'test')).toBe(false)
  })

  test('preserves optimization for local assets and other origins', () => {
    expect(shouldLoadCdnImageDirectly('/logo.png', 'development')).toBe(false)
    expect(shouldLoadCdnImageDirectly('https://example.com/image.png', 'development')).toBe(false)
    expect(
      shouldLoadCdnImageDirectly('https://statics.aipoch.com.example.com/image.png', 'development')
    ).toBe(false)
  })

  test('preserves caller options and intrinsic dimensions', () => {
    const image = CdnImage({ src, alt: 'Setup', width: 100, height: 50, unoptimized: false })
    expect(image.props).toMatchObject({
      src,
      alt: 'Setup',
      width: 100,
      height: 50,
      unoptimized: false
    })
  })
})
