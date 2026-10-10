import { buildSciencePackage, digest } from './science-package'
import { coverageFixtureSession } from './use-case-coverage'

// A minimal one-page PDF exercises MIME recovery from content-addressed object storage.
const pdf = new TextEncoder().encode(
  '%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 200 200]>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF'
)

// Convert the renderer corpus into the real export schema, exercising the worker too.
export function buildCoveragePackage(title = coverageFixtureSession.title) {
  const sample = coverageFixtureSession
  const objects: Record<string, { bytes: Uint8Array; storageKey: string }> = {}
  const artifacts: Record<string, unknown>[] = []
  const records: Record<string, unknown>[] = []
  const runs: Record<string, unknown>[] = []
  const png =
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6ZQAAAABJRU5ErkJggg=='
  const messages = sample.items.flatMap((item) => {
    if (item.type !== 'message') return []
    const artifactIds = item.artifacts?.map((artifact, index) => {
      const id = `${item.id}-${index}`
      const bytes = artifact.fullOnly
        ? new Uint8Array(3 * 1024 ** 2)
        : artifact.mimeType === 'application/pdf'
          ? pdf
          : artifact.mimeType === 'image/svg+xml'
            ? new TextEncoder().encode(
                '<svg xmlns="http://www.w3.org/2000/svg" width="90" height="40"><rect width="90" height="40" fill="blue"/><script>window.svgExecuted=true</script></svg>'
              )
            : artifact.mimeType === 'image/png'
              ? Buffer.from(png, 'base64')
              : new TextEncoder().encode(`Sample ${artifact.name}`)
      const storageKey =
        artifact.mimeType === 'image/svg+xml'
          ? 'artifacts/mock-project/mock-session/.provenance/vector/versions/v1/content'
          : `files/${artifact.name}`
      objects[`objects/${digest(new TextEncoder().encode(storageKey))}`] = { bytes, storageKey }
      artifacts.push({
        ...artifact,
        id,
        path: storageKey,
        sha256: digest(bytes),
        size: bytes.length
      })
      records.push({ contentStorageKey: storageKey, filename: artifact.name })
      return id
    })
    return [
      {
        ...item,
        content:
          item.content.replace(
            '/use-cases/coverage-fixture/objects/report.md',
            'coverage_report.md'
          ) + (item.artifacts?.length ? `\n\nLocal sample replay for ${title}.` : ''),
        artifactIds
      }
    ]
  })
  const activities = sample.items.flatMap<Record<string, unknown>>((item) => {
    if (item.type === 'message') return []
    if (item.type === 'elicitation') return [{ ...item, elicitation: item }]
    return item.activities.map((activity) => {
      if (activity.run)
        runs.push({
          ...activity.run,
          executionInvocationId: activity.id,
          outputs: activity.run.outputs.map((output) => ({
            ...output,
            data: output.data?.['image/png'] ? { ...output.data, 'image/png': png } : output.data
          }))
        })
      return {
        ...activity,
        executionInvocationId: activity.id,
        rawInput: activity.essentialTruncated ? { payload: 'x'.repeat(30000) } : activity.input,
        rawOutput: activity.output,
        toolContent: activity.contentBlocks,
        toolLocations: activity.locations
      }
    })
  })
  const runBytes = new TextEncoder().encode(JSON.stringify({ runs }))
  const runKey = 'notebooks/mock-project/mock-session/run.json'
  objects[`objects/${digest(new TextEncoder().encode(runKey))}`] = {
    bytes: runBytes,
    storageKey: runKey
  }
  return buildSciencePackage(
    title,
    { messages, artifacts, conversationGraph: { activities } },
    objects,
    { tables: { ArtifactVersion: records } }
  )
}
