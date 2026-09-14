import { watch } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { parseMockOptions } from './mock-options'

/** Restart the complete mock session on fixture edits so SSR and browser data cannot diverge. */
const main = async () => {
  const args = process.argv.slice(2)
  if (args.includes('--help')) {
    process.stdout.write(
      'Usage: bun run dev:mock [--port 3202] [--mock-port 3203]\nMock file edits restart both services and reset sample state.\n'
    )
    return
  }
  parseMockOptions(args)
  const root = fileURLToPath(new URL('../', import.meta.url))
  const session = fileURLToPath(new URL('./mock-session.ts', import.meta.url))
  let stopping = false
  let restartRequested = false
  let edited = false
  let wake: (() => void) | undefined
  let child: ReturnType<typeof Bun.spawn> | undefined
  let debounce: ReturnType<typeof setTimeout> | undefined
  const stop = () => {
    stopping = true
    wake?.()
    if (debounce) clearTimeout(debounce)
    if (child?.exitCode === null) child.kill('SIGTERM')
  }
  // Only mock definitions trigger a session restart. Next still owns normal application Fast Refresh.
  const watcher = watch(
    new URL('../mocks', import.meta.url),
    { recursive: true },
    (_event, filename) => {
      if (stopping || !filename || !/\.(ts|json)$/.test(filename)) return
      if (debounce) clearTimeout(debounce)
      debounce = setTimeout(() => {
        restartRequested = true
        edited = true
        wake?.()
        process.stdout.write(
          'Mock definitions changed; restarting the session and resetting sample state.\n'
        )
        if (child?.exitCode === null) child.kill('SIGTERM')
      }, 300)
    }
  )
  process.once('SIGINT', stop)
  process.once('SIGTERM', stop)
  try {
    do {
      restartRequested = false
      child = Bun.spawn([process.execPath, 'run', session, ...args], {
        cwd: root,
        stdout: 'inherit',
        stderr: 'inherit',
        stdin: 'inherit'
      })
      const exitCode = await child.exited
      // A broken edit must not stop file watching or cause an immediate retry loop.
      if (!stopping && !restartRequested && edited && exitCode !== 0) {
        process.stdout.write('Mock session failed. Waiting for the next mock edit.\n')
        await new Promise<void>((resolve) => {
          wake = resolve
        })
        wake = undefined
      }
      if (!restartRequested) process.exitCode = stopping ? 0 : exitCode
    } while (!stopping && restartRequested)
  } finally {
    watcher.close()
    if (debounce) clearTimeout(debounce)
    process.removeListener('SIGINT', stop)
    process.removeListener('SIGTERM', stop)
  }
}

main().catch((error: unknown) => {
  process.stderr.write(
    `Mock startup failed: ${error instanceof Error ? error.message : String(error)}\n`
  )
  process.exitCode = 1
})
