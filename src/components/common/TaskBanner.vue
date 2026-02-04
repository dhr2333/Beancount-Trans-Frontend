<template>
  <transition name="banner-slide">
    <div v-if="visible && pendingTaskCount > 0 && !isReconciliationPage" class="task-banner"
      :class="{ 'has-overdue': overdueCount > 0 }">
      <div class="banner-content">
        <div class="banner-left">
          <el-icon class="banner-icon" :size="20">
            <Bell />
          </el-icon>
          <span class="banner-text">
            您有 <strong>{{ pendingTaskCount }}</strong> 个待办任务
            <span v-if="overdueCount > 0" class="overdue-hint">
              （<span class="overdue-count">{{ overdueCount }}</span> 个逾期）
            </span>
          </span>
        </div>
        <div class="banner-right">
          <el-button id="tour-task-banner-button" type="primary" size="small" @click="handleGoToTasks">
            立即处理
          </el-button>
          <el-button text size="small" @click="handleDismiss">
            稍后提醒
          </el-button>
          <el-button text size="small" @click="handleClose">
            <el-icon>
              <Close />
            </el-icon>
          </el-button>
        </div>
      </div>
    </div>
  </transition>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, computed, nextTick } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { Bell, Close } from '@element-plus/icons-vue'
import { getTasks } from '../../api/reconciliation'
import type { ScheduledTask } from '../../types/reconciliation'
import { subscribeTaskBannerRefresh } from '../../utils/accountEvents'
import { continueUserTour } from '../../utils/userTour'

const router = useRouter()
const route = useRoute()

const visible = ref(true)
const pendingTaskCount = ref(0)
const overdueCount = ref(0)
const previousParseReviewCount = ref(0) // 保存之前的解析审核任务数量
const tourStep4Triggered = ref(false) // 标记是否已经触发过导览步骤4
const tourStep5Triggered = ref(false) // 标记是否已经触发过导览步骤5

// 检查是否在待办列表、对账表单或解析审核页面
const isReconciliationPage = computed(() => {
  return route.path.startsWith('/reconciliation') || route.path.startsWith('/parse-review')
})

// 检查是否已关闭（存储在 localStorage）
const isDismissed = () => {
  const dismissed = localStorage.getItem('taskBannerDismissed')
  if (!dismissed) return false

  const dismissedTime = parseInt(dismissed, 10)
  const now = Date.now()
  // 如果关闭时间超过 1 小时，重新显示
  return (now - dismissedTime) < 3600000
}

