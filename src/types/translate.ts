/**
 * 解析页「写入账本」相关类型定义
 *
 * 写入目标为用户账本的 trans/collect.bean（追加语义）。
 */
import type { ErrorEntry } from './parse-review'

/**
 * 单条待写入条目：directive 为 Beancount 文本（优先取 edited_formatted）
 */
export interface WriteCollectEntry {
  uuid: string
  directive: string
}

/**
 * 写入成功响应
 */
export interface WriteCollectResponse {
  message: string
  /** 已写入条数 */
  entry_count: number
  /** 写入目标（固定为 trans/collect.bean） */
  bean: string
}

/**
 * 写入失败响应（语法错误时带定位信息）
 */
export interface WriteCollectErrorResponse {
  error: string
  error_entries?: ErrorEntry[]
}
