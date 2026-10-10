import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { UseCaseIndexEntry } from './use-case-types'

// Server-only disk fallback for surfaces that cannot call the mocked API
// (sitemap generation). Pages fetch through service/open-science-use-cases.ts.
const INDEX_PATH = join(process.cwd(), 'public', 'use-cases', 'index.json')

const listUseCasesFromDisk = (): UseCaseIndexEntry[] => {
  try {
    if (!existsSync(INDEX_PATH)) return []
    return JSON.parse(readFileSync(INDEX_PATH, 'utf8')) as UseCaseIndexEntry[]
  } catch {
    return []
  }
}

export { listUseCasesFromDisk }
