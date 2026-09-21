import { ArrowLeft, ArrowRight, Clock } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { HighlightedText } from '@/components/highlighted-text'
import { JsonLd } from '@/components/json-ld'
import { MarkdownRenderer } from '@/components/markdown'
import { TableOfContents } from '@/components/markdown/toc'
import { commonLayoutLastModified } from '@/lib/common-layout-metadata'
import { SITE_DOMAIN } from '@/lib/config'
import { getAdjacentGuides, getAllGuides, getGuide } from '@/lib/guides'
import { createPageMetadata } from '@/lib/page-metadata'
import { staticAsset } from '@/lib/staticAsset'
import { extractToc } from '@/lib/toc'

interface GuidePageProps {
  params: Promise<{ slug: string }>
}

const GUIDE_SEO: Record<string, { title: string; description?: string }> = {
  'get-started-with-skills': {
    title: 'Get Started with Skills | AIPOCH'
  },
  'what-is-a-skill': {
    title: 'What Are Agent Skills? Reusable AI Packages Explained',
    description:
      'Discover Agent Skills, reusable AI packages that teach AI agents how to perform tasks reliably, store knowledge, and maintain consistency across workflows.'
  },
  'build-your-own-skill': {
    title: 'Build Your Own Agent Skill — Create and Automate Tasks with AI',
    description:
      'Learn how to create reusable Agent Skills that let AI Agents follow workflows consistently. Step-by-step guidance on designing, testing, and improving skills for task automation, with examples and reference materials.'
  }
}

export async function generateMetadata({
  params
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const guide = await getGuide(slug)
  if (!guide) notFound()

  const seo = GUIDE_SEO[slug]
  const title = seo?.title ?? `${guide.frontmatter.title} | AIPOCH`
  const description = seo?.description ?? guide.frontmatter.description

  return createPageMetadata({
    title,
    description,
    canonical: `${SITE_DOMAIN}/guides/${slug}`,
    type: 'article'
  })
}

export default async function GuidePage({ params }: GuidePageProps) {
  const { slug } = await params
  const guide = await getGuide(slug)

  if (!guide) {
    notFound()
  }

  const toc = await extractToc(guide.content)
  const { prev, next } = await getAdjacentGuides(slug)
  const ogImage = staticAsset('og-bfe41bdd.webp')

  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: guide.frontmatter.title,
    description: guide.frontmatter.description,
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `${SITE_DOMAIN}/guides/${slug}`
    },
    image: ogImage,
    author: {
      '@type': 'Organization',
      name: 'AIPOCH',
      url: SITE_DOMAIN
    },
    publisher: {
      '@type': 'Organization',
      name: 'AIPOCH',
      logo: {
        '@type': 'ImageObject',
        url: ogImage
      }
    },
    url: `${SITE_DOMAIN}/guides/${slug}`,
    datePublished: '2026-02-09T00:00:00Z',
    dateModified: commonLayoutLastModified(guide.frontmatter.lastModified)
  }

  return (
    <main className="relative max-w-3xl mx-auto px-4 pt-12 pb-22 lg:pb-32 flex-1">
      <JsonLd data={articleSchema} />
      {/* Position the TOC absolutely on the right and hide it on small screens. */}
      <div className=" fixed right-4 xl:block hidden 2xl:right-72 top-26 w-64">
        <TableOfContents className="border border-black/10 bg-zinc-100 rounded-md p-4" toc={toc} />
      </div>

      {/* Article header. */}
      <header className="mb-8">
        <div
          className="flex items-center gap-2 text-[#ea580c] font-mono text-xs
        font-bold uppercase leading-none tracking-widest mb-6"
        >
          <Clock size={14} />{' '}
          <span className="leading-none mt-0.5">{guide.frontmatter.readTime}</span>
        </div>
        <h1 className="text-4xl md:text-5xl mb-2 leading-snug">
          <HighlightedText
            highlightClassName="border bg-primary border-black italic pl-2 pr-4"
            keywords={[guide.frontmatter.highlight]}
            content={guide.frontmatter.title}
          />
        </h1>
        <p className="text-gray-400 italic">{guide.frontmatter.description}</p>
      </header>

      {/* Article content. */}
      <MarkdownRenderer content={guide.content} />

      {/* Previous/next navigation. */}
      <nav className="mt-16 pt-8 border-t border-gray-200 dark:border-border-dark">
        <div className="flex gap-4">
          {prev ? (
            <Link
              href={`/guides/${prev.slug}`}
              className="flex-1 group p-4 rounded-lg border border-gray-300 dark:border-border-dark hover:border-gray-400 dark:hover:border-gray-600 transition-colors"
            >
              <p className="font-medium mt-1 flex items-center justify-start gap-2 group-hover:text-amber-600 transition-colors">
                <ArrowLeft size={16} /> {prev.frontmatter.title}
              </p>
              <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                {prev.frontmatter.description}
              </p>
            </Link>
          ) : (
            <div className="flex-1" />
          )}
          {next ? (
            <Link
              href={`/guides/${next.slug}`}
              className="flex-1 group p-4 rounded-lg border border-gray-300 dark:border-border-dark hover:border-gray-400 dark:hover:border-gray-600 transition-colors text-right"
            >
              <p className="font-medium mt-1 flex items-center justify-end gap-2 group-hover:text-amber-600 transition-colors">
                {next.frontmatter.title} <ArrowRight size={16} />
              </p>
              <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                {next.frontmatter.description}
              </p>
            </Link>
          ) : (
            <div className="flex-1" />
          )}
        </div>
      </nav>
    </main>
  )
}

// Generate static route parameters.
export async function generateStaticParams() {
  const guides = await getAllGuides()
  return guides.map((g) => ({ slug: g.slug }))
}
