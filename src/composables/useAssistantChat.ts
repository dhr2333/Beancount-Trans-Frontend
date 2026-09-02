import { ref, computed, watch, type Ref } from 'vue'
import { ElMessage } from 'element-plus'
import type { Router } from 'vue-router'
import {
  getAssistantSession,
  getAssistantStatus,
  reconnectAssistantStream,
  stopAssistantMessage,
  streamAssistantChat,
  submitAssistantFeedback,
} from '../api/assistant'
import {
  INTERRUPTED_REPLY,
  type AssistantFeedbackRating,
  type AssistantStatus,
  type AssistantStreamEvent,
  type ChatMessage,
  type QueryRecord,
  type StoredChatMessage,
} from '../types/assistant'

const EXAMPLE_QUESTIONS = [
  '提供一份消费洞察',
  '有什么令人意外的消费发现？',
  '帮我写一份月度总结',
  '最近有哪些大额消费？',
]

function createMessageId(): string {
  return crypto.randomUUID()
}

function mapStoredMessage(message: StoredChatMessage): ChatMessage {
  const isGenerating = message.generation_status === 'generating'
  return {
    id: message.id,
    role: message.role,
    content: message.content,
    thinking: message.thinking || '',
    reasoning: message.reasoning || '',
    thinkingExpanded: isGenerating,
    queries: message.queries || [],
    feedback: message.feedback,
    streaming: isGenerating,
    status: isGenerating ? 'thinking' : undefined,
  }
}

