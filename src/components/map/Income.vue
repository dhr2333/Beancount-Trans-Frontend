<template>
    <div class="income-mapping">
        <!-- 搜索和操作栏 -->
        <div class="toolbar">
            <div class="search-section">
                <el-input v-model="search" placeholder="搜索关键字、付款方、账户" clearable @input="handleSearch">
                    <template #prefix>
                        <el-icon>
                            <Search />
                        </el-icon>
                    </template>
                </el-input>
            </div>
            <div class="action-section">
                <el-button type="primary" @click="handleAdd()">
                    <el-icon>
                        <Plus />
                    </el-icon>
                    新增映射
                </el-button>
                <el-button @click="handleImport()">
                    <el-icon>
                        <Upload />
                    </el-icon>
                    导入
                </el-button>
                <el-button @click="handleExport()">
                    <el-icon>
                        <Download />
                    </el-icon>
                    导出
                </el-button>
                <el-button @click="fetchData()">
                    <el-icon>
                        <Refresh />
                    </el-icon>
                    刷新
                </el-button>
            </div>
        </div>

        <!-- 映射列表 -->
        <el-table :data="filterIncomeData" v-loading="loading" style="width: 100%;"
            @selection-change="handleSelectionChange">
            <el-table-column type="selection" width="55" />

            <el-table-column label="关键字" prop="key" sortable :sort-method="advancedSort" width="120">
                <template #default="{ row }">
                    <el-tag type="success" size="small">{{ row.key }}</el-tag>
                </template>
            </el-table-column>

            <el-table-column label="付款方" prop="payer" width="150">
                <template #default="{ row }">
                    <span v-if="row.payer">{{ row.payer }}</span>
                    <el-text v-else type="info" size="small">-</el-text>
                </template>
            </el-table-column>

            <el-table-column label="映射账户" prop="income" sortable min-width="200">
                <template #default="{ row }">
                    <div class="account-cell">
                        <el-text type="success">{{ row.income }}</el-text>
                        <el-tag v-if="row.account_type" :type="getAccountTypeColor(row.account_type)" size="small">
                            {{ row.account_type }}
                        </el-tag>
                    </div>
                </template>
            </el-table-column>

            <el-table-column label="关联货币" prop="currencies" width="150">
                <template #default="{ row }">
                    <div v-if="row.currencies && row.currencies.length > 0" class="currency-cell">
                        <el-tag v-for="currency in row.currencies" :key="currency.id" size="small" class="currency-tag">
                            {{ currency.code }}
                        </el-tag>
                    </div>
                    <el-text v-else type="info" size="small">CNY</el-text>
                </template>
            </el-table-column>

            <el-table-column label="状态" prop="enable" width="100">
                <template #default="{ row }">
                    <el-switch v-model="row.enable" @change="handleSwitchChange(row)" inline-prompt active-text="启用"
                        inactive-text="禁用" />
                </template>
            </el-table-column>

            <el-table-column label="操作" width="150" fixed="right">
                <template #default="{ row, $index }">
                    <el-button size="small" @click="handleEdit($index, row)">
                        <el-icon>
                            <Edit />
                        </el-icon>
                    </el-button>
                    <el-button size="small" type="danger" @click="handleDelete($index, row)">
                        <el-icon>
                            <Delete />
                        </el-icon>
                    </el-button>
                </template>
            </el-table-column>
        </el-table>

        <!-- 批量操作栏 -->
        <div v-if="selectedItems.length > 0" class="batch-actions">
            <el-alert :title="`已选择 ${selectedItems.length} 项`" type="info" show-icon :closable="false">
                <template #default>
                    <div class="batch-buttons">
                        <el-button size="small" @click="handleBatchEnable">批量启用</el-button>
                        <el-button size="small" @click="handleBatchDisable">批量禁用</el-button>
                        <el-button size="small" type="danger" @click="handleBatchDelete">批量删除</el-button>
                    </div>
                </template>
            </el-alert>
        </div>
    </div>
    <!-- 新增映射对话框 -->
    <el-dialog v-model="dialogAdd" title="新增收入映射" width="600px">
        <el-form ref="ruleFormRef" :model="ruleForm" :rules="rules" label-width="100px" status-icon>
            <el-row :gutter="20">
                <el-col :span="12">
                    <el-form-item label="关键字" prop="key">
                        <el-input v-model="ruleForm.key" placeholder="红包" />
                    </el-form-item>
                </el-col>
                <el-col :span="12">
                    <el-form-item label="付款方" prop="payer">
                        <el-input v-model="ruleForm.payer" placeholder="微信（可选）" />
                    </el-form-item>
                </el-col>
            </el-row>

            <el-form-item label="映射账户" prop="income">
                <AccountSelector v-model="ruleForm.income" placeholder="选择账户" @change="handleAccountChange" />
            </el-form-item>

            <el-form-item label="关联货币" prop="currency_ids">
                <CurrencySelector v-model="ruleForm.currency_ids" :account-id="ruleForm.income" placeholder="选择货币" />
            </el-form-item>

            <el-form-item>
                <el-button type="primary" @click="submitForm(ruleFormRef)">新增</el-button>
                <el-button @click="resetForm(ruleFormRef)">重置</el-button>
            </el-form-item>
        </el-form>
    </el-dialog>
    <!-- 编辑映射对话框 -->
    <el-dialog v-model="dialogEdit" title="编辑收入映射" width="600px">
        <el-form ref="editFormRef" :model="ruleForm" :rules="rules" label-width="100px" status-icon>
            <el-row :gutter="20">
                <el-col :span="12">
                    <el-form-item label="关键字" prop="key">
                        <el-input v-model="ruleForm.key" />
                    </el-form-item>
                </el-col>
                <el-col :span="12">
                    <el-form-item label="付款方" prop="payer">
                        <el-input v-model="ruleForm.payer" />
                    </el-form-item>
                </el-col>
            </el-row>

            <el-form-item label="映射账户" prop="income">
                <AccountSelector v-model="ruleForm.income" placeholder="选择账户" @change="handleAccountChange" />
            </el-form-item>

            <el-form-item label="关联货币" prop="currency_ids">
                <CurrencySelector v-model="ruleForm.currency_ids" :account-id="ruleForm.income" placeholder="选择货币" />
            </el-form-item>

            <el-form-item>
                <el-button type="primary" @click="editForm(editFormRef)">保存</el-button>
                <el-button @click="dialogEdit = false">取消</el-button>
            </el-form-item>
        </el-form>
    </el-dialog>
    <el-dialog v-model="dialogDel" title="提示" width="30%">
        <el-icon>
            <WarningFilled />
        </el-icon><span>此操作将永久删除该条目, 是否继续?</span>
        <template #footer>
            <span class="dialog-footer">
                <el-button @click="dialogDel = false">取消</el-button>
                <el-button type="primary" @click="confirmDelete">确定</el-button>
            </span>
        </template>
    </el-dialog>
    <!-- <el-dialog v-model="dialogError" title="操作失败" width="30%">
        <el-icon>
            <WarningFilled />
        </el-icon><span>>新增/修改/删除 失败，请登录后重试</span>
    </el-dialog> -->
