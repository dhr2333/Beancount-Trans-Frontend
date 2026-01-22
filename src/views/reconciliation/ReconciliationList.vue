<template>
  <div class="reconciliation-list">
    <!-- 极简头部：只显示待办数量 -->
    <div class="list-header">
      <div class="header-info">
        <h2 class="header-title">对账待办</h2>
        <el-badge v-if="total > 0" :value="total" class="badge-count" />
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
            <p class="empty-text">所有账户都已对账完成</p>
            <p class="empty-hint">在「账户管理」中设置对账周期，系统会自动创建待办任务</p>
          </template>
        </el-empty>
      </div>

      <!-- 待办卡片列表 -->
      <div v-else class="tasks-grid">
        <div v-for="task in tasks" :key="task.id" class="task-card"
          :class="{ 'task-overdue': isOverdue(task.scheduled_date) }" @click="handleStart(task)">
          <!-- 卡片主体 -->
          <div class="card-main">
            <!-- 账户名称（最突出） -->
            <div class="account-name">
              {{ task.account_name || '未知账户' }}
            </div>

            <!-- 日期选择器（直接嵌入） -->
            <div class="date-info" @click.stop>
              <el-date-picker v-model="task.scheduled_date" type="date" format="YYYY-MM-DD" value-format="YYYY-MM-DD"
                :clearable="false" placeholder="选择日期" class="date-picker no-border-date-picker" placement="bottom-start"
                :teleported="true" :popper-options="{
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
                }" @change="(value: string) => handleDateChange(task.id, value)" />
              <el-tag v-if="isOverdue(task.scheduled_date)" type="danger" size="small" class="overdue-tag">
                逾期
              </el-tag>
            </div>
          </div>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onActivated } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import {
  Check
} from '@element-plus/icons-vue'
import { getTasks, updateTask } from '../../api/reconciliation'
import type { ScheduledTask } from '../../types/reconciliation'

const router = useRouter()

const loading = ref(false)
const tasks = ref<ScheduledTask[]>([])
const total = ref(0)

onMounted(() => {
  loadTasks()
  // 动态注入样式，确保清除日期选择器的边框
  injectDatePickerStyles()
})

// 页面激活时刷新列表（从对账表单返回时）
onActivated(() => {
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

async function loadTasks() {
  loading.value = true
  try {
    const response = await getTasks({
      due: true,
      status: 'pending',
    })

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
  router.push(`/reconciliation/${task.id}`)
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
</script>

<style scoped lang="scss">
.reconciliation-list {
  padding: 24px;
  max-width: 1200px;
  margin: 0 auto;

  .list-header {
    display: flex;
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

    .account-name {
      font-size: 18px;
      font-weight: 600;
      color: var(--ep-text-color-primary);
      margin-bottom: 12px;
      word-break: break-word;
      transition: color 0.2s;
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

// 响应式设计
@media (max-width: 768px) {
  .reconciliation-list {
    padding: 16px;

    .tasks-grid {
      grid-template-columns: 1fr;
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
</style>
