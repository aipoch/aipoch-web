// Evaluation snapshots supplied with the article, compiled 19 October to 13 November 2026.
export type AgentGroup =
  | 'aipoch'
  | 'codex'
  | 'claude'
  | 'react'
  | 'smol'
  | 'asta'
  | 'robo'
  | 'other'
  | 'prod'
  | 'evo'
export type RecordSource = 'val' | 'test' | 'local' | 'public'
export type BenchmarkRecord = {
  id: string
  system: string
  model: string
  score: number
  source: RecordSource
  group: AgentGroup
  cost?: number
  log?: string
  date?: string
  /** Official rank as published, when it cannot be derived from the listed scores. */
  rank?: number
}

export const litqa: BenchmarkRecord[] = [
  {
    id: 'litqa-1',
    system: 'AIPOCH Open-Science',
    model: 'gpt-6-astra · literature-retrieval agent',
    score: 90.6667,
    source: 'test',
    group: 'aipoch',
    date: '2026-10-23'
  },
  {
    id: 'litqa-2',
    system: 'AIPOCH Open-Science',
    model: 'deepseek-v4-flash',
    score: 100,
    source: 'val',
    group: 'aipoch'
  },
  {
    id: 'litqa-3',
    system: 'Asta Paper Finder',
    model: 'Gemini 2.0 Flash (unpinned) / gpt-4o-2024-08-06',
    score: 90.6667,
    source: 'test',
    group: 'asta',
    cost: 0.112,
    date: '2025-08-07',
    log: 'aryeh_tiktinsky_ai2_Asta_Paper_Finder_2025-08-07T19-03-14'
  },
  {
    id: 'litqa-4',
    system: 'Asta v0',
    model:
      'Claude Sonnet 4 (2025-05) / Gemini 2.0 Flash (unpinned) / o3 (2025-04) / o3 / GPT-4.1 (2025-04) / gpt-4o-2024-08-06 / GPT-4o (unpinned)',
    score: 90.6667,
    source: 'test',
    group: 'asta',
    cost: 0.112,
    date: '2025-08-13',
    log: 'miked-ai_Asta-v0_2025-08-14T02-11-03'
  },
  {
    id: 'litqa-5',
    system: 'ReAct',
    model: 'claude-opus-4-6',
    score: 86.6667,
    source: 'test',
    group: 'react',
    cost: 1.493,
    date: '2026-04-21'
  },
  {
    id: 'litqa-6',
    system: 'ReAct',
    model: 'claude-sonnet-4-6',
    score: 86.6667,
    source: 'test',
    group: 'react',
    cost: 1.872,
    date: '2026-04-21'
  },
  {
    id: 'litqa-7',
    system: 'ReAct',
    model: 'claude-opus-4-7',
    score: 85.3333,
    source: 'test',
    group: 'react',
    cost: 1.99,
    date: '2026-04-21'
  },
  {
    id: 'litqa-8',
    system: 'ReAct',
    model: 'gpt-5.5-2026-04-23',
    score: 85.3333,
    source: 'test',
    group: 'react',
    cost: 7.324,
    date: '2026-04-27'
  },
  {
    id: 'litqa-9',
    system: 'ReAct',
    model: 'GPT-5 (2025-08)',
    score: 82.6667,
    source: 'test',
    group: 'react',
    cost: 0.389,
    date: '2025-08-11',
    log: 'miked-ai_ReAct-GPT-5_2025-08-11T16-34-47'
  },
  {
    id: 'litqa-10',
    system: 'ReAct',
    model: 'gpt-5.4-2026-03-05',
    score: 80,
    source: 'test',
    group: 'react',
    cost: 3.167,
    date: '2026-04-21'
  },
  {
    id: 'litqa-11',
    system: 'Asta Paper Finder',
    model: 'openai/gpt-4o-mini',
    score: 80,
    source: 'val',
    group: 'asta'
  },
  {
    id: 'litqa-12',
    system: 'ReAct',
    model: 'gemini-3.1-pro-preview',
    score: 77.3333,
    source: 'test',
    group: 'react',
    cost: 4.261,
    date: '2026-04-21'
  },
  {
    id: 'litqa-13',
    system: 'ReAct',
    model: 'GPT-4o (2024-08)',
    score: 66.6667,
    source: 'test',
    group: 'react',
    cost: 0.328,
    date: '2025-08-08',
    log: 'miked-ai_ReAct-GPT-4o_2025-08-08T16-01-09'
  },
  {
    id: 'litqa-14',
    system: 'ReAct',
    model: 'GPT-4.1 (2025-04)',
    score: 65.3333,
    source: 'test',
    group: 'react',
    cost: 0.819,
    date: '2025-08-08',
    log: 'miked-ai_ReAct-GPT-4.1_2025-08-08T16-00-51'
  },
  {
    id: 'litqa-15',
    system: 'ReAct',
    model: 'Claude 3.5 Haiku (2024-10)',
    score: 60,
    source: 'test',
    group: 'react',
    cost: 0.069,
    date: '2025-08-08',
    log: 'miked-ai_ReAct-Claude-3.5-Haiku_2025-08-08T15-59-56'
  },
  {
    id: 'litqa-16',
    system: 'ReAct',
    model: 'o3 (2025-04)',
    score: 57.3333,
    source: 'test',
    group: 'react',
    cost: 0.79,
    date: '2025-08-08',
    log: 'miked-ai_ReAct-o3_2025-08-08T16-01-22'
  },
  {
    id: 'litqa-17',
    system: 'ReAct',
    model: 'Gemini 2.5 Flash (2024-05)',
    score: 57.3333,
    source: 'test',
    group: 'react',
    cost: 0.65,
    date: '2025-08-08',
    log: 'miked-ai_ReAct-Gemini-2.5-Flash_2025-08-08T16-00-31'
  },
  {
    id: 'litqa-18',
    system: 'ReAct',
    model: 'GPT-5 Mini (2025-08)',
    score: 56,
    source: 'test',
    group: 'react',
    cost: 0.118,
    date: '2025-08-11',
    log: 'miked-ai_ReAct-GPT-5-mini_2025-08-11T16-35-18'
  },
  {
    id: 'litqa-19',
    system: 'Smolagents Coder',
    model: 'GPT-5 (2025-08)',
    score: 54.6667,
    source: 'test',
    group: 'smol',
    cost: 0.152,
    date: '2025-08-14',
    log: 'miked-ai_Smolagents-GPT-5_2025-08-14T18-53-46'
  },
  {
    id: 'litqa-20',
    system: 'Smolagents Coder',
    model: 'Claude Sonnet 4 (2025-05)',
    score: 52,
    source: 'test',
    group: 'smol',
    cost: 1.099,
    date: '2025-08-08',
    log: 'miked-ai_Smolagents-Claude-Sonnet-4_2025-08-08T15-58-04'
  },
  {
    id: 'litqa-21',
    system: 'Smolagents Coder',
    model: 'GPT-4.1 (2025-04)',
    score: 50.6667,
    source: 'test',
    group: 'smol',
    cost: 0.095,
    date: '2025-08-08',
    log: 'miked-ai_Smolagents-GPT-4.1_2025-08-08T15-59-03'
  },
  {
    id: 'litqa-22',
    system: 'You.com Search API',
    model: 'openai/gpt-4o-mini',
    score: 50,
    source: 'val',
    group: 'other'
  },
  {
    id: 'litqa-23',
    system: 'Smolagents Coder',
    model: 'GPT-5 Mini (2025-08)',
    score: 48,
    source: 'test',
    group: 'smol',
    cost: 0.036,
    date: '2025-08-14',
    log: 'miked-ai_Smolagents-GPT-5-mini_2025-08-14T18-53-01'
  },
  {
    id: 'litqa-24',
    system: 'ReAct',
    model: 'Claude Sonnet 4 (2025-05)',
    score: 46.6667,
    source: 'test',
    group: 'react',
    cost: 0.553,
    date: '2025-08-08',
    log: 'miked-ai_ReAct-Claude-Sonnet-4_2025-08-08T16-00-10'
  },
  {
    id: 'litqa-25',
    system: 'ReAct',
    model: 'Llama 4 Scout 17B (unpinned)',
    score: 37.3333,
    source: 'test',
    group: 'react',
    cost: 4.326,
    date: '2025-08-08',
    log: 'miked-ai_ReAct-Llama-4-Scout_2025-08-08T15-59-30'
  },
  {
    id: 'litqa-26',
    system: 'You.com Search API',
    model: 'not disclosed',
    score: 36,
    source: 'test',
    group: 'other',
    date: '2025-08-07',
    log: 'aryeh_tiktinsky_ai2_You.com_Search_API_2025-08-07T18-53-46'
  },
  {
    id: 'litqa-27',
    system: 'Smolagents Coder',
    model: 'Gemini 2.5 Flash (2024-05)',
    score: 36,
    source: 'test',
    group: 'smol',
    cost: 0.089,
    date: '2025-08-08',
    log: 'miked-ai_Smolagents-Gemini-2.5-Flash_2025-08-08T15-58-36'
  },
  {
    id: 'litqa-28',
    system: 'Smolagents Coder',
    model: 'GPT-4o (2024-08)',
    score: 20,
    source: 'test',
    group: 'smol',
    cost: 0.105,
    date: '2025-08-08',
    log: 'miked-ai_Smolagents-GPT-4o_2025-08-08T16-08-41'
  },
  {
    id: 'litqa-29',
    system: 'ReAct',
    model: 'anthropic/claude-3-5-haiku-20241022',
    score: 10,
    source: 'val',
    group: 'react'
  },
  {
    id: 'litqa-30',
    system: 'Smolagents Coder',
    model: 'Llama 4 Scout 17B (unpinned)',
    score: 6.6667,
    source: 'test',
    group: 'smol',
    cost: 0.01,
    date: '2025-08-08',
    log: 'miked-ai_Smolagents-Llama-4-Scout_2025-08-08T15-57-17'
  },
  {
    id: 'litqa-31',
    system: 'Smolagents Coder',
    model: 'Claude 3.5 Haiku (2024-10)',
    score: 2.6667,
    source: 'test',
    group: 'smol',
    cost: 0.096,
    date: '2025-08-08',
    log: 'miked-ai_Smolagents-Claude-3.5-Haiku_2025-08-08T15-57-42'
  }
]

