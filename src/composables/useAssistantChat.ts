import { ref, computed } from 'vue'
import { getAssistantStatus, sendAssistantChat } from '../api/assistant'
import type { AssistantStatus, ChatMessage } from '../types/assistant'

const EXAMPLE_QUESTIONS = [
  '本月总支出是多少？',
  '各资产账户余额是多少？',
  '最近有哪些大额消费？',
  '上个月餐饮花了多少？',
]

export function useAssistantChat() {
  const messages = ref<ChatMessage[]>([])
  const loading = ref(false)
  const status = ref<AssistantStatus | null>(null)
  const statusLoading = ref(false)
  const error = ref<string | null>(null)

  const canChat = computed(() => {
    if (!status.value) return false
    return status.value.api_key_configured && status.value.ledger_exists
  })

  const keySourceLabel = computed(() => {
    if (!status.value?.api_key_configured) return '未配置'
    if (status.value.api_key_source === 'user') return '用户 Key'
    if (status.value.api_key_source === 'platform') return '平台 Key'
    return '未配置'
  })

  async function fetchStatus() {
    statusLoading.value = true
    error.value = null
    try {
      const { data } = await getAssistantStatus()
      status.value = data
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string } } }
      error.value = err.response?.data?.detail || '获取助手状态失败'
    } finally {
      statusLoading.value = false
    }
  }

  async function send(content: string) {
    const text = content.trim()
    if (!text || loading.value) return

    messages.value.push({ role: 'user', content: text })
    loading.value = true
    error.value = null

    try {
      const payload = {
        messages: messages.value.map((m) => ({ role: m.role, content: m.content })),
        show_bql: false,
      }
      const { data } = await sendAssistantChat(payload)
      messages.value.push({
        role: 'assistant',
        content: data.reply,
        queries: data.queries,
      })
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string } } }
      const detail = err.response?.data?.detail || '发送失败，请稍后重试'
      error.value = detail
      messages.value.push({ role: 'assistant', content: detail })
    } finally {
      loading.value = false
    }
  }

  function clearMessages() {
    messages.value = []
    error.value = null
  }

  return {
    messages,
    loading,
    status,
    statusLoading,
    error,
    canChat,
    keySourceLabel,
    exampleQuestions: EXAMPLE_QUESTIONS,
    fetchStatus,
    send,
    clearMessages,
  }
}
