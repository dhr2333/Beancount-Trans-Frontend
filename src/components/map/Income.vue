<template>
    <el-table :data="filterExpenseData" style="width: 98%">
        <!-- <el-table-column label="编号" prop="id" /> -->
        <el-table-column label="关键字" prop="key" />
        <el-table-column label="账户" prop="full" />
        <el-table-column label="映射账户" prop="income" />
        <el-table-column align="right">
            <template #header>
                <div style="display: flex">
                    <el-input v-model="search" size="small" placeholder="搜索 关键字" />
                    <el-button size="small" type="info" @click="handleAdd()" style="margin-left: 12px">新增</el-button>
                </div>
            </template>
            <template #default="scope">
                <el-button size="small" @click="handleEdit(scope.$index, scope.row)">编辑</el-button>
                <el-button size="small" type="danger" @click="handleDelete(scope.$index, scope.row)"
                    style="margin-left: 12px">删除</el-button>
            </template>
        </el-table-column>
    </el-table>
    <el-dialog v-model="dialogAdd" title="新增映射" width="30%">
        <el-form ref="ruleFormRef" :model="ruleForm" :rules="rules" label-width="120px" class="demo-ruleForm" status-icon>
            <el-form-item label="关键字" prop="key">
                <el-input v-model="ruleForm.key" placeholder="0000" />
            </el-form-item>
            <el-form-item label="账户" prop="full">
                <el-input v-model="ruleForm.full" placeholder="中国建设银行储蓄卡(0000)" />
            </el-form-item>
            <el-form-item label="映射账户" prop="income">
                <el-input v-model="ruleForm.income" placeholder="Assets:Savings:Bank:Jianshe:C0000" />
            </el-form-item>
            <el-form-item>
                <el-button type="primary" @click="submitForm(ruleFormRef)">新增</el-button>
                <el-button @click="resetForm(ruleFormRef)">重置</el-button>
            </el-form-item>
        </el-form>
    </el-dialog>
    <el-dialog v-model="dialogEdit" title="修改映射" width="30%">
        <el-form ref="ruleFormRef" :model="ruleForm" :rules="rules" label-width="120px" class="demo-ruleForm" status-icon>
            <el-form-item label="关键字" prop="key">
                <el-input v-model="ruleForm.key" />
            </el-form-item>
            <el-form-item label="账户" prop="full">
                <el-input v-model="ruleForm.full" />
            </el-form-item>
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
        </el-icon><span>该关键字已存在</span>
    </el-dialog>
</template>

<script lang="ts" setup>
import { computed, ref, onMounted } from 'vue'
import type { FormInstance, FormRules } from 'element-plus'
import axios from '../../utils/request'
const dialogError = ref(false)

interface Assets {
    id: number
    key: string
    full: string
    income: string
}

// 页面获取数据
const AssetsData = ref<Assets[]>([])
const fetchData = async () => {
    try {
        const response = await axios.get('assets/')
        AssetsData.value = response.data
        console.log(AssetsData.value);
    } catch (error) {
        console.error(error)
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
            data.full.toLowerCase().includes(search.value.toLowerCase())
    )
)

// 新增
const dialogAdd = ref(false)

const handleAdd = () => {
    dialogAdd.value = true
}

const ruleFormRef = ref<FormInstance>()
const ruleForm = ref({
    key: '',
    full: '',
    income: '',
})

const rules = ref<FormRules>({
    key: [
        { required: true, message: '请输入关键字', trigger: 'blur' },
        { max: 16, message: '长度应控制在16个字符以内', trigger: 'blur' },
    ],
    full: [
        { required: true, message: '请输入账户', trigger: 'blur' },
        { max: 16, message: '长度应控制在16个字符以内', trigger: 'blur' },
    ],
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
                    url: 'assets/',
                    data: JSON.parse(JSON.stringify(ruleForm.value)),
                    method: "POST",
                    header: { 'Content-Type': 'application/json' }
                })
                    .then(response => {
                        console.log(response.data);
                    })
                    .catch(error => {
                        dialogError.value = true
                        console.error(error)
                    })
                dialogAdd.value = false
            } catch (error) {
                console.log(error);
            }
        } else {
            console.log('error submit!', fields)
        }
    })
}

// 编辑
const dialogEdit = ref(false)

const handleEdit = (index: number, row: Assets) => {
    ruleForm.value.key = row.key
    ruleForm.value.full = row.full
    ruleForm.value.income = row.income
    dialogEdit.value = true
    selectedId.value = row.id
    console.log(index, row)
}

const editForm = async (formEl: FormInstance | undefined) => {
    if (!formEl) return
    await formEl.validate((valid, fields) => {
        if (valid) {
            try {
                axios({
                    url: `assets/${selectedId.value}/`,
                    data: JSON.parse(JSON.stringify(ruleForm.value)),
                    method: "PUT",
                    header: { 'Content-Type': 'application/json' }
                })
                    .then(response => {
                        console.log(response.data);
                    })
                    .catch(error => {
                        dialogError.value = true
                        console.error(error)
                    })
                dialogEdit.value = false
            } catch (error) {
                console.log(error);
            }
        } else {
            console.log('error submit!', fields)
        }
    })
}

// 删除
const dialogDel = ref(false)
const selectedId = ref(0)  // 编辑 & 删除均用这个

const handleDelete = (index: number, row: Assets) => {
    dialogDel.value = true
    selectedId.value = row.id
    console.log(index, row)
}

// 删除确认
const confirmDelete = async () => {
    try {
        const response = await axios.delete(`assets/${selectedId.value}/`);
        console.log(response.data);
        dialogDel.value = false
        const get = await axios.get('assets')
        expenseData.value = get.data
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