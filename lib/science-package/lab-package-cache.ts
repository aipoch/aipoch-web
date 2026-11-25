import type { UseCasePackage } from '../use-case-types'

const CACHE = 'open-science-lab-packages-v1'

// Keep the publisher URL untouched for downloads. Invalidate saved bytes on catalog changes.
function storageKey(source: UseCasePackage) {
  const key = new URL(source.importUrl ?? source.url)
  key.searchParams.set('lab-package-sha256', source.sha256)
  return key.href
}

export async function readLabPackage(source: UseCasePackage) {
  const cache = await caches.open(CACHE)
  const response = await cache.match(storageKey(source))
  if (!response) return
  const file = await response.blob()
  if (file.size === source.sizeBytes) return file
  await cache.delete(storageKey(source))
}

export async function storeLabPackage(source: UseCasePackage, verifiedFile: Blob) {
  const cache = await caches.open(CACHE)
  await cache.put(storageKey(source), new Response(verifiedFile))
}
