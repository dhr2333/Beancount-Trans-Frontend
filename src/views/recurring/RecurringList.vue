<template>
    <div class="recurring-list">
        <div class="management-header">
            <h2>循环待办</h2>
            <div class="header-actions">
                <el-button type="primary" @click="openCreateDialog">
                    <el-icon>
                        <Plus />
                    </el-icon>
                    新建循环待办
                </el-button>
            </div>
        </div>

        <el-alert type="info" :closable="false" show-icon class="kind-note"
            title="到期产出为「通知」的循环待办，到期后会出现在「待办」列表中，仅作提示；「生成审核待办」将复用现有条目审核流程（模板功能开发中）。" />

        <el-card class="list-card">
            <el-table v-loading="loading" :data="definitions" style="width: 100%" empty-text="暂无循环待办">
                <el-table-column prop="title" label="标题" min-width="160" show-overflow-tooltip />
                <el-table-column prop="describe" label="规则" min-width="200" show-overflow-tooltip>
                    <template #default="{ row }">
                        {{ row.describe || row.rule_text }}
                    </template>
                </el-table-column>
                <el-table-column prop="kind_display" label="到期产出" width="130" />
                <el-table-column prop="next_date" label="下次日期" width="130">
                    <template #default="{ row }">
                        {{ row.next_date || '-' }}
                    </template>
                </el-table-column>
                <el-table-column label="状态" width="100">
                    <template #default="{ row }">
                        <el-tag :type="statusTagType(row.status)" size="small">{{ statusLabel(row.status) }}</el-tag>
                    </template>
                </el-table-column>
                <el-table-column label="操作" width="280" fixed="right">
                    <template #default="{ row }">
                        <el-button size="small" @click="openEditDialog(row)">编辑</el-button>
                        <el-button size="small" @click="handlePreview(row)">预览</el-button>
                        <el-button v-if="row.status === 'active'" size="small" @click="handlePause(row)">暂停</el-button>
                        <el-button v-else-if="row.status === 'paused'" size="small"
                            @click="handleResume(row)">恢复</el-button>
                        <el-button size="small" type="danger" @click="handleDelete(row)">删除</el-button>
                    </template>
                </el-table-column>
            </el-table>
        </el-card>

        <!-- 新建 / 编辑对话框 -->
        <el-dialog v-model="formDialogVisible" :title="editingId === null ? '新建循环待办' : '编辑循环待办'" width="600px">
            <el-form :model="form" :rules="formRules" ref="formRef" label-width="110px">
                <el-form-item label="标题" prop="title">
                    <el-input v-model="form.title" maxlength="128" placeholder="例如：每月房租提醒" />
                </el-form-item>
                <el-form-item label="备注">
                    <el-input v-model="form.note" type="textarea" :rows="2" maxlength="256" placeholder="可选" />
                </el-form-item>
                <el-form-item label="循环规则" prop="rule_text">
                    <RecurrenceRuleInput v-model="form.rule_text" :start-date="form.start_date" />
                </el-form-item>
                <el-form-item label="循环基准">
                    <el-radio-group v-model="form.recurrence_basis">
                        <el-radio label="scheduled">按计划日期</el-radio>
                        <el-radio label="completed">按完成日期</el-radio>
                    </el-radio-group>
                </el-form-item>
                <el-form-item label="开始日期">
                    <el-date-picker v-model="form.start_date" type="date" format="YYYY-MM-DD" value-format="YYYY-MM-DD"
                        placeholder="可选，默认今天" :clearable="true" style="width: 100%" />
                </el-form-item>
                <el-form-item label="到期产出">
                    <el-radio-group v-model="form.kind">
                        <el-radio label="notify">通知</el-radio>
                        <el-radio label="generate_review">生成审核待办</el-radio>
                    </el-radio-group>
                </el-form-item>
                <el-form-item v-if="form.kind === 'generate_review'" label="模板引用">
                    <el-input v-model="form.template_ref" placeholder="可选，模板引用（占位）" />
                    <el-alert type="info" :closable="false" show-icon class="kind-alert" title="模板功能开发中，暂不自动生成审核待办" />
                </el-form-item>
            </el-form>
            <template #footer>
                <el-button @click="formDialogVisible = false">取消</el-button>
                <el-button type="primary" :loading="submitting" @click="handleSubmit">确定</el-button>
            </template>
        </el-dialog>

        <!-- 预览对话框 -->
        <el-dialog v-model="previewDialogVisible" title="规则预览" width="500px">
            <div v-if="previewData" class="preview-content">
                <el-descriptions :column="1" border>
                    <el-descriptions-item label="描述">{{ previewData.describe || '—' }}</el-descriptions-item>
                    <el-descriptions-item label="下次日期">{{ previewData.next_date || '—' }}</el-descriptions-item>
                    <el-descriptions-item label="最近几次">
                        <div v-if="previewData.next_occurrences.length">
                            <div v-for="(date, index) in previewData.next_occurrences" :key="index"
                                class="preview-date">
                                {{ date }}
                            </div>
                        </div>
                        <span v-else>—</span>
                    </el-descriptions-item>
                </el-descriptions>
            </div>
            <template #footer>
                <el-button @click="previewDialogVisible = false">关闭</el-button>
            </template>
        </el-dialog>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import type { FormInstance, FormRules } from 'element-plus'
