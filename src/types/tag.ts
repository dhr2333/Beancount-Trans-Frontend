/**
 * 标签类型定义
 */

/**
 * 标签接口
 */
export interface Tag {
  id: number
  name: string
  parent: number | null
  parent_name?: string
  full_path: string
  description: string
  owner: number
  enable: boolean
  has_children: boolean
  children?: Tag[]
  created: string
  modified: string
}

/**
 * 标签表单
 */
export interface TagForm {
  name: string
  parent?: number | null
  description?: string
  enable?: boolean
}

/**
 * 标签统计
 */
export interface TagStats {
  total: number
  enabled: number
  disabled: number
  root_tags: number
  child_tags: number
}

/**
 * 映射中的标签摘要
 */
export interface TagSummary {
  id: number
  name: string
  full_path: string
  enable: boolean
}

/**
 * 批量更新参数
 */
export interface TagBatchUpdate {
  tag_ids: number[]
  action: 'enable' | 'disable' | 'delete'
}

/**
 * 标签删除参数
 */
export interface TagDeleteParams {
  force?: boolean
}

