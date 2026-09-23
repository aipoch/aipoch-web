import Link from 'next/link'
import { PrivacyChoicesButton } from '@/components/cookie-consent'
import { AIPOCH_DESIGN_SYSTEM_URL, AIPOCH_GITHUB_URL } from '@/lib/config'

const columns = [
  [
    'Resource',
    [
      ['Github', AIPOCH_GITHUB_URL],
      ['Design System', AIPOCH_DESIGN_SYSTEM_URL]
    ]
  ],
  [
    'Explore',
    [
      ['AIPOCH Open-Science', '/open-science'],
      ['Blog', '/blog'],
      ['Contact Us', '/contact-us']
    ]
  ],
  [
    'Connect',
    [
      ['Twitter', 'https://x.com/aipoch_ai'],
      ['LinkedIn', 'https://www.linkedin.com/company/pochai/'],
      ['YouTube', 'https://www.youtube.com/@AIPOCH_AI']
    ]
  ],
  [
    'Legal',
    [
      ['Terms of Service', '/terms-of-service'],
      ['Privacy Policy', '/privacy-policy'],
      ['Cookie Policy', '/cookie-policy']
    ]
  ]
] as const

export function HomeFooter({ variant = 'home' }: { variant?: 'home' | 'content' }) {
  return (
    <footer className="bg-[#0b0b0c] px-6 pb-5 pt-12 text-white sm:px-7">
      <div className="mx-auto max-w-[1164px]">
        <div className="grid gap-10 lg:grid-cols-[1.4fr_2fr] xl:grid-cols-[454px_minmax(0,1fr)] lg:gap-20">
          <div>
            <Link href="/" aria-label="AIPOCH home" className="inline-flex">
              {/* biome-ignore lint/performance/noImgElement: Exact brand lockup exported from Figma. */}
              <img
                src="/figma/landing/footer-brand.png"
                alt="AIPOCH"
                width={125}
                height={31}
                className="h-[31px] w-[125px] object-contain"
              />
            </Link>
            <p className="mt-4 text-[12.5px] leading-[21px] text-white/70">
              {variant === 'home'
                ? 'We build insight moment for scientific research.'
                : 'The open-source harness for scientific research - model-agnostic, auditable, and yours to run.'}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-x-7 gap-y-8 sm:grid-cols-[1fr_1.35fr_.75fr_1fr]">
            {columns.map(([label, links]) => (
              <div key={label}>
                <h2 className="mb-3 font-mono text-[10px] uppercase tracking-[.06em] text-white/50">
                  {label}
                </h2>
                <ul className="space-y-2">
                  {links.map(([label, destination]) => {
                    const preserveGuides = variant === 'content' && destination === '/open-science'
                    const title = preserveGuides ? 'Guides' : label
                    const href = preserveGuides ? '/guides/what-is-a-skill' : destination
                    return (
                      <li key={title}>
                        <Link
                          href={href}
                          target={href.startsWith('https:') ? '_blank' : undefined}
                          rel={href.startsWith('https:') ? 'noopener noreferrer' : undefined}
                          className="text-[13px] text-white/80 transition-colors hover:text-[#fbdd67]"
                        >
                          {title}
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-12 flex flex-wrap items-center justify-between gap-4 border-t border-white/10 pt-5 font-mono text-[10px] uppercase tracking-[.06em] text-white/50">
          <p>
            © {new Date().getFullYear()} AIPOCH · All rights reserved. <PrivacyChoicesButton />
          </p>
          <p>Open-source harness for scientific research</p>
        </div>
      </div>
    </footer>
  )
}