import RecurrenceRuleInput from '../../components/recurrence/RecurrenceRuleInput.vue'
import {
    listRecurringTasks,
    createRecurringTask,
    updateRecurringTask,
    deleteRecurringTask,
    previewRecurringTask,
    pauseRecurringTask,
    resumeRecurringTask
} from '../../api/recurring'
import type {
    RecurringTask,
    RecurringTaskPayload,
    RecurrenceKind,
    RecurrenceBasis,
    RecurringTaskStatus
} from '../../types/reconciliation'
import { emitTaskBannerRefresh } from '../../utils/accountEvents'
import { extractApiErrorMessage } from '../../utils/errorHelper'

interface RecurringForm {
    title: string
    note: string
    rule_text: string
    recurrence_basis: RecurrenceBasis
    start_date: string | null
    kind: RecurrenceKind
    template_ref: string
}

const definitions = ref<RecurringTask[]>([])
const loading = ref(false)
const submitting = ref(false)

const formDialogVisible = ref(false)
const editingId = ref<number | null>(null)
const formRef = ref<FormInstance>()

const previewDialogVisible = ref(false)
const previewData = ref<{ describe: string, next_date: string | null, next_occurrences: string[] } | null>(null)

const form = ref<RecurringForm>(defaultForm())

const formRules: FormRules = {
    title: [{ required: true, message: '请输入标题', trigger: 'blur' }],
    rule_text: [{ required: true, message: '请设置循环规则', trigger: 'change' }]
}

function defaultForm(): RecurringForm {
    return {
        title: '',
        note: '',
        rule_text: 'every month on the 1st',
        recurrence_basis: 'scheduled',
        start_date: null,
        kind: 'notify',
        template_ref: ''
    }
}

function statusLabel(status: RecurringTaskStatus): string {
    const map: Record<RecurringTaskStatus, string> = {
        active: '进行中',
        paused: '已暂停',
        ended: '已结束'
    }
    return map[status] || status
}

function statusTagType(status: RecurringTaskStatus): 'success' | 'info' | 'warning' {
    if (status === 'active') return 'success'
    if (status === 'paused') return 'info'
    return 'warning'
}

async function loadDefinitions() {
    loading.value = true
    try {
        const response = await listRecurringTasks()
        definitions.value = Array.isArray(response.data) ? response.data : []
    } catch (error: unknown) {
        if (error && typeof error === 'object' && 'response' in error) {
            const axiosError = error as { response?: { status?: number, data?: unknown } }
            if (axiosError.response?.status === 401) {
                ElMessage.info('未认证，请登录后重试')
            } else {
                ElMessage.error(extractApiErrorMessage(axiosError.response?.data, '加载循环待办失败'))
            }
        } else {
            ElMessage.error('网络错误，请稍后重试')
        }
    } finally {
        loading.value = false
    }
}

function openCreateDialog() {
    editingId.value = null
    form.value = defaultForm()
    formDialogVisible.value = true
}

function openEditDialog(row: RecurringTask) {
    editingId.value = row.id
    form.value = {
        title: row.title,
        note: row.note || '',
        rule_text: row.rule_text,
        recurrence_basis: row.recurrence_basis,
        start_date: row.start_date,
        kind: row.kind,
        template_ref: row.template_ref || ''
    }
    formDialogVisible.value = true
}