export const sqa: BenchmarkRecord[] = [
  {
    id: 'sqa-1',
    system: 'AIPOCH Open-Science',
    model: 'deepseek-v4-flash',
    score: 0.9289,
    source: 'val',
    group: 'aipoch'
  },
  {
    id: 'sqa-2',
    system: 'Asta Scholar QA (w/ tables)',
    model: 'not disclosed',
    score: 0.9192,
    source: 'test',
    group: 'asta'
  },
  {
    id: 'sqa-3',
    system: 'Asta Scholar QA (w/ tables)',
    model: 'not disclosed',
    score: 0.9131,
    source: 'test',
    group: 'asta'
  },
  {
    id: 'sqa-4',
    system: 'ReAct',
    model: 'openai/gpt-5.4-2026-03-05',
    score: 0.9038,
    source: 'test',
    group: 'react'
  },
  {
    id: 'sqa-5',
    system: 'Asta v0',
    model: 'multiple models',
    score: 0.9014,
    source: 'test',
    group: 'asta'
  },
  {
    id: 'sqa-6',
    system: 'Asta Scholar QA (w/ tables)',
    model: 'not disclosed',
    score: 0.9,
    source: 'test',
    group: 'asta'
  },
  {
    id: 'sqa-7',
    system: 'Asta Scholar QA',
    model: 'not disclosed',
    score: 0.899,
    source: 'test',
    group: 'asta'
  },
  {
    id: 'sqa-8',
    system: 'Asta Scholar QA',
    model: 'not disclosed',
    score: 0.8943,
    source: 'test',
    group: 'asta'
  },
  {
    id: 'sqa-9',
    system: 'Asta Scholar QA',
    model: 'not disclosed',
    score: 0.8861,
    source: 'test',
    group: 'asta'
  },
  {
    id: 'sqa-10',
    system: 'Asta Scholar QA',
    model: 'not disclosed',
    score: 0.8824,
    source: 'test',
    group: 'asta'
  },
  {
    id: 'sqa-11',
    system: 'SciSpace Deep Review',
    model: 'not disclosed',
    score: 0.8741,
    source: 'test',
    group: 'prod'
  },
  {
    id: 'sqa-12',
    system: 'ReAct',
    model: 'openai/gpt-5.5-2026-04-23',
    score: 0.8663,
    source: 'test',
    group: 'react'
  },
  {
    id: 'sqa-13',
    system: 'Elicit',
    model: 'not disclosed',
    score: 0.8663,
    source: 'test',
    group: 'prod'
  },
  {
    id: 'sqa-14',
    system: 'ReAct',
    model: 'anthropic/claude-opus-4-7',
    score: 0.8582,
    source: 'test',
    group: 'react'
  },
  {
    id: 'sqa-15',
    system: 'FutureHouse Crow',
    model: 'not disclosed',
    score: 0.8536,
    source: 'test',
    group: 'prod'
  },
  {
    id: 'sqa-16',
    system: 'ReAct',
    model: 'anthropic/claude-opus-4-6',
    score: 0.8494,
    source: 'test',
    group: 'react'
  },
  {
    id: 'sqa-17',
    system: 'FutureHouse Falcon',
    model: 'not disclosed',
    score: 0.8238,
    source: 'test',
    group: 'prod'
  },
  {
    id: 'sqa-18',
    system: 'STORM',
    model: 'not disclosed',
    score: 0.8167,
    source: 'test',
    group: 'prod'
  },
  {
    id: 'sqa-19',
    system: 'ReAct',
    model: 'openai/gpt-5-2025-08-07',
    score: 0.8145,
    source: 'test',
    group: 'react'
  },
  {
    id: 'sqa-20',
    system: 'ReAct',
    model: 'anthropic/claude-sonnet-4-20250514',
    score: 0.802,
    source: 'test',
    group: 'react'
  },
  {
    id: 'sqa-21',
    system: 'OpenAI Deep Research',
    model: 'openai/o3-deep-research-2025-06-26',
    score: 0.794,
    source: 'test',
    group: 'prod'
  },
  {
    id: 'sqa-22',
    system: 'Asta Scholar QA',
    model: 'not disclosed',
    score: 0.7904,
    source: 'test',
    group: 'asta'
  },
  {
    id: 'sqa-23',
    system: 'ReAct',
    model: 'anthropic/claude-sonnet-4-6',
    score: 0.7817,
    source: 'test',
    group: 'react'
  },
  {
    id: 'sqa-24',
    system: 'Smolagents Coder',
    model: 'anthropic/claude-sonnet-4-20250514',
    score: 0.7475,
    source: 'test',
    group: 'smol'
  },
  {
    id: 'sqa-25',
    system: 'Smolagents Coder',
    model: 'openai/gpt-4.1-2025-04-14',
    score: 0.7454,
    source: 'test',
    group: 'smol'
  },
  {
    id: 'sqa-26',
    system: 'ReAct',
    model: 'google/gemini-3.1-pro-preview',
    score: 0.7403,
    source: 'test',
    group: 'react'
  },
  {
    id: 'sqa-27',
    system: 'Perplexity Sonar Deep Research',
    model: 'perplexity/sonar-deep-research',
    score: 0.7038,
    source: 'test',
    group: 'prod'
  },
  {
    id: 'sqa-28',
    system: 'ReAct',
    model: 'openai/gpt-4.1-2025-04-14',
    score: 0.7024,
    source: 'test',
    group: 'react'
  },
  {
    id: 'sqa-29',
    system: 'ReAct',
    model: 'openai/o3-2025-04-16',
    score: 0.6949,
    source: 'test',
    group: 'react'
  },
  {
    id: 'sqa-30',
    system: 'Smolagents Coder',
    model: 'openai/gpt-5-2025-08-07',
    score: 0.6934,
    source: 'test',
    group: 'smol'
  },
  {
    id: 'sqa-31',
    system: 'ReAct',
    model: 'anthropic/claude-3-5-haiku-20241022',
    score: 0.6555,
    source: 'test',
    group: 'react'
  },
  {
    id: 'sqa-32',
    system: 'Smolagents Coder',
    model: 'google/gemini-2.5-flash-preview-05-20',
    score: 0.6441,
    source: 'test',
    group: 'smol'
  },
  {
    id: 'sqa-33',
    system: 'You.com Research API',
    model: 'not disclosed',
    score: 0.608,
    source: 'test',
    group: 'prod'
  },
  {
    id: 'sqa-34',
    system: 'OpenSciLM',
    model: 'not disclosed',
    score: 0.5946,
    source: 'test',
    group: 'prod'
  },
  {
    id: 'sqa-35',
    system: 'Smolagents Coder',
    model: 'openai/gpt-5-mini-2025-08-07',
    score: 0.5808,
    source: 'test',
    group: 'smol'
  },
  {
    id: 'sqa-36',
    system: 'ReAct',
    model: 'openai/gpt-4o-2024-08-06',
    score: 0.5448,
    source: 'test',
    group: 'react'
  },
  {
    id: 'sqa-37',
    system: 'ReAct',
    model: 'google/gemini-2.5-flash-preview-05-20',
    score: 0.5212,
    source: 'test',
    group: 'react'
  },
  {
    id: 'sqa-38',
    system: 'Smolagents Coder',
    model: 'anthropic/claude-3-5-haiku-20241022',
    score: 0.5164,
    source: 'test',
    group: 'smol'
  },
  {
    id: 'sqa-39',
    system: 'Smolagents Coder',
    model: 'openai/gpt-4o-2024-08-06',
    score: 0.4858,
    source: 'test',
    group: 'smol'
  },
  {
    id: 'sqa-40',
    system: 'Smolagents Coder',
    model: 'together/meta-llama/Llama-4-Scout-17B-16E-Instruct',
    score: 0.389,
    source: 'test',
    group: 'smol'
  },
  {
    id: 'sqa-41',
    system: 'ReAct',
    model: 'openai/gpt-5-mini-2025-08-07',
    score: 0.2729,
    source: 'test',
    group: 'react'
  },
  {
    id: 'sqa-42',
    system: 'ReAct',
    model: 'together/meta-llama/Llama-4-Scout-17B-16E-Instruct',
    score: 0.2568,
    source: 'test',
    group: 'react'
  }
]

