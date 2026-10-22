import { expect, test } from 'bun:test'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'

test('vendored SDK matches the documented local revision and unchanged upstream license', () => {
  const hashes = {
    'browser-import.mjs': 'ca4531994955a55e31ecd47e25a6b41746763b81b0d8febd1becb7c73f59ac4c',
    'browser-import.d.ts': '8d09f8e2f653c504b79318c1d42e83e7949a5be64e12fe1e75d6b24ff9dcfce6',
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
