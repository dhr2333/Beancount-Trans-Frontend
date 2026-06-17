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

export interface QueryRecord {
  bql: string
  result_preview: string
}

export interface AssistantChatRequest {
  messages: Array<{ role: ChatRole; content: string }>
  show_bql?: boolean
}

export interface AssistantChatResponse {
  reply: string
  queries: QueryRecord[]
  api_key_source: 'user' | 'platform' | 'none'
  thinking?: string
  reasoning?: string
}

export interface AssistantStatus {
  api_key_configured: boolean
  api_key_source: 'user' | 'platform' | 'none'
  ledger_exists: boolean
  ledger_path: string
}

export type AssistantStreamEvent =
  | { event: 'status'; data: { phase: AssistantPhase } }
  | { event: 'reasoning_delta'; data: { content: string; source?: 'api' | 'planning' } }
  | { event: 'thinking_delta'; data: { content: string } }
  | { event: 'thinking_set'; data: { content: string; reasoning?: string } }
  | { event: 'tool_start'; data: { name: string; query?: string } }
  | { event: 'tool_end'; data: { name: string; bql?: string; result_preview?: string } }
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
