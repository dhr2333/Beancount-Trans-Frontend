export type ChatRole = 'user' | 'assistant'

export interface ChatMessage {
  role: ChatRole
  content: string
  queries?: QueryRecord[]
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
