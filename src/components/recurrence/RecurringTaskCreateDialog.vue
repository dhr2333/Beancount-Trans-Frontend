<template>
  <el-dialog v-model="visible" title="新建循环待办" width="640px" :close-on-click-modal="false" append-to-body
    class="recurring-create-dialog">
    <!-- ① 循环周期 -->
    <section class="block">
      <h4 class="block-title">循环周期</h4>
      <div class="presets">
        <el-button v-for="preset in PRESETS" :key="preset.rule" size="small" class="preset-btn"
          @click="applyPreset(preset.rule)">
          {{ preset.label }}
        </el-button>
      </div>
      <RecurrenceRuleInput v-model="form.ruleText" :show-preview="false" :emit-preview="true"
        :start-date="form.startDate" @preview="onPreview" />
      <div class="preview-line">
        <span v-if="preview.error" class="preview-error">{{ preview.error }}</span>
        <span v-else-if="preview.describe" class="preview-desc">
          {{ preview.describe }}
          <span v-if="preview.occurrences.length" class="preview-occ">
            · 后续：{{ preview.occurrences.join('、') }}
          </span>
        </span>
        <span v-else class="preview-hint">输入或选择规则后，这里会显示中文描述与后续日期</span>
      </div>
    </section>

    <!-- ② 文本/模板 -->
    <section class="block">
      <h4 class="block-title">文本/模板</h4>
      <el-radio-group v-model="form.kind" class="kind-group">
        <el-radio-button label="notify">通知</el-radio-button>
        <el-radio-button label="generate_review">生成审核待办</el-radio-button>
      </el-radio-group>

      <el-input v-if="form.kind === 'notify'" v-model="form.content" maxlength="128" show-word-limit
        placeholder="输入待办文本，将显示在待办卡片上" />
      <el-input v-else v-model="form.content" type="textarea" :rows="6" class="template-input"
        placeholder="输入 Beancount 模板（固定文本，到期原样并入审核队列，不做日期替换）" />

      <p class="block-hint">
        <template v-if="form.kind === 'notify'">到期后生成一张循环待办卡片，卡片文本即上方内容。</template>
        <template v-else>到期后把模板原样并入统一审核队列；模板中的日期等随期变化内容请在审核页手动修改。</template>
      </p>
    </section>

    <!-- ③ 日期 -->
    <section class="block">
      <h4 class="block-title">日期</h4>
      <div class="date-row">
        <span class="date-label">基准日期</span>
        <el-date-picker v-model="form.startDate" type="date" format="YYYY-MM-DD" value-format="YYYY-MM-DD"
          :clearable="false" placeholder="选择日期" class="date-picker" />
        <el-radio-group v-model="form.basis" class="basis-group" @change="applyBasisToRule">
          <el-radio-button label="scheduled">按计划日期</el-radio-button>
          <el-radio-button label="completed">完成后起算</el-radio-button>
        </el-radio-group>
      </div>
      <p class="block-hint">
        <template v-if="preview.occurrences.length">
          首次生成：{{ preview.occurrences[0] }}（若该日期 ≤ 今天，创建后立即生成待办）
        </template>
        <template v-else>以基准日期为起算锚点；若已到期，创建后会立即生成待办。</template>
      </p>
    </section>

    <template #footer>
      <el-button @click="visible = false">取消</el-button>
      <el-button type="primary" :loading="submitting" :disabled="!canSubmit" @click="handleSubmit">创建</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { createRecurringTask } from '../../api/recurring'
import type { RecurrenceBasis } from '../../types/reconciliation'
import { extractApiErrorMessage } from '../../utils/errorHelper'
import RecurrenceRuleInput from './RecurrenceRuleInput.vue'

const props = defineProps<{ modelValue: boolean }>()
const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'created'): void
}>()

const visible = computed({
  get: () => props.modelValue,
  set: (value: boolean) => emit('update:modelValue', value)
})

// 常用预设（均为后端 DSL 解析器已验证可解析的规则）
const PRESETS: Array<{ label: string; rule: string }> = [
  { label: '每天', rule: 'every day' },
  { label: '每 3 天', rule: 'every 3 days' },
  { label: '每个工作日', rule: 'every weekday' },
  { label: '每周', rule: 'every week' },
  { label: '每周二、周五', rule: 'every week on Tuesday, Friday' },
  { label: '每月', rule: 'every month' },
  { label: '每月 1 日', rule: 'every month on the 1st' },
  { label: '每月最后一天', rule: 'every month on the last' },
  { label: '每月最后一个周五', rule: 'every month on the last Friday' },
  { label: '每季度', rule: 'every 3 months' },
  { label: '每年', rule: 'every year' },
  { label: '每年 1 月 15 日', rule: 'every January on the 15th' }
]

