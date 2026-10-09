<template>
  <div class="recurrence-rule-input">
    <el-radio-group v-model="mode" size="small" class="mode-switch">
      <el-radio-button label="preset">简单预设</el-radio-button>
      <el-radio-button label="advanced">高级 DSL</el-radio-button>
    </el-radio-group>

    <!-- 简单预设模式 -->
    <div v-if="mode === 'preset'" class="preset-mode">
      <div class="preset-row">
        <span class="preset-label">频率</span>
        <el-select v-model="freq" style="width: 120px" @change="syncFromPreset">
          <el-option label="每天" value="day" />
          <el-option label="每周" value="week" />
          <el-option label="每月" value="month" />
          <el-option label="每年" value="year" />
        </el-select>
        <template v-if="freq !== 'year'">
          <span class="preset-label">间隔</span>
          <el-input-number v-model="interval" :min="1" :max="99" controls-position="right" style="width: 130px"
            @change="syncFromPreset" />
        </template>
      </div>

      <!-- 每周 -->
      <div v-if="freq === 'week'" class="preset-row">
        <span class="preset-label">星期</span>
        <el-select v-model="weekdays" multiple collapse-tags collapse-tags-tooltip placeholder="请选择星期" style="flex: 1"
          @change="syncFromPreset">
          <el-option v-for="w in weekdayOptions" :key="w.value" :label="w.label" :value="w.value" />
        </el-select>
      </div>

      <!-- 每月 -->
      <div v-if="freq === 'month'" class="preset-row">
        <span class="preset-label">规则</span>
        <el-radio-group v-model="monthMode" @change="syncFromPreset">
          <el-radio label="day">某日</el-radio>
          <el-radio label="weekday">第几个星期几</el-radio>
        </el-radio-group>
      </div>
      <div v-if="freq === 'month' && monthMode === 'day'" class="preset-row">
        <span class="preset-label">日期</span>
        <el-select v-model="monthDay" style="width: 160px" @change="syncFromPreset">
          <el-option label="最后一天" value="last" />
          <el-option v-for="d in 31" :key="d" :label="`第 ${d} 天`" :value="d" />
        </el-select>
      </div>
      <div v-if="freq === 'month' && monthMode === 'weekday'" class="preset-row">
        <span class="preset-label">第几个</span>
        <el-select v-model="ordinal" style="width: 130px" @change="syncFromPreset">
          <el-option v-for="o in ordinalOptions" :key="o.value" :label="o.label" :value="o.value" />
        </el-select>
        <el-select v-model="monthWeekday" style="width: 120px" @change="syncFromPreset">
          <el-option v-for="w in weekdayOptions" :key="w.value" :label="w.label" :value="w.value" />
        </el-select>
      </div>

      <!-- 每年 -->
      <div v-if="freq === 'year'" class="preset-row">
        <span class="preset-label">日期</span>
        <el-select v-model="yearMonth" style="width: 150px" @change="syncFromPreset">
          <el-option v-for="m in monthOptions" :key="m.value" :label="m.label" :value="m.value" />
        </el-select>
        <el-select v-model="yearDay" style="width: 130px" @change="syncFromPreset">
          <el-option v-for="d in 31" :key="d" :label="`第 ${d} 天`" :value="d" />
        </el-select>
      </div>

      <div class="rule-preview">
        生成规则：<code>{{ modelValue || '—' }}</code>
      </div>
    </div>

    <!-- 高级 DSL 模式 -->
    <div v-else class="advanced-mode">
      <el-input v-model="advancedText" type="textarea" :rows="2"
        placeholder="every 3 days / every weekday / every week on Tuesday, Friday / every month on the last Friday / every January on the 15th"
        @input="handleAdvancedInput" />
    </div>

    <!-- 规则预览 -->
    <div v-if="showPreview" class="preview-block">
      <div v-if="previewLoading" class="preview-hint">正在解析…</div>
      <div v-else-if="previewError" class="preview-error">{{ previewError }}</div>
      <div v-else-if="previewDescribe" class="preview-result">
        <div class="preview-describe">{{ previewDescribe }}</div>
        <div v-if="previewDates.length" class="preview-dates">
          <span class="preview-dates-label">下次：</span>
          <el-tag v-for="(date, index) in previewDates.slice(0, 5)" :key="index" size="small" class="preview-tag">
            {{ date }}
          </el-tag>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue'
