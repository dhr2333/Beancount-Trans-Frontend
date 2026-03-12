<template>
  <div class="parse-review-form">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-left">
        <h2>解析审核 - {{ fileName }}</h2>
        <!-- <el-text v-if="remainingTime" type="info" size="small" style="display: block; margin-top: 4px;">
          剩余时间：{{ remainingTime }}
        </el-text> -->
      </div>
      <div class="header-right">
        <el-button @click="handleReparseAll" :loading="loading.reparseAll">
          重新解析
        </el-button>
        <el-button @click="handleBack">返回</el-button>
      </div>
    </div>

    <!-- 加载状态 -->
    <div v-loading="loading.results" class="content-container">
      <!-- 解析结果表格 -->
      <el-table v-if="formattedEntries.length > 0" :data="formattedEntries" style="width: 100%" border
        highlight-current-row>
        <el-table-column label="Beancount 条目预览" min-width="400">
          <template #default="scope">
            <div :class="getEntryClasses(scope.row.uuid, scope.row.edited_formatted)">
              <el-input v-model="scope.row.edited_formatted" type="textarea" :rows="7" class="entry-preview"
                placeholder="单击进入编辑模式" @blur="handleEntryEdit(scope.row.uuid, scope.row.edited_formatted)" />
              <div v-if="errorEntries[scope.row.uuid]" class="validation-message error-message">
                {{ errorEntries[scope.row.uuid] }}
              </div>
              <div v-else-if="validationWarnings[scope.row.uuid]" class="validation-message warning-message">
                {{ validationWarnings[scope.row.uuid] }}
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="AI分类反馈" min-width="400">
          <template #default="scope">
            <div class="ai-classification-container">
              <div class="current-selection">
                <span class="label">当前分类：</span>
                <el-tag v-if="scope.row.selected_expense_key" type="success" class="selected-tag">
                  {{ scope.row.selected_expense_key }}
                </el-tag>
                <span v-else class="no-category-tip">无分类建议</span>
              </div>
              <div v-if="scope.row.expense_candidates_with_score && scope.row.expense_candidates_with_score.length > 0"
                class="candidates">
                <span class="label">候选分类：</span>
                <div class="candidate-tags">
                  <el-tag v-for="(candidate, idx) in scope.row.expense_candidates_with_score" :key="idx"
                    :type="candidate.key === scope.row.selected_expense_key ? 'success' : 'info'"
                    :class="['candidate-tag', { 'is-selected': candidate.key === scope.row.selected_expense_key }]"
                    @click="handleKeywordSelect(scope.row.uuid, candidate.key)">
                    {{ candidate.key }}
                    <span class="score" v-if="candidate.score !== undefined">
                      ({{ candidate.score }})
                    </span>
                  </el-tag>
                  <el-button size="small" plain @click="handleOpenMappingDialog(scope.row)" class="add-mapping-btn">
                    <el-icon><Plus /></el-icon> 新增映射
                  </el-button>
                </div>
              </div>
              <div v-else class="candidates">
                <span class="label muted">无候选分类</span>
                <el-button size="small" plain @click="handleOpenMappingDialog(scope.row)" class="add-mapping-btn">
                  <el-icon><Plus /></el-icon> 新增映射
                </el-button>
              </div>
            </div>
          </template>
        </el-table-column>
      </el-table>

      <!-- 空状态 -->
      <el-empty v-else description="暂无解析结果" />
    </div>

    <!-- 底部操作栏 -->
    <div class="action-bar">
      <el-button @click="handlePreview" :disabled="formattedEntries.length === 0">
        预览
      </el-button>
      <el-button type="primary" @click="handleConfirmWrite" :loading="loading.confirm"
        :disabled="formattedEntries.length === 0">
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

    <!-- 内联新增映射对话框 -->
    <el-dialog v-model="mappingDialog.visible" title="新增映射" width="500px">
      <el-form :model="mappingForm" :rules="mappingRules" ref="mappingFormRef" label-width="100px">
        <el-form-item label="关键字" prop="key">
          <el-input v-model="mappingForm.key" placeholder="请输入关键字" />
        </el-form-item>
        <el-form-item label="映射账户" prop="accountId">
          <AccountSelector v-model="mappingForm.accountId" 
            placeholder="请选择映射账户" />
        </el-form-item>
        <el-form-item :label="mappingForm.type === 'expense' ? '收款方' : '付款方'" prop="party">
          <el-input v-model="mappingForm.party" :placeholder="mappingForm.type === 'expense' ? '选填：收款方信息' : '选填：付款方信息'" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="mappingDialog.visible = false">取消</el-button>
        <el-button type="primary" @click="handleMappingSubmit" :loading="mappingDialog.loading">
          保存并重解析
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import AccountSelector from '../../components/common/AccountSelector.vue'
import axios from '../../utils/request'
import {
  getParseResults,
  reparseEntry,
  updateEntryEdit,
  confirmWrite,
  reparseAll
} from '../../api/parse-review'
import { getTask } from '../../api/reconciliation'
import type { FormattedEntry, ParseResult, ErrorEntry } from '../../types/parse-review'
import type { ScheduledTask } from '../../types/reconciliation'
import { emitTaskBannerRefresh } from '../../utils/accountEvents'

