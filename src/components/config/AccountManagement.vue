<template>
    <div class="account-management">
        <div class="management-header">
            <h2>账户管理</h2>
            <div class="header-actions">
                <el-button type="primary" @click="showAddAccountDialog">
                    <el-icon>
                        <Plus />
                    </el-icon>
                    新增账户
                </el-button>
                <el-button @click="refreshData">
                    <el-icon>
                        <Refresh />
                    </el-icon>
                    刷新
                </el-button>
            </div>
        </div>

        <div class="management-content">
            <!-- 左侧：账户树形结构 -->
            <div class="account-tree-panel">
                <el-tree :data="accountTree" :props="treeProps" node-key="id" :expand-on-click-node="false"
                    :default-expand-all="true" @node-click="handleNodeClick" class="account-tree" v-loading="loading">
                    <template #default="{ node, data }">
                        <div class="tree-node">
                            <span class="node-label">{{ data.account }}</span>
                            <div class="node-actions">
                                <el-tag size="small" :type="getAccountTypeColor(data.account_type)">
                                    {{ data.account_type }}
                                </el-tag>
                                <el-tag v-if="data.mapping_count && data.mapping_count.total > 0" size="small"
                                    type="info">
                                    {{ data.mapping_count.total }}映射
                                </el-tag>
                                <el-switch v-model="data.enable" size="small" @change="updateAccountStatus(data)"
                                    style="margin-left: 8px;" />
                            </div>
                        </div>
                    </template>
                </el-tree>
            </div>

            <!-- 右侧：账户详情和货币管理 -->
            <div class="account-detail-panel">
                <div v-if="selectedAccount" class="account-detail">
                    <h3>{{ selectedAccount.account }}</h3>

                    <!-- 账户基本信息 -->
                    <el-card class="info-card">
                        <template #header>
                            <span>基本信息</span>
                        </template>
                        <el-descriptions :column="2" border>
                            <el-descriptions-item label="账户类型">
                                <el-tag :type="getAccountTypeColor(selectedAccount.account_type)">
                                    {{ selectedAccount.account_type }}
                                </el-tag>
                            </el-descriptions-item>
                            <el-descriptions-item label="启用状态">
                                <el-switch v-model="selectedAccount.enable"
                                    @change="updateAccountStatus(selectedAccount)" />
                            </el-descriptions-item>
                            <el-descriptions-item label="映射统计" v-if="selectedAccount.mapping_count">
                                <el-tag type="success">{{ selectedAccount.mapping_count.expense }}支出</el-tag>
                                <el-tag type="warning">{{ selectedAccount.mapping_count.assets }}资产</el-tag>
                                <el-tag type="primary">{{ selectedAccount.mapping_count.income }}收入</el-tag>
                                <el-tag type="info">{{ selectedAccount.mapping_count.total }}总计</el-tag>
                            </el-descriptions-item>
                            <el-descriptions-item label="父账户" v-if="selectedAccount.parent_account">
                                {{ selectedAccount.parent_account }}
                            </el-descriptions-item>
                            <el-descriptions-item label="创建时间">
                                {{ formatDateTime(selectedAccount.created) }}
                            </el-descriptions-item>
                        </el-descriptions>
                    </el-card>

                    <!-- 货币管理 -->
                    <el-card class="currency-card">
                        <template #header>
                            <div class="card-header">
                                <span>关联货币</span>
                                <el-button size="small" @click="showCurrencyDialog">
                                    <el-icon>
                                        <Edit />
                                    </el-icon>
                                    管理货币
                                </el-button>
                            </div>
                        </template>
                        <div class="currency-list">
                            <el-tag v-for="currency in selectedAccount.currencies" :key="currency.id"
                                class="currency-tag" closable @close="removeCurrency(currency.id)">
                                {{ currency.code }} - {{ currency.name }}
                            </el-tag>
                            <el-empty v-if="selectedAccount.currencies.length === 0" description="暂无关联货币" />
                        </div>
                    </el-card>

                    <!-- 操作按钮 -->
                    <div class="action-buttons">
                        <el-button type="primary" @click="editAccount">
                            <el-icon>
                                <Edit />
                            </el-icon>
                            编辑账户
                        </el-button>
                        <el-button type="danger" @click="deleteAccount">
                            <el-icon>
                                <Delete />
                            </el-icon>
                            删除账户
                        </el-button>
                    </div>
                </div>

                <el-empty v-else description="请选择账户查看详情" />
            </div>
        </div>

        <!-- 新增账户对话框 -->
        <el-dialog v-model="addAccountDialog" title="新增账户" width="500px">
            <el-form :model="newAccount" :rules="accountRules" ref="accountForm">
                <el-form-item label="账户路径" prop="account">
                    <el-input v-model="newAccount.account" placeholder="Assets:Savings:Bank" />
                </el-form-item>
                <el-form-item label="关联货币" prop="currency_ids">
                    <el-select v-model="newAccount.currency_ids" multiple placeholder="选择货币">
                        <el-option v-for="currency in availableCurrencies" :key="currency.id"
                            :label="`${currency.code} - ${currency.name}`" :value="currency.id" />
                    </el-select>
                </el-form-item>
            </el-form>
            <template #footer>
                <el-button @click="addAccountDialog = false">取消</el-button>
                <el-button type="primary" @click="createAccount">确定</el-button>
            </template>
        </el-dialog>

        <!-- 编辑账户对话框 -->
        <el-dialog v-model="editAccountDialog" title="编辑账户" width="500px">
            <el-form :model="editAccountForm" :rules="accountRules" ref="editAccountFormRef">
                <el-form-item label="账户路径" prop="account">
                    <el-input v-model="editAccountForm.account" />
                </el-form-item>
                <el-form-item label="关联货币" prop="currency_ids">
                    <el-select v-model="editAccountForm.currency_ids" multiple placeholder="选择货币">
                        <el-option v-for="currency in availableCurrencies" :key="currency.id"
                            :label="`${currency.code} - ${currency.name}`" :value="currency.id" />
                    </el-select>
                </el-form-item>
            </el-form>
            <template #footer>
                <el-button @click="editAccountDialog = false">取消</el-button>
                <el-button type="primary" @click="updateAccount">确定</el-button>
            </template>
        </el-dialog>

        <!-- 货币管理对话框 -->
        <el-dialog v-model="currencyDialog" title="管理货币" width="600px">
            <div class="currency-management">
                <div class="available-currencies">
                    <h4>可用货币</h4>
                    <el-select v-model="selectedCurrencies" multiple placeholder="选择货币">
                        <el-option v-for="currency in availableCurrencies" :key="currency.id"
                            :label="`${currency.code} - ${currency.name}`" :value="currency.id" />
                    </el-select>
                </div>
            </div>
            <template #footer>
                <el-button @click="currencyDialog = false">取消</el-button>
                <el-button type="primary" @click="updateAccountCurrencies">确定</el-button>
            </template>
        </el-dialog>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Refresh, Edit, Delete } from '@element-plus/icons-vue'