</template>

<script lang="ts" setup>
import { ElMessage, ElMessageBox } from 'element-plus';
import { computed, ref, onMounted } from 'vue'
import type { FormInstance, FormRules } from 'element-plus'
import { Search, Plus, Upload, Download, Refresh, Edit, Delete } from '@element-plus/icons-vue'
import axios from '../../utils/request'
import handleRefresh from '../../utils/commonFunctions'
import * as XLSX from 'xlsx'
import { pinyin } from 'pinyin-pro';
import AccountSelector from '../common/AccountSelector.vue'
import CurrencySelector from '../common/CurrencySelector.vue'


const dialogError = ref(false)
const loading = ref(false)
const lastEditedData = ref<Partial<Income> | null>(null)

interface Currency {
    id: number
    code: string
    name: string
}

interface Income {
    id: number
    key: string
    payer: string | null | undefined
    income: string
    income_id?: number
    currencies: Currency[]
    currency_ids?: number[]
    account_type?: string
    enable: boolean
}

// 页面增加优先级提示
const showTooltip = ref(true)
const incometipContent = ref("固定格式： [银行]+[储蓄卡/信用卡]+([卡号])。用于支付宝还款功能映射 and 支付宝提现至储蓄卡");

// 页面获取数据
const IncomeData = ref<Income[]>([])
const selectedItems = ref<Income[]>([])

const fetchData = async () => {
    try {
        loading.value = true
        const response = await axios.get('income/')
        IncomeData.value = response.data.sort((a: any, b: any) => a.id - b.id)
    } catch (error: any) {
        console.error(error)
        if (error.response?.data?.code == "token_not_valid") {
            handleRefresh();
        } else if (error.response?.status === 401) {
            ElMessage.info('未认证，请登录后重试')
        } else {
            ElMessage.error('获取收入映射数据失败')
        }
    } finally {
        loading.value = false
    }
}


