import { createRoot } from 'react-dom/client'
import { ImportComposer } from '../../app/(commonLayout)/open-science/use-cases/_components/import-composer'

const root = createRoot(document.getElementById('root') as HTMLElement)
root.render(
  <ImportComposer
    packageInfo={{
      url: '/download.science',
      importUrl: '/package.science',
      filename: 'test.science',
      sizeBytes: new URLSearchParams(window.location.search).has('unknownSize') ? 0 : 64 * 1024,
      sha256: ''
    }}
  />
)
Object.assign(window, { unmountImport: () => root.unmount() })
