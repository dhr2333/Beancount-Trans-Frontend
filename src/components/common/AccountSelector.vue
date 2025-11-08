<template>
    <div class="account-selector">
        <el-cascader v-model="cascaderValue" :options="accountOptions" :props="cascaderProps" :placeholder="placeholder"
            :filterable="true" :filter-method="customFilterMethod" :clearable="true" :show-all-levels="false"
            :separator="' > '" @change="handleChange" @visible-change="handleVisibleChange" class="account-cascader"
            style="width: 100%;">
            <template #default="{ node, data }">
                <div class="cascader-node">
                    <span class="node-label">{{ data.account }}</span>
                    <el-tag v-if="data.account_type" :type="getAccountTypeColor(data.account_type)" size="small"
                        class="node-tag">
                        {{ data.account_type }}
                    </el-tag>
                    <el-tag v-if="data.mapping_count && data.mapping_count.total > 0" type="info" size="small"
                        class="mapping-tag">
                        {{ data.mapping_count.total }}映射
                    </el-tag>
                </div>
            </template>
        </el-cascader>

        <!-- 账户详情预览 -->
        <div v-if="selectedAccount" class="account-preview">
            <el-card size="small">
                <div class="preview-content">
                    <div class="account-info">
                        <h4>{{ selectedAccount.account }}</h4>
                        <el-tag :type="getAccountTypeColor(selectedAccount.account_type)">
                            {{ selectedAccount.account_type }}
                        </el-tag>
                    </div>
                    <div v-if="selectedAccount.mapping_count" class="mapping-stats">
                        <span class="label">映射统计：</span>
                        <el-tag type="warning" size="small">{{ selectedAccount.mapping_count.expense }}支出</el-tag>
                        <el-tag type="success" size="small">{{ selectedAccount.mapping_count.assets }}资产</el-tag>
                        <el-tag type="primary" size="small">{{ selectedAccount.mapping_count.income }}收入</el-tag>
                    </div>
                </div>
            </el-card>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { ElMessage } from 'element-plus'
import type { CascaderProps, CascaderValue, CascaderOption } from 'element-plus'
import axios from '../../utils/request'
import { subscribeAccountTreeUpdated } from '~/utils/accountEvents'
import { getAccountTypeColor } from '~/utils/accountTypeColor'

// 接口定义
interface AccountBase {
    id: number
    account: string
    parent?: number
    parent_account?: string
    account_type: string
    enable: boolean
    mapping_count?: {
        expense: number
        assets: number
        income: number
        total: number
    }
    children?: AccountOption[]
}

type AccountOption = AccountBase & CascaderOption

// Props
interface Props {
    modelValue?: number | null | undefined
    accountType?: string // 过滤账户类型：'Expenses', 'Income', 'Assets'
    placeholder?: string
    disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
    modelValue: null,
    accountType: '',
    placeholder: '请选择账户',
    disabled: false
})

// Emits
const emit = defineEmits<{
    'update:modelValue': [value: number | null]
    'change': [account: AccountOption | null]
}>()

// 响应式数据
const accountTree = ref<AccountOption[]>([])
type InternalCascaderValue = CascaderValue | CascaderValue[] | null
const selectedValue = ref<InternalCascaderValue>(props.modelValue ?? null)

const cascaderValue = computed<CascaderValue | undefined>({
    get: () => selectedValue.value === null ? undefined : selectedValue.value as unknown as CascaderValue,
    set: (value) => {
        selectedValue.value = (value ?? null) as InternalCascaderValue
    }
})
const selectedAccount = ref<AccountOption | null>(null)
const loading = ref(false)
let unsubscribeAccountTreeUpdated: (() => void) | null = null

// 级联选择器配置
const cascaderProps: CascaderProps = {
    value: 'id',
    label: 'account',
    children: 'children',
    emitPath: false,
    checkStrictly: true,
    expandTrigger: 'hover'
}

// 计算属性：过滤后的账户选项
const accountOptions = computed<AccountOption[]>(() => {
    console.log('AccountSelector - 原始账户树:', accountTree.value)
    console.log('AccountSelector - 账户类型过滤:', props.accountType)

    if (!props.accountType) {
        console.log('AccountSelector - 无类型过滤，返回所有账户')
        return accountTree.value
    }

    const filtered = filterAccountsByType(accountTree.value, props.accountType)
    console.log('AccountSelector - 过滤后的账户:', filtered)
    return filtered
})

// 获取账户树形数据
const fetchAccountTree = async () => {
    try {
        loading.value = true
        const response = await axios.get('/account/tree/')
        console.log('账户树数据:', response.data) // 调试日志

        // 确保数据是数组格式
        if (Array.isArray(response.data)) {
            accountTree.value = response.data as AccountOption[]
        } else if (response.data && Array.isArray(response.data.results)) {
            accountTree.value = response.data.results as AccountOption[]
        } else {
            console.warn('账户树数据格式异常:', response.data)
            accountTree.value = []
        }

        const normalized = normalizeCascaderValue(selectedValue.value)
        if (normalized !== null) {
            const account = findAccountById(accountTree.value, normalized)
            selectedAccount.value = account
        }
    } catch (error: any) {
        console.error('获取账户树失败:', error)
        if (error.response?.status === 401) {
            ElMessage.info('未认证，请登录后重试')
        } else {
            ElMessage.error('获取账户数据失败')
        }
        accountTree.value = []
    } finally {
        loading.value = false
    }
}

