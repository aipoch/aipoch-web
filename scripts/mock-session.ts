import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { startStateAdapter } from '../mocks/http-adapter'
import { buildMockEnvironment, parseMockOptions } from './mock-options'

// One foreground launcher owns the shared mock state and the complete Next process group.
const main = async () => {
  const { port, mockPort } = parseMockOptions(process.argv.slice(2))
  const server = await startStateAdapter(mockPort)
  const origin = server.origin
  const root = fileURLToPath(new URL('../', import.meta.url))
  const child = spawn(
    process.execPath,
    ['--bun', 'next', 'dev', '--hostname', '127.0.0.1', '--port', String(port)],
    {
      cwd: root,
      stdio: 'inherit',
      detached: process.platform !== 'win32',
      env: buildMockEnvironment(process.env, origin)
    }
  )
  let stopping = false
  let killTimer: ReturnType<typeof setTimeout> | undefined
  const signalChild = (signal: NodeJS.Signals) => {
    if (!child.pid) return
    try {
      if (process.platform === 'win32') child.kill(signal)
      else process.kill(-child.pid, signal)
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ESRCH') throw error
    }
  }
  const stop = () => {
    if (stopping) return
    stopping = true
    server.stop()
    signalChild('SIGTERM')
    killTimer = setTimeout(() => signalChild('SIGKILL'), 5000)
    killTimer.unref()
  }
  process.once('SIGINT', stop)
  process.once('SIGTERM', stop)
  process.stdout.write(
    `MSW state adapter: ${origin}/api\nMock Web: http://127.0.0.1:${port}\nSample data is held in memory; Ctrl+C stops both services.\n`
  )
  try {
    const exitCode = await new Promise<number>((resolve, reject) => {
      child.once('error', reject)
      child.once('exit', (code) => resolve(stopping ? 0 : (code ?? 1)))
    })
    process.exitCode = exitCode
  } finally {
    server.stop()
    // Also stop descendants if Next exits before its workers do.
    signalChild('SIGTERM')
    if (killTimer) clearTimeout(killTimer)
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
