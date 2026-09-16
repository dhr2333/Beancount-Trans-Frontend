/**
 * 个人访问令牌（供 Claude Code / Cursor 等 MCP 客户端接入使用的长期凭证）
 */

/**
 * 令牌列表项（不含明文令牌）
 */
export interface PersonalAccessToken {
  /** 主键 */
  id: number
  /** 用途说明，如 Claude Code */
  name: string
  /** 明文令牌前缀，便于人工识别 */
  prefix: string
  /** 空格分隔的权限范围，如 ledger:read */
  scopes: string
  /** 过期时间；null 表示长期有效 */
  expires_at: string | null
  /** 最后一次使用时间；null 表示从未使用 */
  last_used_at: string | null
  /** 撤销时间；null 表示未撤销 */
  revoked_at: string | null
  /** 创建时间 */
  created: string
}

/**
 * 新建令牌的响应：仅本次响应包含明文令牌
 */
export interface CreatedPersonalAccessToken extends PersonalAccessToken {
  /** 明文令牌，仅创建时返回一次 */
  token: string
}

/**
 * 新建令牌请求参数
 */
export interface CreateTokenRequest {
  /** 用途说明 */
  name: string
  /** 有效天数（1~3650）；不传或传 null 表示长期有效 */
  expires_in_days?: number | null
}
