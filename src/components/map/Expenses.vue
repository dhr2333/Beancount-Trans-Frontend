<template>
  <div class="expense-mapping">
    <!-- 搜索和操作栏 -->
    <div class="toolbar">
      <div class="search-section">
        <el-input v-model="search" placeholder="搜索关键字、商家、账户" clearable @input="handleSearch">
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
    <el-table :data="filterExpenseData" v-loading="loading" style="width: 100%;"
      @selection-change="handleSelectionChange">
      <el-table-column type="selection" width="55" />

      <el-table-column label="关键字" prop="key" sortable :sort-method="advancedSort" width="120">
        <template #default="{ row }">
          <el-tag type="primary" size="small">{{ row.key }}</el-tag>
        </template>
      </el-table-column>

      <el-table-column label="商家" prop="payee" width="150">
        <template #default="{ row }">
          <span v-if="row.payee">{{ row.payee }}</span>
          <el-text v-else type="info" size="small">-</el-text>
        </template>
      </el-table-column>

      <el-table-column label="映射账户" prop="expend" sortable min-width="200">
        <template #default="{ row }">
          <div class="account-cell">
            <el-text type="primary">{{ row.expend?.account || row.expend }}</el-text>
            <el-tag v-if="row.expend?.account_type" :type="getAccountTypeColor(row.expend.account_type)" size="small">
              {{ row.expend.account_type }}
            </el-tag>
          </div>
        </template>
      </el-table-column>

      <el-table-column label="关联货币" prop="currency" width="150">
        <template #default="{ row }">
          <div v-if="row.currency" class="currency-cell">
            <el-tag size="small" class="currency-tag">
              {{ row.currency.code }}
            </el-tag>
          </div>
          <el-text v-else type="info" size="small">-</el-text>
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
  <el-dialog v-model="dialogAdd" title="新增支出映射" width="600px">
    <!-- 提示信息 -->
    <!-- <el-alert v-if="showTooltip" :title="payeetipContent" type="info" :closable="false" show-icon
      style="margin-bottom: 20px;" /> -->

    <el-form ref="ruleFormRef" :model="ruleForm" :rules="rules" label-width="100px" status-icon>
      <el-row :gutter="20">
        <el-col :span="12">
          <el-form-item label="关键字" prop="key">
            <el-input v-model="ruleForm.key" placeholder="王者荣耀" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="商家" prop="payee">
            <el-input v-model="ruleForm.payee" placeholder="腾讯（可选）" />
          </el-form-item>
        </el-col>
      </el-row>

      <el-form-item label="映射账户" prop="expend">
        <AccountSelector v-model="ruleForm.expend" placeholder="选择账户" @change="handleAccountChange" />
      </el-form-item>

      <el-form-item label="关联货币" prop="currency">
        <CurrencySelector v-model="ruleForm.currency" :account-id="ruleForm.expend || undefined"
          placeholder="选择货币" />
      </el-form-item>

      <el-form-item>
        <el-button type="primary" @click="submitForm(ruleFormRef)">新增</el-button>
        <el-button @click="resetForm(ruleFormRef)">重置</el-button>
      </el-form-item>
    </el-form>
  </el-dialog>
  <!-- 编辑映射对话框 -->
  <el-dialog v-model="dialogEdit" title="编辑支出映射" width="600px">
    <el-form ref="editFormRef" :model="ruleForm" :rules="rules" label-width="100px" status-icon>
      <el-row :gutter="20">
        <el-col :span="12">
          <el-form-item label="关键字" prop="key">
            <el-input v-model="ruleForm.key" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="商家" prop="payee">
            <el-input v-model="ruleForm.payee" />
          </el-form-item>
        </el-col>
      </el-row>

      <el-form-item label="映射账户" prop="expend">
        <AccountSelector v-model="ruleForm.expend" placeholder="选择账户" @change="handleAccountChange" />
      </el-form-item>

      <el-form-item label="关联货币" prop="currency">
        <CurrencySelector v-model="ruleForm.currency" :account-id="ruleForm.expend || undefined"
          placeholder="选择货币" />
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
    </el-icon><span>{{ errorMessage }}</span>
  </el-dialog> -->
</template>

<script lang="ts" setup>
import { computed, ref, onMounted } from 'vue'
import type { FormInstance, FormRules } from 'element-plus'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search, Plus, Upload, Download, Refresh, Edit, Delete } from '@element-plus/icons-vue'
import axios from '../../utils/request'
import handleRefresh from '../../utils/commonFunctions'
import * as XLSX from 'xlsx'
import { pinyin } from 'pinyin-pro';
import AccountSelector from '../common/AccountSelector.vue'
import CurrencySelector from '../common/CurrencySelector.vue'

