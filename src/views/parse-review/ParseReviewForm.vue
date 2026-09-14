<template>
  <div class="parse-review-form">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-left">
        <h2>条目审核</h2>
        <el-text type="info" size="small" style="display: block; margin-top: 4px;">
          共 {{ entryCount }} 条 · {{ sourceFiles.length }} 个账单
        </el-text>
        <!-- <el-text v-if="remainingTime" type="info" size="small" style="display: block; margin-top: 4px;">
          剩余时间：{{ remainingTime }}
        </el-text> -->
      </div>
      <div class="header-right">
        <el-dropdown :disabled="reviewExpired" @command="handleReparseAll">
          <el-button :loading="loading.reparseAll" :disabled="reviewExpired">
            重新解析
            <el-icon class="el-icon--right"><ArrowDown /></el-icon>
          </el-button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item
                v-for="file in sourceFiles"
                :key="file.file_id"
                :command="file.file_id"
              >
                重新解析「{{ file.file_name }}」
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
        <el-button @click="handleBack">返回</el-button>
      </div>
    </div>

    <el-alert
      v-if="reviewExpired"
      type="warning"
      :closable="false"
      show-icon
      title="解析待办已过期，系统将自动写入"
      description="审核截止时间已过，无法再编辑或确认写入。"
      class="expired-banner"
    />

    <!-- 加载状态 -->
    <div v-loading="loading.results" class="content-container" :class="{ 'is-review-expired': reviewExpired }">
      <!-- 审核结果表格 -->
      <ParseEntryTable
        :entries="formattedEntries"
        :error-entries="errorEntries"
        :validation-warnings="validationWarnings"
        :disabled="reviewExpired"
        :show-source-file="true"
        :on-reparse="handleTableReparse"
        :on-persist-edit="persistEntryEdit"
        :on-patch-tags="handleTablePatchTags"
        :on-remove-entry="removeEntryFromReview"
      />
    </div>

    <!-- 底部操作栏 -->
    <div class="action-bar">
      <el-button @click="handlePreview" :disabled="formattedEntries.length === 0 || reviewExpired">
        预览
      </el-button>
      <el-button type="primary" @click="handleConfirmWrite" :loading="loading.confirm"
        :disabled="formattedEntries.length === 0 || reviewExpired">
        确认写入
      </el-button>
    </div>

    <!-- 预览对话框 -->
    <el-dialog v-model="showPreviewDialog" title="预览所有条目" width="80%">
      <el-input v-model="previewContent" type="textarea" :rows="20" class="preview-textarea"
        placeholder="可以在此处编辑所有条目，编辑后点击保存按钮将更新到列表中" />
      <template #footer>
        <el-button @click="showPreviewDialog = false">取消</el-button>
        <el-button type="primary" @click="handleSavePreview" :loading="loading.savePreview">
          保存
        </el-button>
      </template>
    </el-dialog>

    <el-dialog
      v-model="reparsePasswordDialogVisible"
      title="输入解密密码"
      width="450px"
      :close-on-click-modal="false"
    >
      <p class="reparse-password-tip">
        全部重新解析会覆盖该账单的手改内容。若文件已加密，请输入密码后重试。
      </p>
      <el-input
        v-model="reparsePassword"
        type="password"
        placeholder="密码（选填）"
        show-password
      />
      <template #footer>
        <el-button @click="reparsePasswordDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="loading.reparseAll" @click="confirmReparseAllWithPassword">
          确认重新解析
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ArrowDown } from '@element-plus/icons-vue'
import ParseEntryTable from '../../components/parse/ParseEntryTable.vue'
import {
  getEntryReviewResults,
  reparseEntry,
  updateEntryEdit,
  patchEntryTags,
  confirmWrite,
  reparseAll,
  getParseTaskStatus,
  syncPreviewEntries
} from '../../api/parse-review'
import {
  alignPreviewBlocksToEntries,
  parsePreviewContent
} from '../../utils/parse-review-preview'
import type {
  ErrorEntry,
  FormattedEntry,
  PreviewSyncEntry,
  PreviewSyncResponse,
  ReparseResponse,
  UpdateTagsRequest
} from '../../types/parse-review'
import { emitTaskBannerRefresh } from '../../utils/accountEvents'

