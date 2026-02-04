<template>
  <div class="reconciliation-list">
    <!-- 极简头部：只显示待办数量 -->
    <div class="list-header">
      <div class="header-info">
        <h2 class="header-title">待办列表</h2>
      </div>
      <!-- 筛选按钮 -->
      <div class="filter-buttons">
        <el-button :type="filterType === 'reconciliation' ? 'primary' : 'default'"
          @click="filterType = 'reconciliation'" class="filter-button">
          <span class="button-text">对账</span>
          <el-badge v-if="reconciliationCount > 0" :value="formatBadgeValue(reconciliationCount)"
            :type="filterType === 'reconciliation' ? 'danger' : 'info'" class="filter-badge" />
        </el-button>
        <el-button :type="filterType === 'parse_review' ? 'primary' : 'default'" @click="filterType = 'parse_review'"
          class="filter-button">
          <span class="button-text">解析</span>
          <el-badge v-if="parseReviewCount > 0" :value="formatBadgeValue(parseReviewCount)"
            :type="filterType === 'parse_review' ? 'danger' : 'info'" class="filter-badge" />
        </el-button>
      </div>
    </div>

    <!-- 待办列表：大卡片设计 -->
    <div v-loading="loading" class="tasks-container">
      <!-- 空状态：引导设置 -->
      <div v-if="tasks.length === 0" class="empty-state">
        <el-empty description="暂无待办任务">
          <template #image>
            <el-icon :size="80" color="var(--ep-color-info)">
              <Check />
            </el-icon>
          </template>
          <template #description>
            <p class="empty-text" v-if="filterType === 'reconciliation'">所有账户都已对账完成</p>
            <p class="empty-text" v-else-if="filterType === 'parse_review'">暂无解析待办任务</p>
            <p class="empty-text" v-else>暂无待办任务</p>
            <p class="empty-hint" v-if="filterType === 'reconciliation'">在「账户管理」中设置对账周期，系统会自动创建待办任务</p>
            <p class="empty-hint" v-else-if="filterType === 'parse_review'">在「文件管理」中上传并解析文件，系统会自动创建解析待办任务</p>
          </template>
        </el-empty>
      </div>

      <!-- 待办卡片列表 -->
      <div v-else class="tasks-grid">
        <div v-for="task in tasks" :key="task.id" class="task-card" :class="{
          'task-overdue': task.task_type === 'reconciliation' && task.scheduled_date && isOverdue(task.scheduled_date)
        }" @click="handleStart(task)">
          <!-- 卡片主体 -->
          <div class="card-main">
            <!-- 对账待办：显示账户名称和日期选择器 -->
            <template v-if="task.task_type === 'reconciliation'">
              <div class="account-name">
                {{ task.account_name || '未知账户' }}
              </div>
              <div class="date-info" @click.stop>
                <el-date-picker :model-value="task.scheduled_date || undefined"
                  @update:model-value="(value: string) => handleDateChange(task.id, value)" type="date"
                  format="YYYY-MM-DD" value-format="YYYY-MM-DD" :clearable="false" placeholder="选择日期"
                  class="date-picker no-border-date-picker" placement="bottom-start" :teleported="true" :popper-options="{
                    modifiers: [
                      {
                        name: 'offset',
                        options: {
                          offset: [0, 4]
                        }
                      },
                      {
                        name: 'preventOverflow',
                        options: {
                          boundary: 'viewport',
                          padding: 8
                        }
                      },
                      {
                        name: 'computeStyles',
                        options: {
                          adaptive: true,
                          roundOffsets: true
                        }
                      }
                    ]
                  }" />
                <el-tag v-if="task.scheduled_date && isOverdue(task.scheduled_date)" type="danger" size="small"
                  class="overdue-tag">
                  逾期
                </el-tag>
              </div>
            </template>

            <!-- 解析审核待办：显示文件名和剩余时间 -->
            <template v-else-if="task.task_type === 'parse_review'">
              <div class="file-name">
                {{ task.file_name || `文件 #${task.file_id || task.id}` }}
              </div>
              <div class="parse-review-footer">
                <div class="remaining-time">
                  {{ getRemainingTime(task) }}
                </div>
                <div class="card-actions" @click.stop>
                  <el-button 
                    type="primary" 
                    size="small" 
                    :loading="writingTaskIds.has(task.id)"
                    @click="handleDirectWrite(task)"
                    class="direct-write-btn">
                    跳过
                  </el-button>
                </div>
              </div>
            </template>
          </div>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onActivated, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Check
} from '@element-plus/icons-vue'
import { getTasks, updateTask } from '../../api/reconciliation'
import { confirmWrite } from '../../api/parse-review'
import type { ScheduledTask } from '../../types/reconciliation'
import { emitTaskBannerRefresh } from '../../utils/accountEvents'

