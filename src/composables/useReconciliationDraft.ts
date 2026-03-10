/**
 * 对账表单草稿持久化：按 taskId 存入 sessionStorage，防止误返回导致差额分配信息丢失。
 */
import { watch, ref, type Ref } from 'vue'
import type { ReconciliationFormData, TransactionItem } from '../types/reconciliation'

const DRAFT_KEY_PREFIX = 'reconciliation_draft_'
const DEBOUNCE_MS = 300

export interface ReconciliationDraft {
  actualBalance?: number
  currency: string
  reconciliationTiming: string
  transactionItems: Array<{
    account: string
    accountId?: number | null
    amount?: number | null
    date?: string | null
  }>
}

function getDraftKey(taskId: number): string {
  return `${DRAFT_KEY_PREFIX}${taskId}`
}

function hasSubstantialData(formData: ReconciliationFormData): boolean {
  if (formData.actualBalance !== undefined && formData.actualBalance !== null) return true
  const hasFilled = formData.transactionItems.some(
    (item: TransactionItem) =>
      (item.account && item.account.trim()) ||
      (item.amount !== undefined && item.amount !== null) ||
      (item.date != null)
  )
  return hasFilled
}

export function useReconciliationDraft(
  taskId: Ref<number | null>,
  formData: Ref<ReconciliationFormData>
) {
  const hasUnsavedData = ref(false)

  let debounceTimer: ReturnType<typeof setTimeout> | null = null

  function save() {
    const id = taskId.value
    if (id == null) return
    if (!hasSubstantialData(formData.value)) return
    const draft: ReconciliationDraft = {
      actualBalance: formData.value.actualBalance,
      currency: formData.value.currency,
      reconciliationTiming: formData.value.reconciliationTiming,
      transactionItems: formData.value.transactionItems.map((item: TransactionItem) => ({
        account: item.account || '',
        accountId: item.accountId ?? null,
        amount: item.amount ?? null,
        date: item.date ?? null
      }))
    }
    try {
      sessionStorage.setItem(getDraftKey(id), JSON.stringify(draft))
    } catch {
      // ignore quota / private mode
    }
  }

  watch(
    () => [formData.value.actualBalance, formData.value.currency, formData.value.reconciliationTiming, formData.value.transactionItems] as const,
    () => {
      hasUnsavedData.value = hasSubstantialData(formData.value)
      if (debounceTimer) clearTimeout(debounceTimer)
      debounceTimer = setTimeout(save, DEBOUNCE_MS)
    },
    { deep: true }
  )

  function getDraft(): ReconciliationDraft | null {
    const id = taskId.value
    if (id == null) return null
    try {
      const raw = sessionStorage.getItem(getDraftKey(id))
      if (!raw) return null
      return JSON.parse(raw) as ReconciliationDraft
    } catch {
      return null
    }
  }

  function clearDraft() {
    const id = taskId.value
    if (id == null) return
    try {
      sessionStorage.removeItem(getDraftKey(id))
    } catch {
      // ignore
    }
  }

  /** 立即保存草稿（清除防抖，离开前调用以确保最新状态已持久化） */
  function saveDraft() {
    if (debounceTimer) {
      clearTimeout(debounceTimer)
      debounceTimer = null
    }
    save()
  }

  function applyDraft(draft: ReconciliationDraft) {
    formData.value.actualBalance = draft.actualBalance
    formData.value.currency = draft.currency ?? formData.value.currency
    formData.value.reconciliationTiming = (draft.reconciliationTiming as ReconciliationFormData['reconciliationTiming']) ?? formData.value.reconciliationTiming
    if (draft.transactionItems && draft.transactionItems.length > 0) {
      formData.value.transactionItems = draft.transactionItems.map((item) => ({
        account: item.account || '',
        accountId: item.accountId ?? null,
        amount: item.amount !== undefined && item.amount !== null ? item.amount : undefined,
        date: item.date ?? null
      }))
    }
  }

  return {
    hasUnsavedData,
    getDraft,
    clearDraft,
    applyDraft,
    saveDraft
  }
}