export const pf: BenchmarkRecord[] = [
  {
    id: 'pf-1',
    system: 'AIPOCH Open-Science',
    model: 'deepseek-v4-flash',
    score: 0.4554,
    source: 'val',
    group: 'aipoch',
    date: '2026-10-09'
  },
  {
    id: 'pf-2',
    system: 'RoboPhD (2)',
    model: 'gpt-5.4-2026-03-05 / gpt-5.4-mini-2026-03-17',
    score: 0.4403,
    source: 'test',
    group: 'robo',
    date: '2026-08-04'
  },
  {
    id: 'pf-3',
    system: 'Asta Paper Finder',
    model: 'gpt-5-mini-2025-08-07 / gpt-4o-2024-08-06 / gemini-3-flash-preview',
    score: 0.4327,
    source: 'test',
    group: 'asta',
    date: '2026-03-17'
  },
  {
    id: 'pf-4',
    system: 'RoboPhD',
    model: 'gpt-5.4-mini-2026-03-17 / claude-sonnet-4-6 / gpt-5.4-2026-03-05',
    score: 0.4318,
    source: 'test',
    group: 'robo',
    date: '2026-08-02'
  },
  {
    id: 'pf-5',
    system: 'Asta Paper Finder',
    model: 'Gemini 2.0 Flash (unpinned) / gpt-4o-2024-08-06',
    score: 0.3972,
    source: 'test',
    group: 'asta',
    date: '2025-08-07'
  },
  {
    id: 'pf-6',
    system: 'RoboPhD (3)',
    model: 'gpt-5.4-mini-2026-03-17 / gpt-5.4-2026-03-05',
    score: 0.3895,
    source: 'test',
    group: 'robo',
    date: '2026-08-09'
  },
  {
    id: 'pf-7',
    system: 'RoboPhD',
    model:
      'gpt-5.4-mini-2026-03-17 / claude-haiku-4-5-20251001 / gpt-5.4-2026-03-05 / claude-sonnet-4-6',
    score: 0.3762,
    source: 'test',
    group: 'robo',
    date: '2026-07-31'
  },
  {
    id: 'pf-8',
    system: 'Asta v0',
    model:
      'Claude Sonnet 4 (2025-05) / Gemini 2.0 Flash / o3 (2025-04) / o3 / GPT-4.1 (2025-04) / gpt-4o-2024-08-06 / GPT-4o',
    score: 0.3757,
    source: 'test',
    group: 'asta',
    date: '2025-08-13'
  },
  {
    id: 'pf-9',
    system: 'RoboPhD (2)',
    model: 'gpt-5.4-mini-2026-03-17 / gpt-5.4-2026-03-05',
    score: 0.3749,
    source: 'test',
    group: 'robo',
    date: '2026-07-20'
  },
  {
    id: 'pf-10',
    system: 'ReAct',
    model: 'claude-opus-4-7',
    score: 0.374,
    source: 'test',
    group: 'react',
    date: '2026-04-21'
  },
  {
    id: 'pf-11',
    system: 'ReAct',
    model: 'claude-opus-4-6',
    score: 0.3719,
    source: 'test',
    group: 'react',
    date: '2026-04-21'
  },
  {
    id: 'pf-12',
    system: 'ReAct',
    model: 'gpt-5.5-2026-04-23',
    score: 0.3603,
    source: 'test',
    group: 'react',
    date: '2026-04-27'
  },
  {
    id: 'pf-13',
    system: 'ReAct',
    model: 'claude-sonnet-4-6',
    score: 0.3565,
    source: 'test',
    group: 'react',
    date: '2026-04-21'
  },
  {
    id: 'pf-14',
    system: 'ReAct',
    model: 'gpt-5.4-2026-03-05',
    score: 0.3015,
    source: 'test',
    group: 'react',
    date: '2026-04-21'
  },
  {
    id: 'pf-15',
    system: 'ReAct',
    model: 'gemini-3.1-pro-preview',
    score: 0.2641,
    source: 'test',
    group: 'react',
    date: '2026-04-21'
  },
  {
    id: 'pf-16',
    system: 'ReAct',
    model: 'GPT-5 (2025-08)',
    score: 0.2637,
    source: 'test',
    group: 'react',
    date: '2025-08-11'
  },
  {
    id: 'pf-17',
    system: 'Smolagents Coder',
    model: 'Claude Sonnet 4 (2025-05)',
    score: 0.2213,
    source: 'test',
    group: 'smol',
    date: '2025-08-08'
  },
  {
    id: 'pf-18',
    system: 'RoboPhD',
    model: 'gpt-5.4-mini-2026-03-17',
    score: 0.2205,
    source: 'test',
    group: 'robo',
    date: '2026-07-27'
  },
  {
    id: 'pf-19',
    system: 'ReAct',
    model: 'GPT-5 Mini (2025-08)',
    score: 0.2204,
    source: 'test',
    group: 'react',
    date: '2025-08-11'
  },
  {
    id: 'pf-20',
    system: 'ReAct',
    model: 'Claude Sonnet 4 (2025-05)',
    score: 0.2026,
    source: 'test',
    group: 'react',
    date: '2025-08-08'
  },
  {
    id: 'pf-21',
    system: 'Smolagents Coder',
    model: 'GPT-5 (2025-08)',
    score: 0.2,
    source: 'test',
    group: 'smol',
    date: '2025-08-14'
  },
  {
    id: 'pf-22',
    system: 'ReAct',
    model: 'o3 (2025-04)',
    score: 0.1928,
    source: 'test',
    group: 'react',
    date: '2025-08-08'
  },
  {
    id: 'pf-23',
    system: 'Smolagents Coder',
    model: 'GPT-5 Mini (2025-08)',
    score: 0.1718,
    source: 'test',
    group: 'smol',
    date: '2025-08-14'
  },
  {
    id: 'pf-24',
    system: 'Smolagents Coder',
    model: 'GPT-4.1 (2025-04)',
    score: 0.1653,
    source: 'test',
    group: 'smol',
    date: '2025-08-08'
  },
  {
    id: 'pf-25',
    system: 'ReAct',
    model: 'GPT-4.1 (2025-04)',
    score: 0.1647,
    source: 'test',
    group: 'react',
    date: '2025-08-08'
  },
  {
    id: 'pf-26',
    system: 'Smolagents Coder',
    model: 'Gemini 2.5 Flash',
    score: 0.1472,
    source: 'test',
    group: 'smol',
    date: '2025-08-08'
  },
  {
    id: 'pf-27',
    system: 'ReAct',
    model: 'GPT-4o (2024-08)',
    score: 0.1293,
    source: 'test',
    group: 'react',
    date: '2025-08-08'
  },
  {
    id: 'pf-28',
    system: 'Smolagents Coder',
    model: 'GPT-4o (2024-08)',
    score: 0.125,
    source: 'test',
    group: 'smol',
    date: '2025-08-08'
  },
  {
    id: 'pf-29',
    system: 'ReAct',
    model: 'Claude 3.5 Haiku (2024-10)',
    score: 0.107,
    source: 'test',
    group: 'react',
    date: '2025-08-08'
  },
  {
    id: 'pf-30',
    system: 'You.com Search API',
    model: 'not disclosed',
    score: 0.072,
    source: 'test',
    group: 'other',
    date: '2025-08-07'
  },
  {
    id: 'pf-31',
    system: 'Smolagents Coder',
    model: 'Llama 4 Scout 17B (unpinned)',
    score: 0.0702,
    source: 'test',
    group: 'smol',
    date: '2025-08-08'
  },
  {
    id: 'pf-32',
    system: 'ReAct',
    model: 'Gemini 2.5 Flash',
    score: 0.065,
    source: 'test',
    group: 'react',
    date: '2025-08-08'
  },
  {
    id: 'pf-33',
    system: 'ReAct',
    model: 'Llama 4 Scout 17B (unpinned)',
    score: 0.0541,
    source: 'test',
    group: 'react',
    date: '2025-08-08'
  },
  {
    id: 'pf-34',
    system: 'Smolagents Coder',
    model: 'Claude 3.5 Haiku (2024-10)',
    score: 0.0464,
    source: 'test',
    group: 'smol',
    date: '2025-08-08'
  }
]