const router = useRouter()

const entryCount = ref(0)
const formattedEntries = ref<FormattedEntry[]>([])
const reviewExpiresAt = ref<number | null>(null)
const loading = ref({
  results: false,
  reparseAll: false,
  confirm: false,
  savePreview: false
})

const showPreviewDialog = ref(false)
const previewContent = ref('')

const errorEntries = ref<Record<string, string>>({})
const validationWarnings = ref<Record<string, string>>({})

const REPARSE_POLL_INTERVAL_MS = 2000
const REPARSE_POLL_MAX_ATTEMPTS = 150
let reparsePollAborted = false
const reparsePasswordDialogVisible = ref(false)
const reparsePassword = ref('')
const reparseTargetFileId = ref<number | null>(null)

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms))
}

onBeforeUnmount(() => {
  reparsePollAborted = true
})

/** 来源账单列表（按条目首次出现顺序去重） */
const sourceFiles = computed(() => {
  const seen = new Map<number, { file_id: number; file_name: string }>()
  for (const entry of formattedEntries.value) {
    if (entry.file_id == null || seen.has(entry.file_id)) continue
    seen.set(entry.file_id, {
      file_id: entry.file_id,
      file_name: entry.file_name || `文件 #${entry.file_id}`
    })
  }
  return [...seen.values()]
})

/** 按条目 uuid 定位其来源账单文件 ID；缺失时提示并中断操作 */
const entryFileId = (uuid: string): number | undefined => {
  const entry = formattedEntries.value.find((item) => item.uuid === uuid)
  if (!entry || entry.file_id == null) {
    ElMessage.error('条目缺少来源账单信息，请刷新页面')
    return undefined
  }
  return entry.file_id
}

const applyReparsePayloadToEntry = (entryUuid: string, updated: ReparseResponse) => {
  const index = formattedEntries.value.findIndex((e) => e.uuid === entryUuid)
  if (index !== -1) {
    formattedEntries.value[index] = {
      ...formattedEntries.value[index],
      formatted: updated.formatted,
      edited_formatted: (updated.edited_formatted || '').replace(/\n+$/, ''),
      selected_expense_key: updated.selected_expense_key,
      expense_candidates_with_score: updated.expense_candidates_with_score,
      tag_details: updated.tag_details,
      tag_overrides: updated.tag_overrides
    }
  }
}

/** 表格内反馈分类关键字 / 保存映射后的单条重解析 */
const handleTableReparse = async (
  entryUuid: string,
  selectedKey: string,
  mappingType?: 'expense' | 'income' | 'asset'
) => {
  const fileId = entryFileId(entryUuid)
  if (fileId === undefined) return

  const response = await reparseEntry({
    file_id: fileId,
    entry_uuid: entryUuid,
    selected_key: selectedKey,
    ...(mappingType ? { mapping_type: mappingType } : {})
  })
  const updated = response.data
  applyReparsePayloadToEntry(entryUuid, updated)

  const propagated = updated.propagated_entries ?? []
  for (const item of propagated) {
    applyReparsePayloadToEntry(item.uuid, item)
  }
  ElMessage.success('已更新分类')
  if (propagated.length > 0) {
    ElMessage.success(`已自动套用 ${propagated.length} 条相似条目`)
  }
}

/** 表格内标签增删，返回后端最新的 tag 字段供组件回写 */
const handleTablePatchTags = async (uuid: string, payload: UpdateTagsRequest) => {
  const fileId = entryFileId(uuid)
  if (fileId === undefined) return {}
  const response = await patchEntryTags(fileId, uuid, payload)
  return response.data
}

