<template>
  <div class="reconciliation-form">
    <el-card v-loading="loading">
      <template #header>
        <div class="card-header">
          <div class="header-content">
            <span class="header-title">对账</span>
            <span class="header-account">{{ accountName }}</span>
          </div>
        </div>
      </template>

      <div class="form-content">
        <!-- 基本信息区 -->
        <el-form :model="formData" label-width="100px" class="desktop-form">
          <el-form-item label="币种">
            <el-select v-model="formData.currency" @change="onCurrencyChange" style="width: 100%">
              <el-option v-for="balance in availableCurrencies" :key="balance.currency"
                :label="`${balance.currency} (余额: ${balance.expected_balance.toFixed(2)})`" :value="balance.currency" />
            </el-select>
          </el-form-item>

          <el-form-item label="对账时间点">
            <el-radio-group v-model="formData.reconciliationTiming">
              <el-radio label="end_of_day">当天最后一笔交易后</el-radio>
              <el-radio label="start_of_next_day">第二天第一笔交易前</el-radio>
            </el-radio-group>
          </el-form-item>

          <!-- 余额对比区（核心） -->
          <el-form-item label="余额对比">
            <div class="balance-comparison">
              <div class="balance-item">
                <div class="balance-label">预期余额</div>
                <div class="balance-value">{{ formData.expectedBalance.toFixed(2) }}</div>
              </div>
              <div class="balance-separator">→</div>
              <div class="balance-item">
                <div class="balance-label">实际余额</div>
                <el-input-number v-model="formData.actualBalance" :controls="false" :precision="2" placeholder="输入实际余额"
                  style="width: 100%" />
              </div>
              <div
                v-if="formData.actualBalance !== undefined && formData.actualBalance !== null && Math.abs(baseDifference) >= 0.01"
                class="difference-badge" :class="{ 'positive': baseDifference > 0, 'negative': baseDifference < 0 }">
                <div class="difference-main">
                  差额：{{ baseDifference > 0 ? '+' : '' }}{{ baseDifference.toFixed(2) }}
                </div>
                <div v-if="Math.abs(totalAllocated) >= 0.01" class="difference-detail">
                  已分配：{{ totalAllocated > 0 ? '+' : '' }}{{ totalAllocated.toFixed(2) }}
                  <span v-if="Math.abs(difference) > 0.01" class="remaining-hint">
                    （剩余：{{ difference > 0 ? '+' : '' }}{{ difference.toFixed(2) }}）
                  </span>
                  <span v-else-if="Math.abs(difference) <= 0.01" class="complete-hint">
                    ✓ 已完全分配
                  </span>
                </div>
                <div v-else class="difference-detail">
                  其他账户应分配：{{ -baseDifference > 0 ? '+' : '' }}{{ (-baseDifference).toFixed(2) }} 给当前账户
                </div>
              </div>
            </div>
          </el-form-item>
        </el-form>

        <!-- 差额分配区 -->
        <div class="allocation-section">
          <el-divider content-position="left">
            <span class="section-title">差额分配</span>
          </el-divider>
          <el-table :data="formData.transactionItems" border class="allocation-table">
            <el-table-column label="账户" min-width="300">
              <template #default="{ row }">
                <AccountSelector v-model="row.accountId" placeholder="选择账户" :show-details="false"
                  @change="(account) => handleAccountChange(row, account)" />
              </template>
            </el-table-column>
            <el-table-column label="金额" min-width="200">
              <template #default="{ row }">
                <el-input-number v-model="row.amount" :controls="false" :precision="2" placeholder="留空自动分配剩余金额"
                  style="width: 100%" />
              </template>
            </el-table-column>
            <el-table-column label="操作" width="120" align="center">
              <template #default="{ $index }">
                <el-button type="danger" size="small" text :disabled="formData.transactionItems.length === 1"
                  @click="removeItem($index)">
                  删除
                </el-button>
              </template>
            </el-table-column>
          </el-table>
          <div class="allocation-actions">
            <el-button type="primary" plain @click="addItem">
              + 添加账户
            </el-button>
          </div>
          <div v-if="validationErrors.length > 0" class="validation-errors">
            <p v-for="(error, i) in validationErrors" :key="i" class="error">
              {{ error }}
            </p>
          </div>
        </div>

        <!-- 操作按钮区 -->
        <div class="action-section">
          <el-button type="primary" @click="handleSubmit" :loading="submitting">
            提交
          </el-button>
          <el-button @click="$router.back()">返回</el-button>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { startReconciliation, executeReconciliation } from '../../api/reconciliation'
import AccountSelector from '../../components/common/AccountSelector.vue'
import type {
  ReconciliationFormData,
  TransactionItem,
  CurrencyBalance
} from '../../types/reconciliation'

const route = useRoute()
const router = useRouter()

const loading = ref(false)
const submitting = ref(false)
const accountName = ref('')
const availableCurrencies = ref<Array<{ currency: string, expected_balance: number }>>([])

