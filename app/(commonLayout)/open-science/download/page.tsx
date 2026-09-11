import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { JsonLd } from '@/components/json-ld'
import { SITE_DOMAIN } from '@/lib/config'
import { staticImage } from '@/lib/staticAsset'
import { fetchOpenScienceDownloadManifest } from '@/service/open-science-download'
import {
  type DownloadKey,
  formatDownloadVersionLabel,
  getHomepageRecommendedDownloadKey,
  OPEN_SCIENCE_ALL_RELEASES_URL,
  OPEN_SCIENCE_RELEASES_URL
} from '../open-science-download-data'
import { DownloadCards } from './download-cards'

const downloadPageKeys = [
  'mac-x64',
  'mac-arm64',
  'win-x64',
  'linux-x64-deb'
] as const satisfies readonly DownloadKey[]

const faqItems = [
  {
    question: 'Which Mac download should I choose?',
    answer:
      'Choose Apple Silicon for an M1, M2, M3, M4, or newer Mac. Choose Intel only for an older Mac with an Intel processor. In macOS, open Apple menu → About This Mac to check.'
  },
  {
    question: 'Are the macOS downloads signed and notarized?',
    answer:
      'Official stable macOS releases are Developer ID signed and notarized by Apple. A typical local build is not notarized unless Apple signing and notarization credentials are configured.'
  },
  {
    question: 'Does Open-Science update automatically?',
    answer:
      'Packaged stable builds check the stable update channel and can update in place when the platform supports automatic installation. Otherwise, Open-Science provides a manual download link.'
  },
  {
    question: 'Does the installer include an AI model?',
    answer:
      'No. Open-Science is model-agnostic. During first-run setup, you choose and connect a supported agent runtime and model provider. App-managed runtimes can be installed without a separate Node.js setup.'
  },
  {
    question: 'Where are the release notes and older versions?',
    answer:
      'Visit GitHub Releases for release notes, previous versions, update metadata, checksums, and all published assets.'
  }
]

const kickerClass =
  'relative inline-block w-fit bg-[#e8e8e6] px-[9px] py-1.5 font-mono text-[9px] font-semibold leading-[1.5] tracking-[0.04em] text-[#575853] uppercase after:absolute after:-top-[3px] after:-right-[3px] after:size-1 after:bg-[#f2bd2f]'
const headingClass = 'font-[Georgia,serif] font-normal tracking-normal'
const sectionPaddingClass =
  'px-5 py-20 sm:px-10 sm:py-24 lg:px-[max(5.5vw,calc((100vw-1320px)/2))] lg:py-32'
const pageTitle = 'Download Open-Science for macOS, Windows and Linux | AIPOCH'
const pageDescription =
  'Download the latest stable Open-Science desktop app for Apple Silicon, Intel Mac, Windows x64, or Linux. Check system requirements and installation guidance.'
const pageUrl = `${SITE_DOMAIN}/open-science/download`
const heroBackgroundImage = staticImage('aipoch-system-map-7511f128.png')
const socialImage = staticImage('og-open-science-download-56121c38.png')
const releaseDateFormatter = new Intl.DateTimeFormat('en-US', {
  day: 'numeric',
  month: 'long',
  timeZone: 'UTC',
  year: 'numeric'
})

const formatReleaseDate = (value?: string): string | null => {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : releaseDateFormatter.format(date)
}

export const metadata: Metadata = {
  title: pageTitle,
  description: pageDescription,
  alternates: { canonical: pageUrl },
  robots: { index: true, follow: true },
  openGraph: {
    type: 'website',
    url: pageUrl,
    siteName: 'AIPOCH Open-Science',
    title: 'Download Open-Science for macOS, Windows and Linux',
    description:
      'Get the latest stable AIPOCH Open-Science desktop app with clear platform and installation guidance.',
    images: [
      {
        url: socialImage.src,
        width: socialImage.width,
        height: socialImage.height,
        alt: 'Download AIPOCH Open-Science for macOS, Windows, and Linux'
      }
    ]
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Download Open-Science for macOS, Windows and Linux',
    description:
      'Get the latest stable AIPOCH Open-Science desktop app with clear platform and installation guidance.',
    images: [socialImage.src]
  }
}

