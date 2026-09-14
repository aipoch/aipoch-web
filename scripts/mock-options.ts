/** Keep mock overrides local to the spawned development process. */
export const buildMockEnvironment = (
  env: NodeJS.ProcessEnv,
  origin: string
): NodeJS.ProcessEnv => ({
  ...env,
  NODE_ENV: 'development',
  NEXT_PUBLIC_API_URL: `${origin}/api`,
  INTERNAL_API_URL: `${origin}/api`,
  NEXT_PUBLIC_GA_ID: '',
  NEXT_PUBLIC_CLARITY_ID: '',
  E2E_HOMEPAGE_MOCK: '',
  E2E_OPEN_SCIENCE_MANIFEST: '',
  NEXT_PUBLIC_API_MOCKING: 'enabled',
  OPENSCIENCE_WIKI_INTERNAL_URL_PREFIX: origin,
  NEXT_DIST_DIR: '.next/e2e'
})

/** Fail early on malformed arguments instead of silently starting on an unexpected port. */
export const parseMockOptions = (args: string[]) => {
  const options = { port: 3202, mockPort: 3203 }
  const seen = new Set<string>()
  for (let index = 0; index < args.length; index += 2) {
    const flag = args[index]
    if (!['--port', '--mock-port'].includes(flag) || seen.has(flag))
      throw new Error(`Unknown or duplicate option: ${flag}`)
    seen.add(flag)
    const port = Number(args[index + 1])
    if (!Number.isSafeInteger(port) || port < 1 || port > 65535)
      throw new Error(`${flag} requires a port between 1 and 65535`)
    options[flag === '--port' ? 'port' : 'mockPort'] = port
  }
  if (options.port === options.mockPort) throw new Error('Web and mock API ports must differ')
  return options
}
