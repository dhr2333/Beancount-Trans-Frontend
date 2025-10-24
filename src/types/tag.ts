/**
 * 标签类型定义
 */

/**
 * 映射统计
 */
export interface MappingCount {
  expense: number
  assets: number
  income: number
  total: number
}

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
  mapping_count?: MappingCount
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
 * 标签删除参数
 */
export interface TagDeleteParams {
  force?: boolean
}


