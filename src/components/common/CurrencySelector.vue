<template>
    <div class="currency-selector">
        <el-select v-model="selectedCurrency" :placeholder="placeholder" :clearable="true" :filterable="true"
            :disabled="disabled" @change="handleChange" class="currency-select">
            <el-option v-for="currency in availableCurrencies" :key="currency.id"
                :label="`${currency.code} - ${currency.name}`" :value="currency.id">
                <div class="currency-option">
                    <span class="currency-code">{{ currency.code }}</span>
                    <span class="currency-name">{{ currency.name }}</span>
                </div>
            </el-option>
        </el-select>

        <!-- 货币详情预览 -->
        <div v-if="selectedCurrency" class="currency-preview">
            <el-card size="small">
                <div class="preview-content">
                    <div class="selected-currency">
                        <span class="label">已选择货币：</span>
                        <el-tag v-if="selectedCurrencyDetail" :closable="!disabled" @close="clearCurrency"
                            class="currency-tag">
                            {{ selectedCurrencyDetail.code }} - {{ selectedCurrencyDetail.name }}
                        </el-tag>
                    </div>
                </div>
            </el-card>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import axios from '../../utils/request'

// 接口定义
interface Currency {
    id: number
    code: string
    name: string
}

// Props
interface Props {
    modelValue?: number | null
    placeholder?: string
    disabled?: boolean
    accountId?: number | null | undefined // 关联账户ID，用于获取账户支持的货币
}

const props = withDefaults(defineProps<Props>(), {
    modelValue: null,
    placeholder: '请选择货币',
    disabled: false,
    accountId: undefined
})

// Emits
const emit = defineEmits<{
    'update:modelValue': [value: number | null]
    'change': [currency: Currency | null]
}>()

// 响应式数据
const availableCurrencies = ref<Currency[]>([])
const selectedCurrency = ref<number | null>(null)
const loading = ref(false)

// 计算属性：选中的货币详情
const selectedCurrencyDetail = computed(() => {
    if (!selectedCurrency.value) return null
    return availableCurrencies.value.find(currency => currency.id === selectedCurrency.value) || null
})

// 获取可用货币列表
const fetchCurrencies = async () => {
    try {
        loading.value = true
        const response = await axios.get('/currencies/')
        console.log('货币列表数据:', response.data) // 调试日志
        availableCurrencies.value = response.data
    } catch (error: any) {
        console.error('获取货币列表失败:', error)
        if (error.response?.status === 401) {
            ElMessage.info('未认证，请登录后重试')
        } else {
            ElMessage.error('获取货币列表失败')
        }
    } finally {
        loading.value = false
    }
}

// 获取账户关联的货币
const fetchAccountCurrencies = async (accountId: number) => {
    try {
        console.log('CurrencySelector - 获取账户货币:', accountId)
        const response = await axios.get(`/account/${accountId}/`)
        const account = response.data
        console.log('CurrencySelector - 账户数据:', account)

        if (account.currencies && account.currencies.length > 0) {
            // 如果有账户关联的货币，优先显示这些货币
            const accountCurrencyIds = account.currencies.map((c: Currency) => c.id)
            availableCurrencies.value = [
                ...account.currencies,
                ...availableCurrencies.value.filter(c => !accountCurrencyIds.includes(c.id))
            ]
            console.log('CurrencySelector - 更新后的可用货币:', availableCurrencies.value)
        }
    } catch (error: any) {
        console.error('获取账户货币失败:', error)
    }
}

// 处理选择变化
const handleChange = (value: number | null) => {
    emit('update:modelValue', value)
    const currency = value ? availableCurrencies.value.find(c => c.id === value) || null : null
    emit('change', currency)
}

// 清空货币
const clearCurrency = () => {
    selectedCurrency.value = null
    emit('update:modelValue', null)
    emit('change', null)
}

// 监听外部值变化
watch(() => props.modelValue, (newValue) => {
    if (newValue !== selectedCurrency.value) {
        selectedCurrency.value = newValue
    }
}, { immediate: true })

// 监听账户ID变化
watch(() => props.accountId, (newAccountId, oldAccountId) => {
    console.log('CurrencySelector - 账户ID变化:', oldAccountId, '->', newAccountId)
    if (newAccountId) {
        // 先重新获取所有货币，再获取账户关联的货币
        fetchCurrencies().then(() => {
            fetchAccountCurrencies(newAccountId)
        })
    } else {
        // 如果没有账户ID，只显示所有货币
        fetchCurrencies()
    }
}, { immediate: true })

// 组件挂载时初始化
onMounted(() => {
    fetchCurrencies()
    if (props.accountId) {
        fetchAccountCurrencies(props.accountId)
    }
})
</script>

<style scoped>
.currency-selector {
    width: 100%;
}

.currency-select {
    width: 100%;
}

.currency-option {
    display: flex;
    align-items: center;
    gap: 8px;
}

.currency-code {
    font-weight: 600;
    color: #409eff;
    min-width: 40px;
}

.currency-name {
    color: #606266;
}

.currency-preview {
    margin-top: 12px;
}

.preview-content {
    padding: 8px;
}

.selected-currencies {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
}

.label {
    font-size: 12px;
    color: #909399;
    min-width: 80px;
}

.currency-tag {
    margin: 0;
}

/* 响应式设计 */
@media (max-width: 768px) {
    .selected-currencies {
        flex-direction: column;
        align-items: flex-start;
    }

    .label {
        min-width: auto;
    }
}
</style>