const formData = ref<ReconciliationFormData>({
  expectedBalance: 0,
  actualBalance: undefined,
  currency: 'CNY',
  reconciliationTiming: 'end_of_day',
  transactionItems: [{ account: '', accountId: null, amount: undefined }]
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
    availableCurrencies.value = response.data.balances.map((b: CurrencyBalance) => ({
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
  // AccountSelector 组件会自动加载账户树，不需要手动加载
}

// 处理账户选择变化
function handleAccountChange(row: TransactionItem, account: any) {
  if (account && account.account) {
    row.account = account.account
  } else {
    row.account = ''
  }
}

function onCurrencyChange() {
  // 更新预期余额
  const balanceInfo = availableCurrencies.value.find(b => b.currency === formData.value.currency)
  formData.value.expectedBalance = balanceInfo?.expected_balance || 0
}

function addItem() {
  formData.value.transactionItems.push({
    account: '',
    accountId: null,
    amount: undefined
  })
}

function removeItem(index: number) {
  if (formData.value.transactionItems.length > 1) {
    formData.value.transactionItems.splice(index, 1)
  }
}

// 基础差额（实际余额 - 预期余额）
const baseDifference = computed(() => {
  const actualBalance = formData.value.actualBalance ?? 0
  return actualBalance - formData.value.expectedBalance
})

// 已分配的金额总和（保留符号）
// 在复式记账中：实际余额 + 差额分配 = 预期余额
// 所以：差额分配 = 预期余额 - 实际余额 = -基础差额
const totalAllocated = computed(() => {
  return formData.value.transactionItems
    .filter((item: TransactionItem) => item.amount !== undefined && item.amount !== null)
    .reduce((sum: number, item: TransactionItem) => sum + (item.amount || 0), 0)
})

// 剩余差额（-基础差额 - 已分配金额）
// 差额分配的总和应该等于 -基础差额，才能满足：实际余额 + 差额分配 = 预期余额
const difference = computed(() => {
  const targetAllocation = -baseDifference.value
  return targetAllocation - totalAllocated.value
})

const remainingAmount = computed(() => {
  return difference.value
})

const validationErrors = computed(() => {
  const errors: string[] = []

  // 如果无基础差额，不需要验证差额分配
  if (Math.abs(baseDifference.value) < 0.01) {
    return errors
  }

  // 检查是否有填写差额分配的条目
  const itemsWithAccount = formData.value.transactionItems.filter(
    (item: TransactionItem) => item.account
  )

  // 如果没有选择任何账户，不需要验证
  if (itemsWithAccount.length === 0) {
    return errors
  }

  // 检查所有选择的账户
  for (const item of itemsWithAccount) {
    if (!item.account) {
      errors.push('所有条目必须选择账户')
      break
    }
  }

  // 检查是否有多个账户金额为空（只允许一个账户金额为空，由后端自动分配）
  const emptyAmountCount = formData.value.transactionItems.filter(
    (item: TransactionItem) => item.account && (item.amount === undefined || item.amount === null)
  ).length

  if (emptyAmountCount > 1) {
    errors.push('只能有一个账户的金额为空（自动分配剩余差额）')
    return errors
  }

  // 如果没有自动分配账户（所有账户都填写了金额），需要验证金额总和是否匹配
  if (emptyAmountCount === 0) {
    const targetAllocation = -baseDifference.value
    if (Math.abs(totalAllocated.value - targetAllocation) > 0.01) {
      errors.push(`已分配金额与差额不匹配（基础差额：${baseDifference.value.toFixed(2)}，已分配：${totalAllocated.value.toFixed(2)}，应分配：${targetAllocation.toFixed(2)}）`)
    }
  }

  return errors
})

async function handleSubmit() {
  // 验证实际余额是否已填写
  if (formData.value.actualBalance === undefined || formData.value.actualBalance === null) {
    ElMessage.error('请输入实际余额')
    return
  }

  if (validationErrors.value.length > 0) {
    ElMessage.error('请修正表单错误')
    return
  }

  submitting.value = true
  try {
    const taskId = Number(route.params.id)

    // 准备交易条目，如果金额为空则设置 is_auto: true
    const validTransactionItems = formData.value.transactionItems
      .filter((item: TransactionItem) => item.account) // 只保留选择了账户的条目
      .map((item: TransactionItem) => {
        // 如果金额为空，设置 is_auto: true，amount: null
        if (item.amount === undefined || item.amount === null) {
          return {
            account: item.account,
            amount: null,
            is_auto: true
          }
        }
        // 如果金额不为空，正常提交
        return {
          account: item.account,
          amount: item.amount,
          is_auto: false
        }
      })

    // 根据对账时间点计算 as_of_date
    const today = new Date()
    let asOfDate: Date
    if (formData.value.reconciliationTiming === 'start_of_next_day') {
      // 第二天第一笔交易前：提前一天
      asOfDate = new Date(today)
      asOfDate.setDate(asOfDate.getDate() - 1)
    } else {
      // 当天最后一笔交易后：使用今天
      asOfDate = today
    }

    // 格式化为 YYYY-MM-DD
    const asOfDateStr = asOfDate.toISOString().split('T')[0]

    await executeReconciliation(taskId, {
      actual_balance: formData.value.actualBalance,
      currency: formData.value.currency,
      transaction_items: validTransactionItems,
      as_of_date: asOfDateStr
    })

    ElMessage.success('对账完成')
    router.push('/reconciliation')
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'response' in error) {
      const axiosError = error as {
        response?: {
          data?: {
            message?: string
            non_field_errors?: string[]
            error?: string
          }
        }
      }
      const errorData = axiosError.response?.data
      // 处理 DRF ValidationError 格式：优先使用 message，其次使用 non_field_errors，最后使用 error
      const errorMessage = errorData?.message ||
        (errorData?.non_field_errors && errorData.non_field_errors[0]) ||
        errorData?.error ||
        '对账失败'
      ElMessage.error(errorMessage)
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
  display: flex;
  justify-content: center;
  min-height: calc(100vh - 120px);

  :deep(.el-card) {
    width: 100%;
    max-width: 1200px;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  }

  .card-header {
    .header-content {
      display: flex;
      flex-direction: column;
      gap: 8px;

      .header-title {
        font-size: 16px;
        font-weight: 600;
        color: var(--ep-text-color-primary);
      }

      .header-account {
        font-size: 13px;
        color: var(--ep-text-color-regular);
        font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', 'Consolas', 'source-code-pro', monospace;
        word-break: break-all;
        line-height: 1.4;
      }
    }
  }

  .form-content {
    display: flex;
    flex-direction: column;
    gap: 32px;
  }

  // 桌面端表单样式
  .desktop-form {
    :deep(.el-form-item) {
      margin-bottom: 22px;
    }
  }

  // 余额对比区（核心）
  .balance-comparison {
    display: flex;
    align-items: center;
    gap: 20px;
    padding: 20px;
    background-color: var(--ep-fill-color-extra-light);
    border-radius: 8px;
    border: 1px solid var(--ep-border-color-lighter);
    position: relative;

    .balance-item {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 8px;

      .balance-label {
        font-size: 13px;
        color: var(--ep-text-color-regular);
        font-weight: 500;
      }

      .balance-value {
        font-size: 24px;
        color: var(--ep-color-primary);
        font-weight: 600;
        line-height: 1.4;
      }
    }

    .balance-separator {
      font-size: 20px;
      color: var(--ep-text-color-placeholder);
      font-weight: 500;
      flex-shrink: 0;
      padding: 0 8px;
    }

    .difference-badge {
      position: absolute;
      top: -12px;
      right: 20px;
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 13px;
      font-weight: 600;
      background: var(--ep-bg-color);
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
      border: 1px solid var(--ep-border-color-lighter);

      &.positive {
        color: var(--ep-color-success);
      }

      &.negative {
        color: var(--ep-color-danger);
      }

      .difference-main {
        font-weight: 600;
        margin-bottom: 4px;
      }

      .difference-detail {
        font-size: 12px;
        font-weight: 400;
        opacity: 0.8;
        margin-top: 4px;
      }

      .remaining-hint {
        color: var(--ep-color-warning);
      }

      .complete-hint {
        color: var(--ep-color-success);
      }
    }
  }

  // 差额分配区
  .allocation-section {
    .section-title {
      font-size: 15px;
      font-weight: 600;
      color: var(--ep-text-color-primary);
    }

    .allocation-table {
      margin-bottom: 16px;

      :deep(.el-table__cell) {
        padding: 12px 8px;
      }
    }

    .allocation-actions {
      display: flex;
      justify-content: flex-start;
      margin-bottom: 12px;
    }

    .validation-errors {
      margin-top: 12px;

      .error {
        color: var(--ep-color-danger);
        margin: 6px 0;
        font-size: 14px;
        line-height: 1.5;
      }
    }
  }

  // 操作按钮区
  .action-section {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
    padding-top: 16px;
    border-top: 1px solid var(--ep-border-color-lighter);
  }

  // 响应式设计
  @media (max-width: 768px) {
    padding: 12px;

    :deep(.el-card) {
      max-width: 100%;
    }

    .balance-comparison {
      flex-direction: column;
      gap: 16px;
      padding: 16px;

      .balance-separator {
        transform: rotate(90deg);
        padding: 8px 0;
      }

      .difference-badge {
        position: static;
        align-self: flex-start;
        margin-top: 8px;
      }
    }

    .card-header {
      .header-content {
        .header-account {
          font-size: 12px;
        }
      }
    }
  }

  // 暗色模式样式
  :deep(html.dark) :deep(.el-card) {
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.45);
  }

  :deep(html.dark) .balance-comparison {
    background-color: var(--ep-fill-color-darker);
    border-color: var(--ep-border-color);
  }

  :deep(html.dark) .difference-badge {
    background: var(--ep-bg-color);
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.35);
    border-color: var(--ep-border-color);
  }
}
</style>