// 根据账户类型过滤账户
const filterAccountsByType = (accounts: AccountOption[], type: string): AccountOption[] => {
    // 账户类型映射：英文 -> 中文
    const typeMapping: Record<string, string> = {
        'Assets': '资产账户',
        'Expenses': '支出账户',
        'Income': '收入账户',
        'Liabilities': '负债账户',
        'Equity': '权益账户'
    }

    const chineseType = typeMapping[type] || type

    return accounts.filter(account => {
        if (account.account_type === chineseType) return true
        if (account.children) {
            account.children = filterAccountsByType(account.children, type)
            return account.children.length > 0
        }
        return false
    })
}

// 查找账户对象
const findAccountById = (accounts: AccountOption[], id: number): AccountOption | null => {
    for (const account of accounts) {
        if (account.id === id) return account
        if (account.children) {
            const found = findAccountById(account.children, id)
            if (found) return found
        }
    }
    return null
}

// 获取账户类型颜色
// 自定义过滤方法 - 不区分大小写搜索
const customFilterMethod = (node: any, keyword: string) => {
    if (!keyword) return true

    // 将搜索关键词转换为小写
    const lowerKeyword = keyword.toLowerCase()

    // 检查账户名称是否包含关键词（不区分大小写）
    const accountName = node.data.account || ''
    const lowerAccountName = accountName.toLowerCase()

    // 检查账户类型是否包含关键词（不区分大小写）
    const accountType = node.data.account_type || ''
    const lowerAccountType = accountType.toLowerCase()

    // 返回匹配结果
    return lowerAccountName.includes(lowerKeyword) || lowerAccountType.includes(lowerKeyword)
}

// 处理选择变化
const normalizeCascaderValue = (value: InternalCascaderValue): number | null => {
    if (typeof value === 'number') return value
    if (Array.isArray(value)) {
        const latest = value[value.length - 1]
        if (Array.isArray(latest)) {
            const nested = latest[latest.length - 1]
            return typeof nested === 'number' ? nested : null
        }
        return typeof latest === 'number' ? latest : null
    }
    return null
}

const handleChange = (value: CascaderValue | CascaderValue[] | null) => {
    const normalizedValue = normalizeCascaderValue(value)
    selectedValue.value = (value ?? null) as InternalCascaderValue
    emit('update:modelValue', normalizedValue)

    if (normalizedValue !== null) {
        const account = findAccountById(accountTree.value, normalizedValue)
        selectedAccount.value = account
        emit('change', account)
    } else {
        selectedAccount.value = null
        emit('change', null)
    }
}

// 处理下拉框显示状态
const handleVisibleChange = (visible: boolean) => {
    if (visible) {
        fetchAccountTree()
    }
}

// 监听外部值变化
watch(() => props.modelValue, (newValue) => {
    if (normalizeCascaderValue(selectedValue.value) !== (newValue ?? null)) {
        selectedValue.value = newValue ?? null
    }

    if (newValue) {
        const account = findAccountById(accountTree.value, newValue)
        selectedAccount.value = account
    } else {
        selectedAccount.value = null
    }
}, { immediate: true })

// 组件挂载时初始化
onMounted(() => {
    unsubscribeAccountTreeUpdated = subscribeAccountTreeUpdated(() => {
        fetchAccountTree()
    })

    if (props.modelValue) {
        fetchAccountTree().then(() => {
            const account = findAccountById(accountTree.value, props.modelValue!)
            if (account) {
                selectedAccount.value = account
            }
        })
    }

    const normalized = normalizeCascaderValue(selectedValue.value)
    if (normalized !== null) {
        const account = findAccountById(accountTree.value, normalized)
        selectedAccount.value = account
    }
})

onBeforeUnmount(() => {
    if (unsubscribeAccountTreeUpdated) {
        unsubscribeAccountTreeUpdated()
        unsubscribeAccountTreeUpdated = null
    }
})
</script>

<style scoped>
.account-selector {
    width: 100%;
}

.account-cascader {
    width: 100%;
}

.cascader-node {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
}

.node-label {
    flex: 1;
    font-weight: 500;
}

.node-tag,
.mapping-tag {
    margin: 0;
}

.account-preview {
    margin-top: 12px;
}

.preview-content {
    padding: 8px;
}

.account-info {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 8px;
}

.account-info h4 {
    margin: 0;
    font-size: 14px;
    font-weight: 600;
    color: #303133;
}

.currencies,
.mapping-stats {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 4px;
}

.label {
    font-size: 12px;
    color: #909399;
    min-width: 60px;
}

.currency-tag {
    margin: 0;
}

/* 响应式设计 */
@media (max-width: 768px) {
    .account-info {
        flex-direction: column;
        align-items: flex-start;
    }

    .currencies,
    .mapping-stats {
        flex-wrap: wrap;
    }
}
</style>
