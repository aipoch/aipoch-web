import '@/components/landing/landing-effects.css'
import './medflow-redesign.css'
import { MedFlowRedesignExperience } from './medflow-redesign-experience'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'MedFlow redesign — A new signal is coming · AIPOCH',
  description:
    'Explore the MedFlow redesign preview from AIPOCH and join the waitlist for a new way to turn research complexity into clarity.',
  alternates: {
    canonical: 'https://aipoch.com/medflow-redesign'
  },
  openGraph: {
    title: 'MedFlow redesign — A new signal is coming · AIPOCH',
    description:
      'Explore the MedFlow redesign preview from AIPOCH and join the waitlist for a new way to turn research complexity into clarity.',
    url: 'https://aipoch.com/medflow-redesign',
    siteName: 'AIPOCH',
    type: 'website'
  },
  twitter: {
    card: 'summary_large_image',
    title: 'MedFlow redesign — A new signal is coming · AIPOCH',
    description:
      'Explore the MedFlow redesign preview from AIPOCH and join the waitlist for a new way to turn research complexity into clarity.'
  }
}

const MedFlowRedesignPage = () => {
  // Authorized preview: intentionally excluded from the sitemap by product approval.
  // This authorized preview is intentionally independent from the production /medflow page.
  return (
    <main
      id="top"
      className="medflow-page min-h-screen overflow-hidden bg-[#E9E9E9] text-[#111111]"
    >
      <MedFlowRedesignExperience />
    </main>
  )
}

export default MedFlowRedesignPage
