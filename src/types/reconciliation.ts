/**
 * 对账相关类型定义
 */

/**
 * 周期单位枚举
 */
export enum CycleUnit {
  DAYS = 'days',
  WEEKS = 'weeks',
  MONTHS = 'months',
  YEARS = 'years'
}

/**
 * 周期单位显示文本映射
 */
export const CycleUnitLabels: Record<CycleUnit, string> = {
  [CycleUnit.DAYS]: '天',
  [CycleUnit.WEEKS]: '周',
  [CycleUnit.MONTHS]: '月',
  [CycleUnit.YEARS]: '年'
}

/**
 * 任务状态枚举
 */
export enum TaskStatus {
  INACTIVE = 'inactive',
  PENDING = 'pending',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled'
}

/**
 * 任务状态显示文本映射
 */
export const TaskStatusLabels: Record<TaskStatus, string> = {
  [TaskStatus.INACTIVE]: '未激活',
  [TaskStatus.PENDING]: '待执行',
  [TaskStatus.COMPLETED]: '已完成',
  [TaskStatus.CANCELLED]: '已取消'
}

/**
 * 待办任务接口
 */
export interface ScheduledTask {
  id: number
  task_type: string
  task_type_display: string
  scheduled_date: string | null  // 解析待办可能为 null
  completed_date: string | null
  status: TaskStatus
  status_display: string
  account_name: string | null
  account_type: string | null
  file_name?: string | null  // 解析待办的文件名
  file_id?: number | null  // 解析待办的文件ID
  expires_at?: number | null  // 解析待办的缓存过期时间（Unix 时间戳，秒）
  created: string
  modified: string
}

/**
 * Transaction 条目接口（用于差额处理）
 */
export interface TransactionItem {
  account: string  // 账户路径（字符串）
  accountId?: number | null  // 账户 ID（用于 AccountSelector）
  amount?: number | null  // 金额（留空时为自动计算）
  is_auto?: boolean  // 是否为自动计算（前端提交时，如果 amount 为空，自动设置为 true）
  date?: string | null  // 交易日期（可选，仅 is_auto=false 时可指定，不能超过 as_of_date）
}

/**
 * 币种余额接口
 */
export interface CurrencyBalance {
  currency: string
  expected_balance: string
}

/**
 * 对账时间点类型
 */
export type ReconciliationTiming = 'end_of_day' | 'start_of_next_day'

/**
 * 对账表单数据接口
 */
export interface ReconciliationFormData {
  expectedBalance: number
  actualBalance: number | undefined
  currency: string
  reconciliationTiming: ReconciliationTiming
  transactionItems: TransactionItem[]
}

/**
 * 开始对账响应接口
 */
export interface ReconciliationStartResponse {
  balances: CurrencyBalance[]
  account_name: string
  as_of_date: string
  default_currency: string | null
  is_first_reconciliation: boolean
}

/**
 * 执行对账请求接口
 */
export interface ReconciliationExecuteRequest {
  actual_balance: number
  currency: string
  transaction_items: TransactionItem[]
  as_of_date: string
}

/**
 * 执行对账响应接口
 */
export interface ReconciliationExecuteResponse {
  status: string
  directives: string[]
  next_task_id: number | null
}

/**
 * 待办任务更新请求接口
 */
export interface ScheduledTaskUpdateRequest {
  scheduled_date: string
}