function todayString(): string {
  const d = new Date()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

const form = reactive({
  ruleText: '',
  kind: 'notify' as 'notify' | 'generate_review',
  content: '',
  startDate: todayString(),
  basis: 'scheduled' as RecurrenceBasis
})

const preview = reactive<{ describe: string; occurrences: string[]; error: string }>({
  describe: '',
  occurrences: [],
  error: ''
})

const submitting = ref(false)

const canSubmit = computed(() => {
  if (!form.ruleText.trim()) return false
  if (preview.error) return false
  if (!form.content.trim()) return false
  return true
})

const WHEN_DONE_RE = /\s+when done$/i

// 预设仅在「完成后起算」时保留 when done 语义
function applyPreset(rule: string) {
  form.ruleText = form.basis === 'completed' ? `${rule} when done` : rule
}

function onPreview(payload: { describe: string; basis?: RecurrenceBasis; next_occurrences?: string[]; error: string }) {
  preview.describe = payload.describe
  preview.error = payload.error
  preview.occurrences = payload.next_occurrences || []
}

// 切换基准：直接改写规则文本的 when done 后缀（单一数据源）
function applyBasisToRule() {
  const trimmed = form.ruleText.trim()
  if (!trimmed) return
  if (form.basis === 'completed' && !WHEN_DONE_RE.test(trimmed)) {
    form.ruleText = `${trimmed} when done`
  } else if (form.basis === 'scheduled' && WHEN_DONE_RE.test(trimmed)) {
    form.ruleText = trimmed.replace(WHEN_DONE_RE, '')
  }
}

// 手动在文本里增删 when done 时同步单选
watch(
  () => form.ruleText,
  (value) => {
    const has = WHEN_DONE_RE.test(value.trim())
    if (has && form.basis !== 'completed') form.basis = 'completed'
    else if (!has && form.basis === 'completed') form.basis = 'scheduled'
  }
)

function resetForm() {
  form.ruleText = ''
  form.kind = 'notify'
  form.content = ''
  form.startDate = todayString()
  form.basis = 'scheduled'
  preview.describe = ''
  preview.occurrences = []
  preview.error = ''
}

watch(visible, (open) => {
  if (open) resetForm()
})

async function handleSubmit() {
  const rule = form.ruleText.trim()
  const content = form.content.trim()
  if (!rule) {
    ElMessage.warning('请输入循环规则')
    return
  }
  if (preview.error) {
    ElMessage.warning('循环规则无法解析，请修改后再提交')
    return
  }
  if (!content) {
    ElMessage.warning(form.kind === 'notify' ? '请输入待办文本' : '请输入审核模板')
    return
  }

  const payload = {
    rule_text: rule,
    start_date: form.startDate,
    kind: form.kind,
    ...(form.kind === 'generate_review'
      ? { template: form.content }
      : { note: content })
  }

  submitting.value = true
  try {
    await createRecurringTask(payload)
    ElMessage.success('循环待办已创建')
    visible.value = false
    emit('created')
  } catch (error: unknown) {
    const axiosError = error as { response?: { data?: unknown } }
    ElMessage.error(extractApiErrorMessage(axiosError.response?.data, '创建失败，请检查循环规则'))
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped lang="scss">
.recurring-create-dialog {
  .block {
    margin-bottom: 20px;

    &:last-of-type {
      margin-bottom: 0;
    }
  }

  .block-title {
    margin: 0 0 10px;
    font-size: 14px;
    font-weight: 600;
    color: var(--ep-text-color-primary);
  }

  .presets {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-bottom: 10px;

    .preset-btn {
      margin: 0;
    }
  }

  .preview-line {
    margin-top: 6px;
    font-size: 12px;
    line-height: 1.5;
    min-height: 18px;

    .preview-desc {
      font-weight: 600;
      color: var(--ep-text-color-regular);
    }

    .preview-occ {
      font-weight: 400;
      color: var(--ep-text-color-secondary);
    }

    .preview-hint {
      color: var(--ep-text-color-secondary);
    }

    .preview-error {
      color: var(--ep-color-danger);
    }
  }

  .kind-group {
    margin-bottom: 10px;
  }

  .template-input {
    :deep(.el-textarea__inner) {
      font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
      font-size: 13px;
      line-height: 1.5;
    }
  }

  .block-hint {
    margin: 8px 0 0;
    font-size: 12px;
    color: var(--ep-text-color-secondary);
  }

  .date-row {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 12px;

    .date-label {
      font-size: 14px;
      color: var(--ep-text-color-regular);
    }
  }
}
</style>
