/**
 * 条目审核（统一待办）API
 *
 * 后端不再按账单分组创建待办，而是每个用户全局唯一一个条目审核待办。
 * 所有条目操作均以 `file_id` + 条目 `uuid` 定位到对应账单的缓存。
 */
import axios from '../utils/request'
import type {
  EntryReviewResults,
  ReparseRequest,
  ReparseResponse,
  ReparseAllRequest,
  ReparseAllResponse,
  UpdateEditRequest,
  UpdateEditResponse,
  UpdateTagsRequest,
  UpdateTagsResponse,
  ConfirmWriteResponse,
  ParseTaskStatusResponse,
  PreviewSyncRequest,
  PreviewSyncResponse
} from '../types/parse-review'

/**
 * 获取统一审核结果（跨账单扁平条目列表）
 */
export function getEntryReviewResults(): Promise<{ data: EntryReviewResults }> {
  return axios.get('/translate/entry-review/results')
}

/**
 * 重解析条目
 */
export function reparseEntry(request: ReparseRequest): Promise<{ data: ReparseResponse }> {
  return axios.post('/translate/entry-review/reparse', request)
}

/**
 * 更新编辑内容
 */
export function updateEntryEdit(
  fileId: number,
  entryUuid: string,
  request: UpdateEditRequest
): Promise<{ data: UpdateEditResponse }> {
  return axios.put(
    `/translate/entry-review/entries/${encodeURIComponent(entryUuid)}/edit`,
    { file_id: fileId, ...request }
  )
}

/**
 * 更新条目标签（添加/移除）
 */
export function patchEntryTags(
  fileId: number,
  entryUuid: string,
  request: UpdateTagsRequest
): Promise<{ data: UpdateTagsResponse }> {
  return axios.patch(
    `/translate/entry-review/entries/${encodeURIComponent(entryUuid)}/tags`,
    { file_id: fileId, ...request }
  )
}

/**
 * 预览批量同步（以预览文本为真源，支持删条）
 */
export function syncPreviewEntries(
  fileId: number,
  request: PreviewSyncRequest
): Promise<{ data: PreviewSyncResponse }> {
  return axios.put('/translate/entry-review/preview-sync', {
    file_id: fileId,
    ...request
  })
}

/**
 * 确认写入（按来源账单分别写入各自 .bean）
 */
export function confirmWrite(): Promise<{ data: ConfirmWriteResponse }> {
  return axios.post('/translate/entry-review/confirm')
}

/**
 * 重新解析指定账单文件（异步 Celery 任务）
 */
export function reparseAll(
  fileId: number,
  request?: ReparseAllRequest
): Promise<{ data: ReparseAllResponse }> {
  return axios.post('/translate/entry-review/reparse-all', {
    file_id: fileId,
    ...(request ?? {})
  })
}

/**
 * 查询 Celery 解析任务状态
 */
export function getParseTaskStatus(celeryTaskId: string): Promise<{ data: ParseTaskStatusResponse }> {
  return axios.get('/translate/parse-task-status', {
    params: { task_id: celeryTaskId }
  })
}
