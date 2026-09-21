'use client'

import { CheckIcon } from 'lucide-react'
import Link from 'next/link'
import type { FormEventHandler } from 'react'
import type { UseFormRegisterReturn } from 'react-hook-form'
import { CdnImage as Image } from '@/components/cdn-image'
import type { SubmitMedFlowMemberResult } from '@/service/medflow-members'

const discordUrl = 'https://discord.gg/zxQAYjReRv'
const xUrl = 'https://x.com/aipoch_ai'

const DiscordIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <path d="M20.317 4.3698a19.7913 19.7913 0 0 0-4.8851-1.5152.0741.0741 0 0 0-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 0 0-.0785-.037 19.7363 19.7363 0 0 0-4.8852 1.515.0699.0699 0 0 0-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 0 0 .0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 0 0 .0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 0 0-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 0 1-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 0 1 .0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 0 1 .0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 0 1-.0066.1276 12.2986 12.2986 0 0 1-1.873.8914.0766.0766 0 0 0-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 0 0 .0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 0 0 .0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 0 0-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z" />
  </svg>
)

const XIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z" />
  </svg>
)

const pillars = [
  {
    number: '01',
    title: 'Reproducible',
    icon: 'reproducible',
    body: 'The same question, taken down the same path, returns the same answer — today, and a year from now.'
  },
  {
    number: '02',
    title: 'Verifiable',
    icon: 'verifiable',
    body: "Confidence isn't an afterthought. It's built in long before you ever begin."
  },
  {
    number: '03',
    title: 'Traceable',
    icon: 'traceable',
    body: 'Every step is accounted for and open to scrutiny — ready for any reviewer, any question.'
  }
] as const

type MedFlowContentProps = {
  apiError: string
  emailError?: string
  nameError?: string
  consentError?: string
  isSubmitting: boolean
  canSubmit: boolean
  onInput: FormEventHandler<HTMLFormElement>
  onSubmit: FormEventHandler<HTMLFormElement>
  registerConsent: UseFormRegisterReturn<'consent'>
  registerEmail: UseFormRegisterReturn<'email'>
  registerName: UseFormRegisterReturn<'name'>
  result: SubmitMedFlowMemberResult | null
  successName: string
}

