<template>
    <div class="assets-mapping">
        <!-- 搜索和操作栏 -->
        <div class="toolbar">
            <div class="search-section">
                <el-input v-model="search" placeholder="搜索关键字、账户描述、账户" clearable @input="handleSearch">
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
            </div>
        </div>

        <!-- 映射列表 -->
        <el-table :data="filterAssetsData" v-loading="loading" style="width: 100%;"
            @selection-change="handleSelectionChange">
            <el-table-column type="selection" width="55" />

            <el-table-column label="关键字" prop="key" sortable :sort-method="advancedSort" min-width="100" width="auto">
                <template #default="{ row }">
                    <el-tag type="primary" size="small">{{ row.key }}</el-tag>
                </template>
            </el-table-column>

            <el-table-column label="账户描述" prop="full" min-width="150" width="auto">
                <template #default="{ row }">
                    <span v-if="row.full">{{ row.full }}</span>
                    <el-text v-else type="info" size="small">-</el-text>
                </template>
            </el-table-column>

            <el-table-column label="映射账户" prop="assets" sortable :sort-method="sortByAccount" min-width="180"
                width="auto">
                <template #default="{ row }">
                    <div class="account-cell">
                        <el-text type="primary">{{ typeof row.assets === 'object' ? row.assets?.account : row.assets
                            }}</el-text>
                        <el-tag v-if="typeof row.assets === 'object' && row.assets?.account_type"
                            :type="getAccountTypeColor(row.assets.account_type)" size="small">
                            {{ row.assets.account_type }}
                        </el-tag>
                    </div>
                </template>
            </el-table-column>

            <!-- <el-table-column label="关联货币" prop="currencies" width="150">
                <template #default="{ row }">
                    <div v-if="row.currencies && row.currencies.length > 0" class="currency-cell">
                        <el-tag v-for="currency in row.currencies" :key="currency.id" size="small" class="currency-tag">
                            {{ currency.code }}
                        </el-tag>
                    </div>
                    <el-text v-else type="info" size="small">CNY</el-text>
                </template>
            </el-table-column> -->

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
    <el-dialog v-model="dialogAdd" title="新增资产映射" width="600px">
        <el-form ref="ruleFormRef" :model="ruleForm" :rules="rules" label-width="100px" status-icon>
            <el-row :gutter="20">
                <el-col :span="12">
                    <el-form-item label="关键字" prop="key">
                        <el-input v-model="ruleForm.key" placeholder="银行卡号" />
                    </el-form-item>
                </el-col>
                <el-col :span="12">
                    <el-form-item label="账户描述" prop="full">
                        <el-input v-model="ruleForm.full" placeholder="中国建设银行储蓄卡" />
                    </el-form-item>
                </el-col>
            </el-row>

            <el-form-item label="映射账户" prop="assets">
                <AccountSelector v-model="ruleForm.assets" placeholder="选择账户" @change="handleAccountChange" />
            </el-form-item>
            <!-- 
            <el-form-item label="关联货币" prop="currency_ids">
                <CurrencySelector v-model="ruleForm.currency_ids" :account-id="ruleForm.assets" placeholder="选择货币" />
            </el-form-item> -->

            <el-form-item>
                <el-button type="primary" @click="submitForm(ruleFormRef)">新增</el-button>
                <el-button @click="resetForm(ruleFormRef)">重置</el-button>
            </el-form-item>
        </el-form>
    </el-dialog>
    <!-- 编辑映射对话框 -->
    <el-dialog v-model="dialogEdit" title="编辑资产映射" width="600px">
        <el-form ref="editFormRef" :model="ruleForm" :rules="rules" label-width="100px" status-icon>
            <el-row :gutter="20">
                <el-col :span="12">
                    <el-form-item label="关键字" prop="key">
                        <el-input v-model="ruleForm.key" />
                    </el-form-item>
                </el-col>
                <el-col :span="12">
                    <el-form-item label="账户描述" prop="full">
                        <el-input v-model="ruleForm.full" />
                    </el-form-item>
                </el-col>
            </el-row>

            <el-form-item label="映射账户" prop="assets">
                <AccountSelector v-model="ruleForm.assets" placeholder="选择账户" @change="handleAccountChange" />
            </el-form-item>

            <!-- <el-form-item label="关联货币" prop="currency_ids">
                <CurrencySelector v-model="ruleForm.currency_ids" :account-id="ruleForm.assets" placeholder="选择货币" />
            </el-form-item> -->

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
    <!-- 批量删除确认对话框 -->
    <el-dialog v-model="batchDeleteDialog" title="批量删除资产映射" width="600px" :close-on-click-modal="false">
        <div class="batch-delete-content">
            <!-- 警告信息 -->
            <el-alert title="删除确认" type="warning" :closable="false" show-icon style="margin-bottom: 20px;">
                <template #default>
                    <p>您即将删除 <strong>{{ selectedItems.length }}</strong> 个资产映射，此操作不可撤销！</p>
                    <p>请仔细确认以下映射信息：</p>
                </template>
            </el-alert>

            <!-- 删除项目列表 -->
            <div class="delete-items-list">
                <div v-for="(item, index) in selectedItems" :key="item.id" class="delete-item">
                    <div class="item-info">
                        <div class="item-main">
                            <el-tag type="primary" size="small">{{ item.key }}</el-tag>
                            <span v-if="item.full" class="item-description">{{ item.full }}</span>
                        </div>
                        <div class="item-account">
                            {{ typeof item.assets === 'object' ? item.assets?.account : item.assets }}
                        </div>
                    </div>
                    <div class="item-index">{{ index + 1 }}</div>
                </div>
            </div>

            <!-- 进度条 -->
            <div v-if="batchDeleteLoading" class="delete-progress">
                <el-progress :percentage="batchDeleteProgress"
                    :status="batchDeleteProgress === 100 ? 'success' : undefined" :stroke-width="8" />
                <p class="progress-text">正在删除映射... {{ batchDeleteProgress }}%</p>
            </div>

            <!-- 错误信息 -->
            <div v-if="batchDeleteErrors.length > 0" class="delete-errors">
                <el-alert title="部分删除失败" type="error" :closable="false" show-icon>
                    <template #default>
                        <ul class="error-list">
                            <li v-for="error in batchDeleteErrors" :key="error" class="error-item">
                                {{ error }}
                            </li>
                        </ul>
                    </template>
                </el-alert>
            </div>
        </div>

        <template #footer>
            <div class="dialog-footer">
                <el-button @click="cancelBatchDelete" :disabled="batchDeleteLoading">
                    取消
                </el-button>
                <el-button type="danger" @click="confirmBatchDelete" :loading="batchDeleteLoading"
                    :disabled="batchDeleteLoading">
                    {{ batchDeleteLoading ? '删除中...' : '确认删除' }}
                </el-button>
            </div>
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
import { Search, Plus, Upload, Download, Edit, Delete } from '@element-plus/icons-vue'
import axios from '../../utils/request'
import handleRefresh from '../../utils/commonFunctions'
import * as XLSX from 'xlsx'
import { pinyin } from 'pinyin-pro';
import AccountSelector from '../common/AccountSelector.vue'
// import CurrencySelector from '../common/CurrencySelector.vue'

