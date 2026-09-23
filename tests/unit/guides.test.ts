import { describe, expect, test } from 'bun:test'
import GuidePage, {
  generateMetadata,
  generateStaticParams
} from '../../app/(commonLayout)/guides/[slug]/page'
import GuidesIndexPage from '../../app/(commonLayout)/guides/page'
import { getAdjacentGuides, getAllGuides, getGuide } from '../../lib/guides'

describe('published guides', () => {
  test('starts at the first active guide', async () => {
    await expect(GuidesIndexPage()).rejects.toMatchObject({
      digest: expect.stringContaining(';/guides/what-is-a-skill;307;')
    })
  })

  test('publishes the three requested modules in order', async () => {
    const guides = await getAllGuides()
    expect(guides.map((guide) => guide.frontmatter.title)).toEqual([
      'What Is a Skill?',
      'Get Started with Skills',
      'Build Your Own Skill'
    ])
    expect(await generateStaticParams()).toEqual([
      { slug: 'what-is-a-skill' },
      { slug: 'get-started-with-skills' },
      { slug: 'build-your-own-skill' }
    ])
  })

  test.each(['openclaw-local-deployment', 'openclaw-cloud-deployment'])(
    'returns not found for the retired %s page and its metadata',
    async (slug) => {
      const params = Promise.resolve({ slug })
      expect(await getGuide(slug)).toBeNull()
      await expect(GuidePage({ params })).rejects.toMatchObject({
        digest: 'NEXT_HTTP_ERROR_FALLBACK;404'
      })
      await expect(generateMetadata({ params })).rejects.toMatchObject({
        digest: 'NEXT_HTTP_ERROR_FALLBACK;404'
      })
    }
  )

  test('uses the current introduction in both neighboring recommendation cards', async () => {
    const first = await getAdjacentGuides('what-is-a-skill')
    const last = await getAdjacentGuides('build-your-own-skill')
    const expected = {
      slug: 'get-started-with-skills',
      frontmatter: {
        description:
          'Choose and install a research skill, then run your first task and review the results'
      }
    }
    expect(first.prev).toBeNull()
    expect(first.next).toMatchObject(expected)
    expect(last.prev).toMatchObject(expected)
    expect(last.next).toBeNull()
  })
})
