import { expect, test } from 'bun:test'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'

test('vendored SDK matches the pinned upstream bytes except the documented lint comment', () => {
  const hashes = {
    'browser-import.mjs': '21d513281aff4bc30366c8e749b4ac3613ce5c761685269a13e5221450fa07eb',
    'browser-import.d.ts': '84b70c2b26f8792d141184065b6ae4ded8b2a97ed2903be5be230e20f64e794d',
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
