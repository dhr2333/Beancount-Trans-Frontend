/**
 * 对账相关 API 调用函数
 */
import axios from '../utils/request'
import type {
  ScheduledTask,
  ScheduledTaskUpdateRequest,
  ReconciliationStartResponse,
  ReconciliationExecuteRequest,
  ReconciliationExecuteResponse
} from '../types/reconciliation'

const API_BASE = import.meta.env.VITE_API_URL + '/reconciliation'

/**
 * 获取待办任务列表
 * @param params 查询参数
 * @returns 待办任务列表（可能是数组或分页对象）
 */
export function getTasks(params?: {
  status?: string
  task_type?: string
  due?: boolean
  page?: number
  page_size?: number
}) {
  return axios.get<ScheduledTask[] | { results: ScheduledTask[], count: number }>(`${API_BASE}/tasks/`, { params })
}

/**
 * 获取待办任务详情
 * @param id 待办任务 ID
 * @returns 待办任务详情
 */
export function getTask(id: number): Promise<{ data: ScheduledTask }> {
  return axios.get(`${API_BASE}/tasks/${id}/`)
}

/**
 * 更新待办任务（修改执行日期）
 * @param id 待办任务 ID
 * @param data 更新数据
 * @returns 更新后的待办任务
 */
export function updateTask(
  id: number,
  data: ScheduledTaskUpdateRequest
): Promise<{ data: ScheduledTask }> {
  return axios.patch(`${API_BASE}/tasks/${id}/`, data)
}

/**
 * 取消待办任务
 * @param id 待办任务 ID
 * @returns 取消后的待办任务
 */
export function cancelTask(id: number): Promise<{ data: ScheduledTask }> {
  return axios.post(`${API_BASE}/tasks/${id}/cancel/`)
}

/**
 * 开始对账（获取预期余额）
 * @param id 待办任务 ID
 * @returns 预期余额信息
 */
export function startReconciliation(
  id: number
): Promise<{ data: ReconciliationStartResponse }> {
  return axios.post(`${API_BASE}/tasks/${id}/start/`)
}

/**
 * 执行对账
 * @param id 待办任务 ID
 * @param data 对账数据
 * @returns 执行结果
 */
export function executeReconciliation(
  id: number,
  data: ReconciliationExecuteRequest
): Promise<{ data: ReconciliationExecuteResponse }> {
  return axios.post(`${API_BASE}/tasks/${id}/execute/`, data)
}


