/**
 * Git 仓库相关的 TypeScript 类型定义
 */

// Git 仓库信息
export interface GitRepository {
  id: number
  ssh_clone_url: string
  https_clone_url: string
  repo_name: string
  created_with_template: boolean
  last_sync_at: string | null
  sync_status: SyncStatus
  sync_error: string
  deploy_key_download_url: string
  created: string
  modified: string
}

// 同步状态枚举
export type SyncStatus = 'pending' | 'syncing' | 'success' | 'failed'

// 同步状态显示文本映射
export const SyncStatusText: Record<SyncStatus, string> = {
  pending: '待同步',
  syncing: '同步中',
  success: '成功',
  failed: '失败'
}

// 同步状态图标映射
export const SyncStatusIcon: Record<SyncStatus, string> = {
  pending: 'Clock',
  syncing: 'Loading',
  success: 'Check',
  failed: 'Close'
}

// 同步状态颜色类型映射 (Element Plus)
export const SyncStatusType: Record<SyncStatus, 'info' | 'warning' | 'success' | 'danger'> = {
  pending: 'info',
  syncing: 'warning', 
  success: 'success',
  failed: 'danger'
}

// 创建仓库请求
export interface CreateRepositoryRequest {
  template: boolean
}

// 创建仓库选项
export interface CreateRepositoryOption {
  value: boolean
  label: string
  description: string
  icon: string
  recommended?: boolean
}

// 同步状态信息
export interface SyncStatusInfo {
  status: SyncStatus
  last_sync_at: string | null
  error: string | null
}

// 同步响应
export interface SyncResponse {
  status: 'success' | 'failed'
  message: string
  synced_at?: string | null
  error?: string
}

// Deploy Key 响应
export interface DeployKeyResponse {
  filename: string
  content_type: string
  message: string
  key_id?: number
}

// 删除仓库响应
export interface DeleteRepositoryResponse {
  message: string
  cleaned_files: string[]
}

// API 错误响应
export interface GitErrorResponse {
  error: string
  details?: string
}

// Git 设置表单数据
export interface GitSetupForm {
  selectedOption: boolean | null
  loading: boolean
  showOptions: boolean
}

// Git 仓库操作状态
export interface GitRepositoryState {
  repository: GitRepository | null
  loading: boolean
  syncing: boolean
  error: string | null
}

// Git 操作按钮配置
export interface GitActionButton {
  label: string
  icon: string
  type?: 'primary' | 'success' | 'warning' | 'danger' | 'info'
  loading?: boolean
  disabled?: boolean
  onClick: () => void
}