export function useAssistantChat(options: {
  sessionId: Ref<string | undefined>
  router: Router
  onSessionsChanged?: () => void
}) {
  const { sessionId, router, onSessionsChanged } = options

  const messages = ref<ChatMessage[]>([])
  const loading = ref(false)
  const sessionLoading = ref(false)
  const deepThink = ref(false)
  const status = ref<AssistantStatus | null>(null)
  const statusLoading = ref(false)
  const error = ref<string | null>(null)
  let abortController: AbortController | null = null
  let activeRequestId = 0
  let userStopRequested = false

  const canChat = computed(() => {
    if (statusLoading.value) return false
    if (!status.value) return false
    return status.value.api_key_configured && status.value.ledger_exists
  })

  const deepThinkSupported = computed(() => status.value?.deep_think_supported ?? false)

  function getAssistantMessage(): ChatMessage | undefined {
    const last = messages.value[messages.value.length - 1]
    if (last?.role === 'assistant') {
      return last
    }
    return undefined
  }

  function getLastUserMessage(): ChatMessage | undefined {
    for (let i = messages.value.length - 1; i >= 0; i -= 1) {
      if (messages.value[i].role === 'user') {
        return messages.value[i]
      }
    }
    return undefined
  }

  function findUserMessageBefore(index: number): string {
    for (let i = index - 1; i >= 0; i -= 1) {
      const message = messages.value[i]
      if (message.role === 'user') {
        return message.content
      }
    }
    return ''
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
    switch (event.event) {
      case 'session': {
        const userMessage = getLastUserMessage()
        if (userMessage) {
          userMessage.id = event.data.user_message_id
        }
        const assistant = getAssistantMessage()
        if (assistant && event.data.assistant_message_id) {
          assistant.id = event.data.assistant_message_id
        }
        if (!sessionId.value) {
          router.replace(`/assistant/${event.data.id}`)
        }
        onSessionsChanged?.()
        break
      }
      case 'status': {
        const assistant = getAssistantMessage()
        if (assistant) {
          assistant.status = event.data.phase
        }
        break
      }
      case 'reasoning_delta': {
        const assistant = getAssistantMessage()
        if (!assistant) break
        assistant.reasoning = (assistant.reasoning || '') + event.data.content
        assistant.thinking = (assistant.thinking || '') + event.data.content
        assistant.thinkingExpanded = true
        break
      }
      case 'thinking_set': {
        const assistant = getAssistantMessage()
        if (!assistant) break
        assistant.thinking = event.data.content
        assistant.reasoning = event.data.reasoning ?? ''
        break
      }
      case 'tool_end':
        if (event.data.bql && event.data.result_preview) {
          appendQuery({
            bql: event.data.bql,
            result_preview: event.data.result_preview,
          })
        }
        break
      case 'delta': {
        const assistant = getAssistantMessage()
        if (!assistant) break
        assistant.content += event.data.content
        assistant.status = 'writing'
        assistant.thinkingExpanded = false
        break
      }
      case 'done': {
        const assistant = getAssistantMessage()
        if (!assistant) break
        assistant.content = event.data.reply
        assistant.queries = event.data.queries
        assistant.thinking = event.data.thinking || assistant.thinking || ''
        assistant.reasoning = event.data.reasoning || assistant.reasoning || ''
        assistant.streaming = false
        assistant.status = undefined
        assistant.thinkingExpanded = false
        if (event.data.assistant_message_id) {
          assistant.id = event.data.assistant_message_id
        }
        if (event.data.user_message_id) {
          const userMessage = getLastUserMessage()
          if (userMessage) {
            userMessage.id = event.data.user_message_id
          }
        }
        onSessionsChanged?.()
        break
      }
      case 'error': {
        const assistant = getAssistantMessage()
        if (assistant) {
          if (!assistant.content.trim()) {
            assistant.content = event.data.detail
          }
          assistant.streaming = false
          assistant.status = undefined
        }
        error.value = event.data.detail
        break
      }
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

  async function subscribeStream(
    assistantMessageId: string,
    requestId: number,
    mode: 'send' | 'reconnect',
  ) {
    abortController?.abort()
    abortController = new AbortController()

    try {
      const subscribe = mode === 'reconnect'
        ? reconnectAssistantStream
        : null

      if (subscribe) {
        await subscribe(
          assistantMessageId,
          handleStreamEvent,
          abortController.signal,
        )
      }
    } catch (e: unknown) {
      if (requestId !== activeRequestId) {
        return
      }

      if (e instanceof DOMException && (e.name === 'AbortError' || e.name === 'TimeoutError')) {
        const assistant = getAssistantMessage()
        if (assistant?.streaming) {
          assistant.streaming = false
          assistant.status = undefined
        }
        return
      }

      const detail = e instanceof Error ? e.message : '连接失败，请稍后重试'
      error.value = detail
    } finally {
      if (requestId === activeRequestId) {
        loading.value = false
        abortController = null
        const assistant = getAssistantMessage()
        if (assistant?.streaming) {
          assistant.streaming = false
          assistant.status = undefined
        }
      }
    }
  }

  async function loadSession(id: string) {
    sessionLoading.value = true
    error.value = null
    try {
      const { data } = await getAssistantSession(id)
      messages.value = data.messages.map(mapStoredMessage)

      const last = messages.value[messages.value.length - 1]
      if (last?.role === 'assistant' && last.streaming && last.id) {
        const requestId = ++activeRequestId
        loading.value = true
        await subscribeStream(last.id, requestId, 'reconnect')
      }
    } catch (e: unknown) {
      const err = e as { response?: { status?: number; data?: { detail?: string } } }
      if (err.response?.status === 404) {
        ElMessage.warning('会话不存在或无权访问')
        router.replace('/assistant')
      } else {
        error.value = err.response?.data?.detail || '加载会话失败'
      }
      messages.value = []
    } finally {
      sessionLoading.value = false
    }
  }

  watch(
    sessionId,
    async (id, previousId) => {
      if (id === previousId) {
        return
      }

      // 首条消息创建会话并 replace URL 时，保持本地流式状态，不从服务端覆盖
      if (loading.value && !previousId && id) {
        return
      }

      if (loading.value) {
        abortSubscription()
      }
      if (!id) {
        if (previousId) {
          messages.value = []
        }
        return
      }
      await loadSession(id)
    },
    { immediate: true },
  )

  function abortSubscription() {
    abortController?.abort()
    abortController = null
    activeRequestId += 1
  }

  async function stop() {
    userStopRequested = true
    const assistant = getAssistantMessage()
    const messageId = assistant?.id

    abortSubscription()

    if (assistant?.streaming) {
      assistant.streaming = false
      assistant.status = undefined
      if (messageId) {
        try {
          await stopAssistantMessage(messageId)
        } catch {
          // 停止请求失败时仍保留本地已展示内容
        }
      }
      if (!assistant.content.trim()) {
        assistant.content = '已停止生成'
      }
    }
    loading.value = false
  }

  async function send(content: string, options?: { editMessageId?: string }): Promise<boolean> {
    const text = content.trim()
    if (!text || loading.value) {
      return false
    }

    const editMessageId = options?.editMessageId
    if (editMessageId) {
      if (!sessionId.value) {
        ElMessage.error('当前会话尚未保存，无法编辑历史消息')
        return false
      }
      const editIndex = messages.value.findIndex(
        (message) => message.id === editMessageId && message.role === 'user',
      )
      if (editIndex < 0) {
        ElMessage.error('要编辑的消息不存在')
        return false
      }
      messages.value = messages.value.slice(0, editIndex + 1)
      messages.value[editIndex].content = text
    }

    const requestId = ++activeRequestId
    userStopRequested = false

    if (!editMessageId) {
      messages.value.push({
        id: createMessageId(),
        role: 'user',
        content: text,
      })
    }
    messages.value.push({
      id: createMessageId(),
      role: 'assistant',
      content: '',
      thinking: '',
      reasoning: '',
      thinkingExpanded: true,
      streaming: true,
      status: 'thinking',
      queries: [],
      feedback: null,
    })
    loading.value = true
    error.value = null

    abortController?.abort()
    abortController = new AbortController()

    try {
      const payload = {
        session_id: sessionId.value,
        content: text,
        show_bql: false,
        deep_think: deepThink.value,
        ...(editMessageId ? { edit_message_id: editMessageId } : {}),
      }

      await streamAssistantChat(
        payload,
        handleStreamEvent,
        abortController.signal,
      )

      if (requestId !== activeRequestId) {
        return true
      }

      const assistant = getAssistantMessage()
      if (assistant?.streaming) {
        assistant.streaming = false
        assistant.status = undefined
        if (!assistant.content.trim()) {
          const incompleteMessage = '未收到完整回复，请重试'
          assistant.content = incompleteMessage
          error.value = incompleteMessage
        }
      }
      return true
    } catch (e: unknown) {
      if (requestId !== activeRequestId) {
        return true
      }

      if (e instanceof DOMException && (e.name === 'AbortError' || e.name === 'TimeoutError')) {
        const assistant = getAssistantMessage()
        if (assistant) {
          assistant.streaming = false
          assistant.status = undefined
          if (!assistant.content.trim() && userStopRequested) {
            assistant.content = '已停止生成'
          } else if (!assistant.content.trim()) {
            const timeoutMessage = e.message || '响应超时，请重试'
            assistant.content = timeoutMessage
            error.value = timeoutMessage
          }
        }
        return true
      }

      const err = e as Error & { status?: number }
      let detail = err.message || '发送失败，请稍后重试'
      if (err.status === 409) {
        detail = detail || '上一轮回复仍在生成中，请稍候或停止后再试'
      }
      error.value = detail
      ElMessage.warning(detail)

      const assistant = getAssistantMessage()
      if (assistant) {
        messages.value.pop()
        if (!editMessageId) {
          const lastUser = getLastUserMessage()
          if (lastUser && !lastUser.id) {
            messages.value.pop()
          }
        }
        assistant.streaming = false
        assistant.status = undefined
      }
      return false
    } finally {
      if (requestId === activeRequestId) {
        loading.value = false
        abortController = null
      }
    }
  }

  async function submitFeedback(
    messageIndex: number,
    rating: AssistantFeedbackRating,
    comment = '',
  ) {
    const message = messages.value[messageIndex]
    if (!message || message.role !== 'assistant' || message.streaming || !message.id) {
      return
    }

    const nextRating = message.feedback === rating ? null : rating
    message.feedbackSubmitting = true

    try {
      const { data } = await submitAssistantFeedback({
        message_id: message.id,
        rating: nextRating,
        user_message: findUserMessageBefore(messageIndex),
        assistant_reply: message.content,
        queries: message.queries || [],
        comment: nextRating === 'dislike' ? comment : '',
      })
      message.feedback = data.rating
      ElMessage.success(nextRating ? '感谢你的反馈' : '已取消评价')
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string } } }
      ElMessage.error(err.response?.data?.detail || '提交反馈失败')
    } finally {
      message.feedbackSubmitting = false
    }
  }

  function isInterruptedAssistant(message: ChatMessage | undefined): boolean {
    if (!message || message.role !== 'assistant' || message.streaming) {
      return false
    }
    const text = message.content.trim()
    return !text || text === INTERRUPTED_REPLY
  }

  async function retryFromAssistant(index: number): Promise<boolean> {
    for (let i = index - 1; i >= 0; i -= 1) {
      const message = messages.value[i]
      if (message.role === 'user' && message.id) {
        return send(message.content, { editMessageId: message.id })
      }
    }
    ElMessage.error('找不到可重新生成的用户消息')
    return false
  }

  function startNewChat() {
    abortSubscription()
    messages.value = []
    error.value = null
    loading.value = false
    if (sessionId.value) {
      router.push('/assistant')
    }
  }

  return {
    messages,
    loading,
    sessionLoading,
    deepThink,
    status,
    statusLoading,
    error,
    canChat,
    deepThinkSupported,
    exampleQuestions: EXAMPLE_QUESTIONS,
    fetchStatus,
    send,
    stop,
    abortSubscription,
    submitFeedback,
    startNewChat,
    loadSession,
    isInterruptedAssistant,
    retryFromAssistant,
  }
}
