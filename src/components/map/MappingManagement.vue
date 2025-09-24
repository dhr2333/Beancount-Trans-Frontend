<template>
    <div class="mapping-management">
        <!-- 顶部统计面板 -->
        <div class="stats-panel">
            <el-row :gutter="16">
                <el-col :xs="24" :sm="8" :md="6">
                    <el-card class="stat-card">
                        <el-statistic title="总映射数" :value="statistics.totalMappings"
                            :value-style="{ color: '#409eff' }">
                            <template #prefix>
                                <el-icon>
                                    <Document />
                                </el-icon>
                            </template>
                        </el-statistic>
                    </el-card>
                </el-col>
                <el-col :xs="24" :sm="8" :md="6">
                    <el-card class="stat-card">
                        <el-statistic title="活跃映射" :value="statistics.activeMappings"
                            :value-style="{ color: '#67c23a' }">
                            <template #prefix>
                                <el-icon>
                                    <Check />
                                </el-icon>
                            </template>
                        </el-statistic>
                    </el-card>
                </el-col>
                <el-col :xs="24" :sm="8" :md="6">
                    <el-card class="stat-card">
                        <el-statistic title="本月新增" :value="statistics.monthlyNew" :value-style="{ color: '#e6a23c' }">
                            <template #prefix>
                                <el-icon>
                                    <Plus />
                                </el-icon>
                            </template>
                        </el-statistic>
                    </el-card>
                </el-col>
                <el-col :xs="24" :sm="8" :md="6">
                    <el-card class="stat-card">
                        <el-statistic title="映射账户数" :value="statistics.mappedAccounts"
                            :value-style="{ color: '#f56c6c' }">
                            <template #prefix>
                                <el-icon>
                                    <User />
                                </el-icon>
                            </template>
                        </el-statistic>
                    </el-card>
                </el-col>
            </el-row>
        </div>

        <!-- 快速操作面板 -->
        <div class="quick-actions">
            <el-card>
                <template #header>
                    <div class="card-header">
                        <span>快速操作</span>
                        <el-button type="primary" size="small" @click="showQuickCreateDialog">
                            <el-icon>
                                <Plus />
                            </el-icon>
                            快速创建映射
                        </el-button>
                    </div>
                </template>
                <div class="action-buttons">
                    <el-button @click="handleBatchImport">
                        <el-icon>
                            <Upload />
                        </el-icon>
                        批量导入
                    </el-button>
                    <el-button @click="handleBatchExport">
                        <el-icon>
                            <Download />
                        </el-icon>
                        批量导出
                    </el-button>
                    <el-button @click="handleMappingAnalysis">
                        <el-icon>
                            <DataAnalysis />
                        </el-icon>
                        映射分析
                    </el-button>
                    <el-button @click="handleMappingOptimization">
                        <el-icon>
                            <MagicStick />
                        </el-icon>
                        智能优化
                    </el-button>
                </div>
            </el-card>
        </div>

        <!-- 映射类型标签页 -->
        <div class="mapping-tabs">
            <el-tabs v-model="activeTab" @tab-change="handleTabChange">
                <el-tab-pane label="支出映射" name="expense">
                    <template #label>
                        <span class="tab-label">
                            <el-icon>
                                <Money />
                            </el-icon>
                            支出映射
                            <el-badge :value="statistics.expenseMappings" class="tab-badge" />
                        </span>
                    </template>
                    <ExpenseMapping ref="expenseMappingRef" />
                </el-tab-pane>

                <el-tab-pane label="收入映射" name="income">
                    <template #label>
                        <span class="tab-label">
                            <el-icon>
                                <TrendCharts />
                            </el-icon>
                            收入映射
                            <el-badge :value="statistics.incomeMappings" class="tab-badge" />
                        </span>
                    </template>
                    <IncomeMapping ref="incomeMappingRef" />
                </el-tab-pane>

                <el-tab-pane label="资产映射" name="assets">
                    <template #label>
                        <span class="tab-label">
                            <el-icon>
                                <Wallet />
                            </el-icon>
                            资产映射
                            <el-badge :value="statistics.assetsMappings" class="tab-badge" />
                        </span>
                    </template>
                    <AssetsMapping ref="assetsMappingRef" />
                </el-tab-pane>
            </el-tabs>
        </div>

        <!-- 快速创建映射对话框 -->
        <el-dialog v-model="quickCreateDialog" title="快速创建映射" width="600px">
            <el-form :model="quickCreateForm" :rules="quickCreateRules" ref="quickCreateFormRef" label-width="100px">
                <el-form-item label="映射类型" prop="type">
                    <el-select v-model="quickCreateForm.type" placeholder="选择映射类型">
                        <el-option label="支出映射" value="expense" />
                        <el-option label="收入映射" value="income" />
                        <el-option label="资产映射" value="assets" />
                    </el-select>
                </el-form-item>
                <el-form-item label="关键字" prop="key">
                    <el-input v-model="quickCreateForm.key" placeholder="输入关键字" />
                </el-form-item>
                <el-form-item label="映射账户" prop="accountId">
                    <AccountSelector v-model="quickCreateForm.accountId" placeholder="选择映射账户"
                        @change="handleAccountChange" />
                </el-form-item>
                <el-form-item label="关联货币" prop="currencyId">
                    <CurrencySelector v-model="quickCreateForm.currencyId" :account-id="quickCreateForm.accountId"
                        placeholder="选择货币" />
                </el-form-item>
                <el-form-item v-if="quickCreateForm.type === 'expense'" label="商家" prop="payee">
                    <el-input v-model="quickCreateForm.payee" placeholder="输入商家名称（可选）" />
                </el-form-item>
                <el-form-item v-if="quickCreateForm.type === 'income'" label="付款方" prop="payer">
                    <el-input v-model="quickCreateForm.payer" placeholder="输入付款方（可选）" />
                </el-form-item>
                <el-form-item v-if="quickCreateForm.type === 'assets'" label="账户描述" prop="full">
                    <el-input v-model="quickCreateForm.full" placeholder="输入账户描述（可选）" />
                </el-form-item>
            </el-form>
            <template #footer>
                <el-button @click="quickCreateDialog = false">取消</el-button>
                <el-button type="primary" @click="handleQuickCreate">创建</el-button>
            </template>
        </el-dialog>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
    Document, Check, Plus, User, Upload, Download,
    DataAnalysis, MagicStick, Money, TrendCharts, Wallet
} from '@element-plus/icons-vue'
import axios from '../../utils/request'
import AccountSelector from '../common/AccountSelector.vue'
import CurrencySelector from '../common/CurrencySelector.vue'
import ExpenseMapping from './Expenses.vue'
import IncomeMapping from './Income.vue'
import AssetsMapping from './Assets.vue'
import type { FormInstance, FormRules } from 'element-plus'

