import { describe, expect, test } from 'bun:test'
import { existsSync, readFileSync } from 'node:fs'
import { type ComponentProps, createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MedFlowContent } from '../../app/(commonLayout)/medflow/medflow-content'
import {
  MEDFLOW_PAGE_LAST_MODIFIED,
  medFlowMetadata
} from '../../app/(commonLayout)/medflow/medflow-metadata'
import MedFlowPage from '../../app/(commonLayout)/medflow/page'

const text = (markup: string) =>
  markup
    .replace(/<[^>]*>/g, ' ')
    .replace(/&#x27;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
const field = <T extends 'email' | 'name' | 'consent'>(name: T) => ({
  name,
  onBlur: async () => {},
  onChange: async () => {},
  ref: () => {}
})
const renderContent = (overrides: Partial<ComponentProps<typeof MedFlowContent>> = {}) =>
  renderToStaticMarkup(
    createElement(MedFlowContent, {
      apiError: '',
      canSubmit: false,
      isSubmitting: false,
      onInput: () => {},
      onSubmit: () => {},
      registerName: field('name'),
      registerEmail: field('email'),
      registerConsent: field('consent'),
      result: null,
      successName: '',
      ...overrides
    })
  )

describe('MedFlow production page', () => {
  test('keeps the canonical route and consistent metadata without an obsolete launch date', () => {
    const title = 'MedFlow by AIPOCH | Biomedical Research Workflows'
    const description =
      'Explore MedFlow, AIPOCH’s upcoming tool for biomedical research workflows. Join the waitlist to hear when private beta access becomes available.'
    expect(medFlowMetadata.title).toBe(title)
    expect(medFlowMetadata.openGraph?.title).toBe(title)
    expect(medFlowMetadata.twitter?.title).toBe(title)
    expect(medFlowMetadata.description).toBe(description)
    expect(medFlowMetadata.alternates?.canonical).toBe('https://aipoch.com/medflow')
    expect(medFlowMetadata.openGraph?.url).toBe('https://aipoch.com/medflow')
    expect(medFlowMetadata.openGraph?.description).toBe(medFlowMetadata.description ?? undefined)
    expect(medFlowMetadata.twitter?.description).toBe(medFlowMetadata.description ?? undefined)
    expect(medFlowMetadata.description).not.toContain('July 2026')
    expect(MEDFLOW_PAGE_LAST_MODIFIED).toBe('2026-09-21')
  })

  test('renders the replacement directly at the existing route, within the shared shell', () => {
    const html = renderToStaticMarkup(createElement(MedFlowPage))
    expect(html).toContain('aria-label="MedFlow"')
    expect(html).toContain('MEDFLOW')
    expect(text(html)).toContain('A NEW SIGNAL IS COMING')
    expect(text(html)).toContain('COMING SOON')
    expect(text(html)).toContain('Not just faster . Built to be certain .')
    expect(text(html)).toContain('Reproducible')
    expect(text(html)).toContain('Verifiable')
    expect(text(html)).toContain('Traceable')
    for (const removed of [
      '<iframe',
      '<header',
      '<footer',
      'July 2026',
      'What it stands for',
      '0% —',
      'output/medflow'
    ])
      expect(html).not.toContain(removed)
    expect(html).toContain('aria-controls="waitlist"')
    for (const asset of [
      'research-background.png',
      'reproducible.svg',
      'verifiable.svg',
      'traceable.svg'
    ])
      expect(existsSync(`public/medflow/${asset}`)).toBe(true)
  })

  test('uses real named controls and explicit consent with an initially disabled submit', () => {
    const html = renderContent()
    for (const name of ['name', 'email', 'consent']) expect(html).toContain(`name="${name}"`)
    expect(html).toContain('id="mf-btn"')
    expect(html).toMatch(/<button[^>]*disabled=""/)
    expect(html).toContain('autoComplete="email"')
    expect(html).toContain('href="https://aipoch.com/privacy-policy"')
    expect(text(html)).toContain('You hereby acknowledge and agree')
    expect(html).not.toContain('id="mf-success"')
  })

  test('associates field errors and API errors with accessible messages', () => {
    const html = renderContent({
      emailError: 'Enter a valid email address.',
      apiError: 'Already reserved.',
      canSubmit: true
    })
    expect(html).toContain('aria-describedby="mf-email-error"')
    expect(html).toContain('aria-invalid="true"')
    expect(html).toContain('id="mf-email-error" role="alert"')
    expect(html).toContain('id="mf-err" role="alert"')
    expect(text(html)).toContain('Already reserved.')
    expect(renderContent()).not.toContain('id="mf-err"')
  })

  test('locks all fields and the submit button while the real request is pending', () => {
    const html = renderContent({ isSubmitting: true, canSubmit: true })
    expect((html.match(/disabled=""/g) ?? []).length).toBe(4)
    expect(html).toContain('aria-busy="true"')
    expect(text(html)).toContain('Requesting…')
  })

  test('replaces the form with personalized success and keeps its name safely as text', () => {
    const html = renderContent({
      result: { ok: true, message: 'Reserved' },
      successName: '<script>Avery</script>'
    })
    expect(html).not.toContain('<form')
    expect(html).not.toContain('<input')
    expect(html).toContain('id="mf-success-title" tabindex="-1"')
    expect(html).toContain('class="mf-success-name"')
    expect(html).toContain('&lt;script&gt;Avery&lt;/script&gt;')
    expect(text(html)).toContain('Your activation code ships at launch')
    expect(text(html)).toContain('Join our Discord')
    expect(text(html)).toContain('Follow @aipoch_ai')
  })

  test('keeps confetti success-driven and honors reduced motion', () => {
    const effects = readFileSync('app/(commonLayout)/medflow/medflow-effects.tsx', 'utf8')
    expect(effects).toContain('if (!active || !canvasRef.current) return')
    expect(effects).toContain('if (preference.matches) return')
    expect(effects).toContain('disableForReducedMotion: true')
    expect(effects).toContain('fire.reset()')
  })
})
