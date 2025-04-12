<template>
    <el-table v-loading="loading" :data="filterExpenseData" style="width: 98%">
        <el-table-column label="关键字" prop="key" />
        <!-- <el-table-column label="账户" prop="full">
            <template #header="{ column }">
                <span>
                    {{ column.label }}
                    <span class="tooltip-icon" @mouseover="showTooltip = true" @mouseleave="showTooltip = false">
                        <i class="el-icon-question"></i>
                    </span>
                    <el-tooltip v-if="showTooltip" class="tooltip" effect="dark" placement="top"
                        :content="incometipContent">
                        <el-icon>
                            <InfoFilled />
                        </el-icon>
                    </el-tooltip>
                </span>
            </template>
</el-table-column> -->
        <el-table-column label="映射账户" prop="income" />
        <el-table-column align="right">
            <template #header>
                <div style="display: flex">
                    <el-input v-model="search" size="small" placeholder="搜索 关键字" />
                    <el-button size="small" type="info" @click="handleAdd()" style="margin-left: 12px">新增</el-button>
                    <el-button size="small" type="default" @click="handleImport()"
                        style="margin-left: 12px">导入</el-button>
                    <el-button size="small" type="default" @click="handleExport()"
                        style="margin-left: 12px">导出</el-button>
                </div>
            </template>
            <template #default="scope">
                <el-switch v-model="scope.row.enable" style="margin-right: 12px;"
                    @change="handleSwitchChange(scope.row)" inline-prompt inactive-text="禁用" />
                <el-button size="small" @click="handleEdit(scope.$index, scope.row)">编辑</el-button>
                <el-button size="small" type="danger" @click="handleDelete(scope.$index, scope.row)"
                    style="margin-left: 12px">删除</el-button>
            </template>
        </el-table-column>
    </el-table>
    <el-dialog v-model="dialogAdd" title="新增映射" width="30%">
        <el-form ref="ruleFormRef" :model="ruleForm" :rules="rules" label-width="120px" class="demo-ruleForm"
            status-icon>
            <el-form-item label="关键字" prop="key">
                <el-input v-model="ruleForm.key" placeholder="0000" />
            </el-form-item>
            <!-- <el-form-item label="账户" prop="full">
                <el-input v-model="ruleForm.full" placeholder="中国建设银行储蓄卡(0000)" />
            </el-form-item> -->
            <el-form-item label="映射账户" prop="income">
                <el-input v-model="ruleForm.income" placeholder="Assets:Savings:Bank:CCB:C0000" />
            </el-form-item>
            <el-form-item>
                <el-button type="primary" @click="submitForm(ruleFormRef)">新增</el-button>
                <el-button @click="resetForm(ruleFormRef)">重置</el-button>
            </el-form-item>
        </el-form>
    </el-dialog>
    <el-dialog v-model="dialogEdit" title="修改映射" width="30%">
        <el-form ref="ruleFormRef" :model="ruleForm" :rules="rules" label-width="120px" class="demo-ruleForm"
            status-icon>
            <el-form-item label="关键字" prop="key">
                <el-input v-model="ruleForm.key" />
            </el-form-item>
            <!-- <el-form-item label="账户" prop="full">
                <el-input v-model="ruleForm.full" />
            </el-form-item> -->
            <el-form-item label="映射账户" prop="expend">
                <el-input v-model="ruleForm.income" />
            </el-form-item>
            <el-form-item>
                <el-button type="primary" @click="editForm(ruleFormRef)">保存</el-button>
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
    <el-dialog v-model="dialogError" title="操作失败" width="30%">
        <el-icon>
            <WarningFilled />
        </el-icon><span>>新增/修改/删除 失败，请登录后重试</span>
    </el-dialog>
</template>

<script lang="ts" setup>
import { ElMessage } from 'element-plus';
import { computed, ref, onMounted } from 'vue'
import type { FormInstance, FormRules } from 'element-plus'
import axios from '../../utils/request'
import handleRefresh from '../../utils/commonFunctions'
import router from '~/routers'
import * as XLSX from 'xlsx'

const dialogError = ref(false)
const loading = ref(false)
const lastEditedData = ref<Partial<Income> | null>(null)

interface Income {
    id: number
    key: string
    // full: string
    income: string
    enable: boolean
}

// 页面增加优先级提示
const showTooltip = ref(true)
const incometipContent = ref("固定格式： [银行]+[储蓄卡/信用卡]+([卡号])。用于支付宝还款功能映射 and 支付宝提现至储蓄卡");

// 页面获取数据
const AssetsData = ref<Income[]>([])
const fetchData = async () => {
    loading.value = true
    try {
        const response = await axios.get('income/')
        AssetsData.value = response.data
        // console.log(AssetsData.value);
    } catch (error: any) {
        console.error(error)
        if (error.response.data.code == "token_not_valid") {
            handleRefresh();
            // ElMessage("token_not_valid, please log in again.")
            // console.log("token_not_valid");
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

const filterExpenseData = computed(() =>
    AssetsData.value.filter(
        (data) =>
            !search.value ||
            data.key.toLowerCase().includes(search.value.toLowerCase())
    )
)

// 新增
const dialogAdd = ref(false)

const handleAdd = () => {
    if (lastEditedData.value) {
        // 使用上一次编辑的值
        ruleForm.value = {
            key: lastEditedData.value.key || '',
            income: lastEditedData.value.income || '',
        };
    } else {
        // 没有编辑记录则重置
        if (ruleFormRef.value) {
            ruleFormRef.value.resetFields();
        }
    };
    dialogAdd.value = true;
}

const ruleFormRef = ref<FormInstance>()
const ruleForm = ref({
    key: '',
    // full: '',
    income: '',
})

const rules = ref<FormRules>({
    key: [
        { required: true, message: '请输入关键字', trigger: 'blur' },
        { max: 16, message: '长度应控制在16个字符以内', trigger: 'blur' },
    ],
    // full: [
    //     { required: true, message: '请输入账户', trigger: 'blur' },
    //     { max: 16, message: '长度应控制在16个字符以内', trigger: 'blur' },
    // ],
    income: [
        { required: true, message: '请输入映射账户', trigger: 'blur' },
        { max: 64, message: '长度应控制在64个字符以内', trigger: 'blur' },
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
                axios({
                    url: 'income/',
                    data: JSON.parse(JSON.stringify(ruleForm.value)),
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
                            ElMessage.info('权限不足，请登录后重试');
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
                // console.log(error);
            }
        } else {
            // console.log('error submit!', fields)
        }
    })
}


// 导出
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
                                ElMessage.info('权限不足，请登录后重试');
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
    } catch (error) {
        // 请求失败时回滚状态
        row.enable = !row.enable
        ElMessage.error('状态更新失败')
        console.error(error)
    }
}

const editForm = async (formEl: FormInstance | undefined) => {
    if (!formEl) return
    await formEl.validate((valid, fields) => {
        if (valid) {
            try {
                axios({
                    url: `income/${selectedId.value}/`,
                    data: JSON.parse(JSON.stringify(ruleForm.value)),
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
                            ElMessage.info('权限不足，请登录后重试');
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
    } catch (error) {
        console.error(error);
    }
}
</script>

<style scoped>
.dialog-footer button:first-child {
    margin-right: 10px;
}
</style>