import { ArrowRight } from 'lucide-react'
import Link from 'next/link'
import type { HomeSpotlightContent } from '../home-spotlight-content'
import type { HomepageLastUpdated } from '../home-structured-data'
import { homeContainer, homeSection } from '../home-styles'

const card =
  'flex md:min-h-[610px] min-w-0 flex-col border border-[#e7e5de] bg-white/70 p-7 sm:p-10'
const cardLink =
  'mt-auto inline-flex items-center justify-end gap-2 pt-10 font-mono text-[11px] uppercase text-[#de8400] transition-colors hover:text-[#111]'

export const HomeSpotlightSection = ({
  content,
  lastUpdated
}: {
  content: HomeSpotlightContent
  lastUpdated: HomepageLastUpdated
}) => {
  const preview = content.media.find((item) => item.kind === 'image')
  return (
    <section id="open-science-spotlight" className={homeSection}>
      <div className={`${homeContainer} grid gap-8 pb-12 lg:grid-cols-2 lg:gap-10`}>
        <h2
          data-testid="spotlight-title"
          className="max-w-[510px] font-[Georgia] text-[40px] leading-[1.02] tracking-[-.04em] sm:text-[56px]"
        >
          See What’s New <br className="hidden sm:block" />
          in Open-Science
        </h2>
        <div>
          <p data-homepage-summary className="max-w-[540px] text-xl leading-[26px] text-[#6b6b66]">
            Find installation steps, project setup, workspace guides, and troubleshooting. Check the
            documented version when following instructions.
          </p>
          <time
            data-testid="homepage-last-updated"
            dateTime={lastUpdated.dateTime}
            className="sr-only"
          >
            Last updated {lastUpdated.label}
          </time>
          <Link
            href="https://aipoch.com/docs/"
            target="_blank"
            rel="noopener noreferrer"
            data-testid="open-science-wiki-cta"
            className="mt-10 inline-flex bg-[#111] px-7 py-4 text-sm text-white transition-colors hover:bg-[#333]"
          >
            Open the Wiki
          </Link>
        </div>
      </div>
      <div className={`${homeContainer} mb-16 lg:mb-24`}>
        <div
          data-testid="spotlight-media-full-width"
          className="w-full bg-cover bg-center px-[2.65%] py-[4.41%]"
          style={{ backgroundImage: 'url(/figma/landing/workspace-background.png)' }}
        >
          {/* biome-ignore lint/performance/noImgElement: Preserve the API's source image without cropping. */}
          <img
            src={preview?.url ?? '/figma/landing/spotlight-workspace.png'}
            alt={
              preview?.alt ??
              'Open-Science workspace with research figures and inspectable provenance'
            }
            width={1287}
            height={780}
            loading="lazy"
            className="h-auto w-full rounded-md object-contain shadow-[0_24px_44px_rgba(0,0,0,.2)]"
          />
        </div>
      </div>
      <div className={`${homeContainer} grid gap-6 md:grid-cols-3`}>
        <article data-testid="spotlight-latest-release" className={card}>
          <div className="mb-5 flex flex-wrap justify-between gap-3 font-mono text-[10px] uppercase tracking-wide text-[#de8400]">
            <h2>Latest release</h2>
            <span>{content.latestRelease.updateDate}</span>
          </div>
          {content.latestRelease.title ? (
            <h3 className="mb-5 text-[32px] font-semibold leading-[1.2]">
              {content.latestRelease.title}
            </h3>
          ) : null}
          <p className="text-[13px] leading-5 text-[#6b6b66]">
            {content.latestRelease.description}
          </p>
          <ul className="mt-3 space-y-3">
            {content.latestRelease.features.map(([title, text]) => (
              <li key={title} className="text-[13px] leading-5">
                <b className="font-semibold">{title}</b>
                <p className="mt-1 text-[#6b6b66]">{text}</p>
              </li>
            ))}
          </ul>
          <Link
            href="https://github.com/aipoch/open-science/releases"
            target="_blank"
            rel="noopener noreferrer"
            className={cardLink}
          >
            Full changelog <ArrowRight className="size-3" aria-hidden />
          </Link>
        </article>
        <article data-testid="spotlight-read-watch" className={card}>
          <p className="mb-5 font-mono text-[10px] uppercase tracking-wide text-[#de8400]">
            Articles &amp; guides
          </p>
          <h2 className="mb-5 text-[32px] font-semibold leading-[1.2]">Read &amp; watch</h2>
          <div data-testid="spotlight-read-watch-list" className="space-y-5">
            {content.readWatch.map((post) => (
              <Link key={post.url} href={post.url} className="block group">
                <b className="block text-[13px] font-medium leading-5 group-hover:underline">
                  {post.title}
                </b>
                <span className="mt-1 block text-[11px] leading-4 text-[#6b6b66]">
                  {post.meta} · {post.date}
                </span>
              </Link>
            ))}
          </div>
          <Link href="/blog" className={cardLink}>
            All posts <ArrowRight className="size-3" aria-hidden />
          </Link>
        </article>
        <article data-testid="spotlight-product-overview" className={card}>
          <p className="mb-5 font-mono text-[10px] uppercase tracking-wide text-[#de8400]">
            Product overview
          </p>
          <h2 className="mb-5 text-[32px] font-semibold leading-[1.2]">What it does</h2>
          <ul className="space-y-4 text-[13px] leading-5 text-[#6b6b66]">
            {content.whatItDoes.map(([title, text]) => (
              <li key={title}>
                <b className="font-medium text-[#61615c]">{title}</b> — {text}
              </li>
            ))}
          </ul>
          <Link
            href="https://github.com/aipoch/open-science#readme"
            target="_blank"
            rel="noopener noreferrer"
            className={cardLink}
          >
            Documentation <ArrowRight className="size-3" aria-hidden />
          </Link>
        </article>
      </div>
    </section>
  )
}
