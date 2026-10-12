import { expect, test } from 'bun:test'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'

test('vendored SDK matches the pinned upstream bytes except the documented lint comment', () => {
  const hashes = {
    'browser-import.mjs': 'e79eae7534187fc3b3cf5bfcb80778dda1e2636361a44b728c422afdca2ff037',
    'browser-import.d.ts': 'e13fc0620bd2c5bd863b3cf7b00b7c4e2a23def786f0d84f6431570ffe8cf7d7',
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
