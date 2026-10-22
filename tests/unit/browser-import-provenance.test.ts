import { expect, test } from 'bun:test'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'

test('vendored SDK matches the documented local revision and unchanged upstream license', () => {
  const hashes = {
    'browser-import.mjs': '26313c4e91d41323f78543cf2d730e9aa0d89dd75909b36a48e7144cd76db806',
    'browser-import.d.ts': 'f6892ef966030dd5375b429847db36f9acedefda5ee8da26f84f5ba6402dcb7c',
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
