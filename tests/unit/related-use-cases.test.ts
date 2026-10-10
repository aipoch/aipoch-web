import { describe, expect, test } from 'bun:test'
import { selectRelatedUseCases } from '../../lib/related-use-cases'
import type { UseCaseIndexEntry } from '../../lib/use-case-types'

const entry = (slug: string, title: string): UseCaseIndexEntry => ({ slug, title })

describe('related use cases', () => {
  test('ranks by unique shared keywords, normalizes punctuation and keeps ties in manifest order', () => {
    const current = entry('current', 'AI, AI! Climate: POWER?')
    const entries = [
      entry('first-tie', 'Climate climate climate'),
      current,
      entry('second-tie', 'AI ai AI'),
      entry('best', 'Climate / power'),
      entry('third-tie', 'Power'),
      entry('unrelated', 'Wordle')
    ]
    const original = entries.slice()
    const selected = selectRelatedUseCases(current, entries)
    expect(selected.map(({ slug }) => slug)).toEqual(['best', 'first-tie', 'second-tie'])
    expect(selected[0]).toBe(entries[3])
    expect(entries).toEqual(original)
  })

  test('filters prepositions, auxiliaries, pronouns and common stop words before scoring', () => {
    const current = entry('current', 'How can AI work with us, for the world and beyond?')
    const entries = [
      entry('fallback', 'Volcanoes'),
      entry('stop-words', 'HOW CAN with us FOR THE and beyond'),
      entry('topic', 'AI')
    ]
    expect(selectRelatedUseCases(current, entries).map(({ slug }) => slug)).toEqual([
      'topic',
      'fallback',
      'stop-words'
    ])
  })

  test('handles apostrophes and hyphens without counting contractions as keywords', () => {
    const current = entry('current', "What's AI-powered research? It’s not magic.")
    const entries = [
      entry('contractions', 'Whats its not'),
      entry('research', 'Research'),
      entry('ai', 'ai powered'),
      entry('magic', 'Magic')
    ]
    expect(selectRelatedUseCases(current, entries).map(({ slug }) => slug)).toEqual([
      'ai',
      'research',
      'magic'
    ])
  })

  test('fills after matches in manifest order, excluding the current case and duplicate slugs', () => {
    const current = entry('current', 'AI research')
    const entries = [
      current,
      entry('first', 'Wordle'),
      entry('match', 'AI research'),
      entry('match', 'AI research'),
      entry('second', 'Climate'),
      entry('first', 'Wordle'),
      entry('current', 'AI research'),
      entry('third', 'Sleep')
    ]
    expect(selectRelatedUseCases(current, entries).map(({ slug }) => slug)).toEqual([
      'match',
      'first',
      'second'
    ])
  })

  test('falls back to manifest order when no title keywords match', () => {
    const current = entry('current', 'Wordle')
    const entries = [
      entry('first', 'Sleep'),
      current,
      entry('second', 'Climate'),
      entry('third', 'AI'),
      entry('fourth', 'Stars')
    ]
    expect(selectRelatedUseCases(current, entries).map(({ slug }) => slug)).toEqual([
      'first',
      'second',
      'third'
    ])
  })

  test('returns all remaining unique cases when fewer than three exist, including identical titles', () => {
    const current = entry('current', 'AI')
    const first = entry('first', 'AI')
    const second = entry('second', 'AI')
    expect(selectRelatedUseCases(current, [current, first, first, second])).toEqual([first, second])
    expect(selectRelatedUseCases(current, [current])).toEqual([])
    expect(selectRelatedUseCases(current, [])).toEqual([])
  })

  test('handles empty and stop-word-only titles with the same ordered fallback', () => {
    const entries = [entry('empty', ''), entry('stop-words', 'THE with OR'), entry('topic', 'AI')]
    for (const title of ['', '...?!', 'The and of in']) {
      expect(selectRelatedUseCases(entry('current', title), entries)).toEqual(entries)
    }
  })
})