import { previewRule } from '../../api/recurring'

const props = withDefaults(
  defineProps<{
    modelValue: string
    showPreview?: boolean
    startDate?: string | null
  }>(),
  {
    showPreview: true,
    startDate: null
  }
)
const emit = defineEmits<{ (e: 'update:modelValue', value: string): void }>()

type Mode = 'preset' | 'advanced'
type Freq = 'day' | 'week' | 'month' | 'year'

const mode = ref<Mode>('preset')
const freq = ref<Freq>('day')
const interval = ref(1)
const weekdays = ref<string[]>([])
const monthMode = ref<'day' | 'weekday'>('day')
const monthDay = ref<number | 'last'>(1)
const ordinal = ref('last')
const monthWeekday = ref('Friday')
const yearMonth = ref('January')
const yearDay = ref(1)

const advancedText = ref('')
const previewLoading = ref(false)
const previewError = ref('')
const previewDescribe = ref('')
const previewDates = ref<string[]>([])

let lastEmitted = ''
let previewTimer: ReturnType<typeof setTimeout> | null = null

const weekdayOptions = [
  { label: '周一', value: 'Monday' },
  { label: '周二', value: 'Tuesday' },
  { label: '周三', value: 'Wednesday' },
  { label: '周四', value: 'Thursday' },
  { label: '周五', value: 'Friday' },
  { label: '周六', value: 'Saturday' },
  { label: '周日', value: 'Sunday' }
]

const monthOptions = [
  { label: '1月', value: 'January' },
  { label: '2月', value: 'February' },
  { label: '3月', value: 'March' },
  { label: '4月', value: 'April' },
  { label: '5月', value: 'May' },
  { label: '6月', value: 'June' },
  { label: '7月', value: 'July' },
  { label: '8月', value: 'August' },
  { label: '9月', value: 'September' },
  { label: '10月', value: 'October' },
  { label: '11月', value: 'November' },
  { label: '12月', value: 'December' }
]

const ordinalOptions = [
  { label: '第一个', value: '1st' },
  { label: '第二个', value: '2nd' },
  { label: '第三个', value: '3rd' },
  { label: '第四个', value: '4th' },
  { label: '最后一个', value: 'last' }
]

// 数字转序数词，如 1 -> 1st, 2 -> 2nd
function toOrdinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}

function emitValue(value: string) {
  lastEmitted = value
  emit('update:modelValue', value)
  schedulePreview()
}

// 根据预设状态生成 DSL
function buildPreset(): string {
  if (freq.value === 'day') {
    return interval.value > 1 ? `every ${interval.value} days` : 'every day'
  }
  if (freq.value === 'week') {
    const base = interval.value > 1 ? `every ${interval.value} weeks` : 'every week'
    return weekdays.value.length ? `${base} on ${weekdays.value.join(', ')}` : base
  }
  if (freq.value === 'month') {
    const base = interval.value > 1 ? `every ${interval.value} months` : 'every month'
    if (monthMode.value === 'day') {
      const day = monthDay.value === 'last' ? 'last' : toOrdinal(Number(monthDay.value))
      return `${base} on the ${day}`
    }
    return `${base} on the ${ordinal.value} ${monthWeekday.value}`
  }
  // year
  return `every ${yearMonth.value} on the ${toOrdinal(yearDay.value)}`
}

function syncFromPreset() {
  emitValue(buildPreset())
}

