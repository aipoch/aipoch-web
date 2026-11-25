export const USE_CASE_BATCH_SIZE = 6

/** Normalize pagination identically for rendered batches and canonical URLs. */
export function getUseCaseGalleryPage(value: string | string[] | undefined, total: number) {
  const pageCount = Math.max(1, Math.ceil(total / USE_CASE_BATCH_SIZE))
  const requested = typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : 1
  return Number.isSafeInteger(requested) ? Math.min(Math.max(1, requested), pageCount) : 1
}
