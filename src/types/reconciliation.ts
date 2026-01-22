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
  PENDING = 'pending',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled'
}

/**
 * 任务状态显示文本映射
 */
export const TaskStatusLabels: Record<TaskStatus, string> = {
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
  scheduled_date: string
  completed_date: string | null
  status: TaskStatus
  status_display: string
  account_name: string | null
  account_type: string | null
  created: string
  modified: string
}

/**
 * Transaction 条目接口（用于差额处理）
 */
export interface TransactionItem {
  account: string
  amount: number | null
  is_auto: boolean
}

/**
 * 币种余额接口
 */
export interface CurrencyBalance {
  currency: string
  expected_balance: string
}

/**
 * 对账表单数据接口
 */
export interface ReconciliationFormData {
  expectedBalance: number
  actualBalance: number
  currency: string
  difference: number
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
}

/**
 * 执行对账请求接口
 */
export interface ReconciliationExecuteRequest {
  actual_balance: number
  currency: string
  transaction_items: TransactionItem[]
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