// 页面数据获取(组件挂载)
onMounted(() => {
    fetchData()
})

// 关键字搜索
const search = ref('')

const filterIncomeData = computed(() =>
    IncomeData.value.filter((data) => {
        const searchTerm = search.value?.toLowerCase() || ''
        if (!searchTerm) return true

        return [
            data.key.toLowerCase(),
            data.payer?.toLowerCase() ?? '',
            data.income.toLowerCase(),
            ...(data.currencies?.map(c => c.code.toLowerCase()) ?? [])
        ].some(field => field.includes(searchTerm))
    })
)

// 搜索处理
const handleSearch = () => {
    // 搜索逻辑已在计算属性中处理
}

// 新增
const dialogAdd = ref(false)

const handleAdd = () => {
    if (lastEditedData.value) {
        // 使用上一次编辑的值
        ruleForm.value = {
            key: lastEditedData.value.key || '',
            payer: lastEditedData.value.payer ?? null,
            income: lastEditedData.value.income_id || null,
            currency_ids: lastEditedData.value.currency_ids || []
        };
    } else {
        // 没有编辑记录则重置
        ruleForm.value = {
            key: '',
            payer: null,
            income: null,
            currency_ids: []
        };
        if (ruleFormRef.value) {
            ruleFormRef.value.resetFields();
        }
    };
    dialogAdd.value = true;
}

const ruleFormRef = ref<FormInstance>()
const editFormRef = ref<FormInstance>()
const ruleForm = ref({
    key: '',
    payer: null as string | null | undefined,
    income: null as number | null,
    currency_ids: [] as number[],
})

const rules = ref<FormRules>({
    key: [
        { required: true, message: '请输入关键字', trigger: 'blur' },
        { max: 16, message: '长度应控制在16个字符以内', trigger: 'blur' },
    ],
    payer: [
        { required: false, message: '', trigger: 'change' },
        { max: 32, message: '长度应控制在32个字符以内', trigger: 'blur' },
    ],
    income: [
        { required: true, message: '请选择映射账户', trigger: 'change' },
    ],
    currency_ids: [
        { required: false, message: '请选择货币', trigger: 'change' },
    ],
})

// 弹窗重置
const resetForm = (formEl: FormInstance | undefined) => {
    if (!formEl) return
    formEl.resetFields()
}


// 新增确认
const submitForm = async (formEl: FormInstance | undefined) => {
    if (!formEl) return
    await formEl.validate((valid, fields) => {
        if (valid) {
            try {
                // 转换字段名以匹配后端API
                const submitData = {
                    key: ruleForm.value.key,
                    payer: ruleForm.value.payer,
                    income_id: ruleForm.value.income, // 将 income 转换为 income_id
                    currency_ids: ruleForm.value.currency_ids
                }

                console.log('收入映射提交数据:', submitData)

                axios({
                    url: 'income/',
                    data: submitData,
                    method: "POST",
                    headers: { 'Content-Type': 'application/json' }
                })
                    .then(response => {
                        ElMessage.success('新增成功')
                        dialogAdd.value = false
                        fetchData() // 新增刷新
                        resetForm(formEl) // 重置表单
                        // console.log(response.data);
                    })
                    .catch(error => {
                        if (error.response && error.response.status == 401) {
                            ElMessage.info('未认证，请登录后重试');
                        }
                        else if (error.response && error.response.status == 403) {
                            ElMessage.info('权限不足，请登录后重试');
                        }
                        else if (error.response && error.response.status == 400) {
                            ElMessage.error('新增失败，请检查关键字是否冲突');
                        }
                        dialogError.value = false
                        console.error(error)
                    })
            } catch (error) {
                // console.log(error);
            }
        } else {
            // console.log('error submit!', fields)
        }
    })
}


// 导出
const handleExport = () => {
    const data = IncomeData.value
    data.forEach((item: any) => {
        delete item.id
        delete item.url
        delete item.owner
    })
    const ws = XLSX.utils.json_to_sheet(data)
    const csv = XLSX.utils.sheet_to_csv(ws)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', 'export_income.csv')
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
}

