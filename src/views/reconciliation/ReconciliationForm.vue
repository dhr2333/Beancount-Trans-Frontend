<template>
  <div class="reconciliation-form">
    <el-card v-loading="loading">
      <template #header>
        <div class="card-header">
          <span>对账</span>
          <el-button @click="$router.back()">返回</el-button>
        </div>
      </template>

      <el-form :model="formData" label-width="120px">
        <el-form-item label="账户">
          <el-input v-model="accountName" readonly />
        </el-form-item>

        <el-form-item label="币种">
          <el-select 
            v-model="formData.currency" 
            @change="onCurrencyChange"
            style="width: 100%"
          >
            <el-option
              v-for="balance in availableCurrencies"
              :key="balance.currency"
              :label="`${balance.currency} (余额: ${balance.expected_balance.toFixed(2)})`"
              :value="balance.currency"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="预期余额">
          <el-input-number
            v-model="formData.expectedBalance"
            :controls="false"
            :precision="2"
            readonly
          />
        </el-form-item>

        <el-form-item label="实际余额">
          <el-input-number
            v-model="formData.actualBalance"
            :controls="false"
            :precision="2"
            placeholder="请输入实际余额"
            @input="onActualBalanceChange"
          />
        </el-form-item>

        <el-form-item label="差额">
          <el-input-number
            v-model="formData.difference"
            :controls="false"
            :precision="2"
            readonly
            :class="{ 'negative': formData.difference < 0 }"
          />
          <span v-if="formData.difference !== 0" class="difference-hint">
            {{ formData.difference > 0 ? '多出' : '缺少' }} {{ Math.abs(formData.difference).toFixed(2) }} 元
          </span>
        </el-form-item>

        <!-- 有差额时显示动态表单 -->
        <div v-if="formData.difference !== 0" class="transaction-items">
          <el-divider content-position="left">差额分配</el-divider>

          <div
            v-for="(item, index) in formData.transactionItems"
            :key="index"
            class="transaction-item"
          >
            <el-form-item :label="`条目 ${index + 1}`">
              <div class="item-row">
                <el-select
                  v-model="item.account"
                  placeholder="选择账户"
                  filterable
                  style="width: 200px; margin-right: 10px"
                >
                  <el-option
                    v-for="acc in availableAccounts"
                    :key="acc.account"
                    :label="acc.account"
                    :value="acc.account"
                  />
                </el-select>

                <el-input-number
                  v-model="item.amount"
                  :controls="false"
                  :precision="2"
                  :disabled="item.is_auto"
                  placeholder="金额（留空自动计算）"
                  style="width: 180px; margin-right: 10px"
                />

                <el-checkbox
                  v-model="item.is_auto"
                  @change="handleAutoChange(index)"
                >
                  自动计算
                </el-checkbox>

                <el-button
                  type="danger"
                  size="small"
                  :disabled="formData.transactionItems.length === 1"
                  @click="removeItem(index)"
                  style="margin-left: 10px"
                >
                  删除
                </el-button>
              </div>
            </el-form-item>
          </div>

          <el-button type="primary" plain @click="addItem">
            + 添加账户
          </el-button>

          <div class="validation-summary">
            <p>已分配：{{ totalAllocated.toFixed(2) }} 元</p>
            <p>剩余差额：{{ remainingAmount.toFixed(2) }} 元</p>
            <p v-if="validationErrors.length > 0" class="error">
              <span v-for="(error, i) in validationErrors" :key="i">
                {{ error }}<br />
              </span>
            </p>
          </div>
        </div>

        <el-form-item>
          <el-button type="primary" @click="handleSubmit" :loading="submitting">
            提交对账
          </el-button>
          <el-button @click="$router.back()">取消</el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { startReconciliation, executeReconciliation } from '../../api/reconciliation'
import type {
  ReconciliationFormData,
  TransactionItem
} from '../../types/reconciliation'

const route = useRoute()
const router = useRouter()

const loading = ref(false)
const submitting = ref(false)
const accountName = ref('')
const availableAccounts = ref<Array<{ account: string }>>([])
const availableCurrencies = ref<Array<{ currency: string, expected_balance: number }>>([])

const formData = ref<ReconciliationFormData>({
  expectedBalance: 0,
  actualBalance: 0,
  currency: 'CNY',
  difference: 0,
  transactionItems: []
})

onMounted(async () => {
  await loadReconciliationData()
  await loadAccounts()
})

async function loadReconciliationData() {
  loading.value = true
  try {
    const taskId = Number(route.params.id)
    const response = await startReconciliation(taskId)
    
    // 存储所有币种余额
    availableCurrencies.value = response.data.balances.map(b => ({
      currency: b.currency,
      expected_balance: parseFloat(b.expected_balance)
    }))
    
    // 使用默认币种或第一个币种
    const defaultCurrency = response.data.default_currency || 
      (availableCurrencies.value.length > 0 ? availableCurrencies.value[0].currency : 'CNY')
    
    formData.value.currency = defaultCurrency
    
    // 设置对应币种的预期余额
    const balanceInfo = availableCurrencies.value.find(b => b.currency === defaultCurrency)
    formData.value.expectedBalance = balanceInfo?.expected_balance || 0
    
    accountName.value = response.data.account_name
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'response' in error) {
      const axiosError = error as { response?: { data?: { message?: string } } }
      ElMessage.error(axiosError.response?.data?.message || '加载对账数据失败')
    } else {
      ElMessage.error('网络错误，请稍后重试')
    }
    router.back()
  } finally {
    loading.value = false
  }
}