const route = useRoute()
const router = useRouter()

const taskId = computed(() => parseInt(route.params.taskId as string))

const fileName = ref('')
const formattedEntries = ref<FormattedEntry[]>([])
const loading = ref({
  results: false,
  reparseAll: false,
  confirm: false,
  savePreview: false
})

const showPreviewDialog = ref(false)
const previewContent = ref('')

const taskInfo = ref<ScheduledTask | null>(null)
const parseResult = ref<ParseResult | null>(null)

const errorEntries = ref<Record<string, string>>({})
const validationWarnings = ref<Record<string, string>>({})

// 内联新增映射相关
const mappingDialog = ref({
  visible: false,
  loading: false,
  targetEntryUuid: ''
})

const mappingFormRef = ref<FormInstance>()
const mappingForm = ref({
  type: 'expense',
  key: '',
  accountId: null as number | null,
  party: ''
})

const mappingRules: FormRules = {
  key: [{ required: true, message: '请输入关键字', trigger: 'blur' }],
  accountId: [{ required: true, message: '请选择映射账户', trigger: 'change' }]
}

// 处理打开新增映射对话框
const handleOpenMappingDialog = (row: FormattedEntry) => {
  mappingDialog.value.targetEntryUuid = row.uuid
  
  // 预填数据
  let defaultType = 'expense'
  let defaultKey = ''
  const defaultParty = ''
  
  if (row.original_row) {
    if (row.original_row.transaction_type && row.original_row.transaction_type.includes('收入')) {
      defaultType = 'income'
    }
    
    if (row.original_row.counterparty) {
      defaultKey = row.original_row.counterparty
      
    } else if (row.original_row.commodity) {
      defaultKey = row.original_row.commodity.substring(0, 10) // 截取一部分作为关键字
    }
  }
  
  mappingForm.value = {
    type: defaultType,
    key: defaultKey,
    accountId: null,
    party: defaultParty
  }
  
  mappingDialog.value.visible = true
}

// 处理映射提交
const handleMappingSubmit = async () => {
  if (!mappingFormRef.value) return
  
  await mappingFormRef.value.validate(async (valid) => {
    if (!valid) return
    
    mappingDialog.value.loading = true
    try {
      // 1. 创建映射
      if (mappingForm.value.type === 'expense') {
        await axios.post('/expense/', {
          key: mappingForm.value.key,
          expend_id: mappingForm.value.accountId,
          payee: mappingForm.value.party,
          currency: 'CNY' // 默认CNY
        })
      } else {
        await axios.post('/income/', {
          key: mappingForm.value.key,
          income_id: mappingForm.value.accountId,
          payer: mappingForm.value.party
        })
      }
      
      ElMessage.success('映射创建成功')
      
      // 2. 自动重解析当前条目
      try {
        const response = await reparseEntry(taskId.value, {
          entry_uuid: mappingDialog.value.targetEntryUuid,
          selected_key: mappingForm.value.key
        })

        const updated = response.data
        const index = formattedEntries.value.findIndex(e => e.uuid === mappingDialog.value.targetEntryUuid)
        if (index !== -1) {
          formattedEntries.value[index] = {
            ...formattedEntries.value[index],
            formatted: updated.formatted,
            edited_formatted: (updated.edited_formatted || '').replace(/\n+$/, ''),
            selected_expense_key: updated.selected_expense_key,
            expense_candidates_with_score: updated.expense_candidates_with_score
          }
        }
        
        ElMessage.success('重解析完成')
        mappingDialog.value.visible = false
      } catch (reparseError: any) {
        ElMessage.error(reparseError.response?.data?.error || '重新解析失败，请手动点击重试')
      }
    } catch (error: any) {
      if (error.response?.status === 400 && error.response.data?.non_field_errors) {
        ElMessage.error(error.response.data.non_field_errors[0])
      } else {
        ElMessage.error('创建映射失败')
      }
    } finally {
      mappingDialog.value.loading = false
    }
  })
}

