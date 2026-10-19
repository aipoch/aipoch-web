import { expect, mock, test } from 'bun:test'
import { createScienceImport, type ImportState } from '../../lib/science-package/browser-import'

for (const [environment, mocking, shouldLaunch] of [
  ['development', 'enabled', false],
  ['development', undefined, true],
  ['production', 'enabled', true]
] as const) {
  test(`app launch boundaries: ${environment}, mocking ${mocking ?? 'unset'}`, async () => {
    const previousEnvironment = process.env.NODE_ENV
    const previousMocking = process.env.NEXT_PUBLIC_API_MOCKING
    const previousWindow = Object.getOwnPropertyDescriptor(globalThis, 'window')
    const previousLocation = Object.getOwnPropertyDescriptor(globalThis, 'location')
    Reflect.set(process.env, 'NODE_ENV', environment)
    if (mocking) process.env.NEXT_PUBLIC_API_MOCKING = mocking
    else delete process.env.NEXT_PUBLIC_API_MOCKING
    const navigate = mock((_url: string) => {})
    const assign = mock((_url: string) => {})
    const location = {
      set href(url: string) {
        navigate(url)
      },
      assign
    }
    const states: ImportState[] = []
    const download = mock(async () => new Blob(['package']))
    const send = mock(async () => ({ received: true as const }))
    const session = createScienceImport(
      { url: 'https://assets.test/package.science', filename: 'package.science' },
      (state) => states.push(state),
      {
        supported: () => true,
        mobile: () => false,
        availability: async () => ({ status: 'available' }),
        download,
        prepare: () => ({ url: 'open-science://test-only', send })
      }
    )
    try {
      // Prepare without browser globals: this test isolates non-HTTP launch side effects.
      await session.prepare()
      Object.defineProperty(globalThis, 'window', { configurable: true, value: { location } })
      Object.defineProperty(globalThis, 'location', { configurable: true, value: location })
      await session.open()
      expect(states.at(-1)?.phase).toBe('received')
      expect(navigate).toHaveBeenCalledTimes(shouldLaunch ? 1 : 0)
      session.openApp()
      expect(assign).toHaveBeenCalledTimes(shouldLaunch ? 1 : 0)
      if (shouldLaunch) expect(assign).toHaveBeenCalledWith('open-science://open')
      expect(send).toHaveBeenCalledTimes(1)
      expect(download).toHaveBeenCalledTimes(1)
    } finally {
      session.dispose()
      for (const [key, descriptor] of [
        ['window', previousWindow],
        ['location', previousLocation]
      ] as const) {
        if (descriptor) Object.defineProperty(globalThis, key, descriptor)
        else Reflect.deleteProperty(globalThis, key)
      }
      if (previousEnvironment === undefined) Reflect.deleteProperty(process.env, 'NODE_ENV')
      else Reflect.set(process.env, 'NODE_ENV', previousEnvironment)
      if (previousMocking === undefined) delete process.env.NEXT_PUBLIC_API_MOCKING
      else process.env.NEXT_PUBLIC_API_MOCKING = previousMocking
    }
  })
}
