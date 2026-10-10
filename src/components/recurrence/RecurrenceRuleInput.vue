<template>
  <div class="recurrence-rule-input">
    <el-input v-model="text" :placeholder="placeholder" clearable @input="handleInput" @clear="handleClear" />

    <div v-if="showPreview" class="preview-block">
      <div v-if="previewLoading" class="preview-hint">正在解析…</div>
      <div v-else-if="previewError" class="preview-error">{{ previewError }}</div>
      <div v-else-if="previewDescribe" class="preview-result">
        <span class="preview-describe">{{ previewDescribe }}</span>
        <span v-if="previewDates.length" class="preview-dates">
          下次：{{ previewDates.slice(0, 5).join(' · ') }}
        </span>
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
    placeholder?: string
  }>(),
  {
    showPreview: true,
    startDate: null,
    placeholder: '例如：every month on the last / every week on Tuesday, Friday'
  }
)
const emit = defineEmits<{ (e: 'update:modelValue', value: string): void }>()

const text = ref('')
const previewLoading = ref(false)
const previewError = ref('')
const previewDescribe = ref('')
const previewDates = ref<string[]>([])

let lastEmitted = ''
let previewTimer: ReturnType<typeof setTimeout> | null = null

function handleInput(value: string) {
  lastEmitted = value
  emit('update:modelValue', value)
  schedulePreview()
}

function handleClear() {
  text.value = ''
  handleInput('')
}

// 防抖预览（~400ms）
function schedulePreview() {
  if (!props.showPreview) return
  if (previewTimer) clearTimeout(previewTimer)
  previewTimer = setTimeout(runPreview, 400)
}

async function runPreview() {
  const value = (text.value || '').trim()
  previewError.value = ''
  previewDescribe.value = ''
  previewDates.value = []
  if (!value) return

  previewLoading.value = true
  try {
    const response = await previewRule({ rule_text: value, start_date: props.startDate })
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
      text.value = value || ''
    }
    schedulePreview()
  }
)

watch(
  () => props.startDate,
  () => schedulePreview()
)

onMounted(() => {
  text.value = props.modelValue || ''
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

.preview-block {
  margin-top: 6px;
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
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
}

.preview-describe {
  font-weight: 600;
}

.preview-dates {
  color: var(--ep-text-color-secondary);
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
}
</style>
