export const INTERRUPTED_REPLY = '生成已中断，请重试'

export type ChatRole = 'user' | 'assistant'

export type AssistantPhase = 'thinking' | 'querying' | 'writing'

export type AssistantFeedbackRating = 'like' | 'dislike'

export interface ChatMessage {
  id?: string
  role: ChatRole
  content: string
  thinking?: string
  reasoning?: string
  thinkingExpanded?: boolean
  queries?: QueryRecord[]
  streaming?: boolean
  status?: AssistantPhase
  feedback?: AssistantFeedbackRating | null
  feedbackSubmitting?: boolean
}

export interface QueryReportLink {
  name: string
  label: string
  path: string
}

export interface QueryRecord {
  bql: string
  result_preview: string
  fava_path?: string
  report?: QueryReportLink | null
}

export interface AssistantChatRequest {
  messages?: Array<{ role: ChatRole; content: string }>
  session_id?: string
  content?: string
  edit_message_id?: string
  show_bql?: boolean
  deep_think?: boolean
}

export interface AssistantChatResponse {
  reply: string
  queries: QueryRecord[]
  thinking?: string
  reasoning?: string
  model?: string
  session_id?: string
  user_message_id?: string
  assistant_message_id?: string
}

export interface AssistantStatus {
  api_key_configured: boolean
  assistant_model: string
  deep_think_supported: boolean
  ledger_exists: boolean
  ledger_path: string
  reference_date?: string
}

export interface AssistantSessionSummary {
  id: string
  title: string
  created: string
  modified: string
}

export interface AssistantSessionDetail extends AssistantSessionSummary {
  title_locked: boolean
  messages: StoredChatMessage[]
}

export type GenerationStatus = 'generating' | 'complete' | 'cancelled' | 'failed'

export interface StoredChatMessage {
  id: string
  role: ChatRole
  content: string
  thinking: string
  reasoning: string
  queries: QueryRecord[]
  position: number
  generation_status?: GenerationStatus
  feedback: AssistantFeedbackRating | null
  created: string
}

export type AssistantStreamEvent =
  | { event: 'session'; data: { id: string; title: string; user_message_id: string; assistant_message_id?: string } }
  | { event: 'status'; data: { phase: AssistantPhase } }
  | { event: 'reasoning_delta'; data: { content: string; source?: 'api' | 'planning' } }
  | { event: 'thinking_set'; data: { content: string; reasoning?: string } }
  | { event: 'tool_start'; data: { name: string; query?: string } }
  | { event: 'tool_end'; data: { name: string; bql?: string; result_preview?: string; fava_path?: string; report?: QueryReportLink | null } }
  | { event: 'delta'; data: { content: string } }
  | { event: 'done'; data: AssistantChatResponse }
  | { event: 'error'; data: { detail: string } }

export interface AssistantFeedbackRequest {
  message_id: string
  rating: AssistantFeedbackRating | null
  user_message: string
  assistant_reply: string
  queries?: QueryRecord[]
  comment?: string
}

export interface AssistantFeedbackResponse {
  message_id: string
  rating: AssistantFeedbackRating | null
  comment?: string
}

export interface AssistantShareTurn {
  userMessage: string
  assistantContent: string
}