async function loadAccounts() {
  try {
    // TODO: 调用账户 API 获取账户列表
    // 临时使用空数组
    availableAccounts.value = []
  } catch (error: unknown) {
    // Ignore
  }
}

function onCurrencyChange() {
  // 更新预期余额
  const balanceInfo = availableCurrencies.value.find(b => b.currency === formData.value.currency)
  formData.value.expectedBalance = balanceInfo?.expected_balance || 0
  
  // 重新计算差额
  if (formData.value.actualBalance !== 0) {
    formData.value.difference = formData.value.actualBalance - formData.value.expectedBalance
    
    // 有差额时初始化一个空条目
    if (formData.value.difference !== 0 && formData.value.transactionItems.length === 0) {
      formData.value.transactionItems = [{ account: '', amount: null, is_auto: false }]
    } else if (formData.value.difference === 0) {
      formData.value.transactionItems = []
    }
  }
}

function onActualBalanceChange() {
  formData.value.difference = formData.value.actualBalance - formData.value.expectedBalance
  
  // 有差额时初始化一个空条目
  if (formData.value.difference !== 0 && formData.value.transactionItems.length === 0) {
    formData.value.transactionItems = [{ account: '', amount: null, is_auto: false }]
  } else if (formData.value.difference === 0) {
    formData.value.transactionItems = []
  }
}

function addItem() {
  formData.value.transactionItems.push({
    account: '',
    amount: null,
    is_auto: false
  })
}

function removeItem(index: number) {
  if (formData.value.transactionItems.length > 1) {
    formData.value.transactionItems.splice(index, 1)
  }
}

function handleAutoChange(index: number) {
  const item = formData.value.transactionItems[index]
  if (item.is_auto) {
    // 取消其他条目的自动计算标记
    formData.value.transactionItems.forEach((it, i) => {
      if (i !== index) {
        it.is_auto = false
      }
    })
    // 清空金额
    item.amount = null
  }
}

const totalAllocated = computed(() => {
  return formData.value.transactionItems
    .filter(item => !item.is_auto && item.amount !== null)
    .reduce((sum, item) => sum + (item.amount || 0), 0)
})

const remainingAmount = computed(() => {
  return formData.value.difference - totalAllocated.value
})

const validationErrors = computed(() => {
  const errors: string[] = []
  
  if (formData.value.difference === 0) {
    return errors
  }
  
  // 检查每个条目都有账户
  for (const item of formData.value.transactionItems) {
    if (!item.account) {
      errors.push('所有条目必须选择账户')
      break
    }
  }
  
  // 检查自动计算唯一性
  const autoItems = formData.value.transactionItems.filter(item => item.is_auto)
  if (autoItems.length > 1) {
    errors.push('只能有一个条目标记为自动计算')
  }
  
  // 检查金额总和
  if (autoItems.length === 0) {
    // 模式A：全部填写金额
    if (Math.abs(totalAllocated.value - formData.value.difference) > 0.01) {
      errors.push(`已分配金额与差额不匹配`)
    }
  } else {
    // 模式B：一个自动计算
    if (totalAllocated.value >= Math.abs(formData.value.difference)) {
      errors.push('已分配金额不能大于等于差额绝对值')
    }
  }
  
  return errors
})

async function handleSubmit() {
  if (validationErrors.value.length > 0) {
    ElMessage.error('请修正表单错误')
    return
  }
  
  submitting.value = true
  try {
    const taskId = Number(route.params.id)
    await executeReconciliation(taskId, {
      actual_balance: formData.value.actualBalance,
      currency: formData.value.currency,
      transaction_items: formData.value.transactionItems
    })
    
    ElMessage.success('对账完成')
    router.push('/reconciliation')
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'response' in error) {
      const axiosError = error as { response?: { data?: { message?: string } } }
      ElMessage.error(axiosError.response?.data?.message || '对账失败')
    } else {
      ElMessage.error('网络错误，请稍后重试')
    }
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped lang="scss">
.reconciliation-form {
  padding: 20px;

  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .negative {
    :deep(.el-input__inner) {
      color: #f56c6c;
    }
  }

  .difference-hint {
    margin-left: 10px;
    color: #909399;
  }

  .transaction-items {
    margin-top: 20px;

    .transaction-item {
      .item-row {
        display: flex;
        align-items: center;
      }
    }

    .validation-summary {
      margin-top: 20px;
      padding: 15px;
      background-color: #f4f4f5;
      border-radius: 4px;

      p {
        margin: 5px 0;
      }

      .error {
        color: #f56c6c;
      }
    }
  }
}
</style>


