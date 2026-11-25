import { createRoot } from 'react-dom/client'
import { GuidedLabProjectDialog } from '@/app/(commonLayout)/open-science/use-cases/_components/guided-lab-project'
import { parseUseCaseManifest } from '@/lib/use-case-manifest'
import type { UseCaseManifestEntry } from '@/lib/use-case-types'
import { waitForBrowserMock } from '@/mocks/ready'

/** Loaded by a published experience. Embedded experiences delegate to the website. */
function listenForStandaloneProject() {
  const entry = new URL(window.location.href)
  const slug = entry.pathname.match(/\/([^/]+)\/experience\/[a-f0-9]{40}\/(?:index\.html)?$/)?.[1]
  if (!slug) return

  let root: ReturnType<typeof createRoot> | undefined
  let project: UseCaseManifestEntry | undefined
  let loading = false
  let failed = false
  let opened = false

  function setOpen(next: boolean) {
    opened = next
    window.postMessage({ type: 'open-science:project-visibility', open: next }, entry.origin)
    render()
  }

  function render() {
    if (!root) {
      const host = document.createElement('div')
      document.body.append(host)
      const shadow = host.attachShadow({ mode: 'open' })
      // Keyboard interaction in the modal must not trigger scene shortcuts behind it.
      shadow.addEventListener('keydown', event => event.stopPropagation())
      shadow.addEventListener('keyup', event => event.stopPropagation())
      const style = document.createElement('link')
      style.rel = 'stylesheet'
      style.href = new URL('project-dialog.css', entry).href
      const mount = document.createElement('div')
      shadow.append(style, mount)
      root = createRoot(mount)
    }
    root.render(
      <GuidedLabProjectDialog
        project={project}
        opened={opened}
        error={failed}
        onRetry={loadProject}
        onClose={() => setOpen(false)}
      />
    )
  }

  async function loadProject() {
    if (loading || project) return
    loading = true
    failed = false
    render()
    try {
      await waitForBrowserMock()
      const response = await fetch(new URL('../../../manifest.json', entry), {
        credentials: 'omit',
        signal: AbortSignal.timeout(15000)
      })
      if (!response.ok) throw new Error('Catalog unavailable')
      project = parseUseCaseManifest(await response.json(), response.url).find(
        (item) => item.slug === slug
      )
      if (!project) throw new Error('Project missing from catalog')
    } catch {
      failed = true
    } finally {
      loading = false
      render()
    }
  }

  window.addEventListener('message', (event) => {
    if (
      event.source !== window ||
      event.origin !== entry.origin ||
      event.data?.type !== 'open-science:project'
    )
      return
    if (!opened) {
      setOpen(true)
      void loadProject()
    }
  })
}

if (window.parent === window) listenForStandaloneProject()
