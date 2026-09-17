import discord from '../assets/discord.svg' with { type: 'text' }
import reproducible from '../assets/reproducible.svg' with { type: 'text' }
import verifiable from '../assets/verifiable.svg' with { type: 'text' }
import traceable from '../assets/traceable.svg' with { type: 'text' }

const iconSource = (svg) => `data:image/svg+xml,${encodeURIComponent(svg)}`

function AssetIcon({ source, size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" aria-hidden="true">
      <image href={iconSource(source)} width="20" height="20" />
    </svg>
  )
}

export function DiscordIcon() {
  return <AssetIcon source={discord} size={18} />
}

export function MobileIntro({ joinWaitlist }) {
  return (
    <section className="mf-mobile mf-mobile-intro">
      <p className="mf-eyebrow">A NEW SIGNAL IS COMING</p>
      <h1>MEDFLOW</h1>
      <p className="mf-coming">COMING SOON</p>
      <p className="mf-lead">
        We're engineering a new way to turn the complexity of research into clarity you can trust.
      </p>
      <div className="mf-actions">
        <button type="button" className="mf-button mf-primary" onClick={joinWaitlist}>
          Join the waitlist <span aria-hidden="true">→</span>
        </button>
        <a
          className="mf-button"
          href="https://discord.gg/zxQAYjReRv"
          target="_blank"
          rel="noreferrer"
        >
          <DiscordIcon />
          Join Discord
        </a>
      </div>
      <h2 className="mf-promise">
        Not just <em>faster.</em>
        <br />
        Built to be <em>certain.</em>
      </h2>
      <p className="mf-lead">
        MedFlow is the next signal from AIPOCH. We're not ready to reveal everything yet — but we
        can tell you what it's built on. Three things we refuse to compromise on.
      </p>
    </section>
  )
}

export function MobileSuccess() {
  return (
    <section
      className="mf-mobile mf-mobile-success"
      aria-label="Waitlist confirmation"
      tabIndex={-1}
    >
      <div className="mf-success-check" aria-hidden="true">
        ✓
      </div>
      <h2>You're in, Lyla!</h2>
      <p>When MedFlow enters beta, you'll be among the very first to get in.</p>
      <p>
        Keep an eye on your inbox — that's where your <strong>activation code</strong> will arrive.
      </p>
      <p className="mf-activation">🔑 Your activation code ships at launch</p>
      <p>
        While you wait — <strong>join the community</strong> and follow along:
      </p>
      <div className="mf-actions">
        <a
          className="mf-button mf-primary"
          href="https://discord.gg/zxQAYjReRv"
          target="_blank"
          rel="noreferrer"
        >
          <DiscordIcon />
          Join our Discord
        </a>
        <a className="mf-button" href="https://x.com/aipoch_ai" target="_blank" rel="noreferrer">
          <span aria-hidden="true">𝕏</span>Follow @aipoch_ai
        </a>
      </div>
      <div className="mf-success-bottom">
        <span>SIGNAL RECEIVED</span>
        <a href="https://aipoch.com/">Explore AIPOCH →</a>
      </div>
    </section>
  )
}

export function MobilePrinciples() {
  return (
    <section className="mf-mobile mf-principles" aria-label="MedFlow principles">
      {[
        [
          '01',
          'REPRODUCIBLE',
          reproducible,
          'The same question, taken down the same path, returns the same answer — today, and a year from now.'
        ],
        [
          '02',
          'VERIFIABLE',
          verifiable,
          "Confidence isn't an afterthought. It's built in long before you ever begin."
        ],
        [
          '03',
          'TRACEABLE',
          traceable,
          'Every step is accounted for and open to scrutiny — ready for any reviewer, any question.'
        ]
      ].map(([number, title, icon, description]) => (
        <article key={number}>
          <span className="mf-principle-number">{number}</span>
          <h2>
            <AssetIcon source={icon} />
            {title}
          </h2>
          <p>{description}</p>
        </article>
      ))}
    </section>
  )
}
