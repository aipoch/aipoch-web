import { describe, expect, test } from 'bun:test'
import { renderToStaticMarkup } from 'react-dom/server'
import { HeroSection } from '../../app/(commonLayout)/agent-skills/components/hero-section'
import { IntroSection } from '../../app/(commonLayout)/agent-skills/components/intro-section'
import { ProcessSection } from '../../app/(commonLayout)/agent-skills/components/process-section'

describe('agent skills landing page', () => {
  test('keeps the existing hero destinations without the OpenClaw configuration', () => {
    const html = renderToStaticMarkup(<HeroSection />)

    expect(html).toContain('AIPOCH / AGENT SKILLS')
    expect(html).toContain('The Ultimate Skills Hub')
    expect(html).toContain('href="/agent-skills/list"')
    expect(html).toContain('href="https://aipoch.com/skill.md"')
    expect(html).toContain('597')
    expect(html).not.toContain('OpenClaw')
  })

  test('keeps all guide destinations in the redesigned introduction cards', () => {
    const html = renderToStaticMarkup(<IntroSection />)

    expect(html).toContain('New to Skills?')
    expect(html).toContain('href="/guides/what-is-a-skill"')
    expect(html).toContain('href="/guides/get-started-with-skills"')
    expect(html).toContain('href="/guides/build-your-own-skill"')
    expect(html.match(/READ GUIDE/g)).toHaveLength(3)
  })

  test('presents the three-step research process', () => {
    const html = renderToStaticMarkup(<ProcessSection />)

    expect(html).toContain('Accelerate Discovery')
    expect(html).toContain('DISCOVER')
    expect(html).toContain('CONNECT')
    expect(html).toContain('OPERATE')
  })

  test('uses the unified secondary color for labels, descriptions, and process lines', () => {
    const html = renderToStaticMarkup(
      <>
        <HeroSection />
        <IntroSection />
        <ProcessSection />
      </>
    )

    expect(html).toContain('#6B6B66')
    expect(html).not.toContain('#777872')
    expect(html).not.toContain('#bbb9b1')
    expect(html).not.toContain('#cfcdc6')
  })
})
