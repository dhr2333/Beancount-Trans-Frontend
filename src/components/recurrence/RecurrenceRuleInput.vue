<template>
  <div class="recurrence-rule-input">
    <el-input v-model="text" :placeholder="placeholder" clearable @input="handleInput" @clear="handleClear"
      @blur="emit('blur')" @keyup.enter="emit('submit')" />

    <div v-if="showPreview" class="preview-block">
      <div v-if="previewLoading" class="preview-hint">正在解析…</div>
      <div v-else-if="previewError" class="preview-error">{{ previewError }}</div>
      <div v-else-if="previewDescribe" class="preview-result">{{ previewDescribe }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue'
import { previewRule } from '../../api/recurring'
import type { RecurrenceBasis } from '../../types/reconciliation'

const props = withDefaults(
  defineProps<{
    modelValue: string
    showPreview?: boolean
    /** 关闭内部展示但仍向上抛出 preview 事件（供外部自渲染预览） */
    emitPreview?: boolean
    startDate?: string | null
    placeholder?: string
  }>(),
  {
    showPreview: true,
    emitPreview: false,
    startDate: null,
    placeholder: '例如：every month on the last / every week on Tuesday, Friday'
  }
)
const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
  (e: 'blur'): void
  (e: 'submit'): void
  (e: 'preview', payload: { describe: string; basis?: RecurrenceBasis; next_occurrences?: string[]; error: string }): void
}>()

const text = ref('')
const previewLoading = ref(false)
const previewError = ref('')
const previewDescribe = ref('')

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
  if (!props.showPreview && !props.emitPreview) return
  if (previewTimer) clearTimeout(previewTimer)
  previewTimer = setTimeout(runPreview, 400)
}

async function runPreview() {
  const value = (text.value || '').trim()
  previewError.value = ''
  previewDescribe.value = ''
  if (!value) {
    emit('preview', { describe: '', error: '' })
    return
  }

  previewLoading.value = true
  try {
    const response = await previewRule({ rule_text: value, start_date: props.startDate })
    previewDescribe.value = response.data.describe || ''
    emit('preview', {
      describe: previewDescribe.value,
      basis: response.data.basis,
      next_occurrences: response.data.next_occurrences,
      error: ''
    })
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'response' in error) {
      const axiosError = error as { response?: { data?: { error?: string } } }
      previewError.value = axiosError.response?.data?.error || '规则解析失败'
    } else {
      previewError.value = '规则解析失败'
    }
    emit('preview', { describe: '', error: previewError.value })
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
  font-weight: 600;
  color: var(--ep-text-color-regular);
}
</style>