const router = useRouter()

const loading = ref(false)
const tasks = ref<ScheduledTask[]>([])
const total = ref(0)
const reconciliationCount = ref(0)
const parseReviewCount = ref(0)
const filterType = ref<'reconciliation' | 'parse_review'>('parse_review')
const writingTaskIds = ref<Set<number>>(new Set())

onMounted(async () => {
  // 动态注入样式，确保清除日期选择器的边框
  injectDatePickerStyles()
  // 先加载数量，然后根据数量决定默认显示哪个分类
  await loadCounts()
  // 如果解析待办不存在，则显示对账待办
  if (parseReviewCount.value === 0 && reconciliationCount.value > 0) {
    filterType.value = 'reconciliation'
  }
  await loadTasks()
})

// 页面激活时刷新列表（从对账表单或解析审核详情返回时）
onActivated(async () => {
  await loadCounts()
  await loadTasks()
  // 触发横幅更新，确保能检测到任务数量变化（用于导览步骤5）
  emitTaskBannerRefresh()
})

// 监听筛选类型变化
watch(filterType, () => {
  loadTasks()
})

// 动态注入样式清除日期选择器边框
function injectDatePickerStyles() {
  const styleId = 'reconciliation-date-picker-no-border'
  if (document.getElementById(styleId)) return

  const style = document.createElement('style')
  style.id = styleId
  style.textContent = `
    .reconciliation-list .date-info .date-picker .ep-input__wrapper,
    .reconciliation-list .date-info .date-picker .el-input__wrapper,
    .reconciliation-list [class*="ep-input__wrapper"],
    .reconciliation-list [class*="el-input__wrapper"] {
      border: none !important;
      border-width: 0 !important;
      border-style: none !important;
      border-color: transparent !important;
      box-shadow: none !important;
      outline: none !important;
      outline-width: 0 !important;
      background-color: transparent !important;
    }
    .reconciliation-list .date-info .date-picker .ep-input__wrapper::before,
    .reconciliation-list .date-info .date-picker .ep-input__wrapper::after,
    .reconciliation-list .date-info .date-picker .el-input__wrapper::before,
    .reconciliation-list .date-info .date-picker .el-input__wrapper::after {
      display: none !important;
      content: none !important;
      border: none !important;
      box-shadow: none !important;
    }
    .reconciliation-list .date-info .date-picker .ep-date-editor,
    .reconciliation-list .date-info .date-picker .el-date-editor {
      border: none !important;
      box-shadow: none !important;
      outline: none !important;
      background: transparent !important;
    }
  `
  document.head.appendChild(style)
}

// 加载各分类的数量
async function loadCounts() {
  try {
    // 加载对账待办数量
    const reconciliationParams = {
      status: 'pending',
      task_type: 'reconciliation',
      due: true
    }
    const reconciliationResponse = await getTasks(reconciliationParams)
    const reconciliationData = reconciliationResponse.data
    if (Array.isArray(reconciliationData)) {
      reconciliationCount.value = reconciliationData.length
    } else if (reconciliationData && typeof reconciliationData === 'object' && 'count' in reconciliationData) {
      reconciliationCount.value = (reconciliationData as { count: number }).count || 0
    }

    // 加载解析待办数量
    const parseReviewParams = {
      status: 'pending',
      task_type: 'parse_review'
    }
    const parseReviewResponse = await getTasks(parseReviewParams)
    const parseReviewData = parseReviewResponse.data
    if (Array.isArray(parseReviewData)) {
      parseReviewCount.value = parseReviewData.length
    } else if (parseReviewData && typeof parseReviewData === 'object' && 'count' in parseReviewData) {
      parseReviewCount.value = (parseReviewData as { count: number }).count || 0
    }
  } catch (error: unknown) {
    console.error('加载待办数量错误:', error)
    // 静默失败，不影响主流程
  }
}

