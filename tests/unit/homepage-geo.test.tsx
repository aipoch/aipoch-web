import { describe, expect, test } from 'bun:test'
import { resolve } from 'node:path'
import { renderToStaticMarkup } from 'react-dom/server'

const extractJsonLd = (html: string): Record<string, unknown>[] => {
  const content = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)?.[1]
  expect(content).toBeTruthy()
  return JSON.parse(content ?? '[]') as Record<string, unknown>[]
}

describe('homepage GEO contracts', () => {
  test('publishes the same Organization entity on the homepage and product page', async () => {
    const { buildHomepageStructuredData } = await import(
      '../../app/(commonLayout)/home/home-structured-data'
    )
    const { buildOpenSciencePageGraph } = await import(
      '../../app/(commonLayout)/open-science/open-science-structured-data'
    )
    const homepageOrganizationWithContext = buildHomepageStructuredData({
      skillsCount: 550
    }).schemas.find((schema) => schema['@type'] === 'Organization')
    const { '@context': _context, ...homepageOrganization } = homepageOrganizationWithContext ?? {}
    const productOrganization = (
      buildOpenSciencePageGraph({
        releaseManifest: {
          version: '1.2.3',
          releaseDate: '2026-09-07T01:13:01Z',
          downloads: {
            'mac-arm64': { url: 'https://cdn.example.com/OpenScience-arm64.dmg' }
          }
        }
      })['@graph'] as Record<string, unknown>[]
    ).find((schema) => schema['@type'] === 'Organization')

    expect(productOrganization).toBeDefined()
    expect(homepageOrganization).toEqual(productOrganization ?? {})
  })

  test('keeps required current product facts when homepage APIs are unavailable', async () => {
    const { buildHomepageStructuredData } = await import(
      '../../app/(commonLayout)/home/home-structured-data'
    )
    const { lastUpdated, schemas } = buildHomepageStructuredData({})
    const organization = schemas.find((schema) => schema['@type'] === 'Organization')
    const softwareApplication = schemas.find((schema) => schema['@type'] === 'SoftwareApplication')

    expect(organization?.description).toBe(
      'AIPOCH builds the open-source harness for scientific research. Open-Science is a model-agnostic AI workbench with audited medical research agent skills.'
    )
    expect(softwareApplication?.softwareVersion).toBe('v0.16.0')
    expect(lastUpdated).toEqual({
      dateTime: '2026-08-18',
      label: 'Aug 18, 2026'
    })
    expect(softwareApplication).toMatchObject({
      dateModified: '2026-08-18',
      mainEntityOfPage: { '@id': 'https://aipoch.com/open-science#webpage' },
      sameAs: ['https://github.com/aipoch/open-science']
    })
    expect(schemas.some((schema) => schema['@type'] === 'VideoObject')).toBeFalse()

    const { schemas: trustedVideoSchemas } = buildHomepageStructuredData({
      releaseVersion: 'v0.17.0',
      videoUrl: 'https://statics.aipoch.com/public/operations/releases/0-17-0/new'
    })
    expect(trustedVideoSchemas.find((schema) => schema['@type'] === 'VideoObject')).toMatchObject({
      contentUrl: 'https://statics.aipoch.com/public/operations/releases/0-17-0/new'
    })

    const { schemas: multipleVideoSchemas } = buildHomepageStructuredData({
      videoItems: [
        {
          name: 'Product tour',
          url: 'https://statics.aipoch.com/public/operations/releases/0-17-0/tour'
        },
        {
          name: 'Workflow demo',
          url: 'https://statics.aipoch.com/public/operations/releases/0-17-0/workflow.mp4'
        },
        {
          name: 'Untrusted media',
          url: 'https://example.test/public/operations/releases/0-17-0/untrusted.mp4'
        }
      ]
    })
    expect(
      multipleVideoSchemas
        .filter((schema) => schema['@type'] === 'VideoObject')
        .map((schema) => schema.contentUrl)
    ).toEqual([
      'https://statics.aipoch.com/public/operations/releases/0-17-0/tour',
      'https://statics.aipoch.com/public/operations/releases/0-17-0/workflow.mp4'
    ])

    const { HomePage } = await import('../../app/(commonLayout)/home/home-page')
    const fallbackHtml = renderToStaticMarkup(<HomePage />)
    expect(fallbackHtml).toContain('Latest release')
    expect(fallbackHtml).toContain('v0.16.0')
  })

  test('uses homepage API release facts directly in machine-readable schemas', async () => {
    const { buildHomepageStructuredData } = await import(
      '../../app/(commonLayout)/home/home-structured-data'
    )
    const { lastUpdated, schemas } = buildHomepageStructuredData({
      releaseVersion: 'v0.20.4',
      lastModified: 'Aug 4, 2026'
    })
    const webpage = schemas.find((schema) => schema['@type'] === 'WebPage')
    const softwareApplication = schemas.find((schema) => schema['@type'] === 'SoftwareApplication')

    expect(lastUpdated).toEqual({
      dateTime: 'Aug 4, 2026',
      label: 'Aug 4, 2026'
    })
    expect(webpage?.dateModified).toBe('2026-09-17')
    expect(softwareApplication).toMatchObject({
      softwareVersion: 'v0.20.4',
      dateModified: '2026-08-04',
      sameAs: ['https://github.com/aipoch/open-science']
    })
  })

  test('server-renders safely when the homepage API returns malformed release fields', () => {
    const appRoot = resolve(import.meta.dir, '../..')
    const result = Bun.spawnSync({
      cmd: [
        'bun',
        '-e',
        `import { mock } from 'bun:test'
mock.module('@/service/homepage', () => ({
  OPEN_SCIENCE_HOMEPAGE_MODULE: 'openscience',
  fetchHomepageConfig: async () => ({
    release_version: 'v0.20.4',
    latest_release_update: 'Aug 4, 2026',
    media: [null, { title: 'Product tour', url: 'https://example.test/untrusted.mp4' }]
  }),
  fetchHomepageReadWatch: async () => null,
  fetchGithubStarCount: async () => 3500,
  fetchHomepageSkillsCount: async () => {
    throw new Error('Homepage should not fetch runtime skill counts')
  }
}))
const { default: Home } = await import('./app/(commonLayout)/page')
const { renderToStaticMarkup } = await import('react-dom/server')
console.log(renderToStaticMarkup(await Home()))`
      ],
      cwd: appRoot,
      env: { ...process.env, NODE_ENV: 'test' }
    })

    expect(result.exitCode).toBe(0)
    const html = result.stdout.toString()
    expect(html).toContain('v0.20.4')
    expect(html).toContain('Last updated Aug 4, 2026')
    expect(html).not.toContain('VideoObject')
  })

  test('normalizes a configured www origin before metadata consumers use it', () => {
    const appRoot = resolve(import.meta.dir, '../..')
    const result = Bun.spawnSync({
      cmd: [
        'bun',
        '-e',
        "import { openScienceMetadata } from './app/(commonLayout)/open-science/open-science-metadata'; import { SITE_DOMAIN } from './lib/config'; console.log(JSON.stringify({ site: SITE_DOMAIN, openScience: openScienceMetadata.alternates?.canonical }))"
      ],
      cwd: appRoot,
      env: {
        ...process.env,
        SITE_DOMAIN: 'https://www.aipoch.com/'
      }
    })

    expect(result.exitCode).toBe(0)
    expect(JSON.parse(result.stdout.toString())).toEqual({
      site: 'https://aipoch.com',
      openScience: 'https://aipoch.com/open-science'
    })
  })

  test('keeps the crawler summary aligned with the current public release and skill count', async () => {
    const llms = await Bun.file(resolve(import.meta.dir, '../../public/llms.txt')).text()

    expect(llms).toContain('550+ reusable medical research skills')
    expect(llms).toContain("Open-Science is AIPOCH's primary open-source AI research workbench")
    expect(llms).toContain('https://github.com/aipoch/open-science/releases/latest')
    expect(llms).not.toContain('597+')
    expect(llms).not.toContain('v0.14.1')
  })

  test('keeps public policy copy aligned with the canonical non-www origin', async () => {
    const privacyPolicy = await Bun.file(
      resolve(import.meta.dir, '../../data/policy/privacy-policy.mdx')
    ).text()

    expect(privacyPolicy).toContain('aipoch.com and related services')
    expect(privacyPolicy).not.toContain('www.aipoch.com')
  })

  test('redirects the www host to the canonical origin with HTTP 301', async () => {
    const { default: nextConfig } = await import('../../next.config')
    const redirects = await nextConfig.redirects?.()

    expect(redirects).toContainEqual({
      source: '/:path*',
      has: [{ type: 'host', value: 'www.aipoch.com' }],
      destination: 'https://aipoch.com/:path*',
      statusCode: 301
    })
  })

  test('renders canonical entity, page, navigation, video, and product schemas', async () => {
    process.env.E2E_HOMEPAGE_MOCK = '1'
    const { default: Home, dynamic } = await import('../../app/(commonLayout)/page')
    expect(dynamic).toBe('force-dynamic')
    const html = await Home()
      .then((page) => renderToStaticMarkup(page))
      .finally(() => delete process.env.E2E_HOMEPAGE_MOCK)
    const schemas = extractJsonLd(html)

    const organization = schemas.find((schema) => schema['@type'] === 'Organization')
    expect(organization).toMatchObject({
      '@id': 'https://aipoch.com/#organization',
      url: 'https://aipoch.com',
      description:
        'AIPOCH builds the open-source harness for scientific research. Open-Science is a model-agnostic AI workbench with audited medical research agent skills.',
      sameAs: [
        'https://github.com/aipoch',
        'https://www.linkedin.com/company/pochai/',
        'https://www.youtube.com/@AIPOCH_AI',
        'https://x.com/aipoch_ai'
      ]
    })
    expect(schemas.find((schema) => schema['@type'] === 'WebSite')).toMatchObject({
      '@id': 'https://aipoch.com/#website',
      url: 'https://aipoch.com'
    })
    expect(schemas.find((schema) => schema['@type'] === 'WebPage')).toMatchObject({
      '@id': 'https://aipoch.com/#webpage',
      url: 'https://aipoch.com',
      dateModified: '2026-09-17',
      speakable: {
        '@type': 'SpeakableSpecification',
        cssSelector: ['[data-testid="spotlight-title"]', '[data-homepage-summary]']
      }
    })
    expect(schemas.find((schema) => schema['@type'] === 'BreadcrumbList')).toMatchObject({
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: 'AIPOCH',
          item: 'https://aipoch.com'
        }
      ]
    })
    const videoSchemas = schemas.filter((schema) => schema['@type'] === 'VideoObject')
    expect(videoSchemas).toHaveLength(2)
    expect(videoSchemas[0]).toMatchObject({
      contentUrl:
        'https://statics.aipoch.com/public/operations/releases/0-16-0/OpenScienceUpdate0_16_0.mp4',
      uploadDate: 'Aug 16, 2026',
      duration: 'PT1M0.48S',
      publisher: { '@id': 'https://aipoch.com/#organization' }
    })
    expect(videoSchemas[1]).toMatchObject({
      contentUrl:
        'https://statics.aipoch.com/public/operations/releases/0-16-0/OpenScienceUpdate0_16_0.mp4?spotlight=workflow',
      name: 'AIPOCH Open-Science Workflow demo'
    })
    expect(schemas.find((schema) => schema['@type'] === 'SoftwareApplication')).toMatchObject({
      name: 'Open-Science',
      softwareVersion: 'v0.16.0',
      downloadUrl: 'https://github.com/aipoch/open-science/releases/latest',
      license: 'https://www.apache.org/licenses/LICENSE-2.0',
      dateModified: '2026-08-16',
      sameAs: ['https://github.com/aipoch/open-science'],
      mainEntityOfPage: { '@id': 'https://aipoch.com/open-science#webpage' }
    })
    expect(html).toContain('data-testid="homepage-last-updated"')
    expect(html).toContain('dateTime="Aug 16, 2026"')
    expect(html).toContain('Last updated Aug 16, 2026')
    expect(html).toContain('550+ reusable medical research skills')
    expect(html).not.toContain('597+ reusable medical research skills')
  })
})