import axios from '../../utils/request'
import type { FormInstance, FormRules } from 'element-plus'

// 接口定义
interface Currency {
    id: number
    code: string
    name: string
}

interface Account {
    id: number
    account: string
    currencies: Currency[]
    parent?: number
    parent_account?: string
    account_type: string
    enable: boolean
    created: string
    modified: string
    mapping_count?: {
        expense: number
        assets: number
        income: number
        total: number
    }
}

// 响应式数据
const loading = ref(false)
const accountTree = ref<Account[]>([])
const selectedAccount = ref<Account | null>(null)
const availableCurrencies = ref<Currency[]>([])

// 对话框状态
const addAccountDialog = ref(false)
const editAccountDialog = ref(false)
const currencyDialog = ref(false)

// 表单数据
const newAccount = ref({
    account: '',
    currency_ids: [] as number[]
})

const editAccountForm = ref({
    account: '',
    currency_ids: [] as number[]
})

const selectedCurrencies = ref<number[]>([])

// 表单引用
const accountForm = ref<FormInstance>()
const editAccountFormRef = ref<FormInstance>()

// 树形组件配置
const treeProps = {
    children: 'children',
    label: 'account'
}

// 表单验证规则
const accountRules: FormRules = {
    account: [
        { required: true, message: '请输入账户路径', trigger: 'blur' },
        { pattern: /^[A-Z][A-Za-z0-9:]*$/, message: '账户路径必须以大写字母开头，只能包含字母、数字和冒号', trigger: 'blur' }
    ]
}

// 获取账户树形数据
const fetchAccountTree = async () => {
    try {
        loading.value = true
        const response = await axios.get('/account/tree/')
        accountTree.value = response.data
    } catch (error: any) {
        console.error('获取账户树失败:', error)
        if (error.response?.status === 401) {
            ElMessage.info('未认证，请登录后重试')
        } else {
            ElMessage.error('获取账户数据失败')
        }
    } finally {
        loading.value = false
    }
}