async function loadTasks() {
  loading.value = true
  try {
    const params: {
      due?: boolean
      status: string
      task_type: string
    } = {
      status: 'pending',
      task_type: filterType.value
    }

    // 解析审核待办不需要 due 筛选（基于 status='pending' 直接列出）
    if (filterType.value === 'reconciliation') {
      params.due = true
    }

    const response = await getTasks(params)

    const data = response.data
    if (Array.isArray(data)) {
      tasks.value = data as ScheduledTask[]
      total.value = data.length
    } else if (data && typeof data === 'object' && 'results' in data) {
      tasks.value = (data as { results: ScheduledTask[], count: number }).results || []
      total.value = (data as { results: ScheduledTask[], count: number }).count || 0
    } else {
      console.error('未知的响应结构:', data)
      tasks.value = []
      total.value = 0
    }

    // 更新对应分类的数量
    if (filterType.value === 'reconciliation') {
      reconciliationCount.value = total.value
    } else if (filterType.value === 'parse_review') {
      parseReviewCount.value = total.value
    }
  } catch (error: unknown) {
    console.error('加载待办列表错误:', error)
    if (error && typeof error === 'object' && 'response' in error) {
      const axiosError = error as { response?: { data?: { message?: string } } }
      ElMessage.error(axiosError.response?.data?.message || '加载待办列表失败')
    } else {
      ElMessage.error('网络错误，请稍后重试')
    }
  } finally {
    loading.value = false
  }
}

function isOverdue(dateString: string | null): boolean {
  if (!dateString) return false
  const date = new Date(dateString)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  date.setHours(0, 0, 0, 0)
  return date < today
}

function handleStart(task: ScheduledTask) {
  if (task.task_type === 'parse_review') {
    router.push(`/parse-review/${task.id}`)
  } else {
    router.push(`/reconciliation/${task.id}`)
  }
}

