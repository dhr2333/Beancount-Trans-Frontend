/**
 * 解析待办审核 API
 */
import axios from '../utils/request'
import type {
  ParseResult,
  ReparseRequest,
  ReparseResponse,
  UpdateEditRequest,
  UpdateEditResponse
} from '../types/parse-review'

/**
 * 获取解析结果
 */
export function getParseResults(taskId: number): Promise<{ data: ParseResult }> {
  return axios.get(`/translate/parse-review/${taskId}/results`)
}

/**
 * 重解析条目
 */
export function reparseEntry(
  taskId: number,
  request: ReparseRequest
): Promise<{ data: ReparseResponse }> {
  return axios.post(`/translate/parse-review/${taskId}/reparse`, request)
}

/**
 * 更新编辑内容
 */
export function updateEntryEdit(
  taskId: number,
  entryUuid: string,
  request: UpdateEditRequest
): Promise<{ data: UpdateEditResponse }> {
  return axios.put(
    `/translate/parse-review/${taskId}/entries/${entryUuid}/edit`,
    request
  )
}

/**
 * 确认写入
 */
export function confirmWrite(taskId: number): Promise<{ data: { message: string; file_id: number } }> {
  return axios.post(`/translate/parse-review/${taskId}/confirm`)
}

/**
 * 重新解析
 */
export function reparseAll(taskId: number): Promise<{ data: { message: string; file_id: number } }> {
  return axios.post(`/translate/parse-review/${taskId}/reparse-all`)
}
