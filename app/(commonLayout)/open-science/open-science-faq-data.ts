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
  },
  {
    question: 'What does a .science package contain in AIPOCH Open-Science?',
    answer:
      'A .science package can carry selected conversation branches, file versions, Notebook records, and verification evidence for review, handoff, and archiving. Desktop, local Web sessions, and the headless CLI support export and import. Imported history is read-only and does not execute code or restore credentials. Included files depend on the export selection. Side Chat conversations, private reading bookmarks, and their notes are excluded. Received verification records describe the sender’s checks, not a rerun on the receiving computer. Review the export preview before sharing. See the .science package guide for content options and export steps.',
    answerLinks: [
      {
        label: '.science package guide',
        href: 'https://aipoch.com/docs/guides/research-packages/'
      }
    ]
  },
  {
    question: 'Can AIPOCH Open-Science turn a research session into a video?',
    answer:
      'Yes. In the desktop app, choose Generate research film on a completed conversation branch. Your configured model prepares the presentation from the recorded session, and an installed local speech engine generates English narration. Review the film before sharing it. You can download its HTML player or export an MP4. A Research Film presents existing work; it does not rerun the analysis or validate its conclusions. See the Research Film guide for preparation, review, and export steps.',
    answerLinks: [
      {
        label: 'Research Film guide',
        href: 'https://aipoch.com/docs/guides/research-films/'
      }
    ]
  }
] as const
