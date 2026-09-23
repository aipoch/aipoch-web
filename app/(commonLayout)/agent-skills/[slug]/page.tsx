import { ArrowLeft, Download, Eye, FileText } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { JsonLd } from '@/components/json-ld'
import { MarkdownErrorBoundary, MarkdownRenderer } from '@/components/markdown'
import { TableOfContents } from '@/components/markdown/toc'
import { agentSkillPageLastModified } from '@/lib/agent-skill-page-metadata'
import { SITE_DOMAIN } from '@/lib/config'
import { mapScoreDetailToSkillEvaluation } from '@/lib/map-score-detail'
import { createPageMetadata } from '@/lib/page-metadata'
import { extractToc } from '@/lib/toc'
import { fetchSkillDetail, type SkillDetail } from '@/service/skills'
import { DownloadButton } from '../components/download-button'
import { EvaluationOverview } from '../components/evaluation-overview'
import { FileTree, type FileTreeItem } from '../components/file-tree'
import { SkillDetails } from '../components/skill-details'
import styles from '../components/skill-documentation.module.css'

interface ManifestFile {
  kind: string
  path: string
  size: number
}

interface Manifest {
  root?: string
  files?: ManifestFile[]
}

export async function generateMetadata({
  params
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const canonicalUrl = `${SITE_DOMAIN}/agent-skills/${slug}`

  try {
    const skill = await fetchSkillDetail(slug)
    return createPageMetadata({
      title: `${skill.title} | AIPOCH Agent Skill`,
      description: skill.description,
      canonical: canonicalUrl
    })
  } catch {
    return {
      ...createPageMetadata({
        title: 'AIPOCH Skills List — Browse All Medical Research AI Skills',
        description:
          'Browse all AIPOCH medical research skills across Academic Writing, Data Analysis, Evidence Insights, Protocol Design, and more.',
        canonical: canonicalUrl
      }),
      robots: { index: false, follow: false }
    }
  }
}

function buildFileTree(manifest: Manifest): { rootName: string; items: FileTreeItem[] } {
  const rootName = manifest.root || 'skill-package'
  const files = manifest.files || []
  const root: FileTreeItem[] = []

  for (const file of files) {
    // Strip root prefix from path
    const relativePath = file.path.startsWith(`${rootName}/`)
      ? file.path.slice(rootName.length + 1)
      : file.path
    const parts = relativePath.split('/')
    let current = root

    for (let i = 0; i < parts.length; i++) {
      const name = parts[i]
      const isFile = i === parts.length - 1

      if (isFile) {
        current.push({ name, type: 'file' })
      } else {
        let folder = current.find(
          (item): item is FileTreeItem & { type: 'folder'; items: FileTreeItem[] } =>
            item.type === 'folder' && item.name === name
        )
        if (!folder) {
          folder = { name, type: 'folder', items: [] }
          current.push(folder)
        }
        current = folder.items
      }
    }
  }

  return { rootName, items: root }
}

interface AgentSkillPageProps {
  params: Promise<{
    slug: string
  }>
}

export default async function AgentSkillPage({ params }: AgentSkillPageProps) {
  const { slug } = await params

  let data: SkillDetail
  try {
    data = await fetchSkillDetail(slug)
  } catch {
    notFound()
  }

  const tags = data.tags.map((t) => (typeof t === 'string' ? t : t.name))

  const { rootName, items: fileTreeItems } = buildFileTree(data.manifest as Manifest)

  // Extract TOC from skill_md content
  const toc = await extractToc(data.skill_md || '')

  const ensureTimezone = (dateStr: string | undefined) =>
    dateStr ? (dateStr.endsWith('Z') || dateStr.includes('+') ? dateStr : `${dateStr}Z`) : undefined
  const datePublished = ensureTimezone(data.published_at)
  const dateModified = ensureTimezone(data.updated_at)
  const authorName = data.author?.name || 'AIPOCH'
  const firstCategory = data.categories?.[0]
  const categoryName = typeof firstCategory === 'string' ? firstCategory : firstCategory?.name

  const softwareApplicationSchema = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: data.title,
    description: data.description,
    url: `${SITE_DOMAIN}/agent-skills/${data.path ?? data.name}`,
    author: {
      '@type': 'Organization',
      name: authorName,
      url: SITE_DOMAIN
    },
    ...(categoryName && { applicationCategory: categoryName }),
    ...(datePublished && { datePublished }),
    ...(dateModified && { dateModified })
  }

  const evaluationProps = data.score_detail
    ? mapScoreDetailToSkillEvaluation(data.score_detail, data.path ?? data.name, {
        scoreResultUrl: data.score_result_url
      })
    : undefined

  return (
    <>
      <JsonLd data={softwareApplicationSchema} />
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'WebPage',
          name: `${data.title} | AIPOCH Agent Skill`,
          url: `${SITE_DOMAIN}/agent-skills/${data.path ?? data.name}`,
          dateModified: agentSkillPageLastModified(dateModified)
        }}
      />
      <main className="flex-1 bg-[#f7f7f5] text-[#111]">
        <section>
          <div className="mx-auto max-w-7xl px-5 pb-12 pt-10 sm:px-8 lg:pt-14">
            {/* Breadcrumb */}
            <Link
              href="/agent-skills/list"
              className="mb-8 flex min-h-6 w-fit items-center gap-2 text-xs uppercase tracking-[0.6px] text-[#111] transition-colors hover:text-[#6b6b66] focus-visible:outline-2 focus-visible:outline-offset-4"
            >
              <ArrowLeft className="size-4" />
              Agent Skills
            </Link>

            {/* Main content grid */}
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_400px] lg:gap-12">
              {/* Left column - Skill info */}
              <div className="min-w-0 lg:pt-6">
                <h1 className="font-[Georgia] text-[44px] font-normal leading-[1.08] sm:text-[60px] xl:text-[78px] xl:leading-[80px] [overflow-wrap:anywhere]">
                  {data.title}
                </h1>

                {/* Description */}
                <div className="mb-8 mt-8 lg:mt-14">
                  <p className="text-base leading-[26px] text-[#61615c]">{data.description}</p>
                </div>

                {/* Action buttons */}
                <div className="flex flex-wrap gap-4 mb-8">
                  <DownloadButton skillPath={data.path} />
                  <div className="flex items-center gap-6 text-sm text-[#111] sm:ml-4">
                    <div className="flex items-center gap-2">
                      <Eye className="size-4 text-[#6b6b66]" aria-hidden />
                      <span className="sr-only">Views:</span>
                      <span>{data.stats.views}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Download className="size-4 text-[#6b6b66]" aria-hidden />
                      <span className="sr-only">Downloads:</span>
                      <span>{data.stats.downloads}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right column - File tree */}
              <div className="min-w-0 lg:pt-4">
                <FileTree
                  items={[{ name: `${rootName}/`, type: 'folder', items: fileTreeItems }]}
                  title="FILES"
                />
              </div>
            </div>

            {/* Show the evaluation section when score_detail is available. */}
            {evaluationProps && (
              <div className="mt-10">
                <EvaluationOverview evaluation={evaluationProps} />
              </div>
            )}
          </div>
        </section>

        {/* mdx render */}
        <section className="mx-auto max-w-7xl px-5 pt-5 pb-16 sm:px-8">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_400px] lg:gap-12">
            {/* Left: MDX Content */}
            <article
              className={`${styles.documentation} min-w-0 border border-[#111]/10 bg-white/30 px-5 py-8 sm:px-10`}
            >
              <p
                className="flex items-center border-b pb-4
              mb-6 gap-2 text-black/40 text-xs"
              >
                <FileText className="size-4" />
                <span className="leading-tight">SKILL.md</span>
              </p>
              <MarkdownErrorBoundary>
                <MarkdownRenderer content={data.skill_md || ''} mode="md" />
              </MarkdownErrorBoundary>
            </article>

            {/* Right: TOC */}
            <aside className="min-w-0 space-y-4 self-start lg:sticky lg:top-[calc(var(--nav-h)+16px)] lg:max-h-[calc(100dvh-var(--nav-h)-32px)] lg:overflow-y-auto scrollbar-light">
              <div className="hidden border border-[#111]/10 bg-white/30 p-4 lg:block">
                <TableOfContents toc={toc} variant="skill" />
              </div>
              <SkillDetails
                tags={tags}
                author={data.author}
                license={data.license}
                contentLanguage={data.content_language}
                updatedAt={data.updated_at}
                githubRepoUrl={data.github_repo_url}
                version={data.version}
              />
            </aside>
          </div>
        </section>
      </main>
    </>
  )
}