export const b1: BenchmarkRecord[] = [
  {
    id: 'b1-1',
    system: 'AIPOCH Open-Science',
    model: 'GPT-6 Astra',
    score: 79.35,
    source: 'local',
    group: 'aipoch'
  },
  {
    id: 'b1-2',
    system: 'Codex',
    model: 'GPT-6 Astra',
    score: 74.78,
    source: 'local',
    group: 'codex'
  },
  {
    id: 'b1-3',
    system: 'Claude Code',
    model: 'Claude Opus 5',
    score: 72.29,
    source: 'public',
    group: 'claude'
  },
  {
    id: 'b1-4',
    system: 'Codex',
    model: 'GPT-5.6 Sol (record 1)',
    score: 71.78,
    source: 'public',
    group: 'codex'
  },
  {
    id: 'b1-5',
    system: 'AIPOCH Open-Science',
    model: 'DeepSeek v4-flash',
    score: 69.64,
    source: 'local',
    group: 'aipoch'
  },
  {
    id: 'b1-6',
    system: 'Claude Code',
    model: 'GLM-5.3',
    score: 63.05,
    source: 'public',
    group: 'claude'
  },
  {
    id: 'b1-7',
    system: 'Codex',
    model: 'GPT-5.6 Sol (record 2)',
    score: 62.75,
    source: 'public',
    group: 'codex'
  },
  {
    id: 'b1-8',
    system: 'Claude Code',
    model: 'Gemini 3.8 Flash',
    score: 61.33,
    source: 'public',
    group: 'claude'
  },
  {
    id: 'b1-9',
    system: 'Claude Code',
    model: 'Qwen3.8-Max',
    score: 59.14,
    source: 'public',
    group: 'claude'
  },
  {
    id: 'b1-10',
    system: 'Codex',
    model: 'GPT-5.5',
    score: 57.57,
    source: 'public',
    group: 'codex'
  },
  {
    id: 'b1-11',
    system: 'Kimi Code',
    model: 'Kimi K3',
    score: 56.16,
    source: 'public',
    group: 'other'
  },
  {
    id: 'b1-12',
    system: 'Claude Code',
    model: 'Kimi K3',
    score: 55.79,
    source: 'public',
    group: 'claude'
  },
  {
    id: 'b1-13',
    system: 'Claude Code',
    model: 'GLM-5.2',
    score: 54.01,
    source: 'public',
    group: 'claude'
  },
  {
    id: 'b1-14',
    system: 'Claude Code',
    model: 'Claude Opus 4.8',
    score: 52.48,
    source: 'public',
    group: 'claude'
  },
  {
    id: 'b1-15',
    system: 'Claude Code',
    model: 'DeepSeek V4 Flash 0731',
    score: 51.85,
    source: 'public',
    group: 'claude'
  },
  {
    id: 'b1-16',
    system: 'OpenHands',
    model: 'DeepSeek V4 Flash 0731',
    score: 50.6,
    source: 'public',
    group: 'other'
  },
  {
    id: 'b1-17',
    system: 'Claude Code',
    model: 'GLM-5.3-Flash',
    score: 49.27,
    source: 'public',
    group: 'claude'
  },
  {
    id: 'b1-18',
    system: 'Claude Code',
    model: 'Kimi K2.7',
    score: 44.43,
    source: 'public',
    group: 'claude'
  },
  {
    id: 'b1-19',
    system: 'Claude Code',
    model: 'MiniMax M3',
    score: 43.53,
    source: 'public',
    group: 'claude'
  },
  {
    id: 'b1-20',
    system: 'Claude Code',
    model: 'DeepSeek V4 Pro',
    score: 42.97,
    source: 'public',
    group: 'claude'
  },
  {
    id: 'b1-21',
    system: 'Claude Code',
    model: 'MiMo V2.5 Pro',
    score: 41.7,
    source: 'public',
    group: 'claude'
  },
  {
    id: 'b1-22',
    system: 'OpenHands',
    model: 'DeepSeek V4 Pro',
    score: 37.78,
    source: 'public',
    group: 'other'
  },
  {
    id: 'b1-23',
    system: 'Kimi Code',
    model: 'Kimi K2.7',
    score: 29.99,
    source: 'public',
    group: 'other'
  },
  {
    id: 'b1-24',
    system: 'MiMo Code',
    model: 'MiMo V2.5 Pro',
    score: 27.73,
    source: 'public',
    group: 'other'
  }
]