// 接口定义
interface MappingStatistics {
    totalMappings: number
    activeMappings: number
    monthlyNew: number
    mappedAccounts: number
    expenseMappings: number
    incomeMappings: number
    assetsMappings: number
}

// 响应式数据
const activeTab = ref('expense')
const statistics = ref<MappingStatistics>({
    totalMappings: 0,
    activeMappings: 0,
    monthlyNew: 0,
    mappedAccounts: 0,
    expenseMappings: 0,
    incomeMappings: 0,
    assetsMappings: 0
})

// 快速创建相关
const quickCreateDialog = ref(false)
const quickCreateFormRef = ref<FormInstance>()
const quickCreateForm = ref({
    type: 'expense',
    key: '',
    accountId: null as number | null,
    currencyId: null as number | null,
    payee: '',
    payer: '',
    full: ''
})

const quickCreateRules: FormRules = {
    type: [{ required: true, message: '请选择映射类型', trigger: 'change' }],
    key: [{ required: true, message: '请输入关键字', trigger: 'blur' }],
    accountId: [{ required: true, message: '请选择映射账户', trigger: 'change' }]
}

// 组件引用
const expenseMappingRef = ref()
const incomeMappingRef = ref()
const assetsMappingRef = ref()

// 获取映射统计信息
const fetchStatistics = async () => {
    try {
        // 并行获取各类映射数据
        const [expenseRes, incomeRes, assetsRes] = await Promise.all([
            axios.get('/expense/'),
            axios.get('/income/'),
            axios.get('/assets/')
        ])

        const expenseData = expenseRes.data
        const incomeData = incomeRes.data
        const assetsData = assetsRes.data

        // 计算统计信息
        statistics.value = {
            totalMappings: expenseData.length + incomeData.length + assetsData.length,
            activeMappings: expenseData.filter((m: any) => m.enable).length +
                incomeData.filter((m: any) => m.enable).length +
                assetsData.filter((m: any) => m.enable).length,
            monthlyNew: 0, // 需要根据创建时间计算
            mappedAccounts: new Set([
                ...expenseData.map((m: any) => m.expend),
                ...incomeData.map((m: any) => m.income),
                ...assetsData.map((m: any) => m.assets)
            ]).size,
            expenseMappings: expenseData.length,
            incomeMappings: incomeData.length,
            assetsMappings: assetsData.length
        }
    } catch (error: any) {
        console.error('获取映射统计失败:', error)
        if (error.response?.status === 401) {
            ElMessage.info('未认证，请登录后重试')
        } else {
            ElMessage.error('获取映射统计失败')
        }
    }
}

