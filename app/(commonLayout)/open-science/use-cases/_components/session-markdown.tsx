'use client'

// Client components still render on the server in Next.js, so the message
// markdown is present in the SSR HTML (no layout shift on hydration). Only
// the mermaid plugin is browser-dependent — it loads after hydration inside
// session-markdown-streamdown.
import SessionMarkdownStreamdown from './session-markdown-streamdown'

export const SessionMarkdown = ({ content }: { content: string }) => (
  <SessionMarkdownStreamdown content={content} />
)