export const b2: BenchmarkRecord[] = [
  {
    id: 'b2-1',
    system: 'AIPOCH Open-Science',
    model: 'GPT-6 Astra',
    score: 56.11,
    source: 'local',
    group: 'aipoch'
  },
  {
    id: 'b2-2',
    system: 'Codex',
    model: 'GPT-6 Astra',
    score: 56.09,
    source: 'local',
    group: 'codex'
  },
  {
    id: 'b2-3',
    system: 'Codex',
    model: 'GPT-5.6 Sol (record 1)',
    score: 49.57,
    source: 'public',
    group: 'codex'
  },
  {
    id: 'b2-4',
    system: 'Claude Code',
    model: 'Claude Opus 5',
    score: 45.8,
    source: 'public',
    group: 'claude'
  },
  {
    id: 'b2-5',
    system: 'Codex',
    model: 'GPT-5.6 Sol (record 2)',
    score: 42.96,
    source: 'public',
    group: 'codex'
  },
  {
    id: 'b2-6',
    system: 'Claude Code',
    model: 'Gemini 3.8 Flash',
    score: 39.13,
    source: 'public',
    group: 'claude'
  },
  {
    id: 'b2-7',
    system: 'Claude Code',
    model: 'Claude Opus 4.8',
    score: 36.25,
    source: 'public',
    group: 'claude'
  },
  {
    id: 'b2-8',
    system: 'Claude Code',
    model: 'GLM-5.3',
    score: 35.45,
    source: 'public',
    group: 'claude'
  },
  {
    id: 'b2-9',
    system: 'Codex',
    model: 'GPT-5.5',
    score: 35.28,
    source: 'public',
    group: 'codex'
  },
  {
    id: 'b2-10',
    system: 'Claude Code',
    model: 'Kimi K3',
    score: 35.24,
    source: 'public',
    group: 'claude'
  },
  {
    id: 'b2-11',
    system: 'Kimi Code',
    model: 'Kimi K3',
    score: 34.05,
    source: 'public',
    group: 'other'
  },
  {
    id: 'b2-12',
    system: 'Claude Code',
    model: 'Qwen3.8-Max',
    score: 32.51,
    source: 'public',
    group: 'claude'
  },
  {
    id: 'b2-13',
    system: 'Claude Code',
    model: 'GLM-5.2',
    score: 30.81,
    source: 'public',
    group: 'claude'
  },
  {
    id: 'b2-14',
    system: 'Claude Code',
    model: 'GLM-5.3-Flash',
    score: 28.66,
    source: 'public',
    group: 'claude'
  },
  {
    id: 'b2-15',
    system: 'Claude Code',
    model: 'DeepSeek V4 Flash 0731',
    score: 26.49,
    source: 'public',
    group: 'claude'
  },
  {
    id: 'b2-16',
    system: 'OpenHands',
    model: 'DeepSeek V4 Flash 0731',
    score: 24.89,
    source: 'public',
    group: 'other'
  },
  {
    id: 'b2-17',
    system: 'Claude Code',
    model: 'Kimi K2.7',
    score: 23.84,
    source: 'public',
    group: 'claude'
  },
  {
    id: 'b2-18',
    system: 'Claude Code',
    model: 'MiniMax M3',
    score: 20.86,
    source: 'public',
    group: 'claude'
  },
  {
    id: 'b2-19',
    system: 'Claude Code',
    model: 'DeepSeek V4 Pro',
    score: 18.79,
    source: 'public',
    group: 'claude'
  },
  {
    id: 'b2-20',
    system: 'Claude Code',
    model: 'MiMo V2.5 Pro',
    score: 18.49,
    source: 'public',
    group: 'claude'
  },
  {
    id: 'b2-21',
    system: 'Kimi Code',
    model: 'Kimi K2.7',
    score: 17.01,
    source: 'public',
    group: 'other'
  },
  {
    id: 'b2-22',
    system: 'OpenHands',
    model: 'DeepSeek V4 Pro',
    score: 16.66,
    source: 'public',
    group: 'other'
  },
  {
    id: 'b2-23',
    system: 'MiMo Code',
    model: 'MiMo V2.5 Pro',
    score: 11.33,
    source: 'public',
    group: 'other'
  }
]

export const b3: BenchmarkRecord[] = [
  {
    id: 'b3-1',
    system: 'AIPOCH Open-Science',
    model: 'GPT-6 Astra',
    score: 59.67,
    source: 'local',
    group: 'aipoch'
  },
  {
    id: 'b3-2',
    system: 'Codex',
    model: 'GPT-6 Astra',
    score: 58.12,
    source: 'local',
    group: 'codex'
  },
  {
    id: 'b3-3',
    system: 'Codex',
    model: 'GPT-5.6 Sol (record 1)',
    score: 51.6,
    source: 'public',
    group: 'codex'
  },
  {
    id: 'b3-4',
    system: 'Codex',
    model: 'GPT-5.6 Sol (record 2)',
    score: 40.86,
    source: 'public',
    group: 'codex'
  },
  {
    id: 'b3-5',
    system: 'Claude Code',
    model: 'Claude Opus 5',
    score: 40.7,
    source: 'public',
    group: 'claude'
  },
  {
    id: 'b3-6',
    system: 'Claude Code',
    model: 'Gemini 3.8 Flash',
    score: 37.79,
    source: 'public',
    group: 'claude'
  },
  {
    id: 'b3-7',
    system: 'Claude Code',
    model: 'GLM-5.3',
    score: 33.09,
    source: 'public',
    group: 'claude'
  },
  {
    id: 'b3-8',
    system: 'Claude Code',
    model: 'Claude Opus 4.8',
    score: 31.73,
    source: 'public',
    group: 'claude'
  },
  {
    id: 'b3-9',
    system: 'Claude Code',
    model: 'GLM-5.3-Flash',
    score: 30.7,
    source: 'public',
    group: 'claude'
  },
  {
    id: 'b3-10',
    system: 'Claude Code',
    model: 'GLM-5.2',
    score: 30.29,
    source: 'public',
    group: 'claude'
  },
  {
    id: 'b3-11',
    system: 'Claude Code',
    model: 'Qwen3.8-Max',
    score: 29.37,
    source: 'public',
    group: 'claude'
  },
  {
    id: 'b3-12',
    system: 'Codex',
    model: 'GPT-5.5',
    score: 29.29,
    source: 'public',
    group: 'codex'
  },
  {
    id: 'b3-13',
    system: 'Kimi Code',
    model: 'Kimi K3',
    score: 28.15,
    source: 'public',
    group: 'other'
  },
  {
    id: 'b3-14',
    system: 'Claude Code',
    model: 'Kimi K3',
    score: 27.78,
    source: 'public',
    group: 'claude'
  },
  {
    id: 'b3-15',
    system: 'Claude Code',
    model: 'DeepSeek V4 Flash',
    score: 24.84,
    source: 'public',
    group: 'claude'
  },
  {
    id: 'b3-16',
    system: 'OpenHands',
    model: 'DeepSeek V4 Flash',
    score: 21.91,
    source: 'public',
    group: 'other'
  },
  {
    id: 'b3-17',
    system: 'Claude Code',
    model: 'MiniMax M3',
    score: 20.61,
    source: 'public',
    group: 'claude'
  },
  {
    id: 'b3-18',
    system: 'Claude Code',
    model: 'Kimi K2.7',
    score: 19.75,
    source: 'public',
    group: 'claude'
  },
  {
    id: 'b3-19',
    system: 'Claude Code',
    model: 'DeepSeek V4 Pro',
    score: 19.2,
    source: 'public',
    group: 'claude'
  },
  {
    id: 'b3-20',
    system: 'Claude Code',
    model: 'MiMo V2.5 Pro',
    score: 16.49,
    source: 'public',
    group: 'claude'
  },
  {
    id: 'b3-21',
    system: 'OpenHands',
    model: 'DeepSeek V4 Pro',
    score: 15.78,
    source: 'public',
    group: 'other'
  },
  {
    id: 'b3-22',
    system: 'Kimi Code',
    model: 'Kimi K2.7',
    score: 15.65,
    source: 'public',
    group: 'other'
  },
  {
    id: 'b3-23',
    system: 'MiMo Code',
    model: 'MiMo V2.5 Pro',
    score: 11.5,
    source: 'public',
    group: 'other'
  }
]

