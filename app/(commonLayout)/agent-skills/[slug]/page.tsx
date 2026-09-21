import { ArrowLeft, Download, Eye, FileText } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { JsonLd } from '@/components/json-ld'
import { MarkdownErrorBoundary, MarkdownRenderer } from '@/components/markdown'
import { TableOfContents } from '@/components/markdown/toc'
import { Badge } from '@/components/ui/badge'
import { SITE_DOMAIN } from '@/lib/config'
import { mapScoreDetailToSkillEvaluation } from '@/lib/map-score-detail'
import { createPageMetadata } from '@/lib/page-metadata'
import { extractToc } from '@/lib/toc'
import { fetchSkillDetail, type SkillDetail } from '@/service/skills'
import { DownloadButton } from '../components/download-button'
import { EvaluationOverview } from '../components/evaluation-overview'
import { FileTree, type FileTreeItem } from '../components/file-tree'
import { SkillDetails } from '../components/skill-details'

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
      <main className="flex-1">
        <section className="bg-[linear-gradient(rgba(0,0,0,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.03)_1px,transparent_1px)] bg-size-[60px_60px]">
          <div className="mx-auto max-w-7xl px-4 py-12 lg:px-8">
            {/* Breadcrumb */}
            <Link
              href="/agent-skills/list"
              className="text-xs mb-8 flex w-fit items-center gap-2 font-light uppercase tracking-wider text-black/40 hover:text-black/80 transition"
            >
              <ArrowLeft className="size-4" />
              Agent Skills
            </Link>

            {/* Main content grid */}
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-12">
              {/* Left column - Skill info */}
              <div>
                {/* Tags */}
                <div className="flex flex-wrap gap-2 mb-6">
                  {tags.map((tag) => (
                    <Badge
                      key={tag}
                      variant="secondary"
                      className="border border-black/20 py-0.5 rounded-none text-black/70 font-normal text-xs"
                    >
                      {tag}
                    </Badge>
                  ))}
                </div>

                {/* Title */}
                <h1 className="mb-4 text-5xl font-light text-black md:text-6xl lg:text-7xl">
                  {data.title}
                </h1>

                {/* Author info */}
                <div className="flex items-center gap-2 text-sm text-black/60 mb-6">
                  <span>{data.author.name}</span>
                  {data.author.org && (
                    <>
                      <span className="text-black/30">·</span>
                      <span>{data.author.org}</span>
                    </>
                  )}
                </div>

                {/* Description */}
                <div className="border-l-2 border-primary pl-4 mb-8">
                  <p className="text-black/70 leading-relaxed">{data.description}</p>
                </div>

                {/* Action buttons */}
                <div className="flex flex-wrap gap-4 mb-8">
                  <DownloadButton skillPath={data.path} />
                  <div className="flex items-center gap-6 text-sm text-black/50 ml-4">
                    <div className="flex items-center gap-2">
                      <Eye className="h-4 w-4" />
                      <span>{data.stats.views}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Download className="h-4 w-4" />
                      <span>{data.stats.downloads}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right column - File tree */}
              <div className="lg:pt-4">
                <FileTree
                  items={[{ name: `${rootName}/`, type: 'folder', items: fileTreeItems }]}
                  title="FILES"
                />
              </div>
            </div>

            {/* Show the evaluation section when score_detail is available. */}
            {evaluationProps && (
              <div className="mt-8">
                <EvaluationOverview evaluation={evaluationProps} />
              </div>
            )}
          </div>
        </section>

        {/* mdx render */}
        <section className="mx-auto max-w-7xl px-4 pt-6 pb-12 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-12">
            {/* Left: MDX Content */}
            <div className="bg-white/30 border border-black/10 px-10 py-8 min-w-0">
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
            </div>

            {/* Right: TOC */}
            <div className="hidden lg:block sticky top-22 h-fit space-y-4">
              <div className="bg-white/30 p-4 border border-black/10 rounded-md">
                <TableOfContents toc={toc} />
              </div>
              <SkillDetails
                author={data.author}
                license={data.license}
                contentLanguage={data.content_language}
                updatedAt={data.updated_at}
                githubRepoUrl={data.github_repo_url}
                version={data.version}
              />
            </div>
          </div>
        </section>
      </main>
    </>
  )
}
