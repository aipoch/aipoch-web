'use client'

import { Check } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

// Brand glyphs supplied by the design team (18x18); lucide dropped brand icons,
// so these stay inline. fill=currentColor keeps them in sync with the button text.
const XGlyph = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 18 18" fill="currentColor" aria-hidden="true" {...props}>
    <path d="M13.6828 1.6875H16.1648L10.7437 7.88203L17.121 16.3125H12.1289L8.21597 11.2008L3.74409 16.3125H1.25854L7.05581 9.68555L0.942139 1.6875H6.06089L9.59409 6.35977L13.6828 1.6875ZM12.8109 14.8289H14.1855L5.31206 3.09375H3.8355L12.8109 14.8289Z" />
  </svg>
)

const LinkedInGlyph = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 18 18" fill="currentColor" aria-hidden="true" {...props}>
    <path d="M15.75 1.125H2.24648C1.62773 1.125 1.125 1.63477 1.125 2.26055V15.7395C1.125 16.3652 1.62773 16.875 2.24648 16.875H15.75C16.3687 16.875 16.875 16.3652 16.875 15.7395V2.26055C16.875 1.63477 16.3687 1.125 15.75 1.125ZM5.88516 14.625H3.55078V7.10859H5.88867V14.625H5.88516ZM4.71797 6.08203C3.96914 6.08203 3.36445 5.47383 3.36445 4.72852C3.36445 3.9832 3.96914 3.375 4.71797 3.375C5.46328 3.375 6.07148 3.9832 6.07148 4.72852C6.07148 5.47734 5.4668 6.08203 4.71797 6.08203ZM14.6355 14.625H12.3012V10.9688C12.3012 10.0969 12.2836 8.97539 11.0883 8.97539C9.87187 8.97539 9.68555 9.92461 9.68555 10.9055V14.625H7.35117V7.10859H9.59062V8.13516H9.62227C9.93516 7.54453 10.698 6.92227 11.8336 6.92227C14.1961 6.92227 14.6355 8.47969 14.6355 10.5047V14.625Z" />
  </svg>
)

const FacebookGlyph = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 18 18" fill="currentColor" aria-hidden="true" {...props}>
    <path d="M18 9C18 4.02891 13.9711 0 9 0C4.02891 0 0 4.02891 0 9C0 13.2188 2.90742 16.7625 6.82734 17.7363V11.7492H4.97109V9H6.82734V7.81523C6.82734 4.75313 8.2125 3.33281 11.2219 3.33281C11.7914 3.33281 12.7758 3.44531 13.1801 3.55781V6.04688C12.9691 6.02578 12.6 6.01172 12.1395 6.01172C10.6629 6.01172 10.0934 6.5707 10.0934 8.02266V9H13.0324L12.5262 11.7492H10.0898V17.9332C14.5477 17.3953 18 13.602 18 9Z" />
  </svg>
)

const RedditGlyph = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 18 18" fill="currentColor" aria-hidden="true" {...props}>
    <path d="M0 9C0 4.02891 4.02891 0 9 0C13.9711 0 18 4.02891 18 9C18 13.9711 13.9711 18 9 18H1.3043C0.822656 18 0.583594 17.4199 0.921094 17.0789L2.63672 15.3633C1.00898 13.7355 0 11.4855 0 9ZM12.2906 5.4C13.1203 5.4 13.7918 4.72852 13.7918 3.89883C13.7918 3.06914 13.1203 2.39766 12.2906 2.39766C11.5664 2.39766 10.9617 2.91094 10.8211 3.59297C9.6082 3.72305 8.6625 4.75313 8.6625 5.99766V6.00469C7.34414 6.06094 6.13828 6.43711 5.18203 7.02773C4.82695 6.75352 4.38047 6.58828 3.89883 6.58828C2.73867 6.58828 1.79648 7.53047 1.79648 8.69063C1.79648 9.53438 2.29219 10.2586 3.00586 10.5926C3.07617 13.0324 5.73398 14.9941 9.00352 14.9941C12.273 14.9941 14.9344 13.0289 15.0012 10.5891C15.7113 10.2516 16.2 9.52734 16.2 8.69063C16.2 7.53047 15.2578 6.58828 14.0977 6.58828C13.616 6.58828 13.173 6.75 12.818 7.02422C11.8547 6.42656 10.6348 6.05039 9.30234 6.00117V5.99414C9.30234 5.10117 9.9668 4.35938 10.8281 4.23984C10.9828 4.90078 11.577 5.39297 12.2871 5.39297L12.2906 5.4ZM6.22617 8.68008C6.81328 8.68008 7.26328 9.29883 7.22813 10.0617C7.19297 10.8246 6.75352 11.1023 6.16289 11.1023C5.57227 11.1023 5.05898 10.793 5.09414 10.0301C5.1293 9.26719 5.63555 8.68359 6.22266 8.68359L6.22617 8.68008ZM12.9094 10.0266C12.9445 10.7895 12.4277 11.0988 11.8406 11.0988C11.2535 11.0988 10.8105 10.8211 10.7754 10.0582C10.7402 9.29531 11.1902 8.67656 11.7773 8.67656C12.3645 8.67656 12.8742 9.26016 12.9059 10.023L12.9094 10.0266ZM11.2184 12.0199C10.8562 12.8848 10.002 13.493 9.00352 13.493C8.00508 13.493 7.15078 12.8848 6.78867 12.0199C6.74648 11.918 6.8168 11.802 6.92578 11.7914C7.57266 11.7246 8.27227 11.6895 9.00352 11.6895C9.73477 11.6895 10.4344 11.7246 11.0813 11.7914C11.1902 11.802 11.2605 11.918 11.2184 12.0199Z" />
  </svg>
)

