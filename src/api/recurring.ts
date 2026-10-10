/**
 * 循环待办定义相关 API 调用函数
 */
import axios from '../utils/request'
import type {
  RecurringTask,
  RecurringTaskPayload,
  RecurrencePreview
} from '../types/reconciliation'

const API_BASE = '/reconciliation/recurring-tasks'

/**
 * 获取循环待办定义列表（后端无分页）
 */
export function listRecurringTasks() {
  return axios.get<RecurringTask[]>(`${API_BASE}/`)
}

/**
 * 创建循环待办定义
 */
export function createRecurringTask(data: RecurringTaskPayload) {
  return axios.post<RecurringTask>(`${API_BASE}/`, data)
}

/**
 * 更新循环待办定义
 */
export function updateRecurringTask(id: number, data: Partial<RecurringTaskPayload>) {
  return axios.patch<RecurringTask>(`${API_BASE}/${id}/`, data)
}

/**
 * 删除循环待办定义
 */
export function deleteRecurringTask(id: number) {
  return axios.delete(`${API_BASE}/${id}/`)
}

/**
 * 预览已保存的循环待办定义的下一次触发时间
 */
export function previewRecurringTask(id: number) {
  return axios.post<RecurrencePreview>(`${API_BASE}/${id}/preview/`)
}

/**
 * 即时预览规则（未保存的 rule_text）
 * @param data 规则 DSL 文本与可选的开始日期
 */
export function previewRule(data: { rule_text: string, start_date?: string | null }) {
  return axios.post<RecurrencePreview>(`${API_BASE}/preview/`, data)
}
