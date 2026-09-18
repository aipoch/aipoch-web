'use client'

import { useState } from 'react'
import type { FormEvent } from 'react'

const DiscordIcon = () => <span aria-hidden="true">◉</span>

const principles = [
  ['01', 'REPRODUCIBLE', 'The same question, taken down the same path, returns the same answer — today, and a year from now.'],
  ['02', 'VERIFIABLE', "Confidence isn't an afterthought. It's built in long before you ever begin."],
  ['03', 'TRACEABLE', 'Every step is accounted for and open to scrutiny — ready for any reviewer, any question.']
] as const

export const MedFlowRedesignExperience = () => {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [consent, setConsent] = useState(false)
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle')
  const ready = Boolean(name.trim() && email.trim() && consent)

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!ready || status === 'submitting') return
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setStatus('error')
      return
    }
    setStatus('submitting')
    window.setTimeout(() => setStatus('success'), 700)
  }

  return (
    <div className="mf-redesign-shell">
      <section className="mf-redesign-intro" aria-labelledby="mf-redesign-title">
        <p className="mf-redesign-eyebrow">A NEW SIGNAL IS COMING</p>
        <h1 id="mf-redesign-title">MEDFLOW</h1>
        <p className="mf-redesign-coming">COMING SOON</p>
        <p className="mf-redesign-lead">We're engineering a new way to turn the complexity of research into clarity you can trust.</p>
        <div className="mf-redesign-actions">
          <a className="mf-redesign-button mf-redesign-primary" href="#mf-redesign-waitlist">Join the waitlist <span aria-hidden="true">→</span></a>
          <a className="mf-redesign-button" href="https://discord.gg/zxQAYjReRv" target="_blank" rel="noreferrer"><DiscordIcon /> Join Discord</a>
        </div>
        <h2 className="mf-redesign-promise">Not just <em>faster.</em><br />Built to be <em>certain.</em></h2>
        <p className="mf-redesign-lead">MedFlow is the next signal from AIPOCH. We're not ready to reveal everything yet — but we can tell you what it's built on. Three things we refuse to compromise on.</p>
      </section>

      <section id="mf-redesign-waitlist" className="mf-redesign-card" aria-labelledby="mf-redesign-waitlist-title">
        {status === 'success' ? (
          <div className="mf-redesign-success" tabIndex={-1}>
            <div className="mf-redesign-check" aria-hidden="true">✓</div>
            <h2>You're in, {name}!</h2>
            <p>When MedFlow enters beta, you'll be among the very first to get in.</p>
            <p>Keep an eye on your inbox — that's where your <strong>activation code</strong> will arrive.</p>
            <p className="mf-redesign-activation">🔑 Your activation code ships at launch</p>
            <div className="mf-redesign-actions"><a className="mf-redesign-button mf-redesign-primary" href="https://discord.gg/zxQAYjReRv" target="_blank" rel="noreferrer"><DiscordIcon /> Join our Discord</a><a className="mf-redesign-button" href="https://x.com/aipoch_ai" target="_blank" rel="noreferrer">𝕏 Follow @aipoch_ai</a></div>
          </div>
        ) : (
          <>
            <p className="mf-redesign-eyebrow">WAITLIST</p>
            <h2 id="mf-redesign-waitlist-title">Be first in line.</h2>
            <p>When MedFlow opens its private beta, everyone on the waitlist becomes one of our <strong>first testers</strong>. Leave your name and email — the moment we launch, your <strong>activation code</strong> lands straight in your inbox.</p>
            <form onSubmit={submit} noValidate>
              <label>Your name<input aria-label="Your name" value={name} onChange={(event) => { setName(event.target.value); setStatus('idle') }} autoComplete="name" /></label>
              <label>Email address<input aria-label="Email address" type="email" value={email} onChange={(event) => { setEmail(event.target.value); setStatus('idle') }} autoComplete="email" /></label>
              <label className="mf-redesign-consent"><input aria-label="I agree to the processing of my data described in the Privacy Policy" type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} /> <span>You hereby acknowledge and agree that your above data will be processed by AIPOCH PTE. LTD. for the purpose of processing your request and sending you a trial activation code when MedFlow's private beta is ready. For additional information please check our <a href="https://aipoch.com/privacy-policy">Privacy Policy</a>.</span></label>
              {status === 'error' && <p className="mf-redesign-error" role="alert">Enter a valid email address.</p>}
              <button type="submit" disabled={!ready || status === 'submitting'}>{status === 'submitting' ? 'Requesting…' : 'Request early access'} <span aria-hidden="true">→</span></button>
            </form>
          </>
        )}
      </section>

      <section className="mf-redesign-principles" aria-label="MedFlow principles">
        {principles.map(([number, title, body]) => <article key={number}><span>{number}</span><h2>{title}</h2><p>{body}</p></article>)}
      </section>
    </div>
  )
}
