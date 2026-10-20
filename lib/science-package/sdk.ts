import type * as OfficialSdk from '@/vendor/open-science/browser-import'
import * as implementation from '@/vendor/open-science/browser-import.mjs'

// TODO(open-science-sdk): Once a published @aipoch/open-science version is verified
// to provide discovery, standalone launch, wait-for-launch, phase notifications,
// and authenticated cancellation, pin that exact version and switch this entry
// to @aipoch/open-science/browser-import. Then remove vendor and provenance checks.
// The source dependency needs the type pairing normally supplied by package exports.
export const checkBrowserImportAvailability =
  implementation.checkBrowserImportAvailability as typeof OfficialSdk.checkBrowserImportAvailability
export const prepareBrowserImport =
  implementation.prepareBrowserImport as typeof OfficialSdk.prepareBrowserImport
export const launchOpenScience =
  implementation.launchOpenScience as typeof OfficialSdk.launchOpenScience
export const BrowserImportError =
  implementation.BrowserImportError as typeof OfficialSdk.BrowserImportError
export type BrowserImportError = OfficialSdk.BrowserImportError
export type {
  BrowserImportDiscoveryOptions,
  BrowserImportFailureCode,
  BrowserImportPhase,
  BrowserImportProgress,
  BrowserImportReadinessMode,
  BrowserImportTransfer,
  BrowserImportUnavailable
} from '@/vendor/open-science/browser-import'
