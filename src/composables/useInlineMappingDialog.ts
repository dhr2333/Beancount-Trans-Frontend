import { ref, computed } from 'vue'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import axios from '../utils/request'

export type MappingType = 'expense' | 'income'

interface MappingListItem {
  id: number
  key: string
  payee?: string | null
  payer?: string | null
  expend?: { id: number } | number | null
  income?: { id: number } | number | null
}

export interface OpenMappingOptions<T> {
  row: T
  inferType: (row: T) => MappingType
  getSelectedKey: (row: T) => string | undefined
  getCreateDefaults: (row: T) => { key: string; party: string; type: MappingType }
  onReparse: (key: string) => Promise<void>
  requireAuth?: () => boolean
}

function accountIdFromMapping(item: MappingListItem, type: MappingType): number | null {
  const field = type === 'expense' ? item.expend : item.income
  if (field == null) return null
  if (typeof field === 'number') return field
  return field.id ?? null
}

function partyFromMapping(item: MappingListItem, type: MappingType): string {
  if (type === 'expense') return item.payee ?? ''
  return item.payer ?? ''
}

async function fetchMappingByKey(type: MappingType, key: string): Promise<MappingListItem | null> {
  const endpoint = type === 'expense' ? 'expense/' : 'income/'
  const response = await axios.get<MappingListItem[]>(endpoint)
  const list = Array.isArray(response.data) ? response.data : []
  return list.find((m) => m.key === key) ?? null
}

export function useInlineMappingDialog() {
  const mappingFormRef = ref<FormInstance>()
  const mappingDialog = ref({
    visible: false,
    loading: false,
    mode: 'create' as 'create' | 'edit',
    mappingId: null as number | null,
    keyDisabled: false
  })

  const mappingForm = ref({
    type: 'expense' as MappingType,
    key: '',
    accountId: null as number | null,
    party: ''
  })

  const mappingRules: FormRules = {
    key: [{ required: true, message: '请输入关键字', trigger: 'blur' }],
    accountId: [{ required: true, message: '请选择映射账户', trigger: 'change' }]
  }

  const mappingDialogTitle = computed(() =>
    mappingDialog.value.mode === 'edit' ? '编辑映射' : '新增映射'
  )

  let reparseAfterSave: ((key: string) => Promise<void>) | null = null

  const checkAuth = (requireAuth?: () => boolean): boolean => {
    if (requireAuth && !requireAuth()) {
      ElMessage.info('未认证，请登录后重试')
      return false
    }
    return true
  }

  const openForCreate = <T>(options: OpenMappingOptions<T>) => {
    if (!checkAuth(options.requireAuth)) return

    const defaults = options.getCreateDefaults(options.row)
    mappingForm.value = {
      type: defaults.type,
      key: defaults.key,
      accountId: null,
      party: defaults.party
    }
    mappingDialog.value = {
      visible: true,
      loading: false,
      mode: 'create',
      mappingId: null,
      keyDisabled: false
    }
    reparseAfterSave = options.onReparse
  }

  const openForEdit = async <T>(options: OpenMappingOptions<T>) => {
    const key = options.getSelectedKey(options.row)?.trim()
    if (!key) return
    if (!checkAuth(options.requireAuth)) return

    const type = options.inferType(options.row)
    reparseAfterSave = options.onReparse

    mappingDialog.value.loading = true
    mappingDialog.value.visible = true

    try {
      const mapping = await fetchMappingByKey(type, key)
      if (mapping) {
        mappingForm.value = {
          type,
          key: mapping.key,
          accountId: accountIdFromMapping(mapping, type),
          party: partyFromMapping(mapping, type)
        }
        mappingDialog.value = {
          visible: true,
          loading: false,
          mode: 'edit',
          mappingId: mapping.id,
          keyDisabled: true
        }
      } else {
        ElMessage.info('未找到映射，将创建新映射')
        mappingForm.value = {
          type,
          key,
          accountId: null,
          party: ''
        }
        mappingDialog.value = {
          visible: true,
          loading: false,
          mode: 'create',
          mappingId: null,
          keyDisabled: true
        }
      }
    } catch {
      ElMessage.error('加载映射失败')
      mappingDialog.value.visible = false
    } finally {
      mappingDialog.value.loading = false
    }
  }

  const openEditCurrentMapping = <T>(options: OpenMappingOptions<T>) => {
    void openForEdit(options)
  }

  const handleMappingSubmit = async () => {
    if (!mappingFormRef.value) return

    try {
      await mappingFormRef.value.validate()
    } catch {
      return
    }

    if (!reparseAfterSave) return

    mappingDialog.value.loading = true
    const { type, key, accountId, party } = mappingForm.value
    const selectedKey = key.trim()

    try {
      if (mappingDialog.value.mode === 'edit' && mappingDialog.value.mappingId != null) {
        if (type === 'expense') {
          await axios.put(`expense/${mappingDialog.value.mappingId}/`, {
            key: selectedKey,
            expend_id: accountId,
            payee: party,
            currency: 'CNY'
          })
        } else {
          await axios.put(`income/${mappingDialog.value.mappingId}/`, {
            key: selectedKey,
            income_id: accountId,
            payer: party
          })
        }
        ElMessage.success('映射更新成功')
      } else {
        if (type === 'expense') {
          await axios.post('/expense/', {
            key: selectedKey,
            expend_id: accountId,
            payee: party,
            currency: 'CNY'
          })
        } else {
          await axios.post('/income/', {
            key: selectedKey,
            income_id: accountId,
            payer: party
          })
        }
        ElMessage.success('映射创建成功')
      }

      try {
        await reparseAfterSave(selectedKey)
        ElMessage.success('重解析完成')
        mappingDialog.value.visible = false
      } catch (reparseError: unknown) {
        const err = reparseError as { response?: { data?: { error?: string } } }
        ElMessage.error(err.response?.data?.error || '重新解析失败，请手动重试')
      }
    } catch (error: unknown) {
      const err = error as {
        response?: { status?: number; data?: { non_field_errors?: string[]; error?: string } }
      }
      if (err.response?.status === 400 && err.response.data?.non_field_errors) {
        ElMessage.error(err.response.data.non_field_errors[0])
      } else if (err.response?.status === 401) {
        ElMessage.info('未认证，请登录后重试')
      } else if (err.response?.status === 403) {
        ElMessage.info('权限不足，请登录后重试')
      } else {
        ElMessage.error(
          err.response?.data?.error ||
            (mappingDialog.value.mode === 'edit' ? '更新映射失败' : '创建映射失败')
        )
      }
    } finally {
      mappingDialog.value.loading = false
    }
  }

  return {
    mappingFormRef,
    mappingDialog,
    mappingForm,
    mappingRules,
    mappingDialogTitle,
    openForCreate,
    openForEdit,
    openEditCurrentMapping,
    handleMappingSubmit
  }
}
