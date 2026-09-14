import { describe, expect, test } from 'bun:test'
import { buildMockEnvironment, parseMockOptions } from '../../scripts/mock-options'

describe('mock launcher isolation', () => {
  test('overrides real API and analytics only in the child environment', () => {
    const parent = {
      NODE_ENV: 'development' as const,
      INTERNAL_API_URL: 'https://live.example/api',
      NEXT_PUBLIC_API_URL: 'https://live.example/api',
      NEXT_PUBLIC_GA_ID: 'real',
      NEXT_PUBLIC_CLARITY_ID: 'real',
      E2E_HOMEPAGE_MOCK: '1',
      NEXT_DIST_DIR: 'shared'
    }
    const env = buildMockEnvironment(parent, 'http://127.0.0.1:4311')
    expect(env.INTERNAL_API_URL).toBe('http://127.0.0.1:4311/api')
    expect(env.NEXT_PUBLIC_API_URL).toBe(env.INTERNAL_API_URL)
    expect(env.NEXT_PUBLIC_GA_ID).toBe('')
    expect(env.NEXT_PUBLIC_CLARITY_ID).toBe('')
    expect(env.E2E_HOMEPAGE_MOCK).toBe('')
    expect(env.NEXT_DIST_DIR).toBe('.next/e2e')
    expect(env.E2E_OPEN_SCIENCE_MANIFEST).toBe('')
    expect(env.NEXT_PUBLIC_API_MOCKING).toBe('enabled')
    expect(parent.INTERNAL_API_URL).toBe('https://live.example/api')
  })
  test('accepts dedicated ports and rejects invalid or ambiguous options', () => {
    expect(parseMockOptions(['--port', '4310', '--mock-port', '4311'])).toEqual({
      port: 4310,
      mockPort: 4311
    })
    for (const args of [
      ['--port'],
      ['--port', '0'],
      ['--port', '65536'],
      ['--port', '2.5'],
      ['--unknown'],
      ['--port', '4310', '--mock-port', '4310']
    ]) {
      expect(() => parseMockOptions(args)).toThrow()
    }
  })
})
