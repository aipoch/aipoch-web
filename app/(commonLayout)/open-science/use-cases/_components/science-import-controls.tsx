'use client'

import { ArrowUpRight } from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'
import {
  createContext,
  type ReactNode,
  type RefObject,
  useContext,
  useEffect,
  useRef,
  useState
} from 'react'
import {
  createScienceImport,
  type ImportState,
  INITIAL_IMPORT_STATE
} from '@/lib/science-package/browser-import'
import type { UseCasePackage } from '@/lib/use-case-types'

type ImportSession = ReturnType<typeof createScienceImport>
const INSTALL_HINT =
  'Open-Science may not be installed or may need an update. Install Open-Science 1.0.1 or later. This check is an estimate; we are still waiting for a connection.'

const ImportContext = createContext<{
  state: ImportState
  session: RefObject<ImportSession | null>
  packageInfo: UseCasePackage
  hasInteracted: boolean
  revealFeedback: () => void
} | null>(null)

/** Own one transfer for every import entry point on the page. Dispose it on navigation. */
export const ScienceImportProvider = ({
  packageInfo,
  children
}: {
  packageInfo?: UseCasePackage
  children: ReactNode
}) => {
  const [state, setState] = useState<ImportState>(INITIAL_IMPORT_STATE)
  const [hasInteracted, setHasInteracted] = useState(false)
  const session = useRef<ReturnType<typeof createScienceImport> | null>(null)
  const filename = packageInfo?.filename
  const importUrl = packageInfo?.importUrl ?? packageInfo?.url
  useEffect(() => {
    setState(INITIAL_IMPORT_STATE)
    setHasInteracted(false)
    if (!importUrl || !filename) return
    const current = createScienceImport({ url: importUrl, filename }, setState)
    session.current = current
    return () => {
      current.dispose()
      session.current = null
    }
  }, [importUrl, filename])
  return (
    <ImportContext.Provider
      value={
        packageInfo
          ? {
              state,
              session,
              packageInfo,
              hasInteracted,
              revealFeedback: () => setHasInteracted(true)
            }
          : null
      }
    >
      {/* Announce the shared transfer once; each visible feedback area stays readable. */}
      {packageInfo ? (
        <p role="status" aria-live="polite" aria-atomic="true" className="sr-only">
          {[
            state.message,
            state.phase === 'opening' && state.needsApp ? INSTALL_HINT : '',
            state.launchError
          ]
            .filter(Boolean)
            .join(' ')}
        </p>
      ) : null}
      {children}
    </ImportContext.Provider>
  )
}

const useScienceImport = () => {
  const value = useContext(ImportContext)
  if (!value) throw new Error('Import controls require a science package provider')
  return value
}

/** Share action dispatch and progress across the composer and overview buttons. */
export const ScienceImportButton = ({
  variant = 'composer'
}: {
  variant?: 'composer' | 'detail' | 'toolbar'
}) => {
  const { state, session, packageInfo, revealFeedback } = useScienceImport()
  const busy = ['opening', 'downloading', 'sending', 'canceling'].includes(state.phase)
  const downloading = state.phase === 'downloading'
  const sending = state.phase === 'sending'
  const progressing = downloading || (sending && state.loaded !== undefined)
  const total = state.total ?? (downloading ? packageInfo.sizeBytes : undefined)
  const percent =
    total && total > 0 && state.loaded !== undefined
      ? Math.min(100, Math.floor((state.loaded / total) * 100))
      : undefined
  const progressText = percent !== undefined ? `${percent}%` : '—%'
  const progressLabel = downloading ? 'Downloading .science package' : 'Sending to Open-Science'
  // Keep each entry point's default wording when cancellation or failure allows a fresh start.
  const defaultLabel = variant === 'detail' ? 'Open in Open-Science' : 'Continue in Open-Science'
  const label =
    state.phase === 'opening'
      ? 'Waiting for Open-Science…'
      : sending
        ? 'Sending to Open-Science…'
        : state.phase === 'canceling'
          ? 'Canceling…'
          : state.phase === 'received'
            ? 'Open Open-Science'
            : state.action === 'resume'
              ? 'I’ve opened Open-Science'
              : state.action === 'open'
                ? 'Open Open-Science'
                : state.needsApp
                  ? 'Try again'
                  : defaultLabel

  return (
    <button
      type="button"
      aria-label={progressing ? `${progressLabel}: ${progressText}` : undefined}
      disabled={busy || !state.action}
      onClick={() => {
        revealFeedback()
        if (state.action === 'prepare') void session.current?.prepareAndOpen()
        else if (state.action === 'resume') void session.current?.resume()
        else if (state.action === 'open') void session.current?.open()
        else if (state.action === 'launch') session.current?.openApp()
      }}
      className={
        variant === 'toolbar'
          ? 'inline-flex h-9 w-60 shrink-0 cursor-pointer items-center justify-center gap-2 bg-[#10110f] px-4 text-[13px] font-semibold text-white transition-colors hover:bg-[#4a4b46] active:bg-black focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#10110f] disabled:cursor-default max-sm:ml-auto max-sm:w-auto max-sm:max-w-full max-sm:gap-1 max-sm:px-2 max-sm:text-xs max-sm:leading-4'
          : variant === 'detail'
            ? 'inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 bg-[#10110f] px-5 py-1 text-[13px] font-semibold text-white transition-colors hover:bg-[#4a4b46] active:bg-black focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#10110f] disabled:cursor-default'
            : 'inline-flex min-h-10 w-full cursor-pointer items-center justify-center gap-3 rounded-xl bg-[#10110f] px-5 py-1 text-sm font-semibold text-white transition-colors hover:bg-[#34352f] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#10110f] disabled:cursor-default sm:w-auto sm:min-w-56'
      }
    >
      {progressing ? (
        <span
          className={
            variant === 'toolbar'
              ? 'flex w-full flex-col items-center'
              : 'flex w-full flex-col items-center gap-1'
          }
        >
          <span
            className={
              variant === 'toolbar'
                ? 'text-[13px] leading-4 tabular-nums'
                : 'text-sm leading-4 tabular-nums'
            }
          >
            {progressText}
          </span>
          <small
            className={
              variant === 'toolbar'
                ? 'text-[10px] font-normal leading-3 text-white/80'
                : 'text-[11px] font-normal leading-4 text-white/80'
            }
          >
            {progressLabel}
          </small>
        </span>
      ) : (
        <>
          {label}
          <ArrowUpRight
            className={variant === 'toolbar' ? 'size-4 shrink-0' : 'size-5 shrink-0'}
            aria-hidden="true"
          />
        </>
      )}
    </button>
  )
}