export const b4: BenchmarkRecord[] = [
  {
    id: 'b4-1',
    system: 'AIPOCH Open-Science',
    model: 'GPT-6 Astra',
    score: 59.46,
    source: 'local',
    group: 'aipoch'
  },
  {
    id: 'b4-2',
    system: 'Codex',
    model: 'GPT-6 Astra',
    score: 55.45,
    source: 'local',
    group: 'codex'
  },
  {
    id: 'b4-3',
    system: 'Codex',
    model: 'GPT-5.6 Sol (record 1)',
    score: 50.41,
    source: 'public',
    group: 'codex'
  },
  {
    id: 'b4-4',
    system: 'Claude Code',
    model: 'Claude Opus 5',
    score: 42.39,
    source: 'public',
    group: 'claude'
  },
  {
    id: 'b4-5',
    system: 'Codex',
    model: 'GPT-5.6 Sol (record 2)',
    score: 40.74,
    source: 'public',
    group: 'codex'
  },
  {
    id: 'b4-6',
    system: 'Claude Code',
    model: 'GLM-5.3',
    score: 35.01,
    source: 'public',
    group: 'claude'
  },
  {
    id: 'b4-7',
    system: 'Claude Code',
    model: 'Gemini 3.8 Flash',
    score: 34.52,
    source: 'public',
    group: 'claude'
  },
  {
    id: 'b4-8',
    system: 'Claude Code',
    model: 'Qwen3.8-Max',
    score: 34.46,
    source: 'public',
    group: 'claude'
  },
  {
    id: 'b4-9',
    system: 'Codex',
    model: 'GPT-5.5',
    score: 30.46,
    source: 'public',
    group: 'codex'
  },
  {
    id: 'b4-10',
    system: 'Claude Code',
    model: 'Claude Opus 4.8',
    score: 29.59,
    source: 'public',
    group: 'claude'
  },
  {
    id: 'b4-11',
    system: 'Claude Code',
    model: 'Kimi K3',
    score: 29.57,
    source: 'public',
    group: 'claude'
  },
  {
    id: 'b4-12',
    system: 'Claude Code',
    model: 'GLM-5.2',
    score: 27.27,
    source: 'public',
    group: 'claude'
  },
  {
    id: 'b4-13',
    system: 'Kimi Code',
    model: 'Kimi K3',
    score: 26.53,
    source: 'public',
    group: 'other'
  },
  {
    id: 'b4-14',
    system: 'Claude Code',
    model: 'GLM-5.3-Flash',
    score: 25.43,
    source: 'public',
    group: 'claude'
  },
  {
    id: 'b4-15',
    system: 'OpenHands',
    model: 'DeepSeek V4 Flash',
    score: 24.99,
    source: 'public',
    group: 'other'
  },
  {
    id: 'b4-16',
    system: 'Claude Code',
    model: 'DeepSeek V4 Flash',
    score: 24.41,
    source: 'public',
    group: 'claude'
  },
  {
    id: 'b4-17',
    system: 'Claude Code',
    model: 'Kimi K2.7',
    score: 21.34,
    source: 'public',
    group: 'claude'
  },
  {
    id: 'b4-18',
    system: 'Claude Code',
    model: 'MiniMax M3',
    score: 21.21,
    source: 'public',
    group: 'claude'
  },
  {
    id: 'b4-19',
    system: 'Claude Code',
    model: 'DeepSeek V4 Pro',
    score: 18.94,
    source: 'public',
    group: 'claude'
  },
  {
    id: 'b4-20',
    system: 'Claude Code',
    model: 'MiMo V2.5 Pro',
    score: 16.33,
    source: 'public',
    group: 'claude'
  },
  {
    id: 'b4-21',
    system: 'OpenHands',
    model: 'DeepSeek V4 Pro',
    score: 16.28,
    source: 'public',
    group: 'other'
  },
  {
    id: 'b4-22',
    system: 'Kimi Code',
    model: 'Kimi K2.7',
    score: 16.22,
    source: 'public',
    group: 'other'
  },
  {
    id: 'b4-23',
    system: 'MiMo Code',
    model: 'MiMo V2.5 Pro',
    score: 14.11,
    source: 'public',
    group: 'other'
  }
]

export type SourceFilter = 'all' | RecordSource
/** ASI comparisons retain local references; AstaBench filters keep question splits separate. */
export function filterRecords(records: BenchmarkRecord[], source: SourceFilter) {
  return records
    .filter(
      (record) =>
        source === 'all' ||
        record.source === source ||
        ((source === 'public' || source === 'local') && record.group === 'aipoch')
    )
    .sort((a, b) => b.score - a.score)
}
export function matchDistractorRecords() {
  return b4.flatMap((record) => {
    const previous = b3.find(
      (other) => other.system === record.system && other.model === record.model
    )
    return previous
      ? [{ ...record, previousScore: previous.score, delta: record.score - previous.score }]
      : []
  })
}

type Row = [system: string, model: string, score: number, group: AgentGroup, rank?: number]
/** Compact builder for leaderboard snapshots whose records share one split and source. */
function snapshot(prefix: string, source: RecordSource, rows: Row[]): BenchmarkRecord[] {
  return rows.map(([system, model, score, group, rank], index) => ({
    id: `${prefix}-${index + 2}`,
    system,
    model,
    score,
    source,
    group,
    ...(rank === undefined ? {} : { rank })
  }))
}

// AstaBench LitQA2-FullText (multiple-choice QA), official test split, 75 questions.
// Local run compiled 2 November 2026; official snapshot of 28 October 2026.
export const litqaFull: BenchmarkRecord[] = [
  {
    id: 'lqf-1',
    system: 'AIPOCH Open-Science',
    model: 'deepseek-flash · Max',
    score: 93.3333,
    source: 'test',
    group: 'aipoch'
  },
  ...snapshot('lqf', 'test', [
    ['ReAct', 'claude-opus-4-6', 90.6667, 'react'],
    ['ReAct', 'claude-sonnet-4-6', 89.3333, 'react'],
    ['ReAct', 'gpt-5.4-2026-03-05', 89.3333, 'react'],
    ['ReAct', 'gpt-5.5-2026-04-23', 89.3333, 'react'],
    ['ReAct', 'claude-opus-4-7', 84, 'react'],
    ['ReAct', 'gemini-3.1-pro-preview', 82.6667, 'react'],
    ['ReAct', 'GPT-5 (2025-08)', 82.6667, 'react'],
    ['ReAct', 'o3 (2025-04)', 80, 'react'],
    ['ReAct', 'GPT-4.1 (2025-04)', 77.3333, 'react'],
    ['ReAct', 'GPT-5 Mini (2025-08)', 74.6667, 'react'],
    [
      'FutureHouse Falcon',
      'GPT-4.1 Mini (unpinned) / Gemini 2.5 Flash (2024-05) / o3 Mini (unpinned)',
      74.6667,
      'prod'
    ],
    [
      'Perplexity Sonar Deep Research',
      'Gemini 2.5 Flash (2024-05) / Sonar Deep Research (unpinned)',
      73.3333,
      'prod'
    ],
    ['Smolagents Coder', 'GPT-5 (2025-08)', 73.3333, 'smol'],
    [
      'FutureHouse Crow',
      'GPT-4.1 Mini (unpinned) / o3 Mini (unpinned) / Gemini 2.5 Flash (2024-05)',
      72,
      'prod'
    ],
    [
      'Asta v0',
      'Claude Sonnet 4 (2025-05) / Gemini 2.0 Flash (unpinned) / o3 (2025-04) / o3 / GPT-4.1 (2025-04) / gpt-4o-2024-08-06 / GPT-4o (unpinned)',
      70.6667,
      'asta'
    ],
    ['ReAct', 'Claude Sonnet 4 (2025-05)', 68, 'react'],
    ['Smolagents Coder', 'GPT-4.1 (2025-04)', 65.3333, 'smol'],
    ['Smolagents Coder', 'GPT-5 Mini (2025-08)', 50.6667, 'smol'],
    ['Smolagents Coder', 'Claude Sonnet 4 (2025-05)', 50.6667, 'smol'],
    ['Smolagents Coder', 'Llama 4 Scout 17B (unpinned)', 42.6667, 'smol'],
    ['ReAct', 'Llama 4 Scout 17B (unpinned)', 41.3333, 'react'],
    ['Smolagents Coder', 'Gemini 2.5 Flash (2024-05)', 41.3333, 'smol'],
    ['ReAct', 'Gemini 2.5 Flash (2024-05)', 36, 'react'],
    ['ReAct', 'Claude 3.5 Haiku (2024-10)', 32, 'react'],
    ['Smolagents Coder', 'Claude 3.5 Haiku (2024-10)', 25.3333, 'smol'],
    ['ReAct', 'GPT-4o (2024-08)', 22.6667, 'react'],
    ['Smolagents Coder', 'GPT-4o (2024-08)', 14.6667, 'smol'],
    ['You.com Research API', 'not disclosed', 8, 'prod']
  ])
]

