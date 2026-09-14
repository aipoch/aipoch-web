/** Await browser interception only for the explicitly enabled development command. */
export const waitForBrowserMock = async () => {
  if (
    process.env.NODE_ENV !== 'production' &&
    process.env.NEXT_PUBLIC_API_MOCKING === 'enabled' &&
    typeof window !== 'undefined'
  ) {
    const { startBrowserMocking } = await import('./browser')
    await startBrowserMocking()
  }
}