export const dynamic = 'force-dynamic'

export default async function OpenScienceDownloadPage() {
  const [manifest, requestHeaders] = await Promise.all([
    fetchOpenScienceDownloadManifest().catch(() => null),
    headers()
  ])
  // Order cards for the request's operating system on the server to avoid reordering after hydration.
  const recommendedKey = getHomepageRecommendedDownloadKey(requestHeaders.get('user-agent') ?? '')
  const version = manifest ? formatDownloadVersionLabel(manifest) : null
  const releaseDate = formatReleaseDate(manifest?.releaseDate)
  const releaseTagUrl = version
    ? `https://github.com/aipoch/open-science/releases/tag/${version}`
    : OPEN_SCIENCE_RELEASES_URL
  const linuxFilename = manifest?.downloads['linux-x64-deb']?.url.split('/').at(-1)
  const downloadAssets = downloadPageKeys.flatMap((key) => {
    const asset = manifest?.downloads[key]
    return asset ? [asset] : []
  })
  const schemas: Record<string, unknown>[] = [
    {
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      name: 'AIPOCH Open-Science',
      applicationCategory: 'ScienceApplication',
      operatingSystem: 'macOS 12+, Windows 10/11 x64, Linux x64',
      ...(manifest ? { softwareVersion: manifest.version } : {}),
      ...(releaseDate && manifest?.releaseDate ? { datePublished: manifest.releaseDate } : {}),
      ...(downloadAssets.length
        ? {
            downloadUrl: downloadAssets.map((asset) => asset.url),
            fileFormat: downloadAssets.map((asset) => asset.url.split('/').at(-1))
          }
        : {}),
      url: pageUrl,
      license: 'https://www.apache.org/licenses/LICENSE-2.0',
      codeRepository: 'https://github.com/aipoch/open-science',
      publisher: {
        '@type': 'Organization',
        name: 'AIPOCH',
        url: SITE_DOMAIN
      }
    },
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: faqItems.map((item) => ({
        '@type': 'Question',
        name: item.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: item.answer
        }
      }))
    }
  ]

  return (
    <main
      id="top"
      className="-mt-[var(--nav-h)] flex-1 overflow-hidden bg-[#f5f5f3] text-[#10110f]"
    >
      <JsonLd data={schemas} />
      <section className="relative grid min-h-[calc(520px+var(--nav-h))] place-items-center border-b border-[#dfdfda] pt-[var(--nav-h)] lg:min-h-[calc(600px+var(--nav-h))]">
        <div
          aria-hidden="true"
          className="absolute inset-x-0 top-[var(--nav-h)] bottom-0 bg-cover bg-center opacity-65"
          style={{
            backgroundImage: `linear-gradient(rgba(251, 251, 250, 0.38), rgba(251, 251, 250, 0.78)), url("${heroBackgroundImage.src}")`
          }}
        />
        <div className="relative z-10 mx-auto flex max-w-[1260px] flex-col items-center px-5 py-20 text-center sm:px-10 lg:py-[104px]">
          <p className={kickerClass}>OPEN-SCIENCE / DOWNLOAD</p>
          {/* Keep the download page's single H1 semantics from the reference design. */}
          <h1
            className={`${headingClass} mt-[26px] max-w-[1160px] text-[clamp(44px,5.4vw,78px)] leading-[1.02]`}
          >
            <span className="block">Download Open-Science</span>
            <span className="block">for macOS, Windows and Linux</span>
          </h1>
          <p className="mt-[34px] max-w-[700px] text-[clamp(16px,1.3vw,20px)] leading-[1.55] text-[#73746e]">
            Get the open-source, local-first AI research workbench. Choose your platform below and
            follow the installation guidance for your first launch.
          </p>
          {manifest ? (
            <div
              role="status"
              className="mt-9 flex w-fit flex-wrap items-center justify-center gap-x-[18px] gap-y-3 border border-[#dfdfda] bg-white/80 px-[17px] py-[13px] font-mono text-[11px]"
              aria-label="Latest stable release"
            >
              <span
                className="size-2 rounded-full bg-[#39a35b] shadow-[0_0_0_4px_rgba(57,163,91,0.12)]"
                aria-hidden="true"
              />
              <strong className="tracking-[0.05em]">Stable {version}</strong>
              {releaseDate ? <span className="text-[#777872]">Released {releaseDate}</span> : null}
            </div>
          ) : null}
        </div>
      </section>

      <section id="downloads" className={sectionPaddingClass}>
        <div className="mb-[62px] flex flex-col items-center gap-8 text-center">
          <p className={kickerClass}>LATEST STABLE RELEASE</p>
          <div>
            <h2 className={`${headingClass} text-[clamp(36px,4vw,56px)] leading-[1.1]`}>
              Choose your installer.
            </h2>
            <p className="mx-auto mt-[22px] max-w-[700px] text-[17px] leading-[1.65] text-[#777872]">
              Installers and file sizes for each supported platform are listed below. Your operating
              system is highlighted when it can be detected safely.
            </p>
          </div>
        </div>

        {/* Use the same server-provided release manifest for every installer link on the page. */}
        {manifest && downloadAssets.length ? (
          <DownloadCards manifest={manifest} recommendedKey={recommendedKey} />
        ) : (
          <div className="border border-[#dfdfda] bg-[#fbfbfa] p-8 text-center">
            <p className="text-base text-[#777872]">Installers are temporarily unavailable.</p>
            <a
              className="mt-6 inline-flex min-h-12 items-center bg-[#10110f] px-5 text-xs font-semibold text-white"
              href={OPEN_SCIENCE_RELEASES_URL}
            >
              View latest release ↗
            </a>
          </div>
        )}
        <div className="mt-8 flex flex-col items-start gap-4 text-left text-sm font-[650] sm:flex-row sm:items-center sm:justify-between sm:gap-8">
          <a
            className="underline decoration-[#10110f] underline-offset-4"
            href="https://aipoch.com/docs/getting-started/installation"
          >
            Read the Installation Docs ↗
          </a>
          <a className="underline decoration-[#10110f] underline-offset-4" href={releaseTagUrl}>
            Read {version ? `Open-Science ${version} ` : ''}release notes ↗
          </a>
        </div>
      </section>

      <section
        id="requirements"
        className={`${sectionPaddingClass} border-t border-[#dfdfda] bg-[#fbfbfa]`}
      >
        <div className="mb-[62px] flex flex-col items-center gap-8 text-center">
          <p className={kickerClass}>SYSTEM REQUIREMENTS</p>
          <div>
            <h2 className={`${headingClass} text-[clamp(36px,4vw,56px)] leading-[1.1]`}>
              Know before you install.
            </h2>
            <p className="mx-auto mt-[22px] max-w-[700px] text-[17px] leading-[1.65] text-[#777872]">
              Python and R are optional for the core app. They are needed only when you use the
              corresponding Notebook execution features, and Open-Science can prepare app-managed
              environments during setup.
            </p>
          </div>
        </div>
        <div className="overflow-x-auto border-t border-[#10110f]">
          <table className="w-full min-w-[760px] border-collapse text-left">
            <thead>
              <tr className="font-mono text-[10px] uppercase text-[#777872]">
                <th className="border-b border-[#dfdfda] px-4 py-4 font-medium">Platform</th>
                <th className="border-b border-[#dfdfda] px-4 py-4 font-medium">Minimum</th>
                <th className="border-b border-[#dfdfda] px-4 py-4 font-medium">Package</th>
                <th className="border-b border-[#dfdfda] px-4 py-4 font-medium">First launch</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              <tr>
                <th className="border-b border-[#dfdfda] px-4 py-5 font-semibold">macOS</th>
                <td className="border-b border-[#dfdfda] px-4 py-5">macOS 12 Monterey</td>
                <td className="border-b border-[#dfdfda] px-4 py-5">ARM64 or Intel DMG</td>
                <td className="border-b border-[#dfdfda] px-4 py-5">
                  Signed and notarized stable build
                </td>
              </tr>
              <tr>
                <th className="border-b border-[#dfdfda] px-4 py-5 font-semibold">Windows</th>
                <td className="border-b border-[#dfdfda] px-4 py-5">Windows 10 or 11, 64-bit</td>
                <td className="border-b border-[#dfdfda] px-4 py-5">x64 setup EXE</td>
                <td className="border-b border-[#dfdfda] px-4 py-5">
                  SmartScreen warning expected
                </td>
              </tr>
              <tr>
                <th className="border-b border-[#dfdfda] px-4 py-5 font-semibold">Linux</th>
                <td className="border-b border-[#dfdfda] px-4 py-5">64-bit Debian or Ubuntu</td>
                <td className="border-b border-[#dfdfda] px-4 py-5">Debian package (.deb)</td>
                <td className="border-b border-[#dfdfda] px-4 py-5 font-mono text-xs">
                  sudo apt install ./{linuxFilename ?? 'aipoch-open-science_amd64.deb'}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section
        id="automatic-updates"
        className="grid items-center gap-6 border-t-4 border-b border-t-[#f2bd2f] border-b-[#dfdfda] bg-[#efefec] px-5 py-12 sm:px-10 sm:py-14 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:gap-16 lg:px-[max(5.5vw,calc((100vw-1320px)/2))] lg:py-16"
      >
        <div>
          <p className={kickerClass}>AUTOMATIC UPDATES</p>
          <h2
            className={`${headingClass} mt-5 max-w-[440px] text-[clamp(30px,2.8vw,40px)] leading-[1.15] text-balance`}
          >
            How automatic updates work
          </h2>
        </div>
        <p className="max-w-[680px] text-[16px] leading-[1.7] text-[#575853]">
          Packaged stable builds check the official stable update feed and can update in place when
          an installer is available for the platform. Changes published to the official stable
          manifest also appear on this page automatically within one hour.
        </p>
      </section>

      <section id="faq" className={`${sectionPaddingClass} bg-white`}>
        <div className="grid gap-12 lg:grid-cols-[minmax(280px,0.48fr)_minmax(0,1fr)] lg:gap-[8vw]">
          <div>
            <h2 className={`${headingClass} text-[clamp(36px,4vw,56px)] leading-[1.1]`}>
              Download and installation questions.
            </h2>
          </div>
          <div className="border-t border-[#e7e5de]">
            {faqItems.map((item, index) => (
              <details
                key={item.question}
                open={index === 0}
                className="group border-b border-[#e7e5de]"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-6 text-base font-semibold [&::-webkit-details-marker]:hidden">
                  {item.question}
                  <span
                    className="flex size-7 shrink-0 items-center justify-center font-mono text-[13px] font-light text-[#dca510] transition-transform group-open:rotate-45"
                    aria-hidden="true"
                  >
                    +
                  </span>
                </summary>
                <p className="max-w-[760px] pb-7 text-[15px] leading-[1.75] text-[#777872]">
                  {item.answer}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="flex min-h-[460px] flex-col items-center justify-center bg-[#11120f] px-5 py-20 text-center text-[#fbfbfa] sm:px-10 lg:px-[max(5.5vw,calc((100vw-1320px)/2))] lg:py-24">
        <h2 className={`${headingClass} max-w-[900px] text-[clamp(36px,4vw,56px)] leading-[1.1]`}>
          Published releases and older installers are available on GitHub.
        </h2>
        <p className="mt-6 max-w-[680px] text-[17px] leading-[1.65] text-white/60">
          Browse older installers, full release notes, update metadata, checksums, and release
          certification files.
        </p>
        <a
          className="mt-9 inline-flex min-h-12 items-center bg-[#f2bd2f] px-5 text-xs font-semibold text-[#10110f] transition-colors hover:bg-[#fbfbfa]"
          href={OPEN_SCIENCE_ALL_RELEASES_URL}
        >
          View all GitHub Releases{' '}
          <span className="ml-3" aria-hidden="true">
            ↗
          </span>
        </a>
      </section>
    </main>
  )
}