// 获取可用货币列表
const fetchCurrencies = async () => {
    try {
        const response = await axios.get('/currencies/')
        availableCurrencies.value = response.data
    } catch (error: any) {
        console.error('获取货币列表失败:', error)
        ElMessage.error('获取货币列表失败')
    }
}

// 节点点击处理
const handleNodeClick = (data: Account) => {
    selectedAccount.value = data
}

// 获取账户类型颜色
const getAccountTypeColor = (type: string) => {
    const colorMap: Record<string, string> = {
        'Assets': 'success',
        'Expenses': 'warning',
        'Income': 'primary',
        'Liabilities': 'danger',
        'Equity': 'info'
    }
    return colorMap[type] || 'info'
}

// 更新账户状态
const updateAccountStatus = async (account: Account) => {
    try {
        await axios.patch(`/account/${account.id}/`, {
            enable: account.enable
        })
        ElMessage.success('账户状态更新成功')
    } catch (error: any) {
        // 回滚状态
        account.enable = !account.enable
        console.error('更新账户状态失败:', error)
        if (error.response?.status === 401) {
            ElMessage.info('未认证，请登录后重试')
        } else {
            ElMessage.error('更新账户状态失败')
        }
    }
}

// 显示新增账户对话框
const showAddAccountDialog = () => {
    newAccount.value = {
        account: '',
        currency_ids: []
    }
    addAccountDialog.value = true
}

// 创建账户
const createAccount = async () => {
    if (!accountForm.value) return

    try {
        await accountForm.value.validate()
        await axios.post('/account/', newAccount.value)
        ElMessage.success('账户创建成功')
        addAccountDialog.value = false
        await fetchAccountTree()
    } catch (error: any) {
        console.error('创建账户失败:', error)
        if (error.response?.status === 401) {
            ElMessage.info('未认证，请登录后重试')
        } else if (error.response?.status === 400) {
            ElMessage.error('创建失败，请检查账户路径格式')
        } else {
            ElMessage.error('创建账户失败')
        }
    }
}

// 编辑账户
const editAccount = () => {
    if (!selectedAccount.value) return

    editAccountForm.value = {
        account: selectedAccount.value.account,
        currency_ids: selectedAccount.value.currencies.map(c => c.id)
    }
    editAccountDialog.value = true
}

// 更新账户
const updateAccount = async () => {
    if (!editAccountFormRef.value || !selectedAccount.value) return

    try {
        await editAccountFormRef.value.validate()
        await axios.put(`/account/${selectedAccount.value.id}/`, editAccountForm.value)
        ElMessage.success('账户更新成功')
        editAccountDialog.value = false
        await fetchAccountTree()
        // 更新选中账户的信息
        if (selectedAccount.value) {
            const updatedAccount = accountTree.value.find(acc => acc.id === selectedAccount.value!.id)
            if (updatedAccount) {
                selectedAccount.value = updatedAccount
            }
        }
    } catch (error: any) {
        console.error('更新账户失败:', error)
        if (error.response?.status === 401) {
            ElMessage.info('未认证，请登录后重试')
        } else if (error.response?.status === 400) {
            ElMessage.error('更新失败，请检查账户路径格式')
        } else {
            ElMessage.error('更新账户失败')
        }
    }
}

// 删除账户
const deleteAccount = async () => {
    if (!selectedAccount.value) return

    try {
        await ElMessageBox.confirm(
            `确定要删除账户 "${selectedAccount.value.account}" 吗？此操作不可撤销。`,
            '确认删除',
            {
                confirmButtonText: '确定',
                cancelButtonText: '取消',
                type: 'warning'
            }
        )

        await axios.delete(`/account/${selectedAccount.value.id}/`)
        ElMessage.success('账户删除成功')
        selectedAccount.value = null
        await fetchAccountTree()
    } catch (error: any) {
        if (error === 'cancel') return

        console.error('删除账户失败:', error)
        if (error.response?.status === 401) {
            ElMessage.info('未认证，请登录后重试')
        } else if (error.response?.status === 400) {
            ElMessage.error('删除失败，该账户可能有关联数据')
        } else {
            ElMessage.error('删除账户失败')
        }
    }
}

// 显示货币管理对话框
const showCurrencyDialog = () => {
    if (!selectedAccount.value) return

    selectedCurrencies.value = selectedAccount.value.currencies.map(c => c.id)
    currencyDialog.value = true
}