// 计算剩余时间（基于整体审核截止时间）
const remainingTime = computed(() => {
  if (!reviewExpiresAt.value) return null

  const expiryTime = reviewExpiresAt.value * 1000
  const remainingMs = expiryTime - Date.now()

  if (remainingMs <= 0) {
    return '已过期，等待自动写入'
  }

  const remainingHours = Math.floor(remainingMs / (3600 * 1000))
  const remainingMinutes = Math.floor((remainingMs % (3600 * 1000)) / (60 * 1000))

  if (remainingHours > 0) {
    return `${remainingHours}小时${remainingMinutes}分钟`
  } else {
    return `${remainingMinutes}分钟`
  }
})

const reviewExpired = computed(() => {
  if (reviewExpiresAt.value) {
    return Date.now() >= reviewExpiresAt.value * 1000
  }
  return false
})

// 加载统一条目审核结果（跨账单扁平列表）
const loadResults = async () => {
  loading.value.results = true
  try {
    const response = await getEntryReviewResults()
    const result = response.data

    entryCount.value = result.entry_count
    reviewExpiresAt.value = result.review_expires_at

    // 确保每条记录都有 edited_formatted，并去除末尾的换行符；保留来源账单信息
    formattedEntries.value = result.entries.map((entry) => ({
      ...entry,
      edited_formatted: (entry.edited_formatted || entry.formatted || '').replace(/\n+$/, ''),
      tag_details: entry.tag_details ?? [],
      tag_overrides: entry.tag_overrides ?? { removed_paths: [], added_paths: [] }
    }))
  } catch (error: any) {
    ElMessage.error(error.response?.data?.error || '加载条目审核结果失败')
  } finally {
    loading.value.results = false
  }
}

async function persistEntryEdit(uuid: string, editedFormatted: string, options?: { silent?: boolean }) {
  const fileId = entryFileId(uuid)
  if (fileId === undefined) return

  if (errorEntries.value[uuid]) {
    delete errorEntries.value[uuid]
  }

  const response = await updateEntryEdit(fileId, uuid, {
    edited_formatted: editedFormatted
  })

  if (response.data.validation_warning) {
    validationWarnings.value[uuid] = response.data.validation_warning
  } else {
    delete validationWarnings.value[uuid]
  }

  if (!options?.silent) {
    ElMessage.success('编辑内容已保存')
  }
}

/** 确认写入前将本地 edited_formatted 静默同步至 Redis。 */
async function flushEditedEntries(): Promise<boolean> {
  const updatePromises: Promise<void>[] = []
  let hasMissingFileId = false

  for (const entry of formattedEntries.value) {
    if (entry.file_id == null) {
      hasMissingFileId = true
      continue
    }
    const fileId = entry.file_id
    const editedContent = entry.edited_formatted.replace(/\n+$/, '')
    updatePromises.push(
      updateEntryEdit(fileId, entry.uuid, {
        edited_formatted: editedContent,
      }).then((response) => {
        entry.edited_formatted = editedContent
        if (response.data.validation_warning) {
          validationWarnings.value[entry.uuid] = response.data.validation_warning
        } else {
          delete validationWarnings.value[entry.uuid]
        }
        if (errorEntries.value[entry.uuid]) {
          delete errorEntries.value[entry.uuid]
        }
      }),
    )
  }

  if (hasMissingFileId) {
    ElMessage.error('部分条目缺少来源账单信息，已跳过同步')
  }

  if (!updatePromises.length) {
    return true
  }

  try {
    await Promise.all(updatePromises)
    return true
  } catch (error: unknown) {
    const axiosError = error as { response?: { data?: { error?: string } } }
    ElMessage.error(axiosError.response?.data?.error || '同步审核草稿失败，请检查网络后重试')
    return false
  }
}