const WhatsAppGlyph = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 18 18" fill="currentColor" aria-hidden="true" {...props}>
    <path d="M14.516 3.41367C13.043 1.93711 11.0813 1.125 8.99648 1.125C4.69336 1.125 1.1918 4.62656 1.1918 8.92969C1.1918 10.3043 1.55039 11.6473 2.23242 12.832L1.125 16.875L5.26289 15.7887C6.40195 16.4109 7.68516 16.7379 8.99297 16.7379H8.99648C13.2961 16.7379 16.875 13.2363 16.875 8.9332C16.875 6.84844 15.9891 4.89023 14.516 3.41367ZM8.99648 15.423C7.8293 15.423 6.68672 15.1102 5.6918 14.5195L5.45625 14.3789L3.00234 15.0223L3.65625 12.6281L3.50156 12.382C2.85117 11.3484 2.51016 10.1566 2.51016 8.92969C2.51016 5.3543 5.42109 2.44336 9 2.44336C10.7332 2.44336 12.3609 3.11836 13.5844 4.34531C14.8078 5.57227 15.5602 7.2 15.5566 8.9332C15.5566 12.5121 12.5719 15.423 8.99648 15.423ZM12.5543 10.5645C12.3609 10.466 11.4012 9.99492 11.2219 9.93164C11.0426 9.86484 10.9125 9.8332 10.7824 10.0301C10.6523 10.227 10.2797 10.6629 10.1637 10.7965C10.0512 10.9266 9.93516 10.9441 9.7418 10.8457C8.5957 10.2727 7.84336 9.82266 7.0875 8.52539C6.88711 8.18086 7.28789 8.20547 7.66055 7.46016C7.72383 7.33008 7.69219 7.21758 7.64297 7.11914C7.59375 7.0207 7.20352 6.06094 7.0418 5.6707C6.88359 5.29102 6.72188 5.34375 6.60234 5.33672C6.48984 5.32969 6.35977 5.32969 6.22969 5.32969C6.09961 5.32969 5.88867 5.37891 5.70937 5.57227C5.53008 5.76914 5.02734 6.24023 5.02734 7.2C5.02734 8.15977 5.72695 9.08789 5.82188 9.21797C5.92031 9.34805 7.19648 11.3168 9.15469 12.1641C10.3922 12.6984 10.8773 12.7441 11.4961 12.6527C11.8723 12.5965 12.6492 12.1816 12.8109 11.7246C12.9727 11.2676 12.9727 10.8773 12.9234 10.7965C12.8777 10.7086 12.7477 10.6594 12.5543 10.5645Z" />
  </svg>
)

const MailGlyph = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 18 18" fill="currentColor" aria-hidden="true" {...props}>
    <path d="M1.6875 2.25C0.755859 2.25 0 3.00586 0 3.9375C0 4.46836 0.249609 4.96758 0.675 5.2875L8.325 11.025C8.72578 11.3238 9.27422 11.3238 9.675 11.025L17.325 5.2875C17.7504 4.96758 18 4.46836 18 3.9375C18 3.00586 17.2441 2.25 16.3125 2.25H1.6875ZM0 6.1875V13.5C0 14.741 1.00898 15.75 2.25 15.75H15.75C16.991 15.75 18 14.741 18 13.5V6.1875L10.35 11.925C9.54844 12.5262 8.45156 12.5262 7.65 11.925L0 6.1875Z" />
  </svg>
)