// 根据映射类型获取账户类型
const getAccountTypeByMappingType = (type: string): string => {
    const typeMap: Record<string, string> = {
        'expense': 'Expenses',
        'income': 'Income',
        'assets': 'Assets'
    }
    const accountType = typeMap[type] || ''
    console.log('映射管理总览 - 映射类型:', type, '-> 账户类型:', accountType)
    return accountType
}

// 处理标签页切换
const handleTabChange = (tabName: string) => {
    activeTab.value = tabName
}

// 显示快速创建对话框
const showQuickCreateDialog = () => {
    quickCreateForm.value = {
        type: 'expense',
        key: '',
        accountId: null,
        currencyId: null,
        payee: '',
        payer: '',
        full: ''
    }
    quickCreateDialog.value = true
}

// 处理快速创建
const handleQuickCreate = async () => {
    if (!quickCreateFormRef.value) return

    try {
        await quickCreateFormRef.value.validate()

        // 根据映射类型转换字段名
        let formData: any = {
            key: quickCreateForm.value.key,
            currency_ids: quickCreateForm.value.currencyId ? [quickCreateForm.value.currencyId] : []
        }

        let apiUrl = ''
        switch (quickCreateForm.value.type) {
            case 'expense':
                apiUrl = '/expense/'
                formData.payee = quickCreateForm.value.payee
                formData.expend_id = quickCreateForm.value.accountId // 转换为 expend_id
                break
            case 'income':
                apiUrl = '/income/'
                formData.payer = quickCreateForm.value.payer
                formData.income_id = quickCreateForm.value.accountId // 转换为 income_id
                break
            case 'assets':
                apiUrl = '/assets/'
                formData.full = quickCreateForm.value.full
                formData.assets_id = quickCreateForm.value.accountId // 转换为 assets_id
                break
        }

        console.log('快速创建映射数据:', formData)

        await axios.post(apiUrl, formData)
        ElMessage.success('映射创建成功')
        quickCreateDialog.value = false

        // 刷新统计和当前标签页数据
        await fetchStatistics()
        await refreshCurrentTab()
    } catch (error: any) {
        console.error('创建映射失败:', error)
        if (error.response?.status === 401) {
            ElMessage.info('未认证，请登录后重试')
        } else if (error.response?.status === 400) {
            ElMessage.error('创建失败，请检查数据格式')
        } else {
            ElMessage.error('创建映射失败')
        }
    }
}

// 刷新当前标签页数据
const refreshCurrentTab = async () => {
    switch (activeTab.value) {
        case 'expense':
            if (expenseMappingRef.value?.fetchData) {
                await expenseMappingRef.value.fetchData()
            }
            break
        case 'income':
            if (incomeMappingRef.value?.fetchData) {
                await incomeMappingRef.value.fetchData()
            }
            break
        case 'assets':
            if (assetsMappingRef.value?.fetchData) {
                await assetsMappingRef.value.fetchData()
            }
            break
    }
}

// 批量导入
const handleBatchImport = () => {
    ElMessage.info('批量导入功能开发中...')
}

// 批量导出
const handleBatchExport = () => {
    ElMessage.info('批量导出功能开发中...')
}

// 映射分析
const handleMappingAnalysis = () => {
    ElMessage.info('映射分析功能开发中...')
}

// 智能优化
const handleMappingOptimization = () => {
    ElMessage.info('智能优化功能开发中...')
}

// 处理账户选择变化
const handleAccountChange = (account: any) => {
    console.log('映射管理总览 - 账户选择变化:', account)
    // 账户选择变化时，清空已选择的货币，让用户重新选择
    quickCreateForm.value.currencyId = null
}

// 组件挂载时初始化
onMounted(() => {
    fetchStatistics()
})
</script>

<style scoped>
.mapping-management {
    padding: 20px;
    background-color: #f5f7fa;
    min-height: 100vh;
}

.stats-panel {
    margin-bottom: 24px;
}

.stat-card {
    text-align: center;
    transition: all 0.3s ease;
}

.stat-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.quick-actions {
    margin-bottom: 24px;
}

.card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.action-buttons {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
}

.mapping-tabs {
    background: white;
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.tab-label {
    display: flex;
    align-items: center;
    gap: 8px;
}

.tab-badge {
    margin-left: 4px;
}

/* 响应式设计 */
@media (max-width: 768px) {
    .mapping-management {
        padding: 12px;
    }

    .action-buttons {
        flex-direction: column;
    }

    .card-header {
        flex-direction: column;
        gap: 12px;
        align-items: flex-start;
    }
}

@media (max-width: 576px) {
    .stats-panel .el-col {
        margin-bottom: 12px;
    }
}
</style>
