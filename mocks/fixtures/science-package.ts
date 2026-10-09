// Node-only fixture builder for the mock HTTP adapter and test runners.
import { createHash } from 'node:crypto'
import { gzipSync } from 'node:zlib'

export const digest = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex')
export function packScience(files: Record<string, Uint8Array>): Uint8Array {
  const parts: Buffer[] = []
  for (const [name, bytes] of Object.entries(files)) {
    const header = Buffer.alloc(512)
    header.write(name, 0, 100)
    header.write('0000644\0', 100)
    header.write('0000000\0', 108)
    header.write('0000000\0', 116)
    header.write(`${bytes.length.toString(8).padStart(11, '0')}\0`, 124)
    header.write('00000000000\0', 136)
    header.fill(32, 148, 156)
    header[156] = 48
    header.write('ustar\0', 257)
    header.write('00', 263)
    const checksum = header.reduce((sum, byte) => sum + byte, 0)
    header.write(`${checksum.toString(8).padStart(6, '0')}\0 `, 148)
    parts.push(header, Buffer.from(bytes), Buffer.alloc((512 - (bytes.length % 512)) % 512))
  }
  parts.push(Buffer.alloc(1024))
  return gzipSync(Buffer.concat(parts), { level: 1 })
}
export function buildSciencePackage(
  title: string,
  session: Record<string, unknown> = {},
  objects: Record<string, { bytes: Uint8Array; storageKey: string; kind?: string }> = {},
  records: Record<string, unknown> = { tables: {} }
) {
  const json = (value: unknown) => new TextEncoder().encode(JSON.stringify(value))
  const files: Record<string, Uint8Array> = {
    'session.json': json({
      version: 2,
      session: {
        title,
        id: 'mock-session',
        projectId: 'mock-project',
        createdAt: 1788220800000,
        messages: [
          { id: 'question', role: 'user', content: title, createdAt: 1788220800000 },
          {
            id: 'answer',
            role: 'assistant',
            content: `Local sample replay for ${title}.`,
            createdAt: 1788220800001
          }
        ],
        conversationGraph: {
          activities: [
            {
              id: 'large-output',
              title: 'Inspect sample output',
              createdAt: 1788220800002,
              rawOutput: 'sample '.repeat(5000)
            }
          ]
        },
        ...session
      }
    }),
    'records.json': json(records),
    ...Object.fromEntries(Object.entries(objects).map(([name, value]) => [name, value.bytes]))
  }
  files['manifest.json'] = json({
    format: 'open-science-session',
    schemaVersion: 1,
    createdAt: 1788220800000,
    source: { title, projectName: 'Local replay sample' },
    inventory: Object.entries(files).map(([path, bytes]) => ({
      path,
      sizeBytes: bytes.length,
      checksum: digest(bytes),
      kind: objects[path]?.kind ?? 'file',
      storageKey: objects[path]?.storageKey
    })),
    omissions: [],
    excludedFiles: []
  })
  const bytes = packScience(files)
  return { bytes, files, sizeBytes: bytes.length, sha256: digest(bytes) }
}
