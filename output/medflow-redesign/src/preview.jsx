import { createElement, useMemo, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { PathnameContext } from 'next/dist/shared/lib/hooks-client-context.shared-runtime'
import { Navbar } from '@/components/navbar'
import { Footer } from '@/components/footer'
import { CookieConsentBanner } from '@/components/cookie-consent/cookie-consent-banner'
import scenes from './scenes.json'
import { SuccessConfetti } from './success-confetti'

const parameters = new URLSearchParams(location.search)
const requestedState = parameters.get('state')
const initialState = Object.hasOwn(scenes, requestedState) ? requestedState : 'default'
const parser = new DOMParser()
const parseScene = (state) => parser.parseFromString(scenes[state], 'image/svg+xml')
const originalCheckbox = (state) => parseScene(state).querySelector('[id="Checkbox:margin"]')
const sampleValue = (state, field) =>
  parseScene(state).querySelector(`[data-field="${field}"]`)?.textContent || ''
const position = (left, top, width, height) => ({ left, top: top - 72, width, height })

// Render the inspected SVG export as React elements; form values remain text nodes.
function renderLayer(node, key = 0) {
  if (node.nodeType === 3) return node.textContent
  if (node.nodeType !== 1) return null
  const props = { key }
  for (const attribute of node.attributes) {
    const name = attribute.name.startsWith('data-')
      ? attribute.name
      : attribute.name.replace(/[-:]([a-z])/g, (_, letter) => letter.toUpperCase())
    props[name] =
      attribute.name === 'style'
        ? Object.fromEntries(
            attribute.value
              .split(';')
              .filter(Boolean)
              .map((declaration) => {
                const [property, value] = declaration.split(':')
                return [
                  property.trim().replace(/-([a-z])/g, (_, letter) => letter.toUpperCase()),
                  value.trim()
                ]
              })
          )
        : attribute.value === '__BACKGROUND__'
          ? window.MEDFLOW_BACKGROUND
          : attribute.value
  }
  return createElement(node.tagName, props, ...Array.from(node.childNodes, renderLayer))
}

function MedFlow() {
  const [status, setStatus] = useState(initialState)
  const [name, setName] = useState(
    initialState === 'default' ? '' : sampleValue(initialState, 'name')
  )
  const [email, setEmail] = useState(
    initialState === 'default' ? '' : sampleValue(initialState, 'email')
  )
  const [consent, setConsent] = useState(initialState !== 'default')
  const [focused, setFocused] = useState(null)
  const nameRef = useRef(null)
  const ready = Boolean(name.trim() && email.trim() && consent)
  const busy = status === 'submitting'
  const success = status === 'success'
  const error = ['error', 'server', 'duplicate'].includes(status)
  const sceneState =
    error || busy || success || status === 'typing'
      ? status
      : focused
        ? 'typing'
        : ready
          ? 'completed'
          : 'default'

  const artwork = useMemo(() => {
    const document = parseScene(sceneState)
    // Native inputs own their text, selection, caret, scrolling, and focus decoration.
    // Remove the static field layers to prevent a second field from appearing focused.
    for (const layer of document.querySelectorAll(
      '[data-field], [id*="Caret"], g[id^="Text Input"], g[id^="Email Input"]'
    )) {
      layer.remove()
    }
    const checkbox = document.querySelector('[id="Checkbox:margin"]')
    if (checkbox)
      checkbox.replaceWith(
        document.importNode(originalCheckbox(consent ? 'completed' : 'default'), true)
      )
    if (!ready && !busy && !success) {
      const button = document.querySelector('[id="Button_2"]')
      button?.querySelector('rect')?.setAttribute('fill', '#ECECEA')
      button?.querySelector('[id="Request early access"]')?.setAttribute('fill', '#A3A39D')
    }
    return renderLayer(document.documentElement)
  }, [sceneState, consent, ready, busy, success])

  function update(setter, value) {
    setter(value)
    setStatus('default')
  }

  function submit(event) {
    event.preventDefault()
    if (!ready || busy) return
    setFocused(null)
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setStatus('error')
      return
    }
    setStatus('submitting')
    // This review artifact only demonstrates the Figma states. No data is transmitted.
    window.setTimeout(() => {
      const result = parameters.get('result')
      setStatus(['server', 'duplicate'].includes(result) ? result : 'success')
    }, 1400)
  }

  return (
    <main id="top" className="mf-preview" data-state={sceneState}>
      <div className="mf-canvas">
        <h1 className="sr-only">MedFlow</h1>
        <div className="mf-artwork">{artwork}</div>
        <SuccessConfetti active={success} />
        <button
          type="button"
          className="mf-hit"
          style={position(184, 448.719, 164, 44)}
          aria-label="Join the waitlist"
          onClick={() => {
            if (success) setStatus('default')
            requestAnimationFrame(() => nameRef.current?.focus())
          }}
        />
        <a
          className="mf-hit"
          style={position(360, 448.719, 146, 44)}
          aria-label="Join Discord"
          href="https://discord.gg/zxQAYjReRv"
          target="_blank"
          rel="noreferrer"
        >
          <span className="sr-only">Join Discord</span>
        </a>
        {!success && (
          <form aria-label="MedFlow early access" onSubmit={submit} noValidate>
            <input
              ref={nameRef}
              className="mf-field"
              aria-label="Your name"
              name="name"
              placeholder={sampleValue('default', 'name')}
              autoComplete="name"
              style={position(847, 407, 370, 55.422)}
              value={name}
              disabled={busy}
              onChange={(event) => update(setName, event.target.value)}
              onFocus={() => setFocused('name')}
              onBlur={() => setFocused(null)}
            />
            <input
              className="mf-field"
              aria-label="Your email address"
              name="email"
              placeholder={sampleValue('default', 'email')}
              inputMode="email"
              autoCapitalize="none"
              spellCheck={false}
              autoComplete="email"
              type="email"
              style={position(847, 476.422, 370, 55.422)}
              value={email}
              disabled={busy}
              aria-invalid={status === 'error'}
              aria-describedby={error ? 'form-message' : undefined}
              onChange={(event) => update(setEmail, event.target.value)}
              onFocus={() => setFocused('email')}
              onBlur={() => setFocused(null)}
            />
            <input
              className="mf-checkbox"
              aria-label="I agree to the processing of my data described in the Privacy Policy"
              type="checkbox"
              checked={consent}
              disabled={busy}
              style={position(847, 547.844, 14, 14)}
              onChange={(event) => update(setConsent, event.target.checked)}
            />
            <a
              className="mf-hit"
              style={position(924.409, 615.344, 72, 16)}
              aria-label="Privacy Policy"
              href="https://aipoch.com/privacy-policy"
              target="_blank"
              rel="noreferrer"
            >
              <span className="sr-only">Privacy Policy</span>
            </a>
            <button
              type="submit"
              className="mf-hit"
              style={position(847, 720.844, 370, 56)}
              disabled={!ready || busy}
              aria-label={busy ? 'Requesting…' : 'Request early access'}
            />
            <span className="sr-only" id="form-message" role="status" aria-live="polite">
              {status === 'error'
                ? 'Enter a valid email address.'
                : status === 'server'
                  ? 'We couldn’t submit your request. Please try again.'
                  : status === 'duplicate'
                    ? 'This email is already on the waitlist.'
                    : busy
                      ? 'Requesting…'
                      : ''}
            </span>
          </form>
        )}
        {success && (
          <>
            <a
              className="mf-hit"
              style={position(857, 672.148, 171, 44)}
              aria-label="Join our Discord"
              href="https://discord.gg/zxQAYjReRv"
              target="_blank"
              rel="noreferrer"
            >
              <span className="sr-only">Join our Discord</span>
            </a>
            <a
              className="mf-hit"
              style={position(1036, 672.148, 171, 44)}
              aria-label="Follow @aipoch_ai"
              href="https://x.com/aipoch_ai"
              target="_blank"
              rel="noreferrer"
            >
              <span className="sr-only">Follow @aipoch_ai</span>
            </a>
            <a
              className="mf-hit"
              style={position(1041.62, 756, 135, 25)}
              aria-label="Explore AIPOCH"
              href="https://aipoch.com/"
            >
              <span className="sr-only">Explore AIPOCH</span>
            </a>
          </>
        )}
      </div>
    </main>
  )
}

// The actual shared components are compiled unchanged into this standalone artifact.
createRoot(document.getElementById('root')).render(
  <PathnameContext.Provider value="/medflow">
    <div className="flex min-h-screen flex-col pt-[var(--nav-h)]">
      <Navbar />
      <MedFlow />
      <Footer />
    </div>
    <CookieConsentBanner />
  </PathnameContext.Provider>
)
