export const OPEN_SCIENCE_DOWNLOAD_MANIFEST_URL =
  'https://statics.aipoch.com/open-science/app/stable/version.json'
export const OPEN_SCIENCE_RELEASES_URL = 'https://github.com/aipoch/open-science/releases/latest'
export const OPEN_SCIENCE_ALL_RELEASES_URL = 'https://github.com/aipoch/open-science/releases'
export const OPEN_SCIENCE_DOWNLOAD_PAGE_URL = 'https://aipoch.com/open-science/download'

export type DownloadKey =
  | 'mac-x64'
  | 'mac-arm64'
  | 'win-x64'
  | 'linux-x64-appimage'
  | 'linux-x64-deb'

export type DownloadAsset = {
  url: string
  size?: number
  sha256?: string
}

export type DownloadManifest = {
  version: string
  releaseDate?: string
  notes?: string
  downloads: Partial<Record<DownloadKey, DownloadAsset>>
}

export const OPEN_SCIENCE_DOWNLOAD_KEYS = [
  'mac-x64',
  'mac-arm64',
  'win-x64',
  'linux-x64-appimage',
  'linux-x64-deb'
] as const satisfies readonly DownloadKey[]

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value)

const isHttpUrl = (value: unknown): value is string => {
  if (typeof value !== 'string' || !value.trim()) return false

  try {
    const url = new URL(value)
    return url.protocol === 'https:' || url.protocol === 'http:'
  } catch {
    return false
  }
}

export function isValidDownloadManifest(manifest: unknown): manifest is DownloadManifest {
  if (!isPlainObject(manifest)) return false
  if (typeof manifest.version !== 'string' || !manifest.version.trim()) return false
  if (manifest.releaseDate !== undefined && typeof manifest.releaseDate !== 'string') {
    return false
  }
  if (manifest.notes !== undefined && typeof manifest.notes !== 'string') return false
  if (!isPlainObject(manifest.downloads)) return false

  let hasKnownDownload = false
  for (const key of OPEN_SCIENCE_DOWNLOAD_KEYS) {
    const asset = manifest.downloads[key]
    if (asset === undefined) continue
    if (!isPlainObject(asset) || !isHttpUrl(asset.url)) return false
    if (asset.size !== undefined && (typeof asset.size !== 'number' || asset.size < 0)) {
      return false
    }
    if (asset.sha256 !== undefined && typeof asset.sha256 !== 'string') return false
    hasKnownDownload = true
  }

  return hasKnownDownload
}

export function formatDownloadSize(bytes: unknown): string {
  const value = Number(bytes)
  if (!Number.isFinite(value) || value < 0) return 'Unknown size'

  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let unit = 0
  let size = value
  while (size >= 1024 && unit < units.length - 1) {
    size /= 1024
    unit += 1
  }

  return `${new Intl.NumberFormat(undefined, {
    maximumFractionDigits: unit ? 1 : 0
  }).format(size)} ${units[unit]}`
}

export function getDownloadExtension(url: string): string {
  try {
    const { pathname } = new URL(url)
    const filename = decodeURIComponent(pathname.slice(pathname.lastIndexOf('/') + 1))
    const dot = filename.lastIndexOf('.')
    return dot > -1 ? filename.slice(dot) : ''
  } catch {
    return ''
  }
}

export function formatDownloadAssetDetail(asset: Pick<DownloadAsset, 'url' | 'size'>): string {
  const extension = getDownloadExtension(asset.url)
  const size = formatDownloadSize(asset.size)
  return extension ? `${extension} · ${size}` : size
}

export function formatDownloadVersionLabel(manifest: Pick<DownloadManifest, 'version'>): string {
  return /^v/i.test(manifest.version) ? manifest.version : `v${manifest.version}`
}

export function detectRecommendedDownloadKey(userAgent: string): DownloadKey | null {
  if (/windows/i.test(userAgent)) return 'win-x64'
  if (/linux/i.test(userAgent) && !/android/i.test(userAgent)) return 'linux-x64-deb'
  return null
}

