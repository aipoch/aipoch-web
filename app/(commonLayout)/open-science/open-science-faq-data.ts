import { OPEN_SCIENCE_DOWNLOAD_PAGE_URL } from './open-science-download-data'

/** Share the visible FAQ content with FAQPage JSON-LD to keep the copy consistent. */
export const openScienceFaqItems = [
  {
    question: 'What is Open-Science?',
    answer:
      'Open-Science is AIPOCH’s open-source, local-first and model-agnostic AI research workbench. It combines scientific AI agents, executable research tools, scientific data connectors and traceable artifacts in one desktop workspace.'
  },
  {
    question: 'Is Open-Science free and open source?',
    answer:
      'Yes. The software is distributed under the Apache License 2.0 and does not require a seat license. External AI models, scientific services or compute providers may charge separately.'
  },
  {
    question: 'Which AI models can Open-Science use?',
    answer:
      'The workbench supports multiple providers, compatible gateways and available subscription-based agent backends. Specific capabilities depend on the selected model, provider, API protocol and agent framework.'
  },
  {
    question: 'Is Open-Science a replacement for scientific judgment?',
    answer:
      'No. Open-Science supports research, analysis and research record-keeping. Researchers remain responsible for methods, data governance, interpretation, validation and final decisions.'
  },
  {
    question: 'Where can I download the latest release?',
    answer:
      'Visit the official Open-Science download page for current installers, compatibility information, release notes and known limitations.',
    answerLinkLabel: 'official Open-Science download page',
    answerHref: OPEN_SCIENCE_DOWNLOAD_PAGE_URL
  }
] as const
