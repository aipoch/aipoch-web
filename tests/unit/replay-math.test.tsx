import { expect, test } from 'bun:test'
import { renderToReadableStream } from 'react-dom/server'
import SessionMarkdownStreamdown from '../../app/(commonLayout)/open-science/use-cases/_components/session-markdown-streamdown'

const render = async (content: string) =>
  new Response(await renderToReadableStream(<SessionMarkdownStreamdown content={content} />)).text()
const mathCount = (html: string) => (html.match(/class="katex"/g) ?? []).length

for (const [name, content, count, display] of [
  ['inline', String.raw`Before \(x+1\) after.`, 1, false],
  [
    'display',
    String.raw`Before
\[
\%L=\frac{100+ee}{2},\qquad \%R=\frac{100-ee}{2}.
\]
After.`,
    1,
    true
  ],
  ['existing dollars', '$x+1$\n\n$$\nx+2\n$$', 2, true],
  ['mixed', String.raw`\(x\) and $y$`, 2, false],
  [
    'percent from original message',
    String.raw`99% ordinary. \((89.1+9.9)/100 \times 100=99\%\).`,
    1,
    false
  ],
  [
    'table with supported delimiters',
    String.raw`| Meaning | Formula |
| - | - |
| Purity | \(100(L+R)/(L+R+I)\) |`,
    1,
    false
  ]
] as const) {
  test(`replay renders ${name} through KaTeX`, async () => {
    const html = await render(content)
    expect(mathCount(html)).toBe(count)
    expect(html.includes('class="katex-display"')).toBe(display)
    expect(html).not.toContain('class="katex-error"')
    if (name.startsWith('percent')) {
      expect(html).toContain('99% ordinary.')
      expect(html).toContain(String.raw`100=99\%`)
    }
  })
}
for (const [name, content] of [
  ['ordinary brackets', '[x+1] (x+1) and 99%'],
  ['escaped delimiters', String.raw`\\(x\\) and \\[y\\]`],
  ['inline code', '`\\(x\\) \\[y\\] 99%`'],
  ['fenced code', '```tex\n\\(x\\)\n\\[y\\]\n99%\n```'],
  ['indented code', '    \\(x\\) 99%'],
  ['unclosed inline', String.raw`Before \(x after.`],
  [
    'unclosed display',
    String.raw`Before
\[
x+1

After.`
  ],
  ['closing only', String.raw`Before \) and \] after.`]
] as const) {
  test(`replay protects ${name}`, async () => {
    const html = await render(content)
    expect(mathCount(html)).toBe(0)
    if (content.includes('99%')) expect(html).toContain('99%')
    if (name.includes('code')) expect(html).toContain('\\(x\\)')
  })
}

test('display math becomes flow content without dropping surrounding formatting', async () => {
  const html = await render(String.raw`Before *left \[x\] right* after.

> quote \[y\] end

- list \[z\] end`)
  expect(mathCount(html)).toBe(3)
  expect(html).not.toMatch(/<p[^>]*>[^<]*<pre/)
  expect(html).toContain('<em>left ')
  expect(html).toContain(' right</em>')
  expect(html).toContain('<blockquote')
  expect(html).toContain('<li')
})

test('unescaped TeX percent retains comment semantics', async () => {
  const html = await render('\\[x%comment\n+y\\]')
  expect(mathCount(html)).toBe(1)
  expect(html).toContain('x%comment\n+y')
  expect(html).not.toContain('x\\%comment')
})

test('unclosed delimiters preserve following paragraphs and code', async () => {
  const html = await render('\\[x\n\nAfter paragraph.\n\n`\\(code\\)`')
  expect(mathCount(html)).toBe(0)
  expect(html).toContain('After paragraph.')
  expect(html).toContain('\\(code\\)')
})

test('ordinary table pipes remain GFM column boundaries', async () => {
  const html = await render(String.raw`| Meaning | Formula |
| - | - |
| Excess | \(100|L-R|/(L+R)\) |`)
  expect(mathCount(html)).toBe(0)
  expect(html).toContain('<table')
})

for (const source of [
  String.raw`[\[x\]](https://example.com)`,
  String.raw`[left *\[x\]* right][formula]

[formula]: https://example.com`
]) {
  test('display math preserves direct and reference links', async () => {
    const html = await render(source)
    expect(mathCount(html)).toBe(1)
    expect(html.match(/href="https:\/\/example.com\/"/g)).toHaveLength(1)
    expect(html).toMatch(/<a[^>]*>[\s\S]*class="katex-display"[\s\S]*<\/a>/)
  })
}
