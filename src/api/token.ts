import axios from '../utils/request'
import type {
  PersonalAccessToken,
  CreatedPersonalAccessToken,
  CreateTokenRequest,
  UpdateTokenRequest
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
 * 修改访问令牌的用途说明
 * PATCH /api/auth/tokens/{id}/
 */
export const updatePersonalAccessToken = async (
  id: number,
  data: UpdateTokenRequest
): Promise<PersonalAccessToken> => {
  const response = await axios.patch<PersonalAccessToken>(`/auth/tokens/${id}/`, data)
  return response.data
}

/**
 * 删除访问令牌（删除后使用该令牌的客户端立即失去访问权限）
 * DELETE /api/auth/tokens/{id}/
 */
export const deletePersonalAccessToken = async (id: number): Promise<void> => {
  await axios.delete(`/auth/tokens/${id}/`)
}
