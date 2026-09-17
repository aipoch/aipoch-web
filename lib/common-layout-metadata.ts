/** Persistent modification date for the shared website navigation. */
export const COMMON_LAYOUT_LAST_MODIFIED = '2026-09-17'

/** Keep newer content dates while recording changes to the shared page shell. */
export function commonLayoutLastModified(contentDate?: string | Date | null): string {
  const timestamp =
    contentDate instanceof Date ? contentDate.getTime() : Date.parse(contentDate ?? '')
  if (timestamp > Date.parse(COMMON_LAYOUT_LAST_MODIFIED)) return new Date(timestamp).toISOString()
  return COMMON_LAYOUT_LAST_MODIFIED
}
