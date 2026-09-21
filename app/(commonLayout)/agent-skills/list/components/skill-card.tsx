import { ArrowRight, Download, Eye } from 'lucide-react'
import Link from 'next/link'

import { type ScoreRatioBand, scoreRatioBandFromParts } from '@/lib/score-ratio-bands'
import { cn } from '@/lib/utils'
import type { Skill } from '@/service/skills'

interface SkillCardProps {
  skill: Skill
}

const scoreBadgeColors: Record<ScoreRatioBand, string> = {
  green: 'bg-[#E6F4ED] text-[#1A6B3C]',
  orange: 'bg-[#FEF3C7] text-[#92400E]',
  red: 'bg-[#FEE2E2] text-[#991B1B]'
}

export function SkillCard({ skill }: SkillCardProps) {
  const roundedScore = skill.score != null ? Math.round(skill.score) : null
  const skillPath = skill.path ?? skill.name

  return (
    <Link
      href={`/agent-skills/${skillPath}`}
      scroll={false}
      className="group flex min-h-[368px] flex-col border border-[#e7e4db] bg-white p-6 transition-shadow duration-200 hover:shadow-[0_10px_24px_rgba(0,0,0,0.14)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#915600]"
    >
      {/* Header */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs font-medium uppercase tracking-[.2px] text-[#6b6b66]">
          {typeof skill.categories[0] === 'object' && skill.categories[0] !== null
            ? (skill.categories[0] as { name: string }).name
            : (skill.categories[0] as string) || ''}
        </span>
        <div className="flex items-center gap-3 text-xs text-[#6b6b66]">
          <span className="flex items-center gap-1">
            <Eye className="h-3 w-3 text-[#6b6b66]" />
            {skill.stats.views}
          </span>
          <span className="flex items-center gap-1">
            <Download className="h-3 w-3 text-[#6b6b66]" />
            {skill.stats.downloads}
          </span>
          {skill.score != null && (
            <span
              className={cn(
                'ml-1 flex items-center justify-center rounded px-2 py-1 text-xs font-bold',
                scoreBadgeColors[scoreRatioBandFromParts(skill.score, 100)]
              )}
            >
              {roundedScore}
            </span>
          )}
        </div>
      </div>

      {/* Title */}
      <h3 className="mb-2 font-[Georgia] text-[22px] font-normal leading-[1.25] tracking-[-.3px] text-[#111]">
        {skill.title}
      </h3>

      {/* Description */}
      <p className="mb-4 text-sm leading-5 text-[#6b6b66]">{skill.description}</p>

      {/* Tags */}
      <div className="mb-6 flex flex-wrap gap-2">
        {skill.tags.map((tag, index) => {
          const tagName =
            typeof tag === 'object' && tag !== null
              ? (tag as { name: string }).name
              : (tag as string)
          return (
            <span
              key={tagName + index}
              className="bg-[#e9e5db] px-2 py-0.5 text-[10px] uppercase tracking-wide text-[#61615c]"
            >
              {tagName}
            </span>
          )
        })}
      </div>

      {/* Footer */}
      <div className="mt-auto flex items-center justify-end pt-4">
        <ArrowRight className="h-4 w-4 -rotate-45 text-[#9a9890] transition-colors group-hover:text-[#111]" />
      </div>
    </Link>
  )
}