// 加载待办任务数量
async function loadPendingTasks() {
  const accessToken = localStorage.getItem("access")
  if (!accessToken) {
    pendingTaskCount.value = 0
    overdueCount.value = 0
    return
  }

  try {
    // 保存旧值用于检测变化
    const oldCount = pendingTaskCount.value

    // 获取所有待办任务（对账 + 解析审核）
    const reconciliationResponse = await getTasks({
      due: true,
      status: 'pending',
      task_type: 'reconciliation'
    })

    const parseReviewResponse = await getTasks({
      status: 'pending',
      task_type: 'parse_review'
    })

    let reconciliationTasks: ScheduledTask[] = []
    let parseReviewTasks: ScheduledTask[] = []

    // 处理对账待办
    const reconciliationData = reconciliationResponse.data
    if (Array.isArray(reconciliationData)) {
      reconciliationTasks = reconciliationData as ScheduledTask[]
    } else if (reconciliationData && typeof reconciliationData === 'object' && 'results' in reconciliationData) {
      reconciliationTasks = (reconciliationData as { results: ScheduledTask[], count: number }).results || []
    }

    // 处理解析审核待办
    const parseReviewData = parseReviewResponse.data
    if (Array.isArray(parseReviewData)) {
      parseReviewTasks = parseReviewData as ScheduledTask[]
    } else if (parseReviewData && typeof parseReviewData === 'object' && 'results' in parseReviewData) {
      parseReviewTasks = (parseReviewData as { results: ScheduledTask[], count: number }).results || []
    }

    // 合并所有待办任务
    const allTasks = [...reconciliationTasks, ...parseReviewTasks]
    const newCount = allTasks.length
    const newParseReviewCount = parseReviewTasks.length

    // 保存旧值用于比较（在更新之前）
    const oldParseReviewCount = previousParseReviewCount.value

    // 检查是否有新的解析审核任务（用于导览触发步骤4）
    // 条件：1) 在导览中 2) 之前没有解析审核任务(0) 3) 现在有解析审核任务(>0) 4) 还没有触发过步骤4
    const isInTour = sessionStorage.getItem('tour_in_progress') === 'true'
    const hasNewParseReviewTask = isInTour &&
      !tourStep4Triggered.value &&
      oldParseReviewCount === 0 &&
      newParseReviewCount > 0

    // 检查是否有解析审核任务完成（用于导览触发步骤5）
    // 条件：1) 在导览中 2) 之前有解析审核任务(>0) 3) 现在减少了 4) 已经触发过步骤4 5) 还没有触发过步骤5
    const hasCompletedParseReviewTask = isInTour &&
      !tourStep5Triggered.value &&
      tourStep4Triggered.value &&
      oldParseReviewCount > 0 &&
      newParseReviewCount < oldParseReviewCount

    // 调试日志
    if (isInTour) {
      console.log('导览状态检查:', {
        isInTour,
        tourStep4Triggered: tourStep4Triggered.value,
        tourStep5Triggered: tourStep5Triggered.value,
        oldParseReviewCount,
        newParseReviewCount,
        hasCompletedParseReviewTask
      })
    }

    // 更新计数（在检查之后）
    pendingTaskCount.value = newCount
    previousParseReviewCount.value = newParseReviewCount

    // 计算逾期数量（仅对账待办）
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    overdueCount.value = reconciliationTasks.filter(task => {
      if (!task.scheduled_date) return false
      const taskDate = new Date(task.scheduled_date)
      taskDate.setHours(0, 0, 0, 0)
      return taskDate < today
    }).length

    // 如果已关闭且未超过 1 小时，不显示
    if (isDismissed() && pendingTaskCount.value > 0) {
      visible.value = false
    }

    // 检查是否在导览中，且有新的解析审核任务（触发步骤4）
    if (hasNewParseReviewTask) {
      console.log('检测到新的解析审核任务，准备触发导览步骤4', {
        oldCount: oldParseReviewCount,
        newCount: newParseReviewCount,
        isInTour
      })
      // 标记已触发，避免重复触发
      tourStep4Triggered.value = true
      // 等待DOM渲染完成
      await nextTick()
      // 延迟一点时间确保横幅完全显示
      setTimeout(() => {
        continueUserTour()
      }, 1000)
    }

    // 检查是否在导览中，且有解析审核任务完成（触发步骤5）
    if (hasCompletedParseReviewTask) {
      console.log('检测到解析审核任务完成，准备触发导览步骤5', {
        oldCount: oldParseReviewCount,
        newCount: newParseReviewCount,
        isInTour
      })
      // 标记已触发，避免重复触发
      tourStep5Triggered.value = true
      // 等待DOM渲染完成
      await nextTick()
      // 延迟一点时间确保页面渲染完成
      setTimeout(() => {
        import('../../utils/userTour').then(({ continueUserTourToStep5 }) => {
          continueUserTourToStep5()
        })
      }, 1000)
    }
  } catch (error) {
    console.warn('获取待办数量失败:', error)
    pendingTaskCount.value = 0
    overdueCount.value = 0
  }
}

// 跳转到待办列表
function handleGoToTasks() {
  router.push('/reconciliation')
  handleClose()
}

// 稍后提醒（关闭 1 小时）
function handleDismiss() {
  localStorage.setItem('taskBannerDismissed', Date.now().toString())
  visible.value = false
}

// 关闭横幅
function handleClose() {
  visible.value = false
}

// 定时器引用
let refreshInterval: ReturnType<typeof setInterval> | null = null
let tourStatusInterval: ReturnType<typeof setInterval> | null = null
// 事件监听取消订阅函数
let unsubscribeTaskBannerRefresh: (() => void) | null = null