function buildSyncEntriesPayload(entries: FormattedEntry[] = formattedEntries.value) {
  return entries
    .filter((entry) => entry.edited_formatted.replace(/\n+$/, '').trim())
    .map((entry) => ({
      uuid: entry.uuid,
      edited_formatted: entry.edited_formatted.replace(/\n+$/, '')
    }))
}

/** 清除指定账单文件内所有条目的本地校验提示（合并前调用） */
function clearValidationWarningsForFiles(fileIds: number[]) {
  const target = new Set(fileIds)
  for (const entry of formattedEntries.value) {
    if (entry.file_id != null && target.has(entry.file_id)) {
      delete validationWarnings.value[entry.uuid]
    }
  }
}

function applyValidationWarnings(warnings?: Record<string, string>) {
  for (const [uuid, message] of Object.entries(warnings ?? {})) {
    validationWarnings.value[uuid] = message
  }
}

/** 清理已不存在条目的写入错误记录 */
function pruneErrorEntries() {
  const keptUuidSet = new Set(formattedEntries.value.map((entry) => entry.uuid))
  for (const uuid of Object.keys(errorEntries.value)) {
    if (!keptUuidSet.has(uuid)) {
      delete errorEntries.value[uuid]
    }
  }
}

/**
 * 文件级合并：用某账单文件同步后的条目替换该文件原有条目，保持整体来源顺序。
 */
function mergeFileSyncResult(fileId: number, formattedData: FormattedEntry[]) {
  const fileOrder = sourceFiles.value.map((file) => file.file_id)
  const fileNameForFile =
    sourceFiles.value.find((file) => file.file_id === fileId)?.file_name ?? `文件 #${fileId}`

  const normalized = formattedData.map((entry) => ({
    ...entry,
    file_id: fileId,
    file_name: fileNameForFile,
    edited_formatted: (entry.edited_formatted || entry.formatted || '').replace(/\n+$/, ''),
    tag_details: entry.tag_details ?? [],
    tag_overrides: entry.tag_overrides ?? { removed_paths: [], added_paths: [] }
  }))

  const result: FormattedEntry[] = []
  for (const fid of fileOrder) {
    if (fid === fileId) {
      result.push(...normalized)
    } else {
      result.push(...formattedEntries.value.filter((entry) => entry.file_id === fid))
    }
  }
  // 无来源账单信息的条目无法参与文件级合并，保留以避免丢失
  result.push(...formattedEntries.value.filter((entry) => entry.file_id == null))

  formattedEntries.value = result
  entryCount.value = result.length
}

async function removeEntryFromReview(uuid: string) {
  const target = formattedEntries.value.find((entry) => entry.uuid === uuid)
  if (!target) {
    return
  }
  if (target.file_id == null) {
    ElMessage.error('条目缺少来源账单信息，请刷新页面')
    return
  }
  const fileId = target.file_id

  // 该文件剩余的全部条目（未提交的条目会被从该账单移除）
  const remaining = formattedEntries.value.filter(
    (entry) => entry.file_id === fileId && entry.uuid !== uuid
  )
  const fileEntryCount = formattedEntries.value.filter((entry) => entry.file_id === fileId).length
  if (remaining.length === fileEntryCount) {
    return
  }

  const response = await syncPreviewEntries(fileId, {
    entries: buildSyncEntriesPayload(remaining)
  })
  clearValidationWarningsForFiles([fileId])
  mergeFileSyncResult(fileId, response.data.formatted_data)
  applyValidationWarnings(response.data.validation_warnings)
  pruneErrorEntries()
  ElMessage.success('条目已移除')
}

// 预览所有条目
const handlePreview = () => {
  previewContent.value = formattedEntries.value
    .map((entry) => entry.edited_formatted.replace(/\n+$/, ''))
    .filter((text) => text.trim())
    .join('\n\n')
  showPreviewDialog.value = true
}

