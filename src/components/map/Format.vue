<template>
    <!-- 格式配置面板 -->
    <el-collapse v-model="activePanels" class="config-panel">
        <!-- 基础字段显示 -->
        <el-collapse-item title="基础字段显示" name="basic">
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
        <el-collapse-item title="高级格式设置" name="advanced">
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
                                    <el-tooltip content="货币必须以大写字母开头，以大写字母/数字结尾，并且只能包含 [A-Z0-9'._-]" placement="top">
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
    </el-collapse>

    <!-- 操作按钮 -->
    <div class="action-buttons">
        <el-button type="primary" @click="applyConfig" :loading="loading.save">
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
}

// 响应式配置状态
const activePanels = ref(['basic', 'advanced'])
const formatSettings = ref<string[]>([])
const incomeTemplate = ref('')
const commissionTemplate = ref('')
const currency = ref('')

const flagSymbol = ref('*')
const loading = ref({
    save: false,
    reset: false
})

// 转换配置格式：前端 camelCase <-> 后端 snake_case
const convertToFrontend = (config: Config) => {
    return {
        flag: config.flag,
        incomeTemplate: config.income_template || '',
        commissionTemplate: config.commission_template || '',
        currency: config.currency || '',

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
        formatSettings.value = frontendConfig.formatSettings
        incomeTemplate.value = frontendConfig.incomeTemplate
        commissionTemplate.value = frontendConfig.commissionTemplate
        flagSymbol.value = frontendConfig.flag
        currency.value = frontendConfig.currency
    } catch (error) {
        ElMessage.error('配置加载失败，请确保已经登录')
    }
}

// 初始化加载配置
onMounted(loadConfig)

// 生成请求体
const currentConfig = computed(() => ({
    flag: flagSymbol.value,
    show_note: formatSettings.value.includes('showNote'),
    show_tag: formatSettings.value.includes('showTag'),
    show_time: formatSettings.value.includes('showTime'),
    show_uuid: formatSettings.value.includes('showUUID'),
    show_status: formatSettings.value.includes('showStatus'),
    show_discount: formatSettings.value.includes('showDiscount'),
    income_template: incomeTemplate.value,
    commission_template: commissionTemplate.value,
    currency: currency.value

}))

// 应用配置
const applyConfig = async () => {
    try {
        loading.value.save = true
        await axios.put('config/', currentConfig.value)
        ElMessage.success('配置已保存')
    } catch (error) {
        ElMessage.error('保存失败，请重新登录或检查格式是否正确')

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
            currency: 'CNY'

        })
        await loadConfig() // 重新加载最新配置
        ElMessage.success('已恢复默认配置')
    } catch (error) {
        ElMessage.error('重置失败,请确保已经登录')

    } finally {
        loading.value.reset = false
    }
}
</script>

<!-- 保持原有样式不变 -->
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
    /* 比原来稍宽 */
}

.config-group {
    padding: 0 16px;
}

.label-with-tip {
    display: flex;
    align-items: center;
    gap: 6px;
}
</style>

