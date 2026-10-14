// Preview-kind classification for exported session files. Dependency-free on
// purpose: artifact-preview.ts (fetch/thumbnail helpers) imports this, and
// file-preview.tsx re-exports it, so no module cycle forms.

// In-site preview for exported session files. Kinds the browser can render
// open in a modal; anything else downloads directly (see ArtifactCard).
export type PreviewKind = 'image' | 'markdown' | 'json' | 'csv' | 'text' | 'pdf'

export interface PreviewFile {
  name: string
  url: string
  mimeType?: string
}

const IMAGE_EXTENSIONS = ['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp']
const TEXT_EXTENSIONS = [
  'txt',
  'log',
  'py',
  'js',
  'ts',
  'tsx',
  'sh',
  'r',
  'yaml',
  'yml',
  'toml',
  'xml'
]

export const extensionOf = (name: string): string => {
  const segment = name.split(/[?#]/u)[0]
  return segment.includes('.') ? (segment.split('.').pop()?.toLowerCase() ?? '') : ''
}

export const previewKindFor = (name: string, mimeType?: string): PreviewKind | null => {
  const ext = extensionOf(name)
  if (mimeType?.startsWith('image/') || IMAGE_EXTENSIONS.includes(ext)) return 'image'
  if (mimeType === 'application/pdf' || ext === 'pdf') return 'pdf'
  if (ext === 'md' || ext === 'markdown') return 'markdown'
  if (ext === 'csv' || mimeType === 'text/csv') return 'csv'
  if (ext === 'json' || mimeType?.includes('json')) return 'json'
  if (mimeType?.startsWith('text/') || TEXT_EXTENSIONS.includes(ext)) return 'text'
  return null
}

// SVG blobs keep image/svg+xml so <img> renders them, but navigating to one as
// a top-level document would run its scripts same-origin — downloads and inline
// images are the only offered exits, never "open in a new tab".
export const canOpenInNewTab = (file: PreviewFile): boolean =>
  file.mimeType !== 'image/svg+xml' && extensionOf(file.name) !== 'svg'
