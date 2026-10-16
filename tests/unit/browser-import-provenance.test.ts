import { expect, test } from 'bun:test'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'

test('vendored SDK matches the pinned upstream bytes except the documented lint comment', () => {
  const hashes = {
    'browser-import.mjs': 'ed92ada586b74c0e4a5e447f7276cfc90139d30d88b8c732a05d2255d0f3e18d',
    'browser-import.d.ts': 'f41624c56001328d04e348975095dd476f6cfd364552f959a312c726c286d07b',
    LICENSE: 'b038148f912bdd6e61e33e56214d02c4d8a9640f7a637e21dfcf939332816979'
  }
  for (const [name, expected] of Object.entries(hashes)) {
    const source = readFileSync(
      new URL(`../../vendor/open-science/${name}`, import.meta.url),
      'utf8'
    ).replace(
      '    // biome-ignore lint/suspicious/noControlCharactersInRegex: Upstream security validation rejects control characters.\n',
      ''
    )
    expect(createHash('sha256').update(source).digest('hex')).toBe(expected)
  }
})
