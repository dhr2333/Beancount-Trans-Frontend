<template>
    <!-- 匿名用户提示 -->
    <AnonymousPrompt v-model="showAnonymousPrompt" @skip="handleSkipAnonymous" />

    <!-- 格式配置面板，只在非匿名用户或已跳过提示时显示 -->
    <el-form v-if="!showAnonymousPrompt" :model="formModel" :rules="formRules" ref="configForm">
        <el-collapse v-model="activePanels" class="config-panel">
            <!-- 基础字段显示 -->
            <el-collapse-item title="基础字段显示" name="basic" class="config-item">
                <div class="config-group">
                    <el-checkbox-group v-model="formatSettings">
                        <el-checkbox label="showNote">显示备注内容</el-checkbox>
                        <el-checkbox label="showTag">显示交易标签</el-checkbox>
                        <el-checkbox label="showTime">显示交易时间</el-checkbox>
                        <el-checkbox label="showUUID">显示交易流水号</el-checkbox>
                        <el-checkbox label="showStatus">显示交易状态</el-checkbox>
                        <el-checkbox label="showDiscount">显示折扣信息</el-checkbox>
                    </el-checkbox-group>
                </div>
            </el-collapse-item>

            <!-- 高级格式设置 -->
            <el-collapse-item title="高级格式设置" name="advanced" class="config-item">
                <div class="config-group">
                    <el-divider>账户模板配置</el-divider>

                    <!-- 收入模板组 -->
                    <div class="template-group">
                        <el-input v-model="incomeTemplate" placeholder="输入自定义收入账户（如：Income:Discount）" clearable
                            class="template-input">
                            <template #prepend>优惠收入模板</template>
                        </el-input>

                        <el-input v-model="commissionTemplate" placeholder="输入手续费账户（如：Expenses:Finance:Commission）"
                            clearable class="template-input">
                            <template #prepend>手续费模板</template>
                        </el-input>

                        <el-form-item prop="currency" :rules="[
                            {
                                pattern: /^[A-Z][A-Z0-9'._-]{0,22}([A-Z0-9])?$/,
                                message: '货币必须以大写字母开头，以大写字母/数字结尾，并且只能包含 [A-Z0-9\'._-]',
                                trigger: 'blur'
                            }
                        ]">
                            <el-input v-model="currency" placeholder="输入基础货币（如：CNY）" clearable class="template-input">
                                <template #prepend>
                                    <div class="label-with-tip">
                                        <span>基础货币模板</span>
                                        <el-tooltip content="货币必须以大写字母开头，以大写字母/数字结尾，并且只能包含 [A-Z0-9'._-]"
                                            placement="top">
                                            <el-icon class="tip-icon">
                                                <Warning />
                                            </el-icon>
                                        </el-tooltip>
                                    </div>
                                </template>
                            </el-input>
                        </el-form-item>
                    </div>
                    <el-divider>标记符号设置</el-divider>
                    <el-select v-model="flagSymbol" placeholder="选择日期标记符号" class="symbol-selector">
                        <el-option label="星号 *" value="*" />
                        <el-option label="叹号 !" value="!" />
                        <el-option label="井号 #" value="#" />
                    </el-select>
                </div>
            </el-collapse-item>
            <el-collapse-item title="AI模型配置" name="ai" class="config-item">
                <div class="config-group">
                    <el-divider>模型选择</el-divider>

                    <!-- 精简后的AI模型选择 -->
                    <el-form-item label="AI引擎" prop="aiModel">
                        <el-select v-model="aiModel" placeholder="选择AI处理引擎" class="model-selector">
                            <el-option label="单规则匹配" value="None" description="选择第一个" />
                            <el-option label="BERT - 本地模型 (平衡模式)" value="BERT"
                                description="基于Transformer架构，适合复杂语义理解，准确度较高（F1 0.87），推理速度 32ms/token" />
                            <el-option label="spaCy - 本地模型 (极速模式)" value="spaCy"
                                description="工业级NLP库，优化词向量匹配，推理速度 <5ms/token，适合实时处理" />
                            <el-option label="DeepSeek - 云端大模型 (高精度模式)" value="DeepSeek"
                                description="千亿参数LLM（需API密钥），复杂场景准确度提升35%，延迟 800-1200ms/请求" />
                        </el-select>
                    </el-form-item>

                    <!-- DeepSeek专属配置 -->
                    <template v-if="aiModel === 'DeepSeek'">
                        <el-form-item label="API密钥" prop="deepseek_apikey">
                            <el-input v-model="deepseek_apikey" type="password" placeholder="输入DeepSeek API密钥"
                                show-password clearable />
                        </el-form-item>
                    </template>
                </div>
            </el-collapse-item>
        </el-collapse>
    </el-form>

    <!-- 操作按钮 -->
    <div v-if="!showAnonymousPrompt" class="action-buttons">
        <el-button type="primary" @click="validateAndSubmit" :loading="loading.save">
            应用配置
        </el-button>
        <el-button @click="resetToDefault" :loading="loading.reset">
            恢复默认
        </el-button>
    </div>
</template>
<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import axios from '../../utils/request'
import AnonymousPrompt from '../common/AnonymousPrompt.vue'
import { hasAuthTokens } from '../../utils/auth'
import type { FormInstance } from 'element-plus'

const configForm = ref<FormInstance>()
const formModel = computed(() => ({
    aiModel: aiModel.value,
    deepseek_apikey: deepseek_apikey.value
}))
const formRules = computed(() => ({
    deepseek_apikey: aiModel.value === 'DeepSeek' ? [
        { required: true, message: 'API密钥不能为空', trigger: 'blur' }
    ] : []
}))

