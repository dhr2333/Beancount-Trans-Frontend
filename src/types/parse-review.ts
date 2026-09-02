/**
 * 解析待办审核相关类型定义
 */

export interface OriginalRow {
  transaction_time: string
  transaction_category: string
  counterparty: string
  commodity: string
  transaction_type: string
  amount: string | number
  payment_method?: string
  transaction_status?: string
  bill_identifier?: string
  [key: string]: any
}

export interface TagSource {
  type: 'mapping' | 'source' | 'manual'
  key?: string
  mapping_type?: 'expense' | 'income' | 'asset'
}

export interface TagDetail {
  path: string
  sources: TagSource[]
}

export interface TagOverrides {
  removed_paths: string[]
  added_paths: string[]
}

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
  original_row?: OriginalRow
  tag_details?: TagDetail[]
  tag_overrides?: TagOverrides
  installment_role?: 'purchase' | 'installment' | null
  installment_period?: number | null
}

/**
 * 解析结果
 */
export interface ParseResult {
  file_id: number
  formatted_data: FormattedEntry[]
  created_at: number
  review_expires_at: number
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
  mapping_type?: 'expense' | 'income' | 'asset'
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
  tag_details?: TagDetail[]
  tag_overrides?: TagOverrides
  propagated_entries?: ReparseResponse[]
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
  validation_warning?: string
}

export interface PreviewSyncEntry {
  uuid: string
  edited_formatted: string
}

export interface PreviewSyncRequest {
  entries: PreviewSyncEntry[]
}

export interface PreviewSyncResponse {
  formatted_data: FormattedEntry[]
  removed_count: number
  validation_warnings?: Record<string, string>
}

/**
 * 更新标签请求
 */
export interface UpdateTagsRequest {
  action: 'add' | 'remove'
  tag_path: string
}

/**
 * 更新标签响应
 */
export interface UpdateTagsResponse {
  uuid: string
  edited_formatted: string
  tag_details: TagDetail[]
  tag_overrides: TagOverrides
}

/**
 * 确认写入错误条目
 */
export interface ErrorEntry {
  uuid: string
  index: number
  error_message: string
}

/**
 * 确认写入错误响应
 */
export interface ReparseAllRequest {
  password?: string
}

export interface ReparseAllResponse {
  message: string
  file_id: number
  celery_task_id?: string
}

export interface ParseTaskStatusResponse {
  task_id: string
  file_id?: number
  status: string
  error?: string | null
}

export interface ConfirmWriteErrorResponse {
  error: string
  error_entries?: ErrorEntry[]
}

/**
 * 是否显示「新增映射」按钮。
 * 不计收支条目显示资产映射入口；支出/收入条目显示对应收支映射入口。
 */
export function shouldShowParseReviewCreateMapping(row: FormattedEntry): boolean {
  return row.installment_role !== 'installment'
}

export function isNeutralParseReviewEntry(row: FormattedEntry): boolean {
  const txType = row.original_row?.transaction_type?.trim()
  return txType === '/' || txType === '不计收支'
}

export function isInstallmentRepaymentEntry(row: FormattedEntry): boolean {
  return row.installment_role === 'installment'
}
