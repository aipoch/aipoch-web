import fs from 'node:fs/promises'
import path from 'node:path'
import matter from 'gray-matter'

const GUIDES_DIR = path.join(process.cwd(), 'data/guides')

export interface GuideFrontmatter {
  title: string
  description: string
  highlight: string
  readTime: number
  order?: number
  lastModified?: string
}

export interface Guide {
  slug: string
  frontmatter: GuideFrontmatter
  content: string
}

// Get all guides sorted by order.
export async function getAllGuides(): Promise<Guide[]> {
  const files = await fs.readdir(GUIDES_DIR)
  const mdxFiles = files.filter((f: string) => f.endsWith('.mdx'))

  const guides = await Promise.all(
    mdxFiles.map(async (file: string) => {
      const slug = file.replace('.mdx', '')
      const filePath = path.join(GUIDES_DIR, file)
      const raw = await fs.readFile(filePath, 'utf-8')
      const { data, content } = matter(raw)

      return {
        slug,
        frontmatter: data as GuideFrontmatter,
        content
      }
    })
  )

  return guides.sort(
    (a: Guide, b: Guide) => (a.frontmatter.order ?? Infinity) - (b.frontmatter.order ?? Infinity)
  )
}

// Get a single guide.
export async function getGuide(slug: string): Promise<Guide | null> {
  try {
    const filePath = path.join(GUIDES_DIR, `${slug}.mdx`)
    const raw = await fs.readFile(filePath, 'utf-8')
    const { data, content } = matter(raw)

    return {
      slug,
      frontmatter: data as GuideFrontmatter,
      content
    }
  } catch {
    return null
  }
}

// Get the previous and next guides.
export async function getAdjacentGuides(slug: string): Promise<{
  prev: Guide | null
  next: Guide | null
}> {
  const allGuides = await getAllGuides()
  const currentIndex = allGuides.findIndex((g) => g.slug === slug)

  if (currentIndex === -1) {
    return { prev: null, next: null }
  }

  return {
    prev: currentIndex > 0 ? allGuides[currentIndex - 1] : null,
    next: currentIndex < allGuides.length - 1 ? allGuides[currentIndex + 1] : null
  }
}
