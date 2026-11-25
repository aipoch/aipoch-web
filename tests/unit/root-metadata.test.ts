import { describe, expect, mock, test } from 'bun:test'

const mockFont = () => ({ variable: '' })

mock.module('next/font/google', () => ({
  DM_Serif_Display: mockFont,
  Inter: mockFont
}))

mock.module('next/font/local', () => ({ default: mockFont }))

describe('root metadata', () => {
  test('does not publish route-specific title, description, canonical, or social fallbacks', async () => {
    const { metadata } = await import('../../app/layout')

    expect(metadata.title).toBeUndefined()
    expect(metadata.description).toBeUndefined()
    expect(metadata.alternates).toBeUndefined()
    expect(metadata.openGraph).toBeUndefined()
    expect(metadata.twitter).toBeUndefined()
  })
})
