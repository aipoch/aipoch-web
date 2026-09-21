import { describe, expect, test } from 'bun:test'
import type { Metadata } from 'next'

const BLOG_TITLE = 'AIPOCH Blog | Open-Science Updates & Research Workflows'
const BLOG_DESCRIPTION =
  'Explore AIPOCH Open-Science product updates, research workflows, and practical insights for reproducible AI-assisted scientific research.'
const OPEN_SCIENCE_IMAGE =
  'https://statics.aipoch.com/public/f/image/og-science-open-to-all-ab128c94.png'

const expectPageMetadata = (
  metadata: Metadata,
  expected: { title: string; description: string; canonical: string }
) => {
  expect(metadata.title).toBe(expected.title)
  expect(metadata.description).toBe(expected.description)
  expect(String(metadata.alternates?.canonical)).toBe(expected.canonical)
  expect(metadata.openGraph?.title).toBe(expected.title)
  expect(metadata.openGraph?.description).toBe(expected.description)
  expect(String(metadata.openGraph?.url)).toBe(expected.canonical)
  expect(metadata.twitter?.title).toBe(expected.title)
  expect(metadata.twitter?.description).toBe(expected.description)
}

describe('page metadata contracts', () => {
  test('publishes self-contained metadata for Blog, Leaderboard, and policy pages', async () => {
    const { metadata: blogMetadata } = await import('../../app/(commonLayout)/blog/page')
    const { metadata: leaderboardMetadata } = await import(
      '../../app/(commonLayout)/leaderboard/layout'
    )
    const { metadata: privacyMetadata } = await import(
      '../../app/(commonLayout)/privacy-policy/page'
    )
    const { metadata: termsMetadata } = await import(
      '../../app/(commonLayout)/terms-of-service/page'
    )
    const { metadata: cookieMetadata } = await import('../../app/(commonLayout)/cookie-policy/page')

    expectPageMetadata(blogMetadata, {
      title: BLOG_TITLE,
      description: BLOG_DESCRIPTION,
      canonical: 'https://aipoch.com/blog'
    })
    expectPageMetadata(leaderboardMetadata, {
      title: 'Leaderboard',
      description:
        'Ranked evaluation results for all audited medical research agent skills — scored on core capability and live task execution.',
      canonical: 'https://aipoch.com/leaderboard'
    })
    expectPageMetadata(privacyMetadata, {
      title: 'Privacy Policy | AIPOCH',
      description:
        'Learn how AIPOCH collects, uses, shares, protects, and retains personal data when you use our Services.',
      canonical: 'https://aipoch.com/privacy-policy'
    })
    expectPageMetadata(termsMetadata, {
      title: 'Terms of Service | AIPOCH',
      description:
        'Please read these Terms of Service carefully before using AIPOCH products and services.',
      canonical: 'https://aipoch.com/terms-of-service'
    })
    expectPageMetadata(cookieMetadata, {
      title: 'Cookie Policy | AIPOCH',
      description:
        'This Cookie Policy describes what kinds of cookies and similar technologies AIPOCH uses in connection with our Services, and how you can manage them.',
      canonical: 'https://aipoch.com/cookie-policy'
    })
  })

  test('publishes unique, mirrored metadata for all three guide pages', async () => {
    const { generateMetadata } = await import('../../app/(commonLayout)/guides/[slug]/page')
    const expectedGuides = [
      {
        slug: 'get-started-with-skills',
        title: 'Get Started with Skills | AIPOCH',
        description:
          'Choose and install a research skill, then run your first task and review the results'
      },
      {
        slug: 'what-is-a-skill',
        title: 'What Are Agent Skills? Reusable AI Packages Explained',
        description:
          'Discover Agent Skills, reusable AI packages that teach AI agents how to perform tasks reliably, store knowledge, and maintain consistency across workflows.'
      },
      {
        slug: 'build-your-own-skill',
        title: 'Build Your Own Agent Skill — Create and Automate Tasks with AI',
        description:
          'Learn how to create reusable Agent Skills that let AI Agents follow workflows consistently. Step-by-step guidance on designing, testing, and improving skills for task automation, with examples and reference materials.'
      }
    ]

    for (const guide of expectedGuides) {
      const metadata = await generateMetadata({ params: Promise.resolve({ slug: guide.slug }) })
      expectPageMetadata(metadata, {
        title: guide.title,
        description: guide.description,
        canonical: `https://aipoch.com/guides/${guide.slug}`
      })
    }
  })

  test('uses the supplied Open-Science image on the homepage and product page', async () => {
    const { metadata: homepageMetadata } = await import('../../app/(commonLayout)/page')
    const { openScienceMetadata } = await import(
      '../../app/(commonLayout)/open-science/open-science-metadata'
    )

    expectPageMetadata(homepageMetadata, {
      title: 'AIPOCH | The Open-Source Harness for Scientific Research',
      description:
        'AIPOCH builds the open-source harness for scientific research: a model-agnostic Open-Science workbench and a growing library of audited medical research agent skills.',
      canonical: 'https://aipoch.com'
    })

    expect(homepageMetadata.openGraph?.images).toEqual([
      {
        url: OPEN_SCIENCE_IMAGE,
        width: 1280,
        height: 672,
        alt: 'Science, Open to All — AIPOCH Open-Science'
      }
    ])
    expect(homepageMetadata.twitter?.images).toEqual([OPEN_SCIENCE_IMAGE])
    expect(openScienceMetadata.openGraph?.images).toEqual(homepageMetadata.openGraph?.images)
    expect(openScienceMetadata.twitter?.images).toEqual([OPEN_SCIENCE_IMAGE])
  })

  test('keeps Skills List metadata aligned with its new visible description', async () => {
    const { metadata } = await import('../../app/(commonLayout)/agent-skills/list/layout')
    const description =
      'Browse all medical research skills across Academic Writing, Data Analysis, Evidence Insights, Protocol Design, and other scientific research workflows.'

    expect(metadata.description).toBe(description)
    expect(metadata.openGraph?.description).toBe(description)
    expect(metadata.twitter?.description).toBe(description)
  })
})
