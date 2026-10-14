// V4 design category strip for the use-case gallery. Categories and counts are
// derived from the manifest's catalog/catalog_name fields; selection lives in
// the ?category= URL param so it is shareable and server-side filtered.

import Link from 'next/link'

export type UseCaseCategorySummary = {
  /** Manifest catalog key; the ?category= param value. */
  key: string
  label: string
  count: number
}

const pillClass =
  'inline-flex items-baseline gap-2 px-4 py-2.5 text-[14px] leading-none transition-colors'
const pillCountClass = 'text-[12px] tabular-nums'

export const UseCaseCategories = ({
  total,
  categories,
  active
}: {
  total: number
  categories: UseCaseCategorySummary[]
  active?: string
}) => {
  const pill = (label: string, count: number, href: string, isActive: boolean) => (
    <li key={label}>
      <Link
        href={href}
        scroll={false}
        aria-current={isActive ? 'true' : undefined}
        className={`${pillClass} ${
          isActive ? 'bg-[#10110f] text-white' : 'bg-[#eeeeea] text-[#10110f] hover:bg-[#e4e4df]'
        }`}
      >
        {label}
        <span className={`${pillCountClass} ${isActive ? 'text-white/60' : 'text-[#73746e]'}`}>
          {count}
        </span>
      </Link>
    </li>
  )
  return (
    <ul aria-label="Use case categories" className="flex flex-wrap gap-2">
      {pill('All areas', total, '/open-science/use-cases', !active)}
      {categories.map((category) =>
        pill(
          category.label,
          category.count,
          `/open-science/use-cases?category=${encodeURIComponent(category.key)}`,
          active === category.key
        )
      )}
    </ul>
  )
}
