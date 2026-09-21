/** Shared publication-date label for homepage articles and Blog list/detail views. */
export function formatPublishedDate(value: string | null | undefined): string {
  const trimmed = typeof value === 'string' ? value.trim() : ''
  if (!trimmed) return ''
  const date = new Date(trimmed)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
}
