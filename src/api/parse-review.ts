/**
 * 条目审核（统一待办）API
 *
 * 后端不再按账单分组创建待办，而是每个用户全局唯一一个条目审核待办。
 * 写操作以「来源 + file_id + 条目 uuid」定位：账单来源为 file_id，
 * Copilot 记账来源的 file_id 为 null（以其用户暂存区为操作对象）。
 */
import axios from '../utils/request'
import type {
  EntryReviewResults,
  EntrySourceLocator,
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
 * 重解析条目（Copilot 来源不支持，后端会返回 400）
 */
export function reparseEntry(request: ReparseRequest): Promise<{ data: ReparseResponse }> {
  return axios.post('/translate/entry-review/reparse', request)
}

/**
 * 更新编辑内容
 */
export function updateEntryEdit(
  locator: EntrySourceLocator,
  entryUuid: string,
  request: UpdateEditRequest
): Promise<{ data: UpdateEditResponse }> {
  return axios.put(
    `/translate/entry-review/entries/${encodeURIComponent(entryUuid)}/edit`,
    { file_id: locator.fileId, ...request, source: locator.source }
  )
}

/**
 * 更新条目标签（添加/移除）
 */
export function patchEntryTags(
  locator: EntrySourceLocator,
  entryUuid: string,
  request: UpdateTagsRequest
): Promise<{ data: UpdateTagsResponse }> {
  return axios.patch(
    `/translate/entry-review/entries/${encodeURIComponent(entryUuid)}/tags`,
    { file_id: locator.fileId, ...request, source: locator.source }
  )
}

/**
 * 预览批量同步（以预览文本为真源，支持删条）
 */
export function syncPreviewEntries(
  locator: EntrySourceLocator,
  request: PreviewSyncRequest
): Promise<{ data: PreviewSyncResponse }> {
  return axios.put('/translate/entry-review/preview-sync', {
    file_id: locator.fileId,
    ...request,
    source: locator.source
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
