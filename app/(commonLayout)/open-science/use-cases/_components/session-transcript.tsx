import type { UseCaseSession } from '@/lib/use-case-types'
import { SessionActivityGroup } from './activity-group'
import { SessionElicitationCard } from './elicitation-card'
import { FilePreviewProvider } from './file-preview'
import { SessionMessageItem } from './message-item'

// The "Completed" footer is a turn-level marker in the app: it appears once at
// the end of each turn (the last assistant message before the next user
// message), not under every assistant message.
const turnFinalMessageIds = (items: UseCaseSession['items']): Set<string> => {
  const ids = new Set<string>()
  let lastAssistantId: string | undefined
  const flush = () => {
    if (lastAssistantId) ids.add(lastAssistantId)
    lastAssistantId = undefined
  }
  for (const item of items) {
    if (item.type !== 'message') continue
    if (item.role === 'user') flush()
    else lastAssistantId = item.id
  }
  flush()
  return ids
}

// Read-only replay of one exported Open-Science session. The centered column matches the app's
// transcript width (max-w-4xl = 56rem); each row carries the app's own horizontal padding.
export const SessionTranscript = ({ session }: { session: UseCaseSession }) => {
  const turnFinal = turnFinalMessageIds(session.items)
  return (
    <div className="osp-session min-h-screen text-text-000">
      <FilePreviewProvider>
        <div className="mx-auto w-full max-w-4xl pb-14 pt-4">
          {session.items.map((item) => {
            // content-visibility skips rendering for offscreen rows — the main
            // lever against long-transcript jank (the app does the same).
            const rowClassName = '[content-visibility:auto] [contain-intrinsic-size:auto_240px]'
            if (item.type === 'message') {
              return (
                <div key={item.id} className={rowClassName}>
                  <SessionMessageItem message={item} showTurnCompletion={turnFinal.has(item.id)} />
                </div>
              )
            }
            if (item.type === 'activity-group') {
              return (
                <div key={item.id} className={rowClassName}>
                  <SessionActivityGroup activities={item.activities} assets={session.assets} />
                </div>
              )
            }
            return (
              <div key={item.id} className={rowClassName}>
                <SessionElicitationCard item={item} />
              </div>
            )
          })}
        </div>
      </FilePreviewProvider>
    </div>
  )
}