// 尝试把已有的 DSL 文本解析回预设状态，解析失败则回退到高级模式
function initFromModel(text: string) {
  const clean = (text || '').trim()
  if (!clean) {
    mode.value = 'preset'
    freq.value = 'day'
    interval.value = 1
    weekdays.value = []
    monthMode.value = 'day'
    monthDay.value = 1
    ordinal.value = 'last'
    monthWeekday.value = 'Friday'
    yearMonth.value = 'January'
    yearDay.value = 1
    return
  }

  // every [N] days
  let m = clean.match(/^every (\d+ )?days?$/i)
  if (m) {
    mode.value = 'preset'
    freq.value = 'day'
    interval.value = m[1] ? parseInt(m[1], 10) : 1
    return
  }

  // every [N] weeks [on A, B]
  m = clean.match(/^every (\d+ )?weeks?(?: on (.+))?$/i)
  if (m) {
    mode.value = 'preset'
    freq.value = 'week'
    interval.value = m[1] ? parseInt(m[1], 10) : 1
    weekdays.value = m[2]
      ? m[2].split(',').map((s) => s.trim()).filter(Boolean)
      : []
    return
  }

  // every [N] months on the last / Nth [Weekday]
  m = clean.match(/^every (\d+ )?months? on the (last|\d+(?:st|nd|rd|th))(?:\s+([A-Za-z]+))?$/i)
  if (m) {
    mode.value = 'preset'
    freq.value = 'month'
    interval.value = m[1] ? parseInt(m[1], 10) : 1
    const token = m[2].toLowerCase()
    const weekday = m[3]
    if (weekday) {
      monthMode.value = 'weekday'
      ordinal.value = token
      monthWeekday.value = weekday
    } else {
      monthMode.value = 'day'
      monthDay.value = token === 'last' ? 'last' : parseInt(token, 10)
    }
    return
  }

  // every <Month> on the Nth
  m = clean.match(
    /^every (January|February|March|April|May|June|July|August|September|October|November|December) on the (\d+(?:st|nd|rd|th))$/i
  )
  if (m) {
    mode.value = 'preset'
    freq.value = 'year'
    yearMonth.value = m[1]
    yearDay.value = parseInt(m[2], 10)
    return
  }

  // 无法解析：使用高级模式
  mode.value = 'advanced'
  advancedText.value = clean
}

function handleAdvancedInput() {
  emitValue(advancedText.value)
}

// 防抖预览（~400ms）
function schedulePreview() {
  if (!props.showPreview) return
  if (previewTimer) clearTimeout(previewTimer)
  previewTimer = setTimeout(runPreview, 400)
}

async function runPreview() {
  const text = (props.modelValue || '').trim()
  previewError.value = ''
  previewDescribe.value = ''
  previewDates.value = []
  if (!text) return

  previewLoading.value = true
  try {
    const response = await previewRule({ rule_text: text, start_date: props.startDate })
    previewDescribe.value = response.data.describe || ''
    previewDates.value = response.data.next_occurrences || []
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'response' in error) {
      const axiosError = error as { response?: { data?: { error?: string } } }
      previewError.value = axiosError.response?.data?.error || '规则解析失败'
    } else {
      previewError.value = '规则解析失败'
    }
  } finally {
    previewLoading.value = false
  }
}

watch(
  () => props.modelValue,
  (value) => {
    if (value !== lastEmitted) {
      initFromModel(value || '')
    }
    schedulePreview()
  }
)

watch(
  () => props.startDate,
  () => schedulePreview()
)

onMounted(() => {
  initFromModel(props.modelValue || '')
  schedulePreview()
})

onUnmounted(() => {
  if (previewTimer) clearTimeout(previewTimer)
})
</script>

<style scoped>
.recurrence-rule-input {
  width: 100%;
}

.mode-switch {
  margin-bottom: 10px;
}

.preset-mode {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.preset-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.preset-label {
  font-size: 13px;
  color: var(--ep-text-color-regular);
  white-space: nowrap;
}

.rule-preview {
  font-size: 12px;
  color: var(--ep-text-color-secondary);
}

.rule-preview code {
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  background-color: var(--ep-fill-color-light);
  padding: 2px 6px;
  border-radius: 4px;
}

.advanced-mode {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.preview-block {
  margin-top: 8px;
}

.preview-hint {
  font-size: 12px;
  color: var(--ep-text-color-secondary);
}

.preview-error {
  font-size: 12px;
  color: var(--ep-color-danger);
}

.preview-result {
  font-size: 12px;
  color: var(--ep-text-color-regular);
}

.preview-describe {
  font-weight: 600;
}

.preview-dates {
  margin-top: 4px;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  color: var(--ep-text-color-secondary);
}

.preview-dates-label {
  white-space: nowrap;
}

.preview-tag {
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
}
</style>
