import 'server-only'
import { after } from 'next/server'
import { cache } from 'react'
import { API_URL, STATIC_ASSETS_ORIGIN } from '@/lib/config'
import { createUseCaseManifestCache, parseGuidedLab } from '@/lib/use-case-manifest'
import type { GuidedLab, UseCaseDetail, UseCaseIndexEntry } from '@/lib/use-case-types'

// Manifest-relative resources share the configured public static asset origin.
const USE_CASE_MANIFEST_URL = `${STATIC_ASSETS_ORIGIN.replace(/\/+$/, '')}/open-science/usecases/manifest.json`

const manifestSource = (): string => {
  if (process.env.NODE_ENV !== 'production' && process.env.NEXT_PUBLIC_API_MOCKING === 'enabled') {
    return `${new URL(API_URL).origin}/use-case-manifest/manifest.json`
  }
  return USE_CASE_MANIFEST_URL
}

// Next can load this module in separate route bundles within the same runtime.
const runtime = globalThis as typeof globalThis & {
  __aipochUseCaseManifest?: {
    url: string
    reader: ReturnType<typeof createUseCaseManifestCache>
  }
}

// React cache pins a single snapshot across metadata, details, and related cards
// within one render. The underlying manifest cache survives subsequent requests.
const readManifest = cache(async () => {
  const source = manifestSource()
  if (runtime.__aipochUseCaseManifest?.url !== source) {
    runtime.__aipochUseCaseManifest = {
      url: source,
      reader: createUseCaseManifestCache(source)
    }
  }
  return runtime.__aipochUseCaseManifest.reader.read((task) => after(task))
})

export const fetchUseCaseList = async (): Promise<UseCaseIndexEntry[] | null> => {
  try {
    return await readManifest()
  } catch {
    // A configured source failure is not an empty catalog or a live API fallback.
    return null
  }
}

export const fetchGuidedLab = cache(async (descriptorUrl: string): Promise<GuidedLab> => {
  // The publisher always serves index.html. The descriptor adds an optional opening screenshot.
  const entryUrl = new URL('index.html', descriptorUrl).href
  const options = { cache: 'no-store' as const, signal: AbortSignal.timeout(15000) }
  const [descriptor, entry] = await Promise.allSettled([
    fetch(descriptorUrl, options).then(async (res) =>
      res.ok ? parseGuidedLab(await res.json(), descriptorUrl) : undefined
    ),
    fetch(entryUrl, { ...options, method: 'HEAD' })
  ])
  const entryHeaders = entry.status === 'fulfilled' ? entry.value.headers : undefined
  // Lab HTML is hosted on a separate origin. An explicit CSP frame-ancestors overrides XFO.
  const standalone =
    !/(?:^|;)\s*frame-ancestors\s/i.test(entryHeaders?.get('content-security-policy') ?? '') &&
    /^(?:SAMEORIGIN|DENY)$/i.test(entryHeaders?.get('x-frame-options')?.trim() ?? '')
  return {
    entryUrl,
    screenshotUrl: descriptor.status === 'fulfilled' ? descriptor.value?.screenshotUrl : undefined,
    standalone
  }
})

export const fetchUseCaseDetail = async (slug: string): Promise<UseCaseDetail | null> => {
  try {
    const entries = await readManifest()
    const entry = entries?.find((item) => item.slug === slug)
    if (!entry) return null
    return {
      slug: entry.slug,
      title: entry.title,
      coverImage: entry.preview?.image,
      video: entry.video,
      ...(entry.labManifestUrl && {
        labManifestUrl: entry.labManifestUrl,
        lab: await fetchGuidedLab(entry.labManifestUrl)
      }),
      package: entry.package,
      introductionUrl: entry.introductionUrl
    }
  } catch {
    // Same contract as fetchUseCaseList: a manifest outage degrades the detail
    // page to notFound instead of a 500.
    return null
  }
}

export const fetchUseCaseSitemapEntries = async (): Promise<UseCaseIndexEntry[]> =>
  (await fetchUseCaseList()) ?? []