// 更新账户货币关联
const updateAccountCurrencies = async () => {
    if (!selectedAccount.value) return

    try {
        await axios.patch(`/account/${selectedAccount.value.id}/`, {
            currency_ids: selectedCurrencies.value
        })
        ElMessage.success('货币关联更新成功')
        currencyDialog.value = false
        await fetchAccountTree()
        // 更新选中账户的信息
        const updatedAccount = accountTree.value.find(acc => acc.id === selectedAccount.value!.id)
        if (updatedAccount) {
            selectedAccount.value = updatedAccount
        }
    } catch (error: any) {
        console.error('更新货币关联失败:', error)
        if (error.response?.status === 401) {
            ElMessage.info('未认证，请登录后重试')
        } else {
            ElMessage.error('更新货币关联失败')
        }
    }
}

// 移除货币关联
const removeCurrency = async (currencyId: number) => {
    if (!selectedAccount.value) return

    try {
        const newCurrencyIds = selectedAccount.value.currencies
            .filter(c => c.id !== currencyId)
            .map(c => c.id)

        await axios.patch(`/account/${selectedAccount.value.id}/`, {
            currency_ids: newCurrencyIds
        })
        ElMessage.success('货币关联移除成功')
        await fetchAccountTree()
        // 更新选中账户的信息
        const updatedAccount = accountTree.value.find(acc => acc.id === selectedAccount.value!.id)
        if (updatedAccount) {
            selectedAccount.value = updatedAccount
        }
    } catch (error: any) {
        console.error('移除货币关联失败:', error)
        if (error.response?.status === 401) {
            ElMessage.info('未认证，请登录后重试')
        } else {
            ElMessage.error('移除货币关联失败')
        }
    }
}

// 刷新数据
const refreshData = async () => {
    await Promise.all([
        fetchAccountTree(),
        fetchCurrencies()
    ])
}

// 格式化日期时间
const formatDateTime = (dateString: string): string => {
    if (!dateString) return ''

    const date = new Date(dateString)
    if (isNaN(date.getTime())) return ''

    const pad = (num: number) => num.toString().padStart(2, '0')

    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ` +
        `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

// 组件挂载时初始化数据
onMounted(() => {
    refreshData()
})
</script>

<style scoped>
.account-management {
    padding: 20px;
    background-color: #ffffff;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
    animation: fadeIn 0.6s ease;
}

.management-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
    padding-bottom: 15px;
    border-bottom: 1px solid #e4e7ed;
}

.management-header h2 {
    margin: 0;
    color: #303133;
    font-size: 24px;
    font-weight: 600;
}

.header-actions {
    display: flex;
    gap: 10px;
}

.management-content {
    display: flex;
    gap: 20px;
    min-height: 600px;
}

.account-tree-panel {
    flex: 0 0 400px;
    border: 1px solid #e4e7ed;
    border-radius: 8px;
    padding: 15px;
    background-color: #fafafa;
}

.account-tree {
    background-color: transparent;
}

.tree-node {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    padding: 4px 0;
}

.node-label {
    font-weight: 500;
    color: #303133;
}

.node-actions {
    display: flex;
    align-items: center;
    gap: 8px;
}

.account-detail-panel {
    flex: 1;
    border: 1px solid #e4e7ed;
    border-radius: 8px;
    padding: 20px;
    background-color: #ffffff;
}

.account-detail h3 {
    margin: 0 0 20px 0;
    color: #303133;
    font-size: 20px;
    font-weight: 600;
    padding-bottom: 10px;
    border-bottom: 2px solid #409eff;
}

.info-card,
.currency-card {
    margin-bottom: 20px;
}

.card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.currency-list {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    min-height: 40px;
    align-items: center;
}

.currency-tag {
    margin: 0;
}

.action-buttons {
    display: flex;
    gap: 10px;
    margin-top: 20px;
    padding-top: 20px;
    border-top: 1px solid #e4e7ed;
}

.currency-management {
    padding: 10px 0;
}

.available-currencies h4 {
    margin: 0 0 15px 0;
    color: #606266;
    font-size: 16px;
}

@keyframes fadeIn {
    from {
        opacity: 0;
        transform: translateY(-10px);
    }

    to {
        opacity: 1;
        transform: translateY(0);
    }
}

/* 响应式设计 */
@media (max-width: 768px) {
    .management-content {
        flex-direction: column;
    }

    .account-tree-panel {
        flex: none;
    }

    .management-header {
        flex-direction: column;
        align-items: flex-start;
        gap: 15px;
    }

    .header-actions {
        width: 100%;
        justify-content: flex-end;
    }
}
</style>