const LinkGlyph = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true" {...props}>
    <path d="M14.4951 8.29247C15.9076 6.87997 15.9076 4.59247 14.4951 3.17997C13.2451 1.92997 11.2751 1.76747 9.83755 2.79497L9.79755 2.82247C9.43755 3.07997 9.35505 3.57997 9.61255 3.93747C9.87005 4.29497 10.3701 4.37997 10.7276 4.12247L10.7676 4.09497C11.5701 3.52247 12.6676 3.61247 13.3626 4.30997C14.1501 5.09747 14.1501 6.37247 13.3626 7.15997L10.5576 9.96997C9.77005 10.7575 8.49505 10.7575 7.70755 9.96997C7.01005 9.27247 6.92005 8.17497 7.49255 7.37497L7.52005 7.33497C7.77755 6.97497 7.69255 6.47497 7.33505 6.21997C6.97755 5.96497 6.47505 6.04747 6.22005 6.40497L6.19255 6.44497C5.16255 7.87997 5.32505 9.84997 6.57505 11.1C7.98755 12.5125 10.2751 12.5125 11.6876 11.1L14.4951 8.29247ZM1.50505 7.70747C0.0925537 9.11997 0.0925537 11.4075 1.50505 12.82C2.75505 14.07 4.72505 14.2325 6.16255 13.205L6.20255 13.1775C6.56255 12.92 6.64505 12.42 6.38755 12.0625C6.13005 11.705 5.63005 11.62 5.27255 11.8775L5.23255 11.905C4.43005 12.4775 3.33255 12.3875 2.63755 11.69C1.85005 10.9 1.85005 9.62497 2.63755 8.83747L5.44255 6.02997C6.23005 5.24247 7.50505 5.24247 8.29255 6.02997C8.99005 6.72747 9.08005 7.82497 8.50755 8.62747L8.48005 8.66747C8.22255 9.02747 8.30755 9.52747 8.66505 9.78247C9.02255 10.0375 9.52505 9.95497 9.78005 9.59747L9.80755 9.55747C10.8376 8.11997 10.6751 6.14997 9.42505 4.89997C8.01255 3.48747 5.72505 3.48747 4.31255 4.89997L1.50505 7.70747Z" />
  </svg>
)

interface ShareRowProps {
  /** Absolute canonical URL of the page being shared. */
  url: string
  title: string
}

const iconButtonClass =
  'inline-flex size-8 items-center justify-center rounded-full text-[#575853] transition-colors hover:bg-[#e8e8e4] hover:text-[#10110f]'

export const ShareRow = ({ url, title }: ShareRowProps) => {
  const [copied, setCopied] = useState(false)
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const encodedUrl = encodeURIComponent(url)
  const encodedTitle = encodeURIComponent(title)

  useEffect(
    () => () => {
      if (copyTimer.current) clearTimeout(copyTimer.current)
    },
    []
  )

  const targets = [
    {
      name: 'Share on X',
      href: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`,
      icon: <XGlyph className="size-4" />
    },
    {
      name: 'Share on LinkedIn',
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
      icon: <LinkedInGlyph className="size-4" />
    },
    {
      name: 'Share on Facebook',
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      icon: <FacebookGlyph className="size-4" />
    },
    {
      name: 'Share on Reddit',
      href: `https://www.reddit.com/submit?url=${encodedUrl}&title=${encodedTitle}`,
      icon: <RedditGlyph className="size-4" />
    },
    {
      name: 'Share on WhatsApp',
      href: `https://wa.me/?text=${encodedTitle}%20${encodedUrl}`,
      icon: <WhatsAppGlyph className="size-4" />
    },
    {
      name: 'Share via email',
      href: `mailto:?subject=${encodedTitle}&body=${encodedUrl}`,
      icon: <MailGlyph className="size-4" />
    }
  ]

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(url)
      if (copyTimer.current) clearTimeout(copyTimer.current)
      setCopied(true)
      copyTimer.current = setTimeout(() => setCopied(false), 1500)
    } catch {
      // clipboard unavailable (insecure context) — leave the icon unchanged
    }
  }

  return (
    <div className="flex items-center gap-1.5">
      <span className="pr-1 text-[13px] font-medium text-[#10110f]">Share:</span>
      {targets.map((target) => (
        <a
          key={target.name}
          href={target.href}
          target="_blank"
          rel="noreferrer"
          aria-label={target.name}
          title={target.name}
          className={iconButtonClass}
        >
          {target.icon}
        </a>
      ))}
      <button
        type="button"
        onClick={copyLink}
        aria-label={copied ? 'Link copied' : 'Copy link'}
        title="Copy link"
        className={iconButtonClass}
      >
        {copied ? (
          <Check className="size-4 text-[#2d6a4f]" aria-hidden="true" />
        ) : (
          <LinkGlyph className="size-4" />
        )}
      </button>
      <span aria-live="polite" className="sr-only">
        {copied ? 'Link copied to clipboard' : ''}
      </span>
    </div>
  )
}