export function getOpenScienceRecommendedDownloadKeys(
  userAgent: string,
  manifest: DownloadManifest | null,
  maxTouchPoints = 0
): DownloadKey[] {
  const isMac = /macintosh|mac os x/i.test(userAgent)
  // Desktop-mode iPads can use a Mac user agent while retaining touch input.
  if (
    !manifest ||
    /android|iphone|ipad|ipod|mobile|windows phone/i.test(userAgent) ||
    (isMac && maxTouchPoints > 1)
  ) {
    return []
  }

  const detectedKey = detectRecommendedDownloadKey(userAgent)
  let candidates: DownloadKey[] = []
  if (detectedKey === 'linux-x64-deb') {
    candidates = [manifest.downloads['linux-x64-appimage'] ? 'linux-x64-appimage' : 'linux-x64-deb']
  } else if (detectedKey) {
    candidates = [detectedKey]
  } else if (isMac) {
    // "Intel Mac OS X" is also reported on Apple Silicon; leave the architecture choice explicit.
    candidates = ['mac-arm64', 'mac-x64']
  }
  return candidates.filter((key) => Boolean(manifest.downloads[key]))
}

/** Homepage spotlight download (GitHub Releases only): UA-based highlight + primary CTA label. */
export function getHomepageRecommendedDownloadKey(userAgent: string): DownloadKey {
  const detected = detectRecommendedDownloadKey(userAgent)
  if (detected) return detected
  if (/macintosh|mac os x/i.test(userAgent)) {
    // Browser macOS user agents often report "Intel Mac OS X" on Apple Silicon.
    return /x86_64/i.test(userAgent) ? 'mac-x64' : 'mac-arm64'
  }
  return 'mac-arm64'
}

const homepageDownloadPrimaryLabels: Record<DownloadKey, string> = {
  'mac-arm64': 'Download for macOS',
  'mac-x64': 'Download for macOS',
  'win-x64': 'Download for Windows',
  'linux-x64-appimage': 'Download for Linux',
  'linux-x64-deb': 'Download for Linux'
}

export function getHomepageDownloadPrimaryLabel(key: DownloadKey): string {
  return homepageDownloadPrimaryLabels[key]
}

/** Primary/platform href: prefer the manifest asset, else GitHub Releases. */
export function resolveHomepageDownloadHref(
  manifest: DownloadManifest | null | undefined,
  key: DownloadKey
): string {
  return manifest?.downloads[key]?.url ?? OPEN_SCIENCE_RELEASES_URL
}

export type HomepageManifestPlatformLink = {
  id: DownloadKey
  url: string
  detail: string
}

const homepagePlatformOrders = {
  mac: ['mac-arm64', 'mac-x64', 'win-x64', 'linux-x64-deb', 'linux-x64-appimage'],
  windows: ['win-x64', 'mac-arm64', 'mac-x64', 'linux-x64-deb', 'linux-x64-appimage'],
  linux: ['linux-x64-deb', 'linux-x64-appimage', 'mac-arm64', 'mac-x64', 'win-x64']
} as const satisfies Record<string, readonly DownloadKey[]>

const getHomepagePlatformOrder = (recommendedId: DownloadKey): readonly DownloadKey[] => {
  if (recommendedId === 'win-x64') return homepagePlatformOrders.windows
  if (recommendedId.startsWith('linux-')) return homepagePlatformOrders.linux
  return homepagePlatformOrders.mac
}

/** Platforms present in the remote manifest, ordered for the visitor's operating system. */
export function getHomepageManifestPlatformLinks(
  manifest: DownloadManifest | null | undefined,
  recommendedId: DownloadKey
): HomepageManifestPlatformLink[] {
  if (!manifest) return []

  const links: HomepageManifestPlatformLink[] = []
  for (const id of getHomepagePlatformOrder(recommendedId)) {
    const asset = manifest.downloads[id]
    if (!asset?.url) continue
    links.push({
      id,
      url: asset.url,
      detail: formatDownloadAssetDetail(asset)
    })
  }
  return links
}
