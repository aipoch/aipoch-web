import type { Parent, Root } from 'mdast'
import { youtubeVideoId } from './youtube-video'

/** Remove only images linking to videos already rendered above the article. */
export function remarkYoutubeThumbnails({ videoIds }: { videoIds: string[] }) {
  const embeddedIds = new Set(videoIds)

  return (tree: Root) => {
    if (embeddedIds.size === 0) return
    const definitions = new Map<string, string>()
    const normalizeIdentifier = (value: string) => value.replace(/\s+/g, ' ').toUpperCase()
    const collectDefinitions = (parent: Parent) => {
      for (const node of parent.children) {
        if (node.type === 'definition') {
          const identifier = normalizeIdentifier(node.identifier)
          if (!definitions.has(identifier)) definitions.set(identifier, node.url)
        }
        if ('children' in node) collectDefinitions(node)
      }
    }
    collectDefinitions(tree)

    const removeThumbnails = (parent: Parent, withinVideoLink = false): boolean => {
      let removed = false
      parent.children = parent.children.filter((node) => {
        if (withinVideoLink && (node.type === 'image' || node.type === 'imageReference')) {
          removed = true
          return false
        }
        if (!('children' in node)) return true

        const url =
          node.type === 'link'
            ? node.url
            : node.type === 'linkReference'
              ? definitions.get(normalizeIdentifier(node.identifier))
              : undefined
        const id = url ? youtubeVideoId(url) : null
        const childRemoved = removeThumbnails(
          node,
          withinVideoLink || Boolean(id && embeddedIds.has(id))
        )
        removed ||= childRemoved
        // Avoid blank paragraphs and empty links where a thumbnail used to be.
        return (
          !childRemoved ||
          !['paragraph', 'link', 'linkReference', 'emphasis', 'strong', 'delete'].includes(
            node.type
          ) ||
          node.children.some((child) => child.type !== 'text' || child.value.trim() !== '')
        )
      })
      return removed
    }
    removeThumbnails(tree)
  }
}
