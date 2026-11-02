// Export-shaped activities include deliberately unsafe fields to exercise the display boundary.
export const COMPACTION_INTERNAL_TEXT = 'COMPACTION_INTERNAL_INSTRUCTIONS'
export const compactionActivities = ['in_progress', 'completed', 'failed', 'unrecognized'].map(
  (status, index) => ({
    id: `context-compaction:sample-${index}`,
    kind: 'tool',
    providerToolName: 'ContextCompaction',
    title: COMPACTION_INTERNAL_TEXT,
    status,
    promptMessageId: 'question',
    createdAt: 1790133045297 + index * 0.1,
    updatedAt: 1790133045298 + index * 0.1,
    rawInput: { instructions: COMPACTION_INTERNAL_TEXT },
    rawOutput: `${COMPACTION_INTERNAL_TEXT} C:\\Users\\demo\\private.md`,
    toolContent: [{ type: 'text', content: { type: 'text', text: COMPACTION_INTERNAL_TEXT } }],
    toolLocations: [{ path: '/Users/demo/private.md' }],
    // Even malformed extra card fields must not bypass compaction classification.
    elicitation: { message: COMPACTION_INTERNAL_TEXT, fields: [] },
    error: { message: COMPACTION_INTERNAL_TEXT }
  })
)

export const compactionSession = {
  title: 'Compacted conversation',
  createdAt: 1790133045296,
  messages: [
    { id: 'question', role: 'user', content: 'Continue the analysis.', createdAt: 1790133045296 },
    {
      id: 'answer',
      role: 'agent',
      content: 'The analysis is complete.',
      status: 'complete',
      createdAt: 1790133045300,
      completedAt: 1790133045301
    }
  ],
  conversationGraph: { activities: compactionActivities }
}
