<template>
  <el-table :data="filterExpenseData" style="width: 98%">
    <el-table-column label="关键字" prop="key" />
    <el-table-column label="商家" prop="payee">
      <template #header="{ column }">
        <span>
          {{ column.label }}
          <span class="tooltip-icon" @mouseover="showTooltip = true" @mouseleave="showTooltip = false">
            <i class="el-icon-question"></i>
          </span>
          <el-tooltip v-if="showTooltip" class="tooltip" effect="dark" placement="top" :content="payeetipContent">
            <el-icon>
              <InfoFilled />
            </el-icon>
          </el-tooltip>
        </span>
      </template>
    </el-table-column>
    <el-table-column label="映射账户" prop="expend">
      <template #header="{ column }">
        <span>
          {{ column.label }}
          <span class="tooltip-icon" @mouseover="showTooltip = true" @mouseleave="showTooltip = false">
            <i class="el-icon-question"></i>
          </span>
          <el-tooltip v-if="showTooltip" class="tooltip" effect="dark" placement="top" :content="expendtipContent">
            <el-icon>
              <InfoFilled />
            </el-icon>
          </el-tooltip>
        </span>
      </template>
    </el-table-column>
    <el-table-column label="标签" prop="tag" />
    <el-table-column label="类型" prop="classification" />
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
        <el-input v-model="ruleForm.key" placeholder="王者荣耀" />
      </el-form-item>
      <el-form-item label="商家" prop="payee">
        <el-input v-model="ruleForm.payee" placeholder="腾讯" />
      </el-form-item>
      <el-form-item label="映射账户" prop="expend">
        <el-input v-model="ruleForm.expend" placeholder="Expenses:Culture:Entertainment" />
      </el-form-item>
      <el-form-item label="标签" prop="tag">
        <el-input v-model="ruleForm.tag" placeholder="影音娱乐" />
      </el-form-item>
      <el-form-item label="类型" prop="classification">
        <el-input v-model="ruleForm.classification" placeholder="文化休闲/影音娱乐" />
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
      <el-form-item label="商家" prop="payee">
        <el-input v-model="ruleForm.payee" />
      </el-form-item>
      <el-form-item label="映射账户" prop="expend">
        <el-input v-model="ruleForm.expend" />
      </el-form-item>
      <el-form-item label="标签" prop="tag">
        <el-input v-model="ruleForm.tag" />
      </el-form-item>
      <el-form-item label="类型" prop="classification">
        <el-input v-model="ruleForm.classification" />
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
    </el-icon><span>失败</span>
  </el-dialog>
</template>

<script lang="ts" setup>
import { computed, ref, onMounted } from 'vue'
import type { FormInstance, FormRules } from 'element-plus'
import axios from '../../utils/request'
import router from '~/routers'
const dialogError = ref(false)
console.log(import.meta.env);

interface Expense {
  id: number
  key: string
  payee: string | null | undefined
  expend: string
  tag: string
  classification: string
}

// 页面增加优先级提示
const showTooltip = ref(true)
const payeetipContent = ref("若商家存在，优先级 + 50 ,映射账户中每存在一个 ':' ，优先级以 ':' 数量 * 100计算 ");
const expendtipContent = ref("优先级越高则映射账户越精准。例如关键字为蜜雪冰城的条目，优先级为 2 * 100 + 50 = 250")

// 页面获取数据
const expenseData = ref<Expense[]>([])
console.log(expenseData.value);

const fetchData = async () => {
  try {
    const response = await axios.get('expense/')
    expenseData.value = response.data
    console.log(expenseData.value);
  } catch (error: any) {
    console.error(error)
    console.log(error.response.data.code);
    if (error.response.data.code == "token_not_valid") {
      router.push('/login')
    }
  }
}

// 页面数据获取(组件挂载)
onMounted(() => {
  fetchData()
})

// 关键字搜索
const search = ref('')

const filterExpenseData = computed(() =>
  expenseData.value.filter(
    (data) =>
      !search.value ||
      data.key.toLowerCase().includes(search.value.toLowerCase())
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
  // payee: null,
  payee: null as string | null | undefined,
  expend: '',
  tag: '',
  classification: '',
})

const rules = ref<FormRules>({
  key: [
    { required: true, message: '请输入关键字', trigger: 'blur' },
    { max: 16, message: '长度应控制在16个字符以内', trigger: 'blur' },
  ],
  payee: [
    { required: false, message: '', trigger: 'change', },
  ],
  expend: [
    { required: true, message: '请输入映射账户', trigger: 'blur' },
    { max: 64, message: '长度应控制在64个字符以内', trigger: 'blur' },
  ],
  tag: [
    { required: true, message: '请输入标签', trigger: 'blur' },
    { max: 16, message: '长度应控制在16个字符以内', trigger: 'blur' },
  ],
  classification: [
    { required: true, message: '请输入类型', trigger: 'blur' },
    { max: 16, message: '长度应控制在16个字符以内', trigger: 'blur' },
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
          url: 'expense/',
          data: JSON.parse(JSON.stringify(ruleForm.value)),
          method: "POST",
          headers: { 'Content-Type': 'application/json' }
        })
          // axios.post('http://127.0.0.1:8002/translate/map/expense/', ruleForm.value + '/')
          .then(response => {
            console.log(response.data);
          })
          .catch(error => {
            dialogError.value = true
            console.error(error)
          })
        dialogAdd.value = false
        setTimeout(updateExpenseData, 1000)
      } catch (error) {
        console.log(error);
      }
    } else {
      console.log('error submit!', fields)
    }
  })
  async function updateExpenseData() {
    const response = await axios.get('expense/');
    expenseData.value = response.data;
  }
}


// 编辑
const dialogEdit = ref(false)

const handleEdit = (index: number, row: Expense) => {
  ruleForm.value.key = row.key
  ruleForm.value.payee = row.payee !== null ? row.payee : null // 为了解决编辑时payee为null时的问题;
  ruleForm.value.expend = row.expend
  ruleForm.value.tag = row.tag
  ruleForm.value.classification = row.classification
  dialogEdit.value = true
  selectedId.value = row.id
  console.log(index)
  console.log(row);
}

const editForm = async (formEl: FormInstance | undefined) => {
  if (!formEl) return
  await formEl.validate((valid, fields) => {
    if (valid) {
      try {
        // axios.put(`http://127.0.0.1:38001/api/translate/map/expense/${selectedId.value}`, ruleForm.value)
        // axios.put(base_url + `translate/map/expense/${selectedId.value}/`, ruleForm.value + '/')
        axios({
          url: `expense/${selectedId.value}/`,
          data: JSON.parse(JSON.stringify(ruleForm.value)),
          method: "PUT",
          headers: {
            'Content-Type': 'application/json'
          }
        })
          .then(response => {
            console.log(response.data);
            expenseData.value = response.data
            fetchData()
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

const handleDelete = (index: number, row: Expense) => {
  dialogDel.value = true
  selectedId.value = row.id
  console.log(index, row)
}

// 删除确认
const confirmDelete = async () => {
  try {
    // const response = await axios.delete(`http://127.0.0.1:38001/api/translate/map/expense/${selectedId.value}`);
    const response = await axios.delete(`expense/${selectedId.value}/`);
    console.log(response.data);
    dialogDel.value = false
    // const get = await axios.get('http://127.0.0.1:38001/api/translate/map/expense')
    const get = await axios.get('expense')
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