// 计算剩余时间（基于 expires_at 或 created）
const remainingTime = computed(() => {
  if (!taskInfo.value) return null

  // 优先使用 parseResult 中的 expires_at（这是缓存的实际过期时间）
  if (parseResult.value?.expires_at) {
    const expiryTime = parseResult.value.expires_at * 1000  // expires_at 是 Unix 时间戳（秒），转换为毫秒
    const now = Date.now()
    const remainingMs = expiryTime - now

    if (remainingMs <= 0) {
      return '已过期'
    }

    const remainingHours = Math.floor(remainingMs / (3600 * 1000))
    const remainingMinutes = Math.floor((remainingMs % (3600 * 1000)) / (60 * 1000))

    if (remainingHours > 0) {
      return `${remainingHours}小时${remainingMinutes}分钟`
    } else {
      return `${remainingMinutes}分钟`
    }
  }

  // 回退到使用 taskInfo.expires_at（如果序列化器返回了）
  if (taskInfo.value.expires_at) {
    const expiryTime = taskInfo.value.expires_at * 1000
    const now = Date.now()
    const remainingMs = expiryTime - now

    if (remainingMs <= 0) {
      return '已过期'
    }

    const remainingHours = Math.floor(remainingMs / (3600 * 1000))
    const remainingMinutes = Math.floor((remainingMs % (3600 * 1000)) / (60 * 1000))

    if (remainingHours > 0) {
      return `${remainingHours}小时${remainingMinutes}分钟`
    } else {
      return `${remainingMinutes}分钟`
    }
  }

  // 最后回退到使用 created（兼容旧数据）
  const createdTime = new Date(taskInfo.value.created).getTime()
  const now = Date.now()
  const elapsed = now - createdTime
  const totalHours = 24
  const remainingMs = totalHours * 3600 * 1000 - elapsed

  if (remainingMs <= 0) {
    return '已过期'
  }

  const remainingHours = Math.floor(remainingMs / (3600 * 1000))
  const remainingMinutes = Math.floor((remainingMs % (3600 * 1000)) / (60 * 1000))

  if (remainingHours > 0) {
    return `${remainingHours}小时${remainingMinutes}分钟`
  } else {
    return `${remainingMinutes}分钟`
  }
})

// 加载待办任务信息和解析结果
const loadResults = async () => {
  loading.value.results = true
  try {
    // 先获取待办任务信息（包含文件名）
    const taskResponse = await getTask(taskId.value)
    taskInfo.value = taskResponse.data
    fileName.value = taskInfo.value.file_name || `文件 #${taskInfo.value.file_id || taskId.value}`

    // 再获取解析结果
    const response = await getParseResults(taskId.value)
    const result: ParseResult = response.data
    parseResult.value = result  // 保存解析结果，用于计算剩余时间

    // 确保每条记录都有 edited_formatted，并去除末尾的换行符
    formattedEntries.value = result.formatted_data.map(entry => ({
      ...entry,
      edited_formatted: (entry.edited_formatted || entry.formatted || '').replace(/\n+$/, '')
    }))
  } catch (error: any) {
    ElMessage.error(error.response?.data?.error || '加载解析结果失败')
  } finally {
    loading.value.results = false
  }
}