// 导入
const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv';
    input.onchange = () => {
        const files = input.files;
        if (files && files.length > 0) {
            const file = files.item(0);
            const reader = new FileReader();
            reader.onload = (e) => {
                const data = e.target?.result;
                if (data) {
                    // 使用XLSX.read来解析CSV数据
                    const workbook = XLSX.read(data, { type: 'string' });
                    const firstSheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[firstSheetName];
                    let json = XLSX.utils.sheet_to_json(worksheet, { raw: false });

                    axios({
                        url: 'income/',
                        data: JSON.parse(JSON.stringify(json)),
                        method: "POST",
                        headers: { 'Content-Type': 'application/json' }
                    })
                        .then(response => {
                            ElMessage.success('导入成功')
                            fetchData()
                        })
                        .catch(error => {
                            if (error.response && error.response.status == 401) {
                                ElMessage.info('未认证，请登录后重试');
                            }
                            else if (error.response && error.response.status == 403) {
                                ElMessage.info('权限不足，请登录后重试');
                            }
                            else if (error.response && error.response.status == 400) {
                                ElMessage.error('导入失败，请按"导出"提供的格式重新导入');
                            }
                            console.error(error);
                        });
                }
            };
            if (file !== null) {
                reader.readAsText(file);  // 读取文件为文本
            }
        }
    };
    input.click();
}

// 编辑
const dialogEdit = ref(false)

const handleEdit = (index: number, row: Income) => {
    const { id, enable, ...rest } = row;
    lastEditedData.value = rest;

    ruleForm.value.key = row.key
    // ruleForm.value.full = row.full
    ruleForm.value.income = row.income
    dialogEdit.value = true
    selectedId.value = row.id
    // console.log(index, row)
}

const handleSwitchChange = async (row: Income) => {
    try {
        // 立即更新本地状态
        row.enable = row.enable

        // 发送 API 请求
        await axios.patch(`income/${row.id}/`, {
            enable: row.enable
        })
        ElMessage.success('状态更新成功')
    } catch (error: any) {
        // 请求失败时回滚状态
        row.enable = !row.enable
        // ElMessage.error('状态更新失败')
        if (error.response && error.response.status == 401) {
            ElMessage.info('未认证，请登录后重试');
        }
        console.error(error)
    }
}

const editForm = async (formEl: FormInstance | undefined) => {
    if (!formEl) return
    await formEl.validate((valid, fields) => {
        if (valid) {
            try {
                // 转换字段名以匹配后端API
                const submitData = {
                    key: ruleForm.value.key,
                    payer: ruleForm.value.payer,
                    income_id: ruleForm.value.income, // 将 income 转换为 income_id
                    currency_ids: ruleForm.value.currency_ids
                }

                console.log('收入映射编辑提交数据:', submitData)

                axios({
                    url: `income/${selectedId.value}/`,
                    data: submitData,
                    method: "PUT",
                    headers: { 'Content-Type': 'application/json' }
                })
                    .then(response => {
                        ElMessage.success('修改成功')
                        dialogEdit.value = false
                        fetchData() // 新增刷新
                    })
                    .catch(error => {
                        if (error.response && error.response.status == 401) {
                            ElMessage.info('未认证，请登录后重试');
                        }
                        else if (error.response && error.response.status == 403) {
                            ElMessage.info('权限不足，请登录后重试');
                        }
                        else if (error.response && error.response.status == 400) {
                            ElMessage.error('修改失败，请检查关键字是否冲突');
                        }
                        else {
                            dialogError.value = true
                        }
                        console.error(error)
                    })
            } catch (error) {
                // console.log(error);
            }
        } else {
            // console.log('error submit!', fields)
        }
    })
}

// 删除
const dialogDel = ref(false)
const selectedId = ref(0)  // 编辑 & 删除均用这个

const handleDelete = (index: number, row: Income) => {
    dialogDel.value = true
    selectedId.value = row.id
    // console.log(index, row)
}

// 删除确认
const confirmDelete = async () => {
    try {
        const response = await axios.delete(`income/${selectedId.value}/`);
        ElMessage.success('删除成功')
        dialogDel.value = false
        await fetchData() // 新增刷新
    } catch (error: any) {
        dialogDel.value = false
        console.error(error);
        if (error.response && error.response.status == 401) {
            ElMessage.info('未认证，请登录后重试');
        }
        else if (error.response && error.response.status == 403) {
            ElMessage.info('权限不足，请登录后重试');
        }
        else if (error.response && error.response.status == 400) {
            ElMessage.error('修改失败，请检查关键字是否冲突');
        }
        else {
            dialogError.value = true
        }
    }
}