// 保存预览框中的编辑内容（预览文本为真源，按来源账单分别同步）
const handleSavePreview = async () => {
  if (!previewContent.value.trim()) {
    ElMessage.warning('预览内容不能为空')
    return
  }

  loading.value.savePreview = true
  try {
    const blocks = parsePreviewContent(previewContent.value)
    const { kept, removedCount } = alignPreviewBlocksToEntries(
      blocks,
      formattedEntries.value.map((entry) => ({
        uuid: entry.uuid,
        edited_formatted: entry.edited_formatted
      }))
    )

    if (kept.length === 0) {
      ElMessage.warning('预览内容无有效条目')
      return
    }

    if (kept.length > formattedEntries.value.length) {
      ElMessage.warning('预览中新增了条目，暂不支持在预览中新增，请回到列表操作')
      return
    }

    const fileIdByUuid = new Map<string, number>()
    for (const entry of formattedEntries.value) {
      if (entry.file_id != null) {
        fileIdByUuid.set(entry.uuid, entry.file_id)
      }
    }

    // 按来源账单分组
    const grouped = new Map<number, PreviewSyncEntry[]>()
    for (const item of kept) {
      const fileId = fileIdByUuid.get(item.uuid)
      if (fileId == null) {
        ElMessage.error('条目缺少来源账单信息，请刷新页面')
        return
      }
      const bucket = grouped.get(fileId)
      if (bucket) {
        bucket.push(item)
      } else {
        grouped.set(fileId, [item])
      }
    }

    // 原本有条目、但预览中已被全部删除的账单，需提交空数组以移除
    for (const file of sourceFiles.value) {
      if (!grouped.has(file.file_id)) {
        grouped.set(file.file_id, [])
      }
    }

    const syncResults: Array<{ fileId: number; data: PreviewSyncResponse }> = []
    for (const [fileId, entries] of grouped) {
      const response = await syncPreviewEntries(fileId, { entries })
      syncResults.push({ fileId, data: response.data })
    }

    clearValidationWarningsForFiles(syncResults.map((item) => item.fileId))
    for (const item of syncResults) {
      mergeFileSyncResult(item.fileId, item.data.formatted_data)
    }
    for (const item of syncResults) {
      applyValidationWarnings(item.data.validation_warnings)
    }
    pruneErrorEntries()

    if (removedCount > 0) {
      ElMessage.success(`预览内容已保存，并移除 ${removedCount} 条已删除条目`)
    } else {
      ElMessage.success('预览内容已保存')
    }
    showPreviewDialog.value = false
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'response' in error) {
      const axiosError = error as { response?: { data?: { error?: string } } }
      ElMessage.error(axiosError.response?.data?.error || '保存预览内容失败')
    } else {
      ElMessage.error('保存预览内容失败')
    }
  } finally {
    loading.value.savePreview = false
  }
}

// 确认写入
const handleConfirmWrite = async () => {
  loading.value.confirm = true
  errorEntries.value = {}
  try {
    const flushed = await flushEditedEntries()
    if (!flushed) {
      return
    }

    await confirmWrite()
    ElMessage.success('确认写入成功')

    // 返回待办列表
    router.push('/reconciliation')

    // 延迟触发横幅更新，确保页面跳转完成后再更新
    // 这样横幅组件可以正确检测到任务数量变化并触发导览步骤5
    setTimeout(() => {
      emitTaskBannerRefresh()
    }, 500)
  } catch (error: any) {
    if (error.response?.status === 404) {
      ElMessage.error(
        error.response?.data?.error || '审核缓存缺失，请勿重新解析，请先检查网络后重试写入',
      )
      return
    }
    if (error.response?.data?.error_entries) {
      const entries = error.response.data.error_entries as ErrorEntry[]
      entries.forEach(entry => {
        errorEntries.value[entry.uuid] = entry.error_message
      })
      ElMessage.error(error.response?.data?.error || '确认写入失败，请修正错误')

      // 自动滚动到第一个错误
      setTimeout(() => {
        const firstErrorEl = document.querySelector('.has-error')
        if (firstErrorEl) {
          firstErrorEl.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }
      }, 100)
    } else {
      ElMessage.error(error.response?.data?.error || '确认写入失败')
    }
  } finally {
    loading.value.confirm = false
  }
}

