'use client'

import { cjk } from '@streamdown/cjk'
import { code } from '@streamdown/code'
import { createMathPlugin } from '@streamdown/math'
import { useEffect, useMemo, useState } from 'react'
import { type Components, defaultRehypePlugins, Streamdown } from 'streamdown'
import type { PluggableList, Plugin } from 'unified'
import { FileDownloadLink } from './file-download-link'
import { previewKindFor, useFilePreview } from './file-preview'
import 'katex/dist/katex.min.css'

// Static-mode Streamdown tuned like the app's AgentMarkdown: same plugins, controls, and
// prose tightening, minus streaming machinery, the link-safety modal, and session links.
const math = createMathPlugin({ singleDollarTextMath: true })
const basePlugins = { code, math, cjk }

// Keep Streamdown's HTML sanitization while allowing verified package resources.
const [sanitize, schema] = defaultRehypePlugins.sanitize as [
  Plugin,
  { protocols: Record<string, string[]> }
]
const rehypePlugins: PluggableList = [
  defaultRehypePlugins.raw,
  [
    sanitize,
    {
      ...schema,
      protocols: {
        ...schema.protocols,
        href: [...schema.protocols.href, 'blob'],
        src: [...schema.protocols.src, 'blob']
      }
    }
  ],
  defaultRehypePlugins.harden
]

type MermaidPluginFactory = typeof import('@streamdown/mermaid')['createMermaidPlugin']

const controls = {
  table: {
    copy: true,
    download: true,
    fullscreen: true
  },
  code: {
    copy: true,
    download: true
  },
  mermaid: {
    copy: true,
    download: true,
    fullscreen: true,
    panZoom: false
  }
} as const

const linkComponent: Components['a'] = ({ node: _node, href, children, ...props }) => {
  const openPreview = useFilePreview()
  // Intercept internal asset links only when a preview provider is mounted
  // (the transcript); without one, fall through to a plain link so the click
  // still opens the file instead of dying on preventDefault + no-op.
  // Extracted objects have hash-only paths; the loader preserves the real filename in the fragment.
  const extracted = href && /^https?:\/\/[^/]+\/.*\/extracted\/objects\/[a-f0-9]{64}#/.test(href)
  let filename: string | undefined
  if (extracted) {
    try {
      filename = decodeURIComponent(href.slice(href.indexOf('#') + 1))
    } catch {
      /* Use the link label. */
    }
  }
  const name =
    filename ?? (typeof children === 'string' ? children : (href?.split('/').pop() ?? 'file'))
  if (
    (href?.startsWith('/use-cases/') || href?.startsWith('blob:') || extracted) &&
    openPreview &&
    previewKindFor(name)
  ) {
    return (
      <a
        {...props}
        href={href}
        onClick={(event) => {
          event.preventDefault()
          openPreview({ name, url: href })
        }}
      >
        {children}
      </a>
    )
  }
  if (extracted && href && !previewKindFor(name)) {
    return (
      <FileDownloadLink {...props} href={href} download={name}>
        {children}
      </FileDownloadLink>
    )
  }
  return (
    <a {...props} href={href} target="_blank" rel="noreferrer">
      {children}
    </a>
  )
}

const SessionMarkdownStreamdown = ({ content }: { content: string }) => {
  // Mermaid is browser-only; every other plugin renders in the SSR HTML.
  const [createMermaidPlugin, setCreateMermaidPlugin] = useState<MermaidPluginFactory | null>(null)
  useEffect(() => {
    let cancelled = false
    void import('@streamdown/mermaid').then((module) => {
      if (!cancelled) setCreateMermaidPlugin(() => module.createMermaidPlugin)
    })
    return () => {
      cancelled = true
    }
  }, [])
  const plugins = useMemo(
    () =>
      createMermaidPlugin
        ? { ...basePlugins, mermaid: createMermaidPlugin({ config: { theme: 'default' } }) }
        : basePlugins,
    [createMermaidPlugin]
  )

  return (
    <div className="agent-markdown-root max-w-full min-w-0">
      <Streamdown
        className="agent-markdown prose prose-sm prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-li:my-0.5 prose-headings:my-2"
        plugins={plugins}
        rehypePlugins={rehypePlugins}
        controls={controls}
        components={{ a: linkComponent }}
        dir="auto"
        mode="static"
        isAnimating={false}
        animated={false}
        parseIncompleteMarkdown={false}
        shikiTheme={['github-light', 'github-light']}
        // Sanitization above preserves only the permitted URL protocols.
        urlTransform={(url) => url}
      >
        {content}
      </Streamdown>
    </div>
  )
}

export default SessionMarkdownStreamdown