// 获取账户类型颜色
const getAccountTypeColor = (type: string) => {
    const colorMap: Record<string, string> = {
        'Assets': 'success',
        'Expenses': 'warning',
        'Income': 'primary',
        'Liabilities': 'danger',
        'Equity': 'info',
        // 中文类型映射
        '资产账户': 'success',
        '支出账户': 'warning',
        '收入账户': 'primary',
        '负债账户': 'danger',
        '权益账户': 'info'
    }
    return colorMap[type] || 'info'
}

// 处理账户选择变化
const handleAccountChange = (account: any) => {
    // 账户变化时可以做一些额外处理
    console.log('账户选择变化:', account)
}

// 处理选择变化
const handleSelectionChange = (selection: Income[]) => {
    selectedItems.value = selection
}

// 批量启用
const handleBatchEnable = async () => {
    if (selectedItems.value.length === 0) return

    try {
        const promises = selectedItems.value.map(item =>
            axios.patch(`income/${item.id}/`, { enable: true })
        )
        await Promise.all(promises)
        ElMessage.success(`成功启用 ${selectedItems.value.length} 个映射`)
        await fetchData()
        selectedItems.value = []
    } catch (error: any) {
        console.error('批量启用失败:', error)
        ElMessage.error('批量启用失败')
    }
}

// 批量禁用
const handleBatchDisable = async () => {
    if (selectedItems.value.length === 0) return

    try {
        const promises = selectedItems.value.map(item =>
            axios.patch(`income/${item.id}/`, { enable: false })
        )
        await Promise.all(promises)
        ElMessage.success(`成功禁用 ${selectedItems.value.length} 个映射`)
        await fetchData()
        selectedItems.value = []
    } catch (error: any) {
        console.error('批量禁用失败:', error)
        ElMessage.error('批量禁用失败')
    }
}

// 批量删除
const handleBatchDelete = async () => {
    if (selectedItems.value.length === 0) return

    try {
        await ElMessageBox.confirm(
            `确定要删除选中的 ${selectedItems.value.length} 个映射吗？此操作不可撤销。`,
            '确认批量删除',
            {
                confirmButtonText: '确定',
                cancelButtonText: '取消',
                type: 'warning'
            }
        )

        const promises = selectedItems.value.map(item =>
            axios.delete(`income/${item.id}/`)
        )
        await Promise.all(promises)
        ElMessage.success(`成功删除 ${selectedItems.value.length} 个映射`)
        await fetchData()
        selectedItems.value = []
    } catch (error: any) {
        if (error === 'cancel') return
        console.error('批量删除失败:', error)
        ElMessage.error('批量删除失败')
    }
}

// 高级排序方法：处理数字、英文和中文混合内容
const advancedSort = (a: Income, b: Income): number => {
    // 提取数字部分（如果有）
    const numA = parseInt(a.key.match(/\d+/)?.[0] || '0');
    const numB = parseInt(b.key.match(/\d+/)?.[0] || '0');

    // 如果都有数字且数字不同，按数字排序
    if (numA !== numB) {
        return numA - numB;
    }

    // 否则按拼音排序
    const pinyinA = pinyin(a.key, {
        toneType: 'none',
        pattern: 'first',
        type: 'string'
    }).toLowerCase();

    const pinyinB = pinyin(b.key, {
        toneType: 'none',
        pattern: 'first',
        type: 'string'
    }).toLowerCase();

    if (pinyinA < pinyinB) return -1;
    if (pinyinA > pinyinB) return 1;
    return 0;
};

</script>

<style scoped>
.income-mapping {
    padding: 20px;
    background: white;
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.toolbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
    gap: 16px;
}

.search-section {
    flex: 1;
    max-width: 400px;
}

.action-section {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
}

.account-cell {
    display: flex;
    align-items: center;
    gap: 8px;
}

.currency-cell {
    display: flex;
    gap: 4px;
    flex-wrap: wrap;
}

.currency-tag {
    margin: 0;
}

.batch-actions {
    margin-top: 16px;
}

.batch-buttons {
    display: flex;
    gap: 8px;
    margin-top: 8px;
}

.dialog-footer button:first-child {
    margin-right: 10px;
}

/* 响应式设计 */
@media (max-width: 768px) {
    .income-mapping {
        padding: 12px;
    }

    .toolbar {
        flex-direction: column;
        align-items: stretch;
    }

    .search-section {
        max-width: none;
    }

    .action-section {
        justify-content: center;
    }
}
</style>