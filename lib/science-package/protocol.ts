import type { UseCasePackage, UseCaseSession } from '../use-case-types'
import type { PackageProgress } from './archive'

export type WorkerRequest =
  | { type: 'load'; slug: string; info: UseCasePackage }
  | { type: 'urls'; urls: Record<string, string> }
export type WorkerReply =
  | { type: 'progress'; progress: PackageProgress }
  | { type: 'resources'; resources: { id: string; blob: Blob }[] }
  | { type: 'ready'; data: UseCaseSession }
  | { type: 'error'; message: string }