// AstaBench CORE-Bench-Hard, official test split, 37 tasks. Compiled 6 November 2026.
export const coreBench: BenchmarkRecord[] = [
  {
    id: 'core-1',
    system: 'AIPOCH Open-Science',
    model: 'DeepSeek Flash (deepseek-flash) · max',
    score: 97.2973,
    source: 'test',
    group: 'aipoch'
  },
  ...snapshot('core', 'test', [
    ['ReAct', 'gpt-5.4-2026-03-05', 94.59, 'react'],
    ['ReAct', 'gpt-5.5-2026-04-23', 91.89, 'react'],
    ['ReAct', 'gemini-3.1-pro-preview', 89.19, 'react'],
    ['ReAct', 'claude-opus-4-6', 89.19, 'react'],
    ['ReAct', 'claude-opus-4-7', 86.49, 'react'],
    ['ReAct', 'claude-sonnet-4-6', 72.97, 'react'],
    ['EvoScientist-Code', 'GPT-5 (2025-08)', 66.67, 'evo'],
    ['ReAct', 'o3 (2025-04)', 56.76, 'react'],
    ['Asta v0', 'Claude Sonnet 4 (2025-05) (+ 6)', 48.65, 'asta'],
    ['ReAct', 'GPT-5 (2025-08)', 45.95, 'react'],
    ['ReAct', 'GPT-5 Mini (2025-08)', 45.95, 'react'],
    ['ReAct', 'Claude Sonnet 4 (2025-05)', 40.54, 'react'],
    ['Smolagents Coder', 'Claude Sonnet 4 (2025-05)', 32.43, 'smol'],
    ['Smolagents Coder', 'GPT-4.1 (2025-04)', 21.62, 'smol'],
    ['ReAct', 'GPT-4.1 (2025-04)', 18.92, 'react'],
    ['Smolagents Coder', 'GPT-5 (2025-08)', 13.51, 'smol'],
    ['Smolagents Coder', 'Gemini 2.5 Flash (2024-05)', 13.51, 'smol'],
    ['ReAct', 'GPT-4o (2024-08)', 5.41, 'react'],
    ['Smolagents Coder', 'GPT-5 Mini (2025-08)', 5.41, 'smol'],
    ['Smolagents Coder', 'GPT-4o (2024-08)', 5.41, 'smol'],
    ['ReAct', 'Gemini 2.5 Flash (2024-05)', 2.7, 'react'],
    ['ReAct', 'Claude 3.5 Haiku (2024-10)', 0, 'react'],
    ['ReAct', 'Llama 4 Scout 17B (unpinned)', 0, 'react'],
    ['Smolagents Coder', 'Claude 3.5 Haiku (2024-10)', 0, 'smol'],
    ['Smolagents Coder', 'Llama 4 Scout 17B (unpinned)', 0, 'smol']
  ])
]

// AstaBench DiscoveryBench. Local: 25 validation tasks, deepseek-v4-flash judge (9 November
// 2026). Official: full test split, gpt-4-1106-preview judge. Official rank 3 is absent from the
// compiled snapshot, so ranks are kept as published rather than derived.
export const discovery: BenchmarkRecord[] = [
  {
    id: 'disc-1',
    system: 'AIPOCH Open-Science',
    model: 'deepseek-v4-flash',
    score: 0.7467,
    source: 'val',
    group: 'aipoch'
  },
  ...snapshot('disc', 'test', [
    ['ReAct', 'openai/gpt-5.5-2026-04-23', 0.3893, 'react', 1],
    ['ReAct', 'openai/gpt-5.4-2026-03-05', 0.3776, 'react', 2],
    ['ReAct', 'google/gemini-3.1-pro-preview', 0.3707, 'react', 4],
    ['EvoScientist Coder', 'openrouter/moonshotai/kimi-k2.5', 0.3433, 'evo', 5],
    ['ReAct', 'openai/o3-2025-04-16', 0.3367, 'react', 6],
    ['Asta v0', 'multiple models (official field: mockllm/model)', 0.3317, 'asta', 7],
    ['ReAct', 'anthropic/claude-opus-4-7', 0.3281, 'react', 8],
    ['ReAct', 'anthropic/claude-opus-4-6', 0.3158, 'react', 9],
    ['Asta DataVoyager', 'openai/o3', 0.3113, 'asta', 10],
    ['ReAct', 'openai/gpt-4.1-2025-04-14', 0.3054, 'react', 11],
    ['ReAct', 'openai/gpt-5-2025-08-07', 0.3048, 'react', 12],
    ['ReAct', 'anthropic/claude-sonnet-4-6', 0.2996, 'react', 13],
    ['Asta DataVoyager', 'multiple models (official field: mockllm/model)', 0.2988, 'asta', 14],
    ['Asta DataVoyager', 'openai/gpt-5', 0.2956, 'asta', 15],
    ['Smolagents Coder', 'anthropic/claude-sonnet-4-20250514', 0.288, 'smol', 16],
    ['Smolagents Coder', 'openai/gpt-4.1-2025-04-14', 0.284, 'smol', 17],
    ['Smolagents Coder', 'openai/gpt-5-mini-2025-08-07', 0.2768, 'smol', 18],
    ['Asta DataVoyager', 'openai/gpt-5', 0.2704, 'asta', 19],
    ['ReAct', 'openai/gpt-5-mini-2025-08-07', 0.2692, 'react', 20],
    ['Smolagents Coder', 'openai/gpt-5-2025-08-07', 0.2673, 'smol', 21],
    ['Asta DataVoyager', 'anthropic/claude-sonnet-4', 0.2572, 'asta', 22],
    ['Smolagents Coder', 'google/gemini-2.5-flash-preview-05-20', 0.2473, 'smol', 23],
    ['ReAct', 'anthropic/claude-3-5-haiku-20241022', 0.2432, 'react', 24],
    ['ReAct', 'anthropic/claude-sonnet-4-20250514', 0.2322, 'react', 25],
    ['Smolagents Coder', 'together/meta-llama/Llama-4-Scout-17B-16E-Instruct', 0.2016, 'smol', 26],
    ['Smolagents Coder', 'openai/gpt-4o-2024-08-06', 0.1782, 'smol', 27],
    ['Smolagents Coder', 'anthropic/claude-3-5-haiku-20241022', 0.1651, 'smol', 28],
    ['ReAct', 'openai/gpt-4o-2024-08-06', 0.1323, 'react', 29],
    ['ReAct', 'together/meta-llama/Llama-4-Scout-17B-16E-Instruct', 0.0586, 'react', 30],
    ['ReAct', 'google/gemini-2.5-flash-preview-05-20', 0.0193, 'react', 31]
  ])
]
/** Per-task score distribution of the local DiscoveryBench run; partial = 25 − 18 − 5. */
export const discoveryDistribution = { tasks: 25, full: 18, partial: 2, zero: 5, mean: 0.7467 }

// Terminal-Bench-Science 0.1, 70 tasks. Local: 145 of 210 attempts passed (13 November 2026).
// Official v0-1-eval leaderboard snapshot of 13 November 2026, 10:55 Beijing time.
export const tbScienceAttempts = { tasks: 70, attempts: 210, passed: 145 }
export const tbScience: BenchmarkRecord[] = [
  {
    id: 'tbs-1',
    system: 'AIPOCH Open-Science',
    model: 'GPT-6 Astra · max',
    score: 69.0476,
    source: 'local',
    group: 'aipoch'
  },
  ...snapshot('tbs', 'public', [
    ['Codex', 'GPT-6 Astra', 68.1, 'codex'],
    ['Claude Code', 'Opus 5.5', 63.33, 'claude'],
    ['Claude Code', 'Fable 5.1', 40, 'claude'],
    ['Claude Code', 'Opus 5', 30, 'claude'],
    ['Codex', 'GPT-5.6 Sol', 22.38, 'codex'],
    ['Claude Code', 'Fable 5', 21.43, 'claude'],
    ['Codex', 'DeepSeek V4.1 Flash', 15.71, 'codex'],
    ['Grok Build', 'Grok 4.7', 14.29, 'other'],
    ['mini-SWE-agent', 'Gemini 3.8 Flash', 12.38, 'other'],
    ['Claude Code', 'Opus 4.8', 10.48, 'claude'],
    ['Codex', 'GPT-5.6 Terra', 8.57, 'codex'],
    ['Claude Code', 'GLM 5.3', 8.1, 'claude'],
    ['Claude Code', 'Kimi K3', 7.14, 'claude'],
    ['Grok Build', 'Grok 4.6', 7.14, 'other'],
    ['mini-SWE-agent', 'Gemini 3.7 Flash', 5.71, 'other'],
    ['Codex', 'DeepSeek V4 Pro', 3.81, 'codex'],
    ['Codex', 'GPT-5.6 Luna', 3.33, 'codex']
  ])
]