export const MedFlowContent = ({
  apiError,
  emailError,
  nameError,
  consentError,
  isSubmitting,
  canSubmit,
  onInput,
  onSubmit,
  registerConsent,
  registerEmail,
  registerName,
  result,
  successName
}: MedFlowContentProps) => {
  const isSuccess = Boolean(result?.ok)
  return (
    <section className="mf-shell">
      <div className="mf-hero-inner">
        <div className="mf-hero-copy">
          <p className="mf-eyebrow">
            <span className="dot" />A NEW SIGNAL IS COMING
          </p>
          <h1 className="mf-title" aria-label="MedFlow">
            MEDFLOW
          </h1>
          <p className="mf-coming">COMING SOON</p>
          <p className="mf-tagline">
            We're engineering a new way to turn the
            <br className="mf-desktop-break" /> complexity of research into clarity you can trust.
          </p>
          <div className="mf-cta-row">
            <button
              type="button"
              className="mf-button mf-primary"
              aria-controls="waitlist"
              onClick={() => {
                requestAnimationFrame(() =>
                  document
                    .querySelector<HTMLElement>(isSuccess ? '#mf-success-title' : '#mf-name')
                    ?.focus()
                )
              }}
            >
              Join the waitlist <span aria-hidden="true">→</span>
            </button>
            <a className="mf-button" href={discordUrl} target="_blank" rel="noopener noreferrer">
              <DiscordIcon />
              Join Discord
            </a>
          </div>
          <div className="mf-concept-head">
            <h2 className="mf-lead">
              Not just <em>faster</em>.<br />
              Built to be <em>certain</em>.
            </h2>
            <p className="mf-lead-sub">
              MedFlow is the next signal from AIPOCH. We're not ready to reveal everything yet — but
              we can tell you what it's built on. Three things we refuse to compromise on.
            </p>
          </div>
        </div>
        <div className="mf-wl-card" id="waitlist">
          {!isSuccess ? (
            <>
              <p className="mf-eyebrow">
                <span className="dot" />
                WAITLIST
              </p>
              <h2>Be first in line.</h2>
              <p className="mf-form-lead">
                When MedFlow opens its private beta, everyone on the waitlist becomes one of our
                first testers. Leave your name and email — the moment we launch, your activation
                code lands straight in your inbox.
              </p>
              <form
                id="mf-form"
                aria-label="MedFlow early access"
                className="mf-form"
                onInput={onInput}
                onSubmit={onSubmit}
                noValidate
                aria-busy={isSubmitting}
              >
                <div className="mf-field">
                  <label className="sr-only" htmlFor="mf-name">
                    Your name
                  </label>
                  <input
                    id="mf-name"
                    type="text"
                    placeholder="Your name"
                    autoComplete="name"
                    required
                    disabled={isSubmitting}
                    aria-invalid={Boolean(nameError)}
                    aria-describedby={nameError ? 'mf-name-error' : undefined}
                    {...registerName}
                  />
                  {nameError && (
                    <p className="mf-field-error" id="mf-name-error" role="alert">
                      {nameError}
                    </p>
                  )}
                </div>
                <div className="mf-field">
                  <label className="sr-only" htmlFor="mf-email">
                    Email address
                  </label>
                  <input
                    id="mf-email"
                    type="email"
                    placeholder="Email address"
                    autoComplete="email"
                    inputMode="email"
                    autoCapitalize="none"
                    spellCheck={false}
                    required
                    disabled={isSubmitting}
                    aria-invalid={Boolean(emailError)}
                    aria-describedby={emailError ? 'mf-email-error' : undefined}
                    {...registerEmail}
                  />
                  {emailError && (
                    <p className="mf-field-error" id="mf-email-error" role="alert">
                      {emailError}
                    </p>
                  )}
                </div>
                <label className="mf-consent" id="f-consent">
                  <input
                    type="checkbox"
                    id="mf-consent"
                    disabled={isSubmitting}
                    aria-invalid={Boolean(consentError)}
                    aria-describedby={consentError ? 'mf-consent-error' : undefined}
                    {...registerConsent}
                  />
                  <span>
                    You hereby acknowledge and agree that your above data will be processed by
                    AIPOCH PTE. LTD. for the purpose of processing your request and sending you a
                    trial activation code when MedFlow's private beta is ready. For additional
                    information please check our{' '}
                    <a
                      href="https://aipoch.com/privacy-policy"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Privacy Policy
                    </a>
                    .
                  </span>
                </label>
                {consentError && (
                  <p className="mf-field-error" id="mf-consent-error" role="alert">
                    {consentError}
                  </p>
                )}
                {apiError && (
                  <p className="mf-api-error" id="mf-err" role="alert">
                    {apiError}
                  </p>
                )}
                <button
                  type="submit"
                  id="mf-btn"
                  className="mf-button mf-primary mf-submit"
                  disabled={!canSubmit || isSubmitting}
                >
                  {isSubmitting ? 'Requesting…' : 'Request early access'}{' '}
                  <span aria-hidden="true">→</span>
                </button>
                <span className="sr-only" role="status">
                  {isSubmitting ? 'Requesting…' : ''}
                </span>
              </form>
            </>
          ) : (
            <section
              className="mf-success"
              id="mf-success"
              aria-label="Waitlist confirmation"
              role="status"
              aria-live="polite"
            >
              <div className="mf-check" aria-hidden="true">
                <CheckIcon strokeWidth={3} />
              </div>
              <h2 className="mf-success-title" id="mf-success-title" tabIndex={-1}>
                {successName ? (
                  <>
                    <span className="mf-success-prefix">You're in,&nbsp;</span>
                    <span className="mf-success-name" title={successName}>
                      {successName}
                    </span>
                    <span className="mf-success-suffix">!</span>
                  </>
                ) : (
                  "You're on the list!"
                )}
              </h2>
              <p>When MedFlow enters beta, you'll be among the very first to get in.</p>
              <p>
                Keep an eye on your inbox — that's where your <strong>activation code</strong> will
                arrive.
              </p>
              <div className="mf-code-note">
                <span aria-hidden="true">🔑</span> Your activation code ships at launch
              </div>
              <p>
                While you wait — <strong>join the community</strong> and follow along:
              </p>
              <div className="mf-social-row">
                <a
                  className="mf-button mf-primary"
                  href={discordUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <DiscordIcon />
                  Join our Discord
                </a>
                <a className="mf-button" href={xUrl} target="_blank" rel="noopener noreferrer">
                  <XIcon />
                  Follow @aipoch_ai
                </a>
              </div>
              <div className="mf-success-bottom">
                <span>SIGNAL RECEIVED</span>
                <Link href="/">Explore AIPOCH →</Link>
              </div>
            </section>
          )}
        </div>
      </div>
      <section className="mf-pillars" aria-label="MedFlow principles">
        {pillars.map((pillar) => (
          <article className="mf-pillar" key={pillar.number}>
            <span className="mf-pillar-number">{pillar.number}</span>
            <h3>
              <Image src={`/medflow/${pillar.icon}.svg`} alt="" width={20} height={20} />
              {pillar.title}
            </h3>
            <p>{pillar.body}</p>
          </article>
        ))}
      </section>
    </section>
  )
}