// 计算剩余时间（基于 expires_at 或 created）
function getRemainingTime(task: ScheduledTask): string {
  // 优先使用 expires_at（如果存在）- 这是缓存的实际过期时间
  if (task.expires_at) {
    const expiryTime = task.expires_at * 1000  // expires_at 是 Unix 时间戳（秒），转换为毫秒
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

  // 回退到使用 created（兼容旧数据或缓存不存在的情况）
  const createdTime = new Date(task.created).getTime()
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
}

// 格式化 badge 显示值（超过 99 显示 99+）
function formatBadgeValue(count: number): string {
  return count > 99 ? '99+' : String(count)
}

async function handleDateChange(taskId: number, newDate: string) {
  if (!newDate) return

  // 找到对应的任务并保存原值
  const task = tasks.value.find(t => t.id === taskId)
  if (!task) return

  const originalDate = task.scheduled_date

  try {
    await updateTask(taskId, {
      scheduled_date: newDate
    })
    ElMessage.success('修改日期成功')
    // 刷新列表以更新逾期状态
    loadTasks()
  } catch (error: unknown) {
    // 失败时恢复原值
    if (task) {
      task.scheduled_date = originalDate
    }
    if (error && typeof error === 'object' && 'response' in error) {
      const axiosError = error as { response?: { data?: { message?: string } } }
      ElMessage.error(axiosError.response?.data?.message || '修改日期失败')
    } else {
      ElMessage.error('网络错误，请稍后重试')
    }
  }
}

// 跳过审核直接写入
async function handleDirectWrite(task: ScheduledTask) {
  if (task.task_type !== 'parse_review') return

  try {
    await ElMessageBox.confirm(
      `确定要跳过审核，直接将解析结果写入账本吗？`,
      '确认直接写入',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    writingTaskIds.value.add(task.id)
    
    try {
      await confirmWrite(task.id)
      ElMessage.success('已直接写入账本')
      
      // 刷新列表
      await loadTasks()
      await loadCounts()
      
      // 触发横幅更新
      emitTaskBannerRefresh()
    } finally {
      writingTaskIds.value.delete(task.id)
    }
  } catch (error: unknown) {
    if (error === 'cancel') {
      // 用户取消，不处理
      return
    }
    
    if (error && typeof error === 'object' && 'response' in error) {
      const axiosError = error as { response?: { data?: { message?: string } } }
      ElMessage.error(axiosError.response?.data?.message || '直接写入失败')
    } else {
      ElMessage.error('网络错误，请稍后重试')
    }
  }
}
</script>

<style scoped lang="scss">
.reconciliation-list {
  padding: 24px;
  max-width: 1200px;
  margin: 0 auto;

  .list-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 24px;

    .header-info {
      display: flex;
      align-items: center;
      gap: 12px;

      .header-title {
        font-size: 24px;
        font-weight: 600;
        color: var(--ep-text-color-primary);
        margin: 0;
      }

      .badge-count {
        :deep(.el-badge__content) {
          font-size: 12px;
          font-weight: 600;
        }
      }
    }

    .filter-buttons {
      display: flex;
      gap: 12px;

      .filter-button {
        position: relative;
        padding: 8px 20px;
        min-width: 80px;
        transition: all 0.3s ease;

        .button-text {
          display: inline-block;
          position: relative;
          z-index: 1;
        }

        .filter-badge {
          position: absolute;
          top: -6px;
          right: -6px;
          z-index: 2;
          transform: scale(1);
          transition: transform 0.2s ease;

          :deep(.el-badge__content) {
            font-size: 11px;
            font-weight: 700;
            height: 20px;
            line-height: 20px;
            padding: 0 7px;
            min-width: 20px;
            border-radius: 10px;
            box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
            border: 2px solid var(--ep-bg-color);
            letter-spacing: 0;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          }

          // 悬停时轻微放大
          &:hover {
            transform: scale(1.1);
          }
        }

        // 按钮悬停时 badge 也跟随变化
        &:hover {
          .filter-badge {
            transform: scale(1.1);
          }
        }

        // 激活状态下的 badge 样式
        &.el-button--primary {
          .filter-badge {
            :deep(.el-badge__content) {
              box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
              animation: pulse 2s ease-in-out infinite;
            }
          }
        }
      }
    }
  }

  .tasks-container {
    min-height: 400px;
  }

  .empty-state {
    padding: 80px 20px;
    text-align: center;

    .empty-text {
      font-size: 16px;
      color: var(--ep-text-color-primary);
      margin: 16px 0 8px;
    }

    .empty-hint {
      font-size: 14px;
      color: var(--ep-text-color-secondary);
      margin: 0;
    }
  }

  .tasks-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
    gap: 16px;
  }

  .task-card {
    position: relative;
    background: var(--ep-bg-color);
    border: 2px solid var(--ep-border-color);
    border-radius: 12px;
    padding: 20px;
    cursor: pointer;
    transition: all 0.3s ease;
    overflow: hidden;

    // 确保日期选择器弹出面板不被裁剪
    .date-info {
      overflow: visible;
      position: relative;
      z-index: 1;
    }

    &:hover {
      border-color: var(--ep-color-primary);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
      transform: translateY(-2px);
    }

    &.task-overdue {
      border-color: var(--ep-color-danger);
      background: linear-gradient(135deg,
          var(--ep-bg-color) 0%,
          rgba(245, 108, 108, 0.05) 100%);

      .account-name {
        color: var(--ep-color-danger);
      }
    }

    .card-main {
      flex: 1;
      min-width: 0;
    }

    .account-name,
    .file-name {
      font-size: 18px;
      font-weight: 600;
      color: var(--ep-text-color-primary);
      margin-bottom: 12px;
      word-break: break-word;
      transition: color 0.2s;
    }

    .remaining-time {
      font-size: 14px;
      color: var(--ep-text-color-regular);
      margin-top: 4px;
    }

    .parse-review-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 12px;
    }

    .card-actions {
      display: flex;
      justify-content: flex-end;
      gap: 8px;

      .direct-write-btn {
        font-size: 13px;
        padding: 6px 16px;
        height: 28px;
        border-radius: 6px;
        transition: all 0.2s ease;
        
        &:hover {
          transform: translateY(-1px);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }
      }
    }

    .date-info {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 14px;
      color: var(--ep-text-color-regular);
      margin-top: 4px;
      max-width: 240px;
      width: fit-content;

      .date-picker {
        width: 120px;
        flex-shrink: 0;

        // 清除所有边框和阴影（同时匹配 el- 和 ep- 命名空间）
        :deep(.el-input__wrapper),
        :deep(.ep-input__wrapper) {
          padding: 4px 8px !important;
          box-shadow: none !important;
          border: none !important;
          border-width: 0 !important;
          border-style: none !important;
          border-color: transparent !important;
          outline: none !important;
          background-color: transparent !important;
          transition: all 0.2s;

          // 清除所有伪元素（可能用于创建边框效果）
          &::before,
          &::after {
            display: none !important;
            content: none !important;
            border: none !important;
            border-width: 0 !important;
            box-shadow: none !important;
            background: none !important;
          }

          &:hover {
            background-color: var(--ep-fill-color) !important;
            border: none !important;
            border-width: 0 !important;
            box-shadow: none !important;
            outline: none !important;
          }

          &.is-focus,
          &[class*="is-focus"] {
            background-color: var(--ep-fill-color) !important;
            border: none !important;
            border-width: 0 !important;
            box-shadow: none !important;
            outline: none !important;
          }
        }

        // 清除输入框内部边框
        :deep(.el-input__inner),
        :deep(.ep-input__inner) {
          font-family: 'Courier New', monospace;
          font-weight: 500;
          font-size: 14px;
          color: var(--ep-text-color-regular);
          text-align: left;
          border: none !important;
          outline: none !important;
          background: transparent !important;
        }

        // 移除日期选择器右侧的图标
        :deep(.el-input__suffix),
        :deep(.ep-input__suffix) {
          display: none !important;
        }

        // 清除整个输入框容器的边框
        :deep(.el-input),
        :deep(.ep-input) {
          border: none !important;
          outline: none !important;
          box-shadow: none !important;
          // width: 120px;
        }

        // 清除日期选择器外层容器的所有视觉效果
        :deep(.ep-date-editor),
        :deep(.el-date-editor) {
          border: none !important;
          box-shadow: none !important;
          outline: none !important;
          background: transparent !important;

          &::before,
          &::after {
            display: none !important;
            content: none !important;
          }
        }
      }

      .overdue-tag {
        margin-left: 4px;
        flex-shrink: 0;
      }
    }
  }
}

