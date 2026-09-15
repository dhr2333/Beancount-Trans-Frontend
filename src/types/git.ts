/**
 * Git 仓库相关的 TypeScript 类型定义
 */

export type GitProvider =
  | 'gitea_hosted'
  | 'github'
  | 'gitlab'
  | 'gitea'
  | 'gogs'
  | 'other'

// Git 仓库信息
export interface GitRepository {
  id: number
  ssh_clone_url: string
  repo_name: string
  setup_mode?: 'create' | 'link'
  provider: GitProvider
  remote_ssh_url?: string
  external_full_name?: string
  default_branch?: string
  deploy_key_public?: string
  webhook_callback_url?: string
  setup_instructions?: string[]
  /** 仅创建/关联接口首次返回；列表 GET 通常不含此字段 */
  webhook_secret?: string
  created_with_template: boolean
  last_sync_at: string | null
  sync_status: SyncStatus
  sync_error: string | null
  /** 是否已取消同步（暂停自动拉取） */
  sync_paused: boolean
  deploy_key_download_url: string
  created: string
  modified: string
}

// 同步状态枚举（paused 表示已取消同步，仅在展示时根据 sync_paused 取用）
export type SyncStatus = 'pending' | 'syncing' | 'success' | 'failed' | 'paused'

// 同步状态显示文本映射
export const SyncStatusText: Record<SyncStatus, string> = {
  pending: '待同步',
  syncing: '同步中',
  success: '成功',
  failed: '失败',
  paused: '已取消同步'
}

// 同步状态图标映射
export const SyncStatusIcon: Record<SyncStatus, string> = {
  pending: 'Clock',
  syncing: 'Loading',
  success: 'Check',
  failed: 'Close',
  paused: 'VideoPause'
}

// 同步状态颜色类型映射 (Element Plus)
export const SyncStatusType: Record<SyncStatus, 'info' | 'warning' | 'success' | 'danger'> = {
  pending: 'info',
  syncing: 'warning', 
  success: 'success',
  failed: 'danger',
  paused: 'warning'
}

// 创建仓库请求（仅平台托管 Gitea）
export interface CreateRepositoryRequest {
  template: boolean
}

export interface LinkRepositoryRequest {
  remote_ssh_url: string
  /** 留空则由后端从 SSH 地址自动识别 */
  provider?: GitProvider | ''
  default_branch?: string
  external_full_name?: string
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
  paused: boolean
}

// 同步响应
export interface SyncResponse {
  status: 'success' | 'failed' | 'paused'
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

// 取消同步响应
export interface ClearSyncedLedgerResponse {
  message: string
  cleaned_files: string[]
  trans_preserved: boolean
  repo_name: string
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

