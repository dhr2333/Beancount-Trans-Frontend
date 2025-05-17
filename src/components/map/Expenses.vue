<template>
  <el-table :data="filterExpenseData" style="width: 99%;margin-left: 10px;">
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
    <el-table-column label="货币" prop="currency" width="120">
      <template #header="{ column }">
        <div class="currency-header">
          {{ column.label }}
          <el-tooltip v-if="showTooltip" class="tooltip" effect="dark" placement="top" :content="currencyContent">
            <el-icon>
              <InfoFilled />
            </el-icon>
          </el-tooltip>
        </div>
      </template>
    </el-table-column>
    <!-- <el-table-column label="标签" prop="tag" />
    <el-table-column label="类型" prop="classification" /> -->
    <el-table-column align="right">
      <template #header>
        <div style="display: flex">
          <el-input v-model="search" size="small" placeholder="搜索 关键字" />
          <el-button size="small" type="info" @click="handleAdd()" style="margin-left: 12px">新增</el-button>
          <el-button size="small" type="default" @click="handleImport()" style="margin-left: 12px">导入</el-button>
          <el-button size="small" type="default" @click="handleExport()" style="margin-left: 12px">导出</el-button>
        </div>
      </template>
      <template #default="scope">
        <el-switch v-model="scope.row.enable" style="margin-right: 12px;" @change="handleSwitchChange(scope.row)"
          inline-prompt inactive-text="禁用" />
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
      <el-form-item label="货币" prop="currency">
        <el-input v-model="ruleForm.currency" placeholder="CNY" clearable>
        </el-input>
      </el-form-item>
      <!-- <el-form-item label="标签" prop="tag">
        <el-input v-model="ruleForm.tag" placeholder="影音娱乐" />
      </el-form-item>
      <el-form-item label="类型" prop="classification">
        <el-input v-model="ruleForm.classification" placeholder="文化休闲/影音娱乐" />
      </el-form-item> -->
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
      <el-form-item label="货币" prop="currency">
        <el-input v-model="ruleForm.currency" />
      </el-form-item>
      <!-- <el-form-item label="标签" prop="tag">
        <el-input v-model="ruleForm.tag" />
      </el-form-item>
      <el-form-item label="类型" prop="classification">
        <el-input v-model="ruleForm.classification" />
      </el-form-item> -->
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
  <!-- <el-dialog v-model="dialogError" title="操作失败" width="30%">
    <el-icon>
      <WarningFilled />
    </el-icon><span>{{ errorMessage }}</span>
  </el-dialog> -->
</template>

<script lang="ts" setup>
import { ElMessage } from 'element-plus';
import { computed, ref, onMounted } from 'vue'
import type { FormInstance, FormRules } from 'element-plus'
import axios from '../../utils/request'
import handleRefresh from '../../utils/commonFunctions'
import * as XLSX from 'xlsx'

// const apiUrl = import.meta.env.VITE_API_URL;
const dialogError = ref(false)
const lastEditedData = ref<Partial<Expense> | null>(null)
// console.log(import.meta.env);

interface Expense {
  id: number
  key: string
  payee: string | null | undefined
  expend: string
  currency: string | null | undefined
  enable: boolean
  // tag: string
  // classification: string
}

// 页面增加优先级提示
const showTooltip = ref(true)
const payeetipContent = ref("若商家存在，优先级 + 50 ,映射账户中每存在一个 ':' ，优先级以 ':' 数量 * 100计算 ");
const expendtipContent = ref("优先级越高则映射账户越精准。例如关键字为蜜雪冰城的条目，优先级为 2 * 100 + 50 = 250")
const currencyContent = ref("若该货币与格式化输出中的基础货币模板不同，则会使用\"@@\"来指定总成本，建议储值类使用非CNY货币，留空默认为\"CNY\"")

// 页面获取数据
const expenseData = ref<Expense[]>([])
// console.log(expenseData.value);

