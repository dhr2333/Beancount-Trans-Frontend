import { ref, computed } from 'vue'
import { getAssistantStatus, streamAssistantChat } from '../api/assistant'
import type {
  AssistantStatus,
  AssistantStreamEvent,
  ChatMessage,
  QueryRecord,
} from '../types/assistant'

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
  let abortController: AbortController | null = null

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

  function getAssistantMessage(): ChatMessage | undefined {
    const last = messages.value[messages.value.length - 1]
    if (last?.role === 'assistant') {
      return last
    }
    return undefined
  }

  function appendQuery(record: QueryRecord) {
    const assistant = getAssistantMessage()
    if (!assistant) {
      return
    }
    if (!assistant.queries) {
      assistant.queries = []
    }
    const existing = assistant.queries.findIndex((q) => q.bql === record.bql)
    if (existing >= 0) {
      assistant.queries[existing] = record
    } else {
      assistant.queries.push(record)
    }
  }

  function handleStreamEvent(event: AssistantStreamEvent) {
    const assistant = getAssistantMessage()
    if (!assistant) {
      return
    }

    switch (event.event) {
      case 'status':
        assistant.status = event.data.phase
        break
      case 'tool_end':
        if (event.data.bql && event.data.result_preview) {
          appendQuery({
            bql: event.data.bql,
            result_preview: event.data.result_preview,
          })
        }
        break
      case 'delta':
        assistant.content += event.data.content
        assistant.status = 'writing'
        break
      case 'done':
        assistant.content = event.data.reply
        assistant.queries = event.data.queries
        assistant.streaming = false
        assistant.status = undefined
        break
      case 'error':
        assistant.content = event.data.detail
        assistant.streaming = false
        assistant.status = undefined
        error.value = event.data.detail
        break
      default:
        break
    }
  }

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

  function stop() {
    abortController?.abort()
    abortController = null
    loading.value = false
    const assistant = getAssistantMessage()
    if (assistant?.streaming) {
      assistant.streaming = false
      assistant.status = undefined
      if (!assistant.content.trim()) {
        assistant.content = '已停止生成'
      }
    }
  }

  async function send(content: string) {
    const text = content.trim()
    if (!text || loading.value) return

    messages.value.push({ role: 'user', content: text })
    messages.value.push({
      role: 'assistant',
      content: '',
      streaming: true,
      status: 'thinking',
      queries: [],
    })
    loading.value = true
    error.value = null

    abortController?.abort()
    abortController = new AbortController()

    try {
      const payload = {
        messages: messages.value
          .filter((m) => !m.streaming)
          .map((m) => ({ role: m.role, content: m.content })),
        show_bql: false,
      }

      await streamAssistantChat(
        payload,
        handleStreamEvent,
        abortController.signal,
      )

      const assistant = getAssistantMessage()
      if (assistant?.streaming) {
        assistant.streaming = false
        assistant.status = undefined
        if (!assistant.content.trim()) {
          assistant.content = '未收到完整回复，请重试'
        }
      }
    } catch (e: unknown) {
      if (e instanceof DOMException && e.name === 'AbortError') {
        return
      }
      const detail = e instanceof Error ? e.message : '发送失败，请稍后重试'
      error.value = detail
      const assistant = getAssistantMessage()
      if (assistant) {
        assistant.content = detail
        assistant.streaming = false
        assistant.status = undefined
      }
    } finally {
      loading.value = false
      abortController = null
    }
  }

  function clearMessages() {
    stop()
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
    stop,
    clearMessages,
  }
}