// 重新解析指定账单
const pollReparseAllTask = async (celeryTaskId: string) => {
  ElMessage.info('正在重新解析，完成后将自动刷新')

  for (let attempt = 0; attempt < REPARSE_POLL_MAX_ATTEMPTS; attempt++) {
    if (reparsePollAborted) return
    await sleep(REPARSE_POLL_INTERVAL_MS)
    const statusRes = await getParseTaskStatus(celeryTaskId)
    const status = statusRes.data.status

    if (status === 'pending_review' || status === 'parsed') {
      await loadResults()
      ElMessage.success('重新解析完成')
      reparsePasswordDialogVisible.value = false
      reparsePassword.value = ''
      return
    }
    if (status === 'needs_password') {
      reparsePasswordDialogVisible.value = true
      ElMessage.warning('该文件需要解密密码，请输入后重试')
      return
    }
    if (status === 'failed' || status === 'cancelled') {
      ElMessage.error(statusRes.data.error || '重新解析失败')
      return
    }
  }

  ElMessage.warning('解析耗时较长，请稍后手动刷新页面')
}

const submitReparseAll = async (fileId: number, password?: string) => {
  const file = sourceFiles.value.find((item) => item.file_id === fileId)
  const fileName = file?.file_name ?? `文件 #${fileId}`

  loading.value.reparseAll = true
  reparsePollAborted = false
  try {
    try {
      await ElMessageBox.confirm(
        `全部重新解析「${fileName}」会覆盖该账单的手改内容，是否继续？`,
        '重新解析',
        {
          confirmButtonText: '继续',
          cancelButtonText: '取消',
          type: 'warning'
        }
      )
    } catch {
      return
    }

    reparseTargetFileId.value = fileId

    const response = await reparseAll(
      fileId,
      password ? { password } : undefined
    )
    const celeryTaskId = response.data.celery_task_id
    if (!celeryTaskId) {
      ElMessage.warning('未获取到解析任务 ID，请稍后手动刷新')
      return
    }

    await pollReparseAllTask(celeryTaskId)
  } catch (error: any) {
    ElMessage.error(error.response?.data?.error || '重新解析失败')
  } finally {
    loading.value.reparseAll = false
  }
}

const handleReparseAll = async (command: number | string | object) => {
  const fileId = Number(command)
  if (!Number.isFinite(fileId)) {
    return
  }
  await submitReparseAll(fileId)
}

const confirmReparseAllWithPassword = async () => {
  const fileId = reparseTargetFileId.value
  if (fileId == null) {
    ElMessage.warning('未找到目标账单，请重新选择账单')
    return
  }
  const password = reparsePassword.value.trim()
  await submitReparseAll(fileId, password || undefined)
}

// 返回
const handleBack = () => {
  router.push('/reconciliation')
}

onMounted(() => {
  void loadResults()
})
</script>

<style scoped lang="scss">
.parse-review-form {
  padding: 24px;
  max-width: 1400px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--el-border-color);

  .header-left {
    h2 {
      margin: 0 0 8px 0;
      font-size: 20px;
      font-weight: 600;
    }
  }

  .header-right {
    display: flex;
    gap: 12px;
  }
}

.content-container {
  min-height: 400px;
  margin-bottom: 24px;

  &.is-review-expired {
    pointer-events: none;
    opacity: 0.75;
  }
}

.expired-banner {
  margin-bottom: 16px;
}

.action-bar {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding-top: 16px;
  border-top: 1px solid var(--el-border-color);
}

.preview-textarea {
  :deep(.el-textarea__inner) {
    font-family: Monaco, Consolas, 'Courier New', monospace;
    font-size: 12px;
    line-height: 1.6;
  }
}
</style>