// 处理关键字选择
const handleKeywordSelect = async (uuid: string, selectedKey: string) => {
  try {
    const response = await reparseEntry(taskId.value, {
      entry_uuid: uuid,
      selected_key: selectedKey
    })

    const updated = response.data
    const index = formattedEntries.value.findIndex(e => e.uuid === uuid)
    if (index !== -1) {
      formattedEntries.value[index] = {
        ...formattedEntries.value[index],
        formatted: updated.formatted,
        edited_formatted: (updated.edited_formatted || '').replace(/\n+$/, ''),
        selected_expense_key: updated.selected_expense_key,
        expense_candidates_with_score: updated.expense_candidates_with_score
      }
    }

    ElMessage.success('已反馈AI选择')
  } catch (error: any) {
    ElMessage.error(error.response?.data?.error || '重解析失败')
  }
}

// 处理条目编辑
const handleEntryEdit = async (uuid: string, editedFormatted: string) => {
  try {
    // 每次编辑后清除错误状态
    if (errorEntries.value[uuid]) {
      delete errorEntries.value[uuid]
    }

    const response = await updateEntryEdit(taskId.value, uuid, {
      edited_formatted: editedFormatted
    })
    
    if (response.data.validation_warning) {
      validationWarnings.value[uuid] = response.data.validation_warning
    } else {
      delete validationWarnings.value[uuid]
    }

    ElMessage.success('编辑内容已保存')
  } catch (error: any) {
    ElMessage.error(error.response?.data?.error || '更新编辑内容失败')
  }
}

// 获取条目预览的类名
const getEntryClasses = (uuid: string, editedFormatted: string) => {
  const isError = !!errorEntries.value[uuid]
  const isWarning = !!validationWarnings.value[uuid] && !isError
  
  // 检查是否包含 Other 分类
  const isOther = /(?:Assets|Expenses|Income):Other/.test(editedFormatted || '')

  return [
    'entry-preview-wrapper',
    {
      'has-error': isError,
      'has-warning': isWarning,
      'has-other': isOther && !isError && !isWarning // 错误和警告优先级更高
    }
  ]
}

// 预览所有条目
const handlePreview = () => {
  previewContent.value = formattedEntries.value
    .map(entry => entry.edited_formatted.replace(/\n+$/, ''))
    .join('\n\n')
  showPreviewDialog.value = true
}

