import type { Plugin } from 'unified'

type Node = { type: string; value?: string; children?: Node[]; data?: Record<string, unknown> }
const phrasingContainers = new Set([
  'paragraph',
  'heading',
  'emphasis',
  'strong',
  'delete',
  'link',
  'linkReference'
])

// remark-mathjax-delimiters 0.1 emits display math inside phrasing containers.
// Lift only parsed math nodes to flow level; never inspect or rewrite source text/code.
export const remarkMathjaxBlocks: Plugin = () => (tree) => {
  const lift = (node: Node): Node[] => {
    if (!node.children) return [node]
    const children = node.children.flatMap(lift)
    // Keep inline wrappers (especially links) intact. KaTeX accepts a phrasing
    // code node with display mode, avoiding invalid pre elements inside them.
    if (phrasingContainers.has(node.type) && node.type !== 'paragraph' && node.type !== 'heading') {
      for (const child of children) {
        if (child.type !== 'math') continue
        child.type = 'inlineMath'
        child.data = {
          hName: 'code',
          hProperties: { className: ['language-math', 'math-display'] },
          hChildren: [{ type: 'text', value: child.value }]
        }
      }
    }
    if (!phrasingContainers.has(node.type) || !children.some((child) => child.type === 'math')) {
      node.children = children
      return [node]
    }
    const result: Node[] = []
    let inline: Node[] = []
    const flush = () => {
      if (inline.some((child) => child.type !== 'text' || child.value?.trim()))
        result.push({ ...node, children: inline })
      inline = []
    }
    for (const child of children) {
      if (child.type === 'math') {
        flush()
        result.push(child)
      } else inline.push(child)
    }
    flush()
    return result
  }
  lift(tree as Node)
}