const fetchData = async () => {
  try {
    const response = await axios.get('expense/')
    expenseData.value = response.data
    // console.log(expenseData.value);
  } catch (error: any) {
    console.error(error)
    // console.log(error.response.data.code);
    if (error.response.data.code == "token_not_valid") {
      handleRefresh();
      // ElMessage("token_not_valid, please log in again.")
      // console.log("token_not_valid");
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
  expenseData.value.filter((data) => {
    const searchTerm = search.value?.toLowerCase() || ''
    if (!searchTerm) return true

    return [
      data.key.toLowerCase(),
      data.payee?.toLowerCase() ?? '',
      data.expend.toLowerCase(),
      data.currency?.toLowerCase() ?? ''
    ].some(field => field.includes(searchTerm))
  })
)

// 新增
const dialogAdd = ref(false)

const handleAdd = () => {
  if (lastEditedData.value) {
    // 使用上一次编辑的值
    ruleForm.value = {
      key: lastEditedData.value.key || '',
      payee: lastEditedData.value.payee ?? null,
      expend: lastEditedData.value.expend || '',
      currency: lastEditedData.value.currency ?? null
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
  // payee: null,
  payee: null as string | null | undefined,
  expend: '',
  currency: null as string | null | undefined,
  // enable: '',
  // tag: '',
  // classification: '',
})

const rules = ref<FormRules>({
  key: [
    { required: true, message: '请输入关键字', trigger: 'blur' },
    { max: 16, message: '长度应控制在16个字符以内', trigger: 'blur' },
  ],
  payee: [
    { required: false, message: '', trigger: 'change', },
    { max: 32, message: '长度应控制在32个字符以内', trigger: 'blur' },
  ],
  expend: [
    { required: true, message: '请输入映射账户', trigger: 'blur' },
    { max: 64, message: '长度应控制在64个字符以内', trigger: 'blur' },
  ],
  currency: [
    { required: false, message: '请输入货币', trigger: 'blur' },
    { pattern: /^[A-Z][A-Z0-9'._-]{0,22}([A-Z0-9])?$/, message: '必须以大写字母开头，以大写字母/数字结尾，允许字符 [A-Z0-9\'._-]', trigger: 'blur' }
  ],
  // tag: [
  //   { required: true, message: '请输入标签', trigger: 'blur' },
  //   { max: 16, message: '长度应控制在16个字符以内', trigger: 'blur' },
  // ],
  // classification: [
  //   { required: true, message: '请输入类型', trigger: 'blur' },
  //   { max: 16, message: '长度应控制在16个字符以内', trigger: 'blur' },
  // ],
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
          .then(response => {
            ElMessage.success('新增成功')
            dialogAdd.value = false
            fetchData();
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
  // async function updateExpenseData() {
  //   const response = await axios.get('expense/');
  //   expenseData.value = response.data;
  // }
}

// 导出
const handleExport = () => {
  const data = expenseData.value
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
  link.setAttribute('download', 'export_expense.csv')
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

          // 遍历JSON数据，确保所有字段存在
          json = json.map((item: any) => {
            return {
              key: item.key || "",
              payee: item.payee || "",
              expend: item.expend || "",
              currency: item.currency || "",
              enable: item.enable || "",
            };
          });


          axios({
            url: 'expense/',
            data: JSON.parse(JSON.stringify(json)),
            method: "POST",
            headers: { 'Content-Type': 'application/json' }
          })
            .then(response => {
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

const handleEdit = (index: number, row: Expense) => {
  const { id, enable, ...rest } = row;
  lastEditedData.value = rest;

  ruleForm.value.key = row.key
  ruleForm.value.payee = row.payee !== null ? row.payee : null // 为了解决编辑时payee为null时的问题;
  ruleForm.value.expend = row.expend
  ruleForm.value.currency = row.currency
  // ruleForm.value.enable = row.enable
  // ruleForm.value.tag = row.tag
  // ruleForm.value.classification = row.classification
  dialogEdit.value = true
  selectedId.value = row.id
  // console.log(index)
  // console.log(row);
}

const handleSwitchChange = async (row: Expense) => {
  try {
    // 立即更新本地状态
    row.enable = row.enable

    // 发送 API 请求
    await axios.patch(`expense/${row.id}/`, {
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
        axios({
          url: `expense/${selectedId.value}/`,
          data: JSON.parse(JSON.stringify(ruleForm.value)),
          method: "PUT",
          headers: {
            'Content-Type': 'application/json'
          }
        })
          .then(response => {
            // console.log(response.data);
            // expenseData.value = response.data
            fetchData()
          })
          .catch(error => {
            if (error.response && error.response.status === 401) {
              ElMessage.info('未认证，请登录后重试');
            }
            else if (error.response && error.response.status == 403) {
              ElMessage.info('权限不足，请登录后重试');
            }
            else if (error.response && error.response.status === 400) {
              ElMessage.error('修改失败，请检查关键字是否冲突');
            }
            else {
              dialogError.value = true
            }
            console.error(error)
          })
        dialogEdit.value = false
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

const handleDelete = (index: number, row: Expense) => {
  dialogDel.value = true
  selectedId.value = row.id
  // console.log(index, row)
}

// 删除确认
// const errorMessage = ref('') // 存储错误信息
const confirmDelete = async () => {
  try {
    const response = await axios.delete(`expense/${selectedId.value}/`);
    // console.log(response.data);
    const get = await axios.get('expense')
    expenseData.value = get.data
  } catch (error: any) {
    console.error(error);
    // 从错误响应中提取后端信息
    if (error.response && error.response.status === 401) {
      ElMessage.info('未认证，请登录后重试');
    }
    // errorMessage.value = error.response?.data?.error ||
    //   error.response?.data?.detail ||
    //   '请求失败，请稍后重试'
    // dialogError.value = true
  }
  dialogDel.value = false
}

</script>

<style scoped>
.dialog-footer button:first-child {
  margin-right: 10px;
}
</style>