/** Share a smooth height and opacity reveal across desktop and mobile without idle spacing. */
export const ScienceImportToolbarFeedback = () => {
  const { hasInteracted, state } = useScienceImport()
  return (
    <section
      aria-label="Replay import feedback"
      aria-hidden={!hasInteracted}
      className={`mx-auto grid w-full max-w-4xl px-4 transition-[grid-template-rows,opacity] duration-300 ease-out motion-reduce:transition-none max-sm:pl-36 max-[375px]:pl-24 md:pr-6 md:pl-44 ${hasInteracted ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}
    >
      <div className="min-h-0 overflow-hidden">
        {/* Reserve the left column for the centered overview link once guidance is expanded. */}
        <div
          className={`-mt-1 flex w-full flex-col items-end justify-center px-3 max-sm:px-0 sm:min-h-8 ${state.phase === 'unsupported' ? 'min-h-8 pb-1' : 'min-h-16'}`}
        >
          <ScienceImportFeedback compact />
        </div>
      </div>
    </section>
  )
}

/** Reveal detail guidance on first interaction while keeping the initial action layout unchanged. */
export const ScienceImportDetailFeedback = () => {
  const { hasInteracted } = useScienceImport()
  const reduceMotion = useReducedMotion()
  if (!hasInteracted) return null
  return (
    <motion.div
      className="order-1 -mt-3 w-full overflow-hidden sm:order-last"
      initial={reduceMotion ? false : { height: 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: 1 }}
      transition={{ duration: reduceMotion ? 0 : 0.3, ease: 'easeOut' }}
    >
      <ScienceImportFeedback />
    </motion.div>
  )
}

/** Keep every recovery action and browser permission hint beside each entry point. */
export const ScienceImportFeedback = ({ compact = false }: { compact?: boolean }) => {
  const {
    state,
    session,
    hasInteracted,
    packageInfo: { url, filename }
  } = useScienceImport()
  // A click on either entry point reveals guidance for the shared page session, including retries.
  if (!hasInteracted) return null
  const busy = ['opening', 'downloading', 'sending', 'canceling'].includes(state.phase)
  const needsApp = state.needsApp
  const downloadPrompt = 'download it first'
  const inlineDownload = needsApp && state.message?.endsWith(`${downloadPrompt}.`)
  const waitingTimedOut = state.phase === 'ready' && state.action === 'resume'
  const opening = state.phase === 'opening' || state.action === 'resume'
  // The sticky toolbar shows only the current guidance; completed transfers need no permissions.
  const showPermissionHint = state.phase !== 'unsupported' && (!compact || !state.message)
  const message =
    compact && state.phase === 'received'
      ? 'File sent. Confirm in Open-Science.'
      : compact && state.phase === 'opening'
        ? 'Waiting for Open-Science… Choose Open; allow local network access.'
        : compact && waitingTimedOut
          ? 'Not connected. Open the app, allow browser prompts, then continue.'
          : state.message
  const hasRecoveryActions =
    (needsApp && !inlineDownload) ||
    state.action === 'resume' ||
    (state.phase === 'error' && state.action === 'open')
  return (
    <div
      className={`flex flex-col gap-1 text-[13px] leading-5 text-[#777872] ${compact ? '' : 'mt-1.5'}`}
    >
      {showPermissionHint ? (
        <p>
          {compact
            ? 'Allow app and local network access if prompted. Keep this page open.'
            : opening
              ? 'If your browser asks to open Open-Science, choose Open. You may also need to allow local network access.'
              : 'You may need to allow your browser to open Open-Science and access your local network. Keep this page open until the file is sent.'}
        </p>
      ) : null}
      <div className="space-y-1">
        <div className={`flex items-center gap-x-4 ${compact && state.message ? 'min-h-8' : ''}`}>
          <p
            role={state.phase === 'error' || state.phase === 'unsupported' ? 'alert' : 'status'}
            aria-live="off"
            className={
              state.phase === 'error'
                ? 'text-status-failure-foreground'
                : state.phase === 'unsupported'
                  ? compact
                    ? 'text-status-warning-foreground max-sm:whitespace-nowrap max-sm:text-[11px] max-sm:leading-4'
                    : 'text-status-warning-foreground'
                  : !state.message
                    ? 'sr-only'
                    : undefined
            }
          >
            {inlineDownload ? (
              <>
                {state.message?.slice(0, -`${downloadPrompt}.`.length)}
                <a
                  href="/open-science/download"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium underline underline-offset-4"
                >
                  {downloadPrompt}
                </a>
                .
              </>
            ) : (
              message
            )}{' '}
            {state.phase === 'received' ? (
              <span>
                {compact ? '' : 'Clicked Cancel by mistake? '}
                <button
                  type="button"
                  onClick={() => void session.current?.retryImport()}
                  className="font-medium text-[#10110f] underline underline-offset-4"
                >
                  {compact ? 'Retry import' : 'Retry the import.'}
                </button>
              </span>
            ) : null}
          </p>
          {busy ? (
            <button
              type="button"
              disabled={state.phase === 'canceling'}
              onClick={() => session.current?.cancel()}
              className={`${compact ? 'min-h-8' : ''} shrink-0 whitespace-nowrap font-medium text-[#10110f] underline underline-offset-4 disabled:opacity-50`}
            >
              Cancel
            </button>
          ) : null}
        </div>
        {state.phase === 'opening' && needsApp ? <p>{INSTALL_HINT}</p> : null}
        {state.launchError ? (
          <p role="alert" aria-live="off" className="text-status-failure-foreground">
            {state.launchError}
          </p>
        ) : null}
        {waitingTimedOut && !compact ? (
          <p>
            If Open-Science does not open,{' '}
            <a
              href={url}
              download={filename}
              className="font-medium text-[#10110f] underline underline-offset-4"
            >
              download the .science package
            </a>{' '}
            and double-click it to open it with your installed Open-Science app. You can also choose
            “Open with” and select Open-Science. If you haven’t installed it yet,{' '}
            <a
              href="/open-science/download"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-[#10110f] underline underline-offset-4"
            >
              Download Open-Science
            </a>{' '}
            and install it first.
          </p>
        ) : null}
        {hasRecoveryActions && (
          <div
            className={`flex flex-wrap items-center gap-x-5 gap-y-1 ${compact ? 'justify-end' : ''}`}
          >
            {needsApp && !inlineDownload ? (
              <a
                href="/open-science/download"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-8 items-center font-medium text-[#10110f] underline underline-offset-4"
              >
                Install or update Open-Science
              </a>
            ) : null}
            {state.phase === 'opening' && needsApp ? (
              <button
                type="button"
                onClick={() => session.current?.reopen()}
                className="min-h-8 font-medium text-[#10110f] underline underline-offset-4"
              >
                Open again
              </button>
            ) : null}
            {state.action === 'resume' ? (
              <button
                type="button"
                onClick={() => void session.current?.open()}
                className="min-h-8 font-medium text-[#10110f] underline underline-offset-4"
              >
                Open Open-Science
              </button>
            ) : null}
            {(state.phase === 'error' && state.action === 'open') || state.action === 'resume' ? (
              <button
                type="button"
                onClick={() => session.current?.restart()}
                className="min-h-8 font-medium text-[#10110f] underline underline-offset-4"
              >
                Start a new transfer
              </button>
            ) : null}
            {/* Keep the manual download paths accessible without the toolbar's full tutorial. */}
            {compact && waitingTimedOut ? (
              <>
                <a
                  href={url}
                  download={filename}
                  className="inline-flex min-h-8 items-center font-medium text-[#10110f] underline underline-offset-4"
                >
                  Download .science
                </a>
                <a
                  href="/open-science/download"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-8 items-center font-medium text-[#10110f] underline underline-offset-4"
                >
                  Get Open-Science
                </a>
              </>
            ) : null}
          </div>
        )}
      </div>
    </div>
  )
}
