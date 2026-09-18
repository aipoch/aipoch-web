import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import postcss from 'postcss'
import tailwind from '@tailwindcss/postcss'

const destination = resolve(import.meta.dirname, '..')
const repository = resolve(destination, '../..')
const cssPath = resolve(repository, 'app/globals.css')
const globalCSS = await postcss([tailwind({ base: repository, optimize: true })]).process(
  await readFile(cssPath, 'utf8'),
  { from: cssPath }
)
const result = await Bun.build({
  entrypoints: [resolve(import.meta.dirname, 'preview.jsx')],
  target: 'browser',
  format: 'iife',
  minify: true,
  plugins: [
    {
      name: 'standalone-browser-environment',
      setup(build) {
        // The standalone review file has no injected server environment.
        build.onResolve({ filter: /^next-runtime-env$/ }, () => ({
          path: 'browser-env',
          namespace: 'preview'
        }))
        build.onLoad({ filter: /.*/, namespace: 'preview' }, () => ({
          contents: 'export function env(key) { return undefined }',
          loader: 'js'
        }))
      }
    }
  ],
  define: { 'process.env.NODE_ENV': '"production"', 'process.env': '{}' }
})
if (!result.success) throw new AggregateError(result.logs, 'Preview compilation failed')
let fonts = ''
for (const [family, file, weight] of [
  ['Inter', 'inter-300.ttf', 300],
  ['Inter', 'inter-400.ttf', 400],
  ['Inter', 'inter-500.ttf', 500],
  ['Inter', 'inter-600.ttf', 600],
  ['Inter', 'inter-700.ttf', 700],
  ['Roboto Mono', 'roboto-mono-500.ttf', 500]
]) {
  const data = (await readFile(resolve(destination, 'assets', file))).toString('base64')
  fonts += `@font-face{font-family:'${family}';font-style:normal;font-weight:${weight};font-display:block;src:url(data:font/ttf;base64,${data}) format('truetype');}`
}
const background = (
  await readFile(resolve(destination, 'assets/research-background.png'))
).toString('base64')
const css =
  globalCSS.css + fonts + (await readFile(resolve(import.meta.dirname, 'preview.css'), 'utf8'))
const js = await result.outputs[0].text()
const html = `<!doctype html>
<html lang="en" class="[--nav-h:80px] scroll-pt-[var(--nav-h)] lg:[--nav-h:72px]">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>MedFlow — AIPOCH</title><meta name="robots" content="noindex,nofollow">
<base href="https://aipoch.com/"><link rel="icon" href="data:,">
<style>${css}</style></head>
<body class="font-sans antialiased bg-[#e8e8e8]"><div id="root"></div>
<script>window.MEDFLOW_BACKGROUND=${JSON.stringify(`data:image/png;base64,${background}`)};</script>
<script>${js.replaceAll('</script', '<\\/script')}</script>
</body></html>`
await writeFile(resolve(destination, 'index.html'), html)
process.stdout.write(
  `Built standalone HTML (${(Buffer.byteLength(html) / 1024 / 1024).toFixed(2)} MB) from the unchanged site shell and original Figma layers.\n`
)