// 保存预览框中的编辑内容
const handleSavePreview = async () => {
  if (!previewContent.value.trim()) {
    ElMessage.warning('预览内容不能为空')
    return
  }

  loading.value.savePreview = true
  try {
    // 将预览内容按空行分割成条目
    const editedEntries = previewContent.value
      .split(/\n\n+/)
      .map(entry => entry.trim())
      .filter(entry => entry.length > 0)

    // 检查条目数量是否匹配
    if (editedEntries.length !== formattedEntries.value.length) {
      try {
        await ElMessageBox.confirm(
          `预览框中有 ${editedEntries.length} 条条目，列表中应有 ${formattedEntries.value.length} 条。是否继续保存？将只更新前 ${Math.min(editedEntries.length, formattedEntries.value.length)} 条。`,
          '条目数量不匹配',
          {
            confirmButtonText: '继续保存',
            cancelButtonText: '取消',
            type: 'warning'
          }
        )
      } catch {
        // 用户取消
        loading.value.savePreview = false
        return
      }
    }

    // 更新条目内容
    const updatePromises: Promise<void>[] = []
    const minLength = Math.min(editedEntries.length, formattedEntries.value.length)

    for (let i = 0; i < minLength; i++) {
      const entry = formattedEntries.value[i]
      const editedContent = editedEntries[i].replace(/\n+$/, '')

      // 如果内容有变化，才更新
      if (entry.edited_formatted.replace(/\n+$/, '') !== editedContent) {
        // 清除错误状态
        if (errorEntries.value[entry.uuid]) {
          delete errorEntries.value[entry.uuid]
        }

        updatePromises.push(
          updateEntryEdit(taskId.value, entry.uuid, {
            edited_formatted: editedContent
          }).then((response) => {
            // 更新本地数据
            entry.edited_formatted = editedContent
            
            if (response.data.validation_warning) {
              validationWarnings.value[entry.uuid] = response.data.validation_warning
            } else {
              delete validationWarnings.value[entry.uuid]
            }
          })
        )
      }
    }

    // 等待所有更新完成
    await Promise.all(updatePromises)

    ElMessage.success('预览内容已保存')
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
    await confirmWrite(taskId.value)
    ElMessage.success('确认写入成功')
    
    // 返回待办列表
    router.push('/reconciliation')
    
    // 延迟触发横幅更新，确保页面跳转完成后再更新
    // 这样横幅组件可以正确检测到任务数量变化并触发导览步骤5
    setTimeout(() => {
      emitTaskBannerRefresh()
    }, 500)
  } catch (error: any) {
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

// 重新解析
const handleReparseAll = async () => {
  loading.value.reparseAll = true
  try {
    await reparseAll(taskId.value)
    ElMessage.success('重新解析任务已提交，稍后将自动刷新')
    // 可以延迟刷新
    setTimeout(() => {
      loadResults()
    }, 2000)
  } catch (error: any) {
    ElMessage.error(error.response?.data?.error || '重新解析失败')
  } finally {
    loading.value.reparseAll = false
  }
}

// 返回
const handleBack = () => {
  router.push('/reconciliation')
}

onMounted(() => {
  loadResults()
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
}

.entry-preview-wrapper {
  position: relative;
  
  &.has-error {
    :deep(.el-textarea__inner),
    :deep(.ep-textarea__inner) {
      border-color: var(--el-color-danger);
      box-shadow: 0 0 0 1px var(--el-color-danger) inset;
    }
  }
  
  &.has-warning {
    :deep(.el-textarea__inner),
    :deep(.ep-textarea__inner) {
      border-color: var(--el-color-warning);
      box-shadow: 0 0 0 1px var(--el-color-warning) inset;
    }
  }
  
  &.has-other {
    :deep(.el-textarea__inner),
    :deep(.ep-textarea__inner) {
      border-color: var(--ep-color-primary, var(--el-color-primary));
      box-shadow: 0 0 0 1px var(--ep-color-primary, var(--el-color-primary)) inset;
      background-color: var(--ep-color-primary-light-9, var(--el-color-primary-light-9));
    }
  }
}

// 暗黑模式下：避免 primary-light-* 过亮导致文本对比度差
:deep(html.dark) .entry-preview-wrapper.has-other {
  :deep(.el-textarea__inner),
  :deep(.ep-textarea__inner) {
    color: var(--el-text-color-primary, var(--ep-text-color-primary));
    background-color: var(--ep-color-primary-dark-2, var(--el-color-primary-dark-2));
    background-color: color-mix(
      in srgb,
      var(--ep-color-primary, var(--el-color-primary)) 18%,
      var(--ep-bg-color, var(--el-bg-color))
    );
  }
}

.validation-message {
  font-size: 12px;
  margin-top: 4px;
  line-height: 1.4;
  padding: 4px 8px;
  border-radius: 4px;
  
  &.error-message {
    color: var(--el-color-danger);
    background-color: var(--el-color-danger-light-9);
  }
  
  &.warning-message {
    color: var(--el-color-warning);
    background-color: var(--el-color-warning-light-9);
  }
}

.entry-preview {
  :deep(.el-textarea__inner),
  :deep(.ep-textarea__inner) {
    font-family: Monaco, Consolas, 'Courier New', monospace;
    font-size: 12px;
    line-height: 1.6;
  }
}

.ai-classification-container {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.current-selection,
.candidates {
  display: flex;
  align-items: center;
}

.label {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  margin-right: 8px;
  flex-shrink: 0;
}

.label.muted {
  color: var(--el-text-color-placeholder);
}

.candidate-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.candidate-tag {
  cursor: pointer;
  transition: all 0.3s;
}

.candidate-tag:hover {
  transform: translateY(-2px);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.12);
}

.candidate-tag.is-selected {
  font-weight: bold;
}

.score {
  font-size: 0.85em;
  color: var(--el-text-color-placeholder);
  margin-left: 2px;
}

.no-category-tip {
  color: var(--el-text-color-placeholder);
  font-size: 12px;
  display: inline-block;
  line-height: 22px;
  padding: 0 9px;
  border-radius: 4px;
  background: var(--el-fill-color-light);
  vertical-align: middle;
}

// 暗黑模式下：无分类建议提示更柔和、对比度更稳定
:deep(html.dark) .no-category-tip {
  background: var(--ep-fill-color-darker, var(--el-fill-color-darker));
  color: var(--ep-text-color-placeholder, var(--el-text-color-placeholder));
}

.add-mapping-btn {
  margin-left: 8px;
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
