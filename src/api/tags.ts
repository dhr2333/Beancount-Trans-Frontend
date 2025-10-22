/**
 * 标签 API 服务
 */
import axios from '../utils/request'
import type { Tag, TagForm, TagStats, TagBatchUpdate, TagDeleteParams } from '../types/tag'

/**
 * 获取标签树形结构
 */
export const fetchTagTree = () => {
  return axios.get<Tag[]>('/tags/tree/')
}

/**
 * 获取标签列表（扁平，支持分页和过滤）
 */
export const fetchTags = (params?: {
  name?: string
  enable?: boolean
  is_root?: boolean
  page?: number
  page_size?: number
}) => {
  return axios.get<{ count: number; results: Tag[] }>('/tags/', { params })
}

/**
 * 获取标签详情
 */
export const fetchTag = (id: number) => {
  return axios.get<Tag>(`/tags/${id}/`)
}

/**
 * 创建标签
 */
export const createTag = (data: TagForm) => {
  return axios.post<Tag>('/tags/', data)
}

/**
 * 更新标签
 */
export const updateTag = (id: number, data: Partial<TagForm>) => {
  return axios.patch<Tag>(`/tags/${id}/`, data)
}

/**
 * 完整更新标签
 */
export const replaceTag = (id: number, data: TagForm) => {
  return axios.put<Tag>(`/tags/${id}/`, data)
}

/**
 * 删除标签
 */
export const deleteTag = (id: number, params?: TagDeleteParams) => {
  return axios.delete(`/tags/${id}/`, {
    data: params
  })
}

/**
 * 更新标签启用状态
 */
export const updateTagEnable = (id: number, enable: boolean) => {
  return axios.patch(`/tags/${id}/`, { enable })
}

/**
 * 批量操作标签
 */
export const batchUpdateTags = (data: TagBatchUpdate) => {
  return axios.post('/tags/batch_update/', data)
}


/**
 * 获取标签相关的映射
 */
export const fetchTagMappings = (id: number) => {
  return axios.get(`/tags/${id}/mappings/`)
}

