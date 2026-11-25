/** Build the published dialog for the adapter's standalone example, using mock desktop launches. */
async function buildAssets() {
  const build = await Bun.build({
    entrypoints: ['./scripts/standalone-lab/project-dialog.tsx'],
    target: 'browser',
    format: 'iife',
    minify: true,
    define: {
      'process.env.NODE_ENV': '"test"',
      'process.env.NEXT_PUBLIC_API_MOCKING': '"enabled"'
    },
    plugins: [
      {
        name: 'standalone-adapter',
        setup(builder) {
          // This document runs directly on the mock HTTP adapter. Its requests already use MSW.
          builder.onResolve({ filter: /^@\/mocks\/ready$/ }, () => ({
            path: 'ready',
            namespace: 'standalone-adapter'
          }))
          builder.onLoad({ filter: /^ready$/, namespace: 'standalone-adapter' }, () => ({
            contents: 'export const waitForBrowserMock = async () => {}',
            loader: 'js'
          }))
        }
      }
    ]
  })
  if (!build.success) throw new AggregateError(build.logs, 'Could not build the sample lab dialog')
  return new Map(build.outputs.map((asset) => [asset.path.split('/').pop(), asset]))
}

let assets: ReturnType<typeof buildAssets> | undefined
export async function standaloneLabAsset(name: string) {
  assets ??= buildAssets().catch((error) => {
    assets = undefined
    throw error
  })
  return (await assets).get(name)
}