// Paper-scale research tasks: four agents, the same ten tasks, one sealed run each.
export type SuiteAgentId = 'aipoch' | 'codex' | 'evo' | 'claude'
export type ReplayClass = 'ok' | 'diff' | 'fail'
export const suiteAgents: {
  id: SuiteAgentId
  name: string
  harness: string
  model: string
}[] = [
  {
    id: 'aipoch',
    name: 'AIPOCH Open-Science',
    harness: 'Open-Science 1.0.3 (B19: 0.37.1)',
    model: 'GPT-6.1 Sol · high'
  },
  { id: 'codex', name: 'Codex', harness: 'Codex CLI 0.158.0', model: 'GPT-6.1 Sol · high' },
  { id: 'evo', name: 'EvoScientist', harness: 'EvoScientist v0.4.2', model: 'GPT-6.1 Sol · high' },
  {
    id: 'claude',
    name: 'Claude Science',
    harness: 'Claude Science',
    model: 'Opus 5.5 as displayed (alias claude-opus-4-8) · high, thinking on'
  }
]
export const suiteTasks: {
  id: string
  domain: 'bioinformatics' | 'clinical'
  title: string
  version: string
  doi: string
}[] = [
  {
    id: 'B12',
    domain: 'bioinformatics',
    title: 'Drug-specific and time-dependent chromatin responses in cardiomyocytes',
    version: '6.0.0',
    doi: '10.1371/journal.pgen.1011900'
  },
  {
    id: 'B13',
    domain: 'bioinformatics',
    title: 'Ovarian culture programs and clinical chemotherapy refractoriness',
    version: '10.0.0',
    doi: '10.1016/j.mcpro.2025.100965'
  },
  {
    id: 'B14',
    domain: 'bioinformatics',
    title: 'Cell states and mosaic GNAS biology in fibrous dysplasia',
    version: '7.0.0',
    doi: '10.1016/j.ajhg.2025.07.018'
  },
  {
    id: 'B19',
    domain: 'bioinformatics',
    title: 'Malignant-cell states and immune responses in tubo-ovarian cancer',
    version: '6.0.0',
    doi: '10.1038/s41590-024-01943-5'
  },
  {
    id: 'B21',
    domain: 'bioinformatics',
    title: 'Immune-state and clonal evidence for durable response after CAR-T',
    version: '4.0.0',
    doi: '10.1038/s41467-025-59904-x'
  },
  {
    id: 'C04',
    domain: 'clinical',
    title: 'Methylcobalamin during adjuvant capecitabine',
    version: '4.0.1',
    doi: '10.1136/bmj-2025-084290'
  },
  {
    id: 'C12',
    domain: 'clinical',
    title: 'Individualized recommendations for hospitalized patients with acute kidney injury',
    version: '4.0.0',
    doi: '10.1001/jama.2024.22718'
  },
  {
    id: 'C33',
    domain: 'clinical',
    title: 'Automated insulin delivery in older adults with type 1 diabetes',
    version: '1.0.0',
    doi: '10.1056/EVIDoa2400200'
  },
  {
    id: 'C34',
    domain: 'clinical',
    title: 'Brain and systemic physiology during circulatory arrest',
    version: '2.0.0',
    doi: '10.1038/s41591-025-03889-z'
  },
  {
    id: 'C35',
    domain: 'clinical',
    title: 'Cardiovascular risk equations and preventive-treatment policy',
    version: '1.0.0',
    doi: '10.1001/jama.2024.12537'
  }
]
/** Scores out of 100 and the independent replay outcome, in suiteTasks order. */
export const suiteResults: Record<SuiteAgentId, [score: number, replay: string][]> = {
  aipoch: [
    [96, 'executed'],
    [87, 'executed_with_comparison_differences'],
    [93, 'executed'],
    [82, 'executed'],
    [85, 'executed_with_comparison_differences'],
    [100, 'executed'],
    [92, 'executed'],
    [91, 'consistency_passed'],
    [90, 'consistency_passed'],
    [83, 'consistency_passed']
  ],
  codex: [
    [92, 'passed'],
    [88, 'passed_with_auxiliary_file_missing'],
    [90, 'passed'],
    [81, 'passed_verified_reuse'],
    [85, 'passed'],
    [98, 'passed'],
    [89, 'passed'],
    [90, 'passed_timing_difference_only'],
    [83, 'passed_with_auxiliary_files_missing'],
    [87, 'passed']
  ],
  evo: [
    [97, 'reproduced'],
    [90, 'reproduced'],
    [93, 'reproduced'],
    [83, 'reproduced'],
    [85, 'reproduced'],
    [96, 'reproduced'],
    [89, 'reproduced'],
    [89, 'reproduced'],
    [76, 'reproduced'],
    [80, 'reproduced_with_equivalent_serialization']
  ],
  claude: [
    [40, 'failed'],
    [30, 'failed'],
    [35, 'failed'],
    [17, 'failed'],
    [36, 'outputs_regenerated'],
    [58, 'outputs_regenerated'],
    [60, 'outputs_partially_regenerated'],
    [48, 'failed'],
    [30, 'skipped_missing_steps'],
    [33, 'no_outputs_observed']
  ]
}
const replayDiffs = new Set([
  'executed_with_comparison_differences',
  'passed_with_auxiliary_file_missing',
  'passed_with_auxiliary_files_missing',
  'outputs_partially_regenerated'
])
const replayFailures = new Set(['failed', 'skipped_missing_steps', 'no_outputs_observed'])
export function replayClass(status: string): ReplayClass {
  return replayFailures.has(status) ? 'fail' : replayDiffs.has(status) ? 'diff' : 'ok'
}
export function replayLabel(status: string) {
  const text = status.replaceAll('_', ' ')
  return text.charAt(0).toUpperCase() + text.slice(1)
}
/** Equal-weight means per task group, matching the supplied summary (one decimal). */
export function suiteMeans(agent: SuiteAgentId) {
  const scores = suiteResults[agent].map(([score]) => score)
  const mean = (values: number[]) => values.reduce((sum, value) => sum + value, 0) / values.length
  return {
    bioinformatics: mean(scores.slice(0, 5)),
    clinical: mean(scores.slice(5)),
    overall: mean(scores)
  }
}

export type MatchOutcome = 'win' | 'tie' | 'loss'
/** Open-Science against one rival on each task, in suiteTasks order. */
export function suiteHeadToHead(rival: Exclude<SuiteAgentId, 'aipoch'>) {
  const outcomes: MatchOutcome[] = suiteResults.aipoch.map(([ours], index) => {
    const theirs = suiteResults[rival][index][0]
    return ours > theirs ? 'win' : ours === theirs ? 'tie' : 'loss'
  })
  const count = (outcome: MatchOutcome) => outcomes.filter((item) => item === outcome).length
  return { outcomes, wins: count('win'), ties: count('tie'), losses: count('loss') }
}
/** Headline facts for Open-Science on the research tasks, derived from the score matrix. */
export function suiteHighlights() {
  const agents = Object.keys(suiteResults) as SuiteAgentId[]
  const best = suiteTasks.map((_, task) =>
    Math.max(...agents.map((agent) => suiteResults[agent][task][0]))
  )
  const ours = suiteResults.aipoch.map(([score]) => score)
  const floors = Object.fromEntries(
    agents.map((agent) => [agent, Math.min(...suiteResults[agent].map(([score]) => score))])
  ) as Record<SuiteAgentId, number>
  const perfect = agents.flatMap((agent) =>
    suiteResults[agent].flatMap(([score], task) =>
      score === 100 ? [{ agent, task: suiteTasks[task].id }] : []
    )
  )
  return {
    bestOrShared: ours.filter((score, task) => score === best[task]).length,
    clinicalOutright: suiteTasks.filter(
      (task, index) =>
        task.domain === 'clinical' &&
        agents.every((agent) => agent === 'aipoch' || suiteResults[agent][index][0] < ours[index])
    ).length,
    floors,
    perfect,
    replaysPassed: suiteResults.aipoch.filter(([, replay]) => replayClass(replay) !== 'fail').length
  }
}
