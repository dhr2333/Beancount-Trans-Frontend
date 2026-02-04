/**
 * 解析待办审核相关类型定义
 */

/**
 * 格式化条目
 */
export interface FormattedEntry {
  uuid: string
  formatted: string
  edited_formatted: string
  selected_expense_key: string
  expense_candidates_with_score: Array<{
    key: string
    score: number
  }>
  original_row?: any
}

/**
 * 解析结果
 */
export interface ParseResult {
  file_id: number
  formatted_data: FormattedEntry[]
  created_at: number
  expires_at: number
}

/**
 * 解析待办任务
 */
export interface ParseReviewTask {
  id: number
  task_type: 'parse_review'
  status: 'inactive' | 'pending' | 'completed' | 'cancelled'
  file_id: number
  file_name?: string
  created: string
  modified: string
}

/**
 * 重解析请求
 */
export interface ReparseRequest {
  entry_uuid: string
  selected_key: string
}

/**
 * 重解析响应
 */
export interface ReparseResponse {
  uuid: string
  formatted: string
  edited_formatted: string
  selected_expense_key: string
  expense_candidates_with_score: Array<{
    key: string
    score: number
  }>
}

/**
 * 更新编辑内容请求
 */
export interface UpdateEditRequest {
  edited_formatted: string
}

/**
 * 更新编辑内容响应
 */
export interface UpdateEditResponse {
  uuid: string
  edited_formatted: string
}
