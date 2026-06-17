export type ChatRole = 'user' | 'assistant'

export type AssistantPhase = 'thinking' | 'querying' | 'writing'

export interface ChatMessage {
  role: ChatRole
  content: string
  queries?: QueryRecord[]
  streaming?: boolean
  status?: AssistantPhase
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
}

export interface AssistantStatus {
  api_key_configured: boolean
  api_key_source: 'user' | 'platform' | 'none'
  ledger_exists: boolean
  ledger_path: string
}

export type AssistantStreamEvent =
  | { event: 'status'; data: { phase: AssistantPhase } }
  | { event: 'tool_start'; data: { name: string; query?: string } }
  | { event: 'tool_end'; data: { name: string; bql?: string; result_preview?: string } }
  | { event: 'delta'; data: { content: string } }
  | { event: 'done'; data: AssistantChatResponse }
  | { event: 'error'; data: { detail: string } }
