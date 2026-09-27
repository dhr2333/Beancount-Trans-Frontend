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
  /** 查询所属账本；'self' 或省略表示「我的账本」；其他值为共享账本的某个别名（无别名时为来源用户名） */
  ledger?: string
}

export interface AssistantChatRequest {
  messages?: Array<{ role: ChatRole; content: string }>
  session_id?: string
  content?: string
  edit_message_id?: string
  show_bql?: boolean
  deep_think?: boolean
  /** 参与对比的共享账本绑定 id 列表 */
  shared_binding_ids?: number[]
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
  | { event: 'tool_end'; data: { name: string; bql?: string; result_preview?: string; fava_path?: string; report?: QueryReportLink | null; ledger?: string } }
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

/** 共享账本绑定（接收方视角） */
export interface SharedLedgerBinding {
  id: number
  /** 共享账本所有者的用户名 */
  owner_username: string
  /** 别名列表（可为空；Copilot 可用其中任意一个别名识别该账本，为空时使用 owner_username） */
  aliases: string[]
  /** 令牌当前是否可用（未撤销且未过期） */
  usable: boolean
  /** 令牌过期时间；null 表示长期有效 */
  expires_at: string | null
  /** 最后一次使用时间；null 表示从未使用 */
  last_used_at: string | null
  /** 创建时间 */
  created: string
}

/** 绑定共享账本请求参数 */
export interface BindSharedLedgerRequest {
  /** 对方提供的 bct_… 个人访问令牌 */
  token: string
  /** 别名列表（可选；每项 ≤64，不能为保留值 self，不能与其他绑定重复） */
  aliases?: string[]
}