// Badge 脉冲动画（仅在激活状态）
@keyframes pulse {

  0%,
  100% {
    transform: scale(1);
    opacity: 1;
  }

  50% {
    transform: scale(1.05);
    opacity: 0.9;
  }
}


// 响应式设计
@media (max-width: 768px) {
  .reconciliation-list {
    padding: 16px;

    .tasks-grid {
      grid-template-columns: 1fr;
    }

    .list-header {
      .filter-buttons {
        gap: 8px;

        .filter-button {
          padding: 6px 16px;
          min-width: 70px;
          font-size: 14px;

          .filter-badge {
            top: -4px;
            right: -4px;

            :deep(.el-badge__content) {
              font-size: 10px;
              height: 18px;
              line-height: 18px;
              padding: 0 6px;
              min-width: 18px;
              border-radius: 9px;
            }
          }
        }
      }
    }
  }
}
</style>

<!-- 非 scoped 样式，用于覆盖 Element Plus 默认样式 -->
<style lang="scss">
// 使用全局样式强制覆盖日期选择器的边框（使用更具体的选择器）
.reconciliation-list .date-info .no-border-date-picker,
.reconciliation-list .date-info .date-picker {
  width: 120px;

  // 直接选择所有可能的类名组合，不使用 :deep
  .ep-input__wrapper,
  .el-input__wrapper,
  [class*="input__wrapper"] {
    border: none !important;
    border-width: 0 !important;
    border-style: none !important;
    border-color: transparent !important;
    box-shadow: none !important;
    outline: none !important;
    outline-width: 0 !important;
    background-color: transparent !important;

    &::before,
    &::after {
      display: none !important;
      content: none !important;
      border: none !important;
      border-width: 0 !important;
      box-shadow: none !important;
      background: none !important;
    }
  }

  .ep-date-editor,
  .el-date-editor,
  [class*="date-editor"] {
    border: none !important;
    box-shadow: none !important;
    outline: none !important;
    background: transparent !important;

    &::before,
    &::after {
      display: none !important;
      content: none !important;
    }
  }

  // 使用属性选择器匹配所有可能的变体
  [class*="ep-input"],
  [class*="el-input"] {
    border: none !important;
    box-shadow: none !important;
    outline: none !important;
    // width: 120px;
  }

  // 强制清除所有子元素的边框和阴影
  * {
    border: none !important;
    box-shadow: none !important;
    outline: none !important;
  }
}

// 更激进的全局覆盖：直接针对所有可能的类名
.reconciliation-list {

  [class*="ep-input__wrapper"],
  [class*="el-input__wrapper"] {
    border: none !important;
    box-shadow: none !important;
    outline: none !important;
  }
}

// 暗色模式适配
html.dark {
  .reconciliation-list {
    .filter-buttons {
      .filter-button {
        .filter-badge {

          .el-badge__content,
          [class*="badge__content"] {
            border-color: var(--ep-bg-color-page) !important;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3) !important;
          }
        }

        &.el-button--primary {
          .filter-badge {

            .el-badge__content,
            [class*="badge__content"] {
              border-color: var(--ep-color-primary-dark-2) !important;
            }
          }
        }
      }
    }
  }
}
</style>
