import { Github } from 'lucide-react'

interface SkillDetailsProps {
  tags?: string[]
  author: {
    name: string
    avatar_url: string
    org: string
  }
  license: string
  contentLanguage: string
  updatedAt: string
  githubRepoUrl: string | null
  version: string
}

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toISOString().split('T')[0]
}

export function SkillDetails({
  tags = [],
  author,
  license,
  contentLanguage,
  updatedAt,
  githubRepoUrl,
  version
}: SkillDetailsProps) {
  const displayAuthor = author.name || author.org

  return (
    <div className="bg-white/30 p-4 border border-[#111]/10">
      <h3 className="text-xs font-medium uppercase tracking-wider text-[#111] mb-4 border-b border-black/10 pb-2">
        Details
      </h3>

      {tags.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2">
          {tags.map((tag) => (
            <span key={tag} className="bg-[#e7e5de] px-2 py-1 text-xs text-[#6b6b66]">
              {tag}
            </span>
          ))}
        </div>
      )}
      <div className="space-y-3">
        <div className="flex justify-between items-center text-sm">
          <span className="text-[#6b6b66]">Author</span>
          <span className="text-[#111]">{displayAuthor}</span>
        </div>

        {author.org && author.org !== displayAuthor && (
          <div className="flex justify-between items-center gap-4 text-sm">
            <span className="text-[#6b6b66]">Organization</span>
            <span className="text-right text-[#111]">{author.org}</span>
          </div>
        )}
        <div className="flex justify-between items-center text-sm">
          <span className="text-[#6b6b66]">License</span>
          <span className="text-[#111]">{license}</span>
        </div>

        <div className="flex justify-between items-center text-sm">
          <span className="text-[#6b6b66]">Language</span>
          <span className="text-[#111]">{contentLanguage}</span>
        </div>

        <div className="flex justify-between items-center text-sm">
          <span className="text-[#6b6b66]">Updated</span>
          <span className="text-[#111]">{formatDate(updatedAt)}</span>
        </div>

        <div className="flex justify-between items-center text-sm">
          <span className="text-[#6b6b66]">Version</span>
          <span className="text-[#111]">{version}</span>
        </div>

        {githubRepoUrl && (
          <div className="flex justify-between items-center text-sm pt-2 border-t border-black/10">
            <span className="text-[#6b6b66]">Source</span>
            <a
              href={githubRepoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-[#111] hover:text-black transition-colors"
            >
              <Github className="size-3.5" />
              <span>GitHub</span>
            </a>
          </div>
        )}
      </div>
    </div>
  )
}
