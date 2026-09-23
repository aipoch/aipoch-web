'use client'

import { ChevronRight, FileText, Folder } from 'lucide-react'
import * as React from 'react'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'

type FileTreeItem =
  | { name: string; type: 'file' }
  | { name: string; type: 'folder'; items: FileTreeItem[] }

interface FileTreeProps {
  items: FileTreeItem[]
  title: string
}

function FileTreeNode({ item, depth = 0 }: { item: FileTreeItem; depth?: number }) {
  const [isOpen, setIsOpen] = React.useState(true)

  if (item.type === 'file') {
    return (
      <div
        className="flex items-center gap-2 py-1.5 px-2 text-sm text-white/90 hover:bg-white/5 rounded-sm transition-colors"
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
      >
        <FileText className="h-4 w-4 text-white/60 flex-shrink-0" />
        <span className="truncate">{item.name}</span>
      </div>
    )
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className={`flex w-full items-center text-left focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#ffbd2e] gap-2 py-1.5 px-2 text-sm hover:bg-white/5 rounded-sm transition-colors cursor-pointer select-none ${
            depth === 0 ? 'text-[#ffbd2e] font-bold' : 'text-white/90'
          }`}
          style={{ paddingLeft: `${depth * 12 + 8}px` }}
        >
          <ChevronRight
            className={`h-4 w-4 text-white/60 flex-shrink-0 transition-transform duration-200 ${
              isOpen ? 'rotate-90' : ''
            }`}
          />
          <Folder className="h-4 w-4 text-[#ffbd2e] flex-shrink-0" />
          <span className="truncate">{item.name}</span>
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        {item.items.map((child, index) => (
          <FileTreeNode key={index} item={child} depth={depth + 1} />
        ))}
      </CollapsibleContent>
    </Collapsible>
  )
}

export function FileTree({ items, title }: FileTreeProps) {
  return (
    <div className="rounded-[10px] overflow-hidden bg-[#1e1e1e] border border-white/10">
      {/* Title bar with window controls */}
      <div className="flex items-center justify-between px-4 py-3 bg-[#111] border-b border-white/5">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-[#ff5f56]" />
          <div className="w-3 h-3 rounded-full bg-[#ffbd2e]" />
          <div className="w-3 h-3 rounded-full bg-[#27c93f]" />
        </div>
        <span className="text-xs font-mono text-white/40 uppercase">{title}</span>
      </div>

      {/* File tree content */}
      <div className="py-4 px-2 max-h-125 overflow-y-auto scrollbar-dark">
        {items.map((item, index) => (
          <FileTreeNode key={index} item={item} />
        ))}
      </div>
    </div>
  )
}

export type { FileTreeItem }
