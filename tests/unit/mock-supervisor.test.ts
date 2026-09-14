import { expect, test } from 'bun:test'
import { cp, mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

// Run the actual supervisor with an isolated session, without modifying project fixtures or ports.
test('recovers after an invalid mock edit and can stop while waiting for a correction', async () => {
  const root = await mkdtemp(join(tmpdir(), 'aipoch-mock-supervisor-'))
  let child: ReturnType<typeof Bun.spawn> | undefined
  let output = ''
  const waitForOutput = async (text: string) => {
    for (let attempt = 0; attempt < 100; attempt++) {
      if (output.includes(text)) return
      if (child?.exitCode !== null) throw new Error(`Supervisor exited: ${output}`)
      await Bun.sleep(50)
    }
    throw new Error(`Missing ${text}: ${output}`)
  }
  try {
    await mkdir(join(root, 'scripts'))
    await mkdir(join(root, 'mocks'))
    for (const file of ['dev-mock.ts', 'mock-options.ts'])
      await cp(new URL(`../../scripts/${file}`, import.meta.url), join(root, 'scripts', file))
    await writeFile(
      join(root, 'scripts/mock-session.ts'),
      'import { value } from "../mocks/fixture"; console.log("ready-" + value); setInterval(() => {}, 1000);'
    )
    const fixture = join(root, 'mocks/fixture.ts')
    await writeFile(fixture, 'export const value = 1')
    child = Bun.spawn([process.execPath, 'run', join(root, 'scripts/dev-mock.ts')], {
      stdout: 'pipe',
      stderr: 'pipe'
    })
    const collect = async (stream: ReadableStream<Uint8Array>) => {
      const reader = stream.getReader()
      const decoder = new TextDecoder()
      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          output += decoder.decode(value, { stream: true })
        }
      } finally {
        reader.releaseLock()
      }
    }
    const collectors = Promise.all([
      collect(child.stdout as ReadableStream<Uint8Array>),
      collect(child.stderr as ReadableStream<Uint8Array>)
    ])
    await waitForOutput('ready-1')
    await writeFile(fixture, 'export const value = ;')
    await waitForOutput('Waiting for the next mock edit')
    expect(child.exitCode).toBeNull()
    await writeFile(fixture, 'export const value = 2')
    await waitForOutput('ready-2')
    output = ''
    await writeFile(fixture, 'export const value = ;')
    await waitForOutput('Waiting for the next mock edit')
    child.kill('SIGTERM')
    expect(await child.exited).toBe(0)
    await collectors
  } finally {
    if (child?.exitCode === null) {
      child.kill('SIGTERM')
      await child.exited
    }
    await rm(root, { recursive: true, force: true })
  }
}, 15000)