// const apiUrl = import.meta.env.VITE_API_URL;
const dialogError = ref(false)
const lastEditedData = ref<Partial<Expense> | null>(null)
// console.log(import.meta.env);

interface Currency {
  id: number
  code: string
  name: string
}

interface Expense {
  id: number
  key: string
  payee: string | null | undefined
  expend: {
    id: number
    account: string
    enable: boolean
    account_type?: string
  } | string
  currency: {
    id: number
    code: string
    name: string
  } | null
  enable: boolean
}

// 页面增加优先级提示
const showTooltip = ref(true)
const payeetipContent = ref("若商家存在，优先级 + 50 ,映射账户中每存在一个 ':' ，优先级以 ':' 数量 * 100计算 ");
const expendtipContent = ref("优先级越高则映射账户越精准。例如关键字为蜜雪冰城的条目，优先级为 2 * 100 + 50 = 250")
const currencyContent = ref("若该货币与格式化输出中的基础货币模板不同，则会使用\"@@\"来指定总成本，建议储值类使用非CNY货币，留空默认为\"CNY\"")

// 页面获取数据
const ExpenseData = ref<Expense[]>([])
const selectedItems = ref<Expense[]>([])

const loading = ref(false)

const fetchData = async () => {
  try {
    loading.value = true
    const response = await axios.get('expense/')
    ExpenseData.value = response.data.sort((a: any, b: any) => a.id - b.id)
  } catch (error: any) {
    console.error(error)
    if (error.response?.data?.code == "token_not_valid") {
      handleRefresh();
    } else if (error.response?.status === 401) {
      ElMessage.info('未认证，请登录后重试')
    } else {
      ElMessage.error('获取支出映射数据失败')
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
  ExpenseData.value.filter((data) => {
    const searchTerm = search.value?.toLowerCase() || ''
    if (!searchTerm) return true

    const expendAccount = typeof data.expend === 'string' ? data.expend : data.expend?.account || ''

    return [
      data.key.toLowerCase(),
      data.payee?.toLowerCase() ?? '',
      expendAccount.toLowerCase(),
      data.currency?.code?.toLowerCase() ?? ''
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
    const expendId = typeof lastEditedData.value.expend === 'object'
      ? lastEditedData.value.expend?.id
      : lastEditedData.value.expend

    ruleForm.value = {
      key: lastEditedData.value.key || '',
      payee: lastEditedData.value.payee ?? null,
      expend: typeof expendId === 'number' ? expendId : null,
      currency: lastEditedData.value.currency?.id || null
    };
  } else {
    // 没有编辑记录则重置
    ruleForm.value = {
      key: '',
      payee: null,
      expend: null,
      currency: null
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
  payee: null as string | null | undefined,
  expend: null as number | null | undefined,
  currency: null as number | null,
})

const rules = ref<FormRules>({
  key: [
    { required: true, message: '请输入关键字', trigger: 'blur' },
    { max: 16, message: '长度应控制在16个字符以内', trigger: 'blur' },
  ],
  payee: [
    { required: false, message: '', trigger: 'change' },
    { max: 32, message: '长度应控制在32个字符以内', trigger: 'blur' },
  ],
  expend: [
    { required: true, message: '请选择映射账户', trigger: 'change' },
  ],
  currency: [
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
          payee: ruleForm.value.payee,
          expend_id: ruleForm.value.expend, // 将 expend 转换为 expend_id
            currency: ruleForm.value.currency
        }

        console.log('提交数据:', submitData)

        axios({
          url: 'expense/',
          data: submitData,
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
}

// 导出
const handleExport = () => {
  const data = ExpenseData.value
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
  ruleForm.value.expend = typeof row.expend === 'object' ? row.expend?.id : (typeof row.expend === 'number' ? row.expend : null)
  ruleForm.value.currency = row.currency?.id || null
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
        // 转换字段名以匹配后端API
        const submitData = {
          key: ruleForm.value.key,
          payee: ruleForm.value.payee,
          expend_id: ruleForm.value.expend, // 将 expend 转换为 expend_id
            currency: ruleForm.value.currency
        }

        console.log('编辑提交数据:', submitData)

        axios({
          url: `expense/${selectedId.value}/`,
          data: submitData,
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
    ExpenseData.value = get.data
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
const handleSelectionChange = (selection: Expense[]) => {
  selectedItems.value = selection
}

// 批量启用
const handleBatchEnable = async () => {
  if (selectedItems.value.length === 0) return

  try {
    const promises = selectedItems.value.map(item =>
      axios.patch(`expense/${item.id}/`, { enable: true })
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
      axios.patch(`expense/${item.id}/`, { enable: false })
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
      axios.delete(`expense/${item.id}/`)
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
const advancedSort = (a: Expense, b: Expense): number => {
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
.expense-mapping {
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
  .expense-mapping {
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