// 修改提交方法
const validateAndSubmit = async () => {
    try {
        // 先验证表单
        await configForm.value?.validate()

        // 验证通过后提交
        await applyConfig()
    } catch (error) {
        // 验证失败会自动显示错误信息
    }
}

interface Config {
    flag: string
    show_note: boolean
    show_tag: boolean
    show_time: boolean
    show_uuid: boolean
    show_status: boolean
    show_discount: boolean
    income_template?: string
    commission_template?: string
    currency?: string
    ai_model?: string
    deepseek_apikey?: string
    enable_realtime?: boolean
}

// 响应式配置状态
const activePanels = ref(['basic', 'advanced', 'ai'])
const formatSettings = ref<string[]>([])
const incomeTemplate = ref('')
const commissionTemplate = ref('')
const currency = ref('')
const aiModel = ref('BERT') // 默认使用 BERT
const deepseek_apikey = ref('')
const flagSymbol = ref('*')

const loading = ref({
    save: false,
    reset: false
})

// 匿名用户提示
const showAnonymousPrompt = ref(false)

// 转换配置格式：前端 camelCase <-> 后端 snake_case
const convertToFrontend = (config: Config) => {
    return {
        flag: config.flag,
        incomeTemplate: config.income_template || '',
        commissionTemplate: config.commission_template || '',
        currency: config.currency || 'CNY',
        aiModel: config.ai_model || 'BERT',
        deepseek_apikey: config.deepseek_apikey || '',

        formatSettings: [
            ...(config.show_note ? ['showNote'] : []),
            ...(config.show_tag ? ['showTag'] : []),
            ...(config.show_time ? ['showTime'] : []),
            ...(config.show_uuid ? ['showUUID'] : []),
            ...(config.show_status ? ['showStatus'] : []),
            ...(config.show_discount ? ['showDiscount'] : [])
        ]
    }
}

// 加载用户配置
const loadConfig = async () => {
    try {
        const { data } = await axios.get<Config>('config/')
        const frontendConfig = convertToFrontend(data)
        aiModel.value = frontendConfig.aiModel
        deepseek_apikey.value = frontendConfig.deepseek_apikey
        formatSettings.value = frontendConfig.formatSettings
        incomeTemplate.value = frontendConfig.incomeTemplate
        commissionTemplate.value = frontendConfig.commissionTemplate
        flagSymbol.value = frontendConfig.flag
        currency.value = frontendConfig.currency
    } catch (error: any) {
        if (error.response && error.response.status == 401) {
            ElMessage.info('未认证，请登录后重试');
        }
    }
}

// 处理匿名用户跳过提示
const handleSkipAnonymous = () => {
    showAnonymousPrompt.value = false
    // 继续加载配置，显示admin用户的共享配置
    loadConfig()
}

// 初始化加载配置
onMounted(() => {
    // 检查用户是否已登录
    if (!hasAuthTokens()) {
        // 未登录用户显示提示
        showAnonymousPrompt.value = true
    } else {
        // 已登录用户直接加载配置
        loadConfig()
    }
})

// 生成请求体
const currentConfig = computed(() => {
    const config: Config = {
        flag: flagSymbol.value,
        show_note: formatSettings.value.includes('showNote'),
        show_tag: formatSettings.value.includes('showTag'),
        show_time: formatSettings.value.includes('showTime'),
        show_uuid: formatSettings.value.includes('showUUID'),
        show_status: formatSettings.value.includes('showStatus'),
        show_discount: formatSettings.value.includes('showDiscount'),
        income_template: incomeTemplate.value,
        commission_template: commissionTemplate.value,
        currency: currency.value,
        ai_model: aiModel.value
    }

    // 只有选择 DeepSeek 时才提交 API 密钥
    if (aiModel.value === 'DeepSeek') {
        config.deepseek_apikey = deepseek_apikey.value
    }

    return config
})

// 应用配置
const applyConfig = async () => {
    try {
        loading.value.save = true
        await axios.put('config/', currentConfig.value)
        ElMessage.success('配置已保存')
    } catch (error: any) {
        if (error.response) {
            switch (error.response.status) {
                case 401:
                    ElMessage.error('未认证，请登录后重试')
                    break
                case 400:
                    ElMessage.error(`配置保存失败: ${error.response.data?.message || '参数错误'}`)
                    break
                default:
                    ElMessage.error('配置保存失败，请稍后重试')
            }
        } else {
            ElMessage.error('网络错误，请检查连接')
        }
    } finally {
        loading.value.save = false
    }
}

// 重置为默认配置
const resetToDefault = async () => {
    try {
        loading.value.reset = true
        await axios.put('config/', {
            flag: '*',
            show_note: true,
            show_tag: true,
            show_time: true,
            show_uuid: true,
            show_status: true,
            show_discount: true,
            income_template: 'Income:Discount',
            commission_template: 'Expenses:Finance:Commission',
            currency: 'CNY',
            ai_model: 'BERT',
        })
        await loadConfig() // 重新加载最新配置
        ElMessage.success('已恢复默认配置')
    } catch (error: any) {
        if (error.response && error.response.status == 401) {
            ElMessage.error('未认证，请登录后重试')
        } else {
            ElMessage.error('重置配置失败')
        }
    } finally {
        loading.value.reset = false
    }
}
</script>


<style scoped>
.template-group {
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.template-input {
    margin-bottom: 10px;
}

.symbol-selector {
    width: 220px;
}

.config-item {
    padding: 0 16px;
}

.config-group {
    padding: 0 16px;

}

.label-with-tip {
    display: flex;
    align-items: center;
    gap: 6px;
}

.model-selector {
    width: 100%;
    margin-bottom: 15px;
}

.el-form-item {
    margin-bottom: 18px;
}
</style>
