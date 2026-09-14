/** Initialize SSR interception before Next starts handling requests. */
export const register = async () => {
  if (
    process.env.NODE_ENV !== 'production' &&
    process.env.NEXT_PUBLIC_API_MOCKING === 'enabled' &&
    process.env.NEXT_RUNTIME === 'nodejs'
  ) {
    const { startServerMocking } = await import('./mocks/server')
    startServerMocking(new URL(process.env.INTERNAL_API_URL ?? '').origin)
  }
}