const dialogError = ref(false)
const lastEditedData = ref<Partial<Assets> | null>(null)

interface Assets {
    id: number
    key: string
    full: string
    assets: string | { id: number; account: string; enable: boolean; account_type?: string }
    assets_id?: number
    account_type?: string
    enable: boolean
}

// 页面增加优先级提示
const showTooltip = ref(true)
const keyTooltipVisible = ref(false)
const fullTooltipVisible = ref(false)
const assetsTooltipVisible = ref(false)
const keytipContent = ref("账户相似时，详细账户的优先级应更高，例如'零钱通'应在'零钱'的前面");
const assetstipContent = ref("固定格式： [银行]+[储蓄卡/信用卡]+([卡号])。用于支付宝还款功能映射 and 支付宝提现至储蓄卡");
const loading = ref(false)

// 页面获取数据
const AssetsData = ref<Assets[]>([])
const selectedItems = ref<Assets[]>([])

const fetchData = async () => {
    try {
        loading.value = true
        const response = await axios.get('assets/')
        AssetsData.value = response.data.sort((a: any, b: any) => a.id - b.id)
    } catch (error: any) {
        console.error(error)
        if (error.response?.data?.code == "token_not_valid") {
            handleRefresh()
        } else if (error.response?.status === 401) {
            ElMessage.info('未认证，请登录后重试')
        } else {
            ElMessage.error('获取资产映射数据失败')
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

const filterAssetsData = computed(() =>
    AssetsData.value.filter((data) => {
        const searchTerm = search.value?.toLowerCase() || ''
        if (!searchTerm) return true

        return [
            data.key.toLowerCase(),
            data.full?.toLowerCase() ?? '',
            typeof data.assets === 'string' ? data.assets.toLowerCase() : data.assets?.account?.toLowerCase() ?? ''
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
            full: lastEditedData.value.full || '',
            assets: lastEditedData.value.assets_id || null,
            currency_id: lastEditedData.value.currency_ids?.[0] || null
        };
    } else {
        // 没有编辑记录则重置
        ruleForm.value = {
            key: '',
            full: '',
            assets: null,
            currency_id: null
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
    full: '',
    assets: null as number | null | undefined,
    currency_id: null as number | null,
})

const rules = ref<FormRules>({
    key: [
        { required: true, message: '请输入关键字', trigger: 'blur' },
        { max: 16, message: '长度应控制在16个字符以内', trigger: 'blur' },
    ],
    full: [
        { required: true, message: '请输入账户描述', trigger: 'blur' },
        { max: 32, message: '长度应控制在32个字符以内', trigger: 'blur' },
    ],
    assets: [
        { required: false, message: '请选择映射账户', trigger: 'change' },
    ],
    currency_id: [
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
                    full: ruleForm.value.full,
                    assets_id: ruleForm.value.assets, // 将 assets 转换为 assets_id
                    currency_ids: ruleForm.value.currency_id ? [ruleForm.value.currency_id] : []
                }

                console.log('资产映射提交数据:', submitData)

                axios({
                    url: 'assets/',
                    data: submitData,
                    method: "POST",
                    headers: { 'Content-Type': 'application/json' }
                })
                    .then(response => {
                        ElMessage.success('新增成功')
                        dialogAdd.value = false
                        fetchData()
                    })
                    .catch(error => {
                        if (error.response && error.response.status == 401) {
                            ElMessage.info('为认证，请登录后重试');
                        }
                        else if (error.response && error.response.status == 403) {
                            ElMessage.info('权限不足，请登录后重试');
                        }
                        else if (error.response && error.response.status == 400) {
                            ElMessage.error('新增失败，请检查关键字是否冲突');
                        }
                        else {
                            dialogError.value = true
                        }
                        console.error(error)
                    })
            } catch (error) {
                console.log(error);
            }
        } else {
            console.log('error submit!', fields)
        }
    })
}

// 导出
// const handleExport = () => {
//     const data = AssetsData.value
//     data.forEach((item: any) => {
//         delete item.id
//         delete item.url
//         delete item.owner
//     })
//     const fileName = 'export_assets.xlsx'
//     const wb = XLSX.utils.book_new()
//     const ws = XLSX.utils.json_to_sheet(data)
//     XLSX.utils.book_append_sheet(wb, ws, "Sheet1")
//     XLSX.writeFile(wb, fileName)
// }
const handleExport = () => {
    const data = AssetsData.value
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
    link.setAttribute('download', 'export_assets.csv')
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
}


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

                    console.log(JSON.stringify(json));

                    axios({
                        url: 'assets/',
                        data: JSON.parse(JSON.stringify(json)),
                        method: "POST",
                        headers: { 'Content-Type': 'application/json' }
                    })
                        .then(response => {
                            // console.log(response.data);
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
                            // dialogError.value = true
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

const handleEdit = (index: number, row: Assets) => {
    const { id, enable, ...rest } = row;
    lastEditedData.value = rest;

    ruleForm.value.key = row.key
    ruleForm.value.full = row.full
    ruleForm.value.assets = typeof row.assets === 'object' && row.assets ? row.assets.id : (typeof row.assets === 'number' ? row.assets : null)
    dialogEdit.value = true
    selectedId.value = row.id
    // console.log(index, row)
}

const handleSwitchChange = async (row: Assets) => {
    try {
        // 立即更新本地状态
        row.enable = row.enable

        // 发送 API 请求
        await axios.patch(`assets/${row.id}/`, {
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
                    full: ruleForm.value.full,
                    assets_id: ruleForm.value.assets, // 将 assets 转换为 assets_id
                    currency_ids: ruleForm.value.currency_id ? [ruleForm.value.currency_id] : []
                }

                console.log('资产映射编辑提交数据:', submitData)

                axios({
                    url: `assets/${selectedId.value}/`,
                    data: submitData,
                    method: "PUT",
                    headers: { 'Content-Type': 'application/json' }
                })
                    .then(response => {
                        dialogEdit.value = false
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

const handleDelete = (index: number, row: Assets) => {
    dialogDel.value = true
    selectedId.value = row.id
    // console.log(index, row)
}

// 删除确认
const confirmDelete = async () => {
    try {
        const response = await axios.delete(`assets/${selectedId.value}/`);
        // console.log(response.data);
        dialogDel.value = false
        fetchData()
    } catch (error: any) {
        console.error(error);
        dialogDel.value = false
        if (error.response && error.response.status == 401) {
            ElMessage.info('未认证，请登录后重试');
        }
        else if (error.response && error.response.status == 403) {
            ElMessage.info('权限不足，请登录后重试');
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
const handleSelectionChange = (selection: Assets[]) => {
    selectedItems.value = selection
}

// 批量启用
const handleBatchEnable = async () => {
    if (selectedItems.value.length === 0) return

    try {
        const promises = selectedItems.value.map(item =>
            axios.patch(`assets/${item.id}/`, { enable: true })
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
            axios.patch(`assets/${item.id}/`, { enable: false })
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

// 批量删除相关状态
const batchDeleteDialog = ref(false)
const batchDeleteLoading = ref(false)
const batchDeleteProgress = ref(0)
const batchDeleteErrors = ref<string[]>([])

// 批量删除
const handleBatchDelete = () => {
    if (selectedItems.value.length === 0) return
    batchDeleteDialog.value = true
    batchDeleteErrors.value = []
    batchDeleteProgress.value = 0
}

// 确认批量删除
const confirmBatchDelete = async () => {
    if (selectedItems.value.length === 0) return

    batchDeleteLoading.value = true
    batchDeleteProgress.value = 0
    batchDeleteErrors.value = []

    const totalItems = selectedItems.value.length
    const errors: string[] = []
    let successCount = 0

    try {
        // 逐个删除以显示进度
        for (let i = 0; i < selectedItems.value.length; i++) {
            const item = selectedItems.value[i]
            try {
                await axios.delete(`assets/${item.id}/`)
                successCount++
            } catch (error: any) {
                const errorMsg = `删除 "${item.key}" 失败: ${error.response?.data?.detail || error.message || '未知错误'}`
                errors.push(errorMsg)
                console.error(`删除资产映射失败 (ID: ${item.id}):`, error)
            }

            // 更新进度
            batchDeleteProgress.value = Math.round(((i + 1) / totalItems) * 100)
        }

        // 处理结果
        if (errors.length > 0) {
            batchDeleteErrors.value = errors
            if (successCount > 0) {
                ElMessage.warning(`成功删除 ${successCount} 个映射，${errors.length} 个失败`)
            } else {
                ElMessage.error('批量删除失败')
            }
        } else {
            ElMessage.success(`成功删除 ${successCount} 个资产映射`)
            batchDeleteDialog.value = false
            await fetchData()
            selectedItems.value = []
        }
    } catch (error: any) {
        console.error('批量删除过程出错:', error)
        ElMessage.error('批量删除过程中发生错误')
    } finally {
        batchDeleteLoading.value = false
    }
}

// 取消批量删除
const cancelBatchDelete = () => {
    batchDeleteDialog.value = false
    batchDeleteErrors.value = []
    batchDeleteProgress.value = 0
}

// 高级排序方法：处理数字、英文和中文混合内容
const advancedSort = (a: Assets, b: Assets): number => {
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

// 映射账户排序方法：处理中文字符串排序
const sortByAccount = (a: Assets, b: Assets): number => {
    const accountA = typeof a.assets === 'string' ? a.assets : a.assets?.account || '';
    const accountB = typeof b.assets === 'string' ? b.assets : b.assets?.account || '';

    // 按拼音排序
    const pinyinA = pinyin(accountA, {
        toneType: 'none',
        pattern: 'first',
        type: 'string'
    }).toLowerCase();

    const pinyinB = pinyin(accountB, {
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
.assets-mapping {
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
    flex-wrap: wrap;
    min-width: 0;
}

.currency-cell {
    display: flex;
    gap: 4px;
    flex-wrap: wrap;
    min-width: 0;
}

/* 表格自适应优化 */
:deep(.el-table) {
    table-layout: auto;
}

:deep(.el-table__body-wrapper) {
    overflow-x: auto;
}

/* 确保表格列能够自适应内容 */
:deep(.el-table th),
:deep(.el-table td) {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

/* 关键字列特殊处理 */
:deep(.el-table .el-tag) {
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
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

/* 批量删除对话框样式 */
.batch-delete-content {
    padding: 10px 0;
}

.delete-items-list {
    max-height: 300px;
    overflow-y: auto;
    border: 1px solid #e4e7ed;
    border-radius: 6px;
    background-color: #fafafa;
    margin-bottom: 20px;
}

.delete-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 16px;
    border-bottom: 1px solid #e4e7ed;
    transition: background-color 0.2s ease;
}

.delete-item:last-child {
    border-bottom: none;
}

.delete-item:hover {
    background-color: #f0f2f5;
}

.item-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 4px;
}

.item-main {
    display: flex;
    align-items: center;
    gap: 8px;
}

.item-description {
    color: #606266;
    font-size: 14px;
}

.item-account {
    color: #909399;
    font-size: 12px;
    font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
    background-color: #f0f9ff;
    padding: 2px 6px;
    border-radius: 4px;
    display: inline-block;
}

.item-index {
    color: #909399;
    font-size: 12px;
    font-weight: 500;
    background-color: #e4e7ed;
    padding: 4px 8px;
    border-radius: 12px;
    min-width: 24px;
    text-align: center;
}

.delete-progress {
    margin: 20px 0;
    text-align: center;
}

.progress-text {
    margin-top: 8px;
    color: #606266;
    font-size: 14px;
}

.delete-errors {
    margin-top: 20px;
}

.error-list {
    margin: 0;
    padding-left: 20px;
}

.error-item {
    margin-bottom: 4px;
    color: #f56c6c;
    font-size: 13px;
}

.dialog-footer {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
}

/* 响应式设计 */
@media (max-width: 1200px) {

    /* 中等屏幕优化 */
    .account-cell {
        flex-direction: column;
        align-items: flex-start;
        gap: 4px;
    }
}

@media (max-width: 768px) {
    .assets-mapping {
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

    .delete-item {
        flex-direction: column;
        align-items: flex-start;
        gap: 8px;
    }

    .item-index {
        align-self: flex-end;
    }

    /* 小屏幕表格优化 */
    :deep(.el-table) {
        font-size: 12px;
    }

    :deep(.el-tag) {
        font-size: 11px;
        padding: 2px 6px;
    }

    :deep(.el-button--small) {
        padding: 4px 8px;
        font-size: 11px;
    }
}

@media (max-width: 480px) {

    /* 超小屏幕进一步优化 */
    .account-cell {
        gap: 2px;
    }

    .currency-cell {
        gap: 2px;
    }
}
</style>