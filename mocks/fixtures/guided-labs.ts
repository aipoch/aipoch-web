import type { UseCaseManifestItem } from '../../lib/use-case-types'
import { digest } from './science-package'
import samples from './use-case-manifest.json'

export const labDocument = `<!doctype html><html lang="en"><title>Sample laboratory</title>
<button id="project">Open project</button><script>
document.getElementById('project').onclick = () => parent.postMessage({type:'open-science:project'}, '*');
addEventListener('message', event => {
  if (event.source === parent && event.data?.type === 'open-science:lab-ping')
    parent.postMessage({type:'open-science:lab-ready'}, '*');
});
</script></html>`

export const labScreenshot =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 810"><rect width="1440" height="810" fill="#424240"/></svg>'

export const labDescriptor = {
  entry: {
    file_name: 'lab-entry.html',
    bytes: new TextEncoder().encode(labDocument).length,
    sha256: digest(new TextEncoder().encode(labDocument))
  },
  screenshot: {
    file_name: 'lab-opening.svg',
    bytes: new TextEncoder().encode(labScreenshot).length,
    sha256: digest(new TextEncoder().encode(labScreenshot))
  },
  assets: []
}

export const guidedLabFixtures: UseCaseManifestItem[] = samples.slice(0, 5).map((item) => ({
  ...item,
  catalog: '3D Lab',
  catalog_name: '3-d-lab'
}))
