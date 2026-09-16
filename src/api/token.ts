import axios from '../utils/request'
import type {
  PersonalAccessToken,
  CreatedPersonalAccessToken,
  CreateTokenRequest
} from '../types/token'

/**
 * 个人访问令牌相关 API 调用（供 MCP 客户端接入）
 */

/**
 * 获取当前用户的全部访问令牌
 * GET /api/auth/tokens/
 */
export const listPersonalAccessTokens = async (): Promise<PersonalAccessToken[]> => {
  const response = await axios.get<PersonalAccessToken[]>(`/auth/tokens/`)
  return response.data
}

/**
 * 创建访问令牌；明文令牌仅在本次响应中返回一次
 * POST /api/auth/tokens/
 */
export const createPersonalAccessToken = async (
  data: CreateTokenRequest
): Promise<CreatedPersonalAccessToken> => {
  const response = await axios.post<CreatedPersonalAccessToken>(`/auth/tokens/`, data)
  return response.data
}

/**
 * 撤销访问令牌（幂等，重复撤销不报错）
 * POST /api/auth/tokens/{id}/revoke/
 */
export const revokePersonalAccessToken = async (id: number): Promise<PersonalAccessToken> => {
  const response = await axios.post<PersonalAccessToken>(`/auth/tokens/${id}/revoke/`)
  return response.data
}
