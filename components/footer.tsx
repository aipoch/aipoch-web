import Link from 'next/link'
import { PrivacyChoicesButton } from '@/components/cookie-consent'
import { LogoIcon } from '@/components/svg-icons'
import { AIPOCH_DESIGN_SYSTEM_URL, AIPOCH_GITHUB_URL } from '@/lib/config'

const footerLinks = {
  resource: [
    { label: 'Open-Science', href: 'https://github.com/aipoch/open-science' },
    { label: 'Agent Skills', href: AIPOCH_GITHUB_URL },
    { label: 'Design System', href: AIPOCH_DESIGN_SYSTEM_URL }
  ],
  explore: [
    { label: 'Guides', href: '/guides/what-is-a-skill' },
    { label: 'Blog', href: '/blog' },
    { label: 'Contact Us', href: '/contact-us', title: 'support@aipoch.com' }
  ],
  connect: [
    { label: 'Twitter', href: 'https://x.com/aipoch_ai' },
    { label: 'LinkedIn', href: 'https://www.linkedin.com/company/pochai/' },
    { label: 'YouTube', href: 'https://www.youtube.com/@AIPOCH_AI' }
  ],
  legal: [
    { label: 'Terms of Service', href: '/terms-of-service' },
    { label: 'Privacy Policy', href: '/privacy-policy' },
    { label: 'Cookie Policy', href: '/cookie-policy' }
  ]
}

export function Footer() {
  const currentYear = new Date().getFullYear()
  const displayYear = Math.max(currentYear, 2026)

  return (
    <footer className="bg-[#1a1a1a] px-4 py-12 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-6 lg:gap-10">
          <div className="col-span-2 flex flex-col items-start gap-4">
            <div className="flex items-center flex-col gap-2">
              <LogoIcon className="size-16 text-white" />
              <span className="block text-2xl font-light tracking-tight text-white">AIPOCH</span>
            </div>
            <p className="max-w-[230px] text-[12.5px] leading-[21px] text-white/70">
              The open-source harness for scientific research - model-agnostic, auditable, and yours
              to run.
            </p>
          </div>
          {/* Resource Links */}
          <div>
            <h4 className="mb-4 text-[10px] font-medium uppercase tracking-widest text-white/40">
              Resource
            </h4>
            <ul className="space-y-3">
              {footerLinks.resource.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-white/60 transition-colors hover:text-[#f1dd67]"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          {/* Explore Links */}
          <div>
            <h4 className="mb-4 text-[10px] font-medium uppercase tracking-widest text-white/40">
              Explore
            </h4>
            <ul className="space-y-3">
              {footerLinks.explore.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    title={link.title}
                    className="text-xs text-white/60 transition-colors hover:text-[#f1dd67]"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Connect Links */}
          <div>
            <h4 className="mb-4 text-[10px] font-medium uppercase tracking-widest text-white/40">
              Connect
            </h4>
            <ul className="space-y-3">
              {footerLinks.connect.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    target="_blank"
                    className="text-xs text-white/60 transition-colors hover:text-[#f1dd67]"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal Links */}
          <div>
            <h4 className="mb-4 text-[10px] font-medium uppercase tracking-widest text-white/40">
              Legal
            </h4>
            <ul className="space-y-3">
              {footerLinks.legal.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-xs text-white/60 transition-colors hover:text-[#f1dd67]"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom legal control keeps the privacy action adjacent to the copyright text. */}
        <div className="mt-12 flex flex-col gap-4 border-t border-white/10 pt-8 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[10px] leading-5 text-white/40">
            © {displayYear} AIPOCH. All Rights Reserved. <PrivacyChoicesButton />.
          </p>
          <p className="text-right font-mono text-[10px] font-medium leading-[10px] tracking-[0.6px] text-white/50 uppercase">
            Open-source harness for scientific research
          </p>
        </div>
      </div>
    </footer>
  )
}