// 组件挂载时加载
onMounted(() => {
  loadPendingTasks()

  // 定期刷新（每30秒）
  refreshInterval = setInterval(() => {
    loadPendingTasks()
    // 如果任务数量变化，重新显示横幅（如果之前关闭了）
    if (pendingTaskCount.value > 0 && !isDismissed()) {
      visible.value = true
    }
  }, 30000)

  // 监听待办任务刷新事件（账户开启对账周期时触发，或解析待办完成时触发）
  unsubscribeTaskBannerRefresh = subscribeTaskBannerRefresh(() => {
    console.log('收到横幅刷新事件，准备加载待办任务')
    loadPendingTasks()
    // 如果任务数量变化，重新显示横幅（如果之前关闭了）
    if (pendingTaskCount.value > 0 && !isDismissed()) {
      visible.value = true
    }
  })

  // 监听导览状态变化，重置标记
  const checkTourStatus = () => {
    const isInTour = sessionStorage.getItem('tour_in_progress') === 'true'
    if (!isInTour) {
      // 如果不在导览中，重置标记
      tourStep4Triggered.value = false
      tourStep5Triggered.value = false
      previousParseReviewCount.value = 0
    }
  }

  // 定期检查导览状态（每1秒检查一次）
  tourStatusInterval = setInterval(checkTourStatus, 1000)
})

// 组件卸载时清理定时器和事件监听
onUnmounted(() => {
  if (refreshInterval) {
    clearInterval(refreshInterval)
    refreshInterval = null
  }
  if (unsubscribeTaskBannerRefresh) {
    unsubscribeTaskBannerRefresh()
    unsubscribeTaskBannerRefresh = null
  }
  if (tourStatusInterval) {
    clearInterval(tourStatusInterval)
    tourStatusInterval = null
  }
})

// 监听待办数量变化
watch(pendingTaskCount, (newCount) => {
  if (newCount > 0 && !isDismissed()) {
    visible.value = true
  } else if (newCount === 0) {
    visible.value = false
  }
})
</script>

<style scoped lang="scss">
.task-banner {
  background: linear-gradient(135deg, var(--ep-color-primary-light-9) 0%, var(--ep-color-primary-light-8) 100%);
  border-bottom: 1px solid var(--ep-border-color-lighter);
  padding: 12px 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  z-index: 1000;

  .banner-content {
    max-width: 1200px;
    margin: 0 auto;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
  }

  .banner-left {
    display: flex;
    align-items: center;
    gap: 12px;
    flex: 1;

    .banner-icon {
      color: var(--ep-color-primary);
      flex-shrink: 0;
    }

    .banner-text {
      color: var(--ep-text-color-primary);
      font-size: 14px;

      strong {
        color: var(--ep-color-primary);
        font-weight: 600;
      }

      .overdue-hint {
        color: var(--ep-text-color-regular);
        font-size: 13px;

        .overdue-count {
          color: var(--ep-color-danger);
          font-weight: 600;
        }
      }
    }
  }

  .banner-right {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
  }
}

// 逾期时的样式
.task-banner.has-overdue {
  background: linear-gradient(135deg, var(--ep-color-danger-light-9) 0%, var(--ep-color-danger-light-8) 100%);
  border-bottom-color: var(--ep-color-danger-light-7);

  .banner-left .banner-icon {
    color: var(--ep-color-danger);
  }

  .banner-left .banner-text strong {
    color: var(--ep-color-danger);
  }
}

// 过渡动画
.banner-slide-enter-active,
.banner-slide-leave-active {
  transition: all 0.3s ease;
}

.banner-slide-enter-from {
  transform: translateY(-100%);
  opacity: 0;
}

.banner-slide-leave-to {
  transform: translateY(-100%);
  opacity: 0;
}

// 响应式设计
@media (max-width: 768px) {
  .task-banner {
    padding: 10px 16px;

    .banner-content {
      flex-direction: column;
      align-items: flex-start;
      gap: 12px;
    }

    .banner-left {
      width: 100%;
    }

    .banner-right {
      width: 100%;
      justify-content: flex-end;
    }
  }
}
</style>