function buildPayload(): RecurringTaskPayload {
    return {
        title: form.value.title.trim(),
        note: form.value.note,
        kind: form.value.kind,
        rule_text: form.value.rule_text.trim(),
        recurrence_basis: form.value.recurrence_basis,
        start_date: form.value.start_date,
        template_ref: form.value.kind === 'generate_review' ? (form.value.template_ref || '') : ''
    }
}

async function handleSubmit() {
    if (!formRef.value) return
    try {
        await formRef.value.validate()
    } catch {
        return
    }

    submitting.value = true
    try {
        const payload = buildPayload()
        if (editingId.value === null) {
            await createRecurringTask(payload)
            ElMessage.success('循环待办创建成功')
        } else {
            await updateRecurringTask(editingId.value, payload)
            ElMessage.success('循环待办更新成功')
        }
        formDialogVisible.value = false
        await loadDefinitions()
        emitTaskBannerRefresh()
    } catch (error: unknown) {
        const axiosError = error as { response?: { status?: number, data?: unknown } }
        ElMessage.error(extractApiErrorMessage(axiosError.response?.data, '保存失败，请检查循环规则'))
    } finally {
        submitting.value = false
    }
}

async function handlePreview(row: RecurringTask) {
    try {
        const response = await previewRecurringTask(row.id)
        previewData.value = {
            describe: response.data.describe || '',
            next_date: row.next_date,
            next_occurrences: response.data.next_occurrences || []
        }
        previewDialogVisible.value = true
    } catch (error: unknown) {
        const axiosError = error as { response?: { data?: unknown } }
        ElMessage.error(extractApiErrorMessage(axiosError.response?.data, '预览失败'))
    }
}

async function handlePause(row: RecurringTask) {
    try {
        await pauseRecurringTask(row.id)
        ElMessage.success('已暂停')
        await loadDefinitions()
        emitTaskBannerRefresh()
    } catch (error: unknown) {
        const axiosError = error as { response?: { data?: unknown } }
        ElMessage.error(extractApiErrorMessage(axiosError.response?.data, '暂停失败'))
    }
}

async function handleResume(row: RecurringTask) {
    try {
        await resumeRecurringTask(row.id)
        ElMessage.success('已恢复')
        await loadDefinitions()
        emitTaskBannerRefresh()
    } catch (error: unknown) {
        const axiosError = error as { response?: { data?: unknown } }
        ElMessage.error(extractApiErrorMessage(axiosError.response?.data, '恢复失败'))
    }
}

async function handleDelete(row: RecurringTask) {
    try {
        await ElMessageBox.confirm(`确定要删除循环待办「${row.title}」吗？`, '确认删除', {
            confirmButtonText: '确定',
            cancelButtonText: '取消',
            type: 'warning'
        })
    } catch {
        return
    }

    try {
        await deleteRecurringTask(row.id)
        ElMessage.success('删除成功')
        await loadDefinitions()
        emitTaskBannerRefresh()
    } catch (error: unknown) {
        const axiosError = error as { response?: { data?: unknown } }
        ElMessage.error(extractApiErrorMessage(axiosError.response?.data, '删除失败'))
    }
}

onMounted(() => {
    loadDefinitions()
})
</script>

<style scoped>
.recurring-list {
    padding: 20px;
    background-color: var(--ep-bg-color);
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
}

.management-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
    padding-bottom: 15px;
    border-bottom: 1px solid var(--ep-border-color);
}

.management-header h2 {
    margin: 0;
    color: var(--ep-text-color-primary);
    font-size: 24px;
    font-weight: 600;
}

.header-actions {
    display: flex;
    gap: 10px;
}

.list-card {
    border-radius: 8px;
}

.kind-note {
    margin-bottom: 16px;
}

.kind-alert {
    margin-top: 8px;
    width: 100%;
}

.preview-content {
    font-size: 14px;
}

.preview-date {
    font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
    font-size: 13px;
}

@media (max-width: 768px) {
    .recurring-list {
        padding: 12px;
    }

    .management-header {
        flex-direction: column;
        align-items: flex-start;
        gap: 12px;
    }
}
</style>
