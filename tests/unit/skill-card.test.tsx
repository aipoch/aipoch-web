import { describe, expect, test } from 'bun:test'
import { renderToStaticMarkup } from 'react-dom/server'
import { SkillCard } from '../../app/(commonLayout)/agent-skills/list/components/skill-card'
import type { Skill } from '../../service/skills'

const baseSkill: Skill = {
  path: '/skills/demo',
  id: 'skill-1',
  name: 'demo-skill',
  title: 'Demo Skill',
  description: 'Demo description',
  categories: ['Protocol Design'],
  tags: ['tag-a'],
  icon: '',
  author: {
    name: 'AIPOCH',
    avatar_url: '',
    org: 'AIPOCH'
  },
  stats: {
    views: 12,
    downloads: 34
  },
  updated_at: '2026-03-12',
  score: 86.6
}

describe('skill card', () => {
  test('rounds the displayed score badge', () => {
    const html = renderToStaticMarkup(<SkillCard skill={baseSkill} />)

    expect(html).toContain('>87</span>')
    expect(html).not.toContain('>86.6</span>')
  })

  test.each([
    [100, 'bg-[#E6F4ED] text-[#1A6B3C]'],
    [75, 'bg-[#E6F4ED] text-[#1A6B3C]'],
    [74.6, 'bg-[#FEF3C7] text-[#92400E]'],
    [45, 'bg-[#FEF3C7] text-[#92400E]'],
    [44.6, 'bg-[#FEE2E2] text-[#991B1B]'],
    [0, 'bg-[#FEE2E2] text-[#991B1B]']
  ] as const)('uses the existing total-score band for %s before rounding', (score, colors) => {
    const html = renderToStaticMarkup(<SkillCard skill={{ ...baseSkill, score }} />)

    expect(html).toContain(colors)
    expect(html).toContain(`>${Math.round(score)}</span>`)
  })

  test.each([null, undefined])('omits the score badge when the score is %s', (score) => {
    const html = renderToStaticMarkup(<SkillCard skill={{ ...baseSkill, score }} />)

    expect(html).not.toContain('font-bold')
  })
})
