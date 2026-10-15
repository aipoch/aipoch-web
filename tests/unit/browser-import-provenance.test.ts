import { expect, test } from 'bun:test'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'

test('vendored SDK matches the pinned upstream bytes except the documented lint comment', () => {
  const hashes = {
    'browser-import.mjs': '62dabc102ed38fbd70988abd6f1de08b631f2bcc68e9a57e395b6b4862fe722c',
    'browser-import.d.ts': '9294310ac24722c0b24a4fb98efed5723c2e51281303dc42f77ab828170f0996',
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
