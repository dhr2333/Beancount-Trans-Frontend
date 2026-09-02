import axios from '../utils/request'
import { fetchWithAuth } from '../utils/request'
import type {
  AssistantChatRequest,
  AssistantChatResponse,
  AssistantFeedbackRequest,
  AssistantFeedbackResponse,
  AssistantSessionDetail,
  AssistantSessionSummary,
  AssistantStatus,
  AssistantStreamEvent,
} from '../types/assistant'

export function getAssistantStatus(): Promise<{ data: AssistantStatus }> {
  return axios.get('/assistant/status/')
}

export function listAssistantSessions(search = ''): Promise<{ data: AssistantSessionSummary[] }> {
  return axios.get('/assistant/sessions/', {
    params: search ? { search } : undefined,
  })
}

export function getAssistantSession(sessionId: string): Promise<{ data: AssistantSessionDetail }> {
  return axios.get(`/assistant/sessions/${sessionId}/`)
}

export function updateAssistantSessionTitle(
  sessionId: string,
  title: string,
): Promise<{ data: AssistantSessionDetail }> {
  return axios.patch(`/assistant/sessions/${sessionId}/`, { title })
}

export function deleteAssistantSession(sessionId: string): Promise<void> {
  return axios.delete(`/assistant/sessions/${sessionId}/`)
}

export function sendAssistantChat(
  request: AssistantChatRequest
): Promise<{ data: AssistantChatResponse }> {
  return axios.post('/assistant/chat/', request)
}

export function stopAssistantMessage(messageId: string): Promise<{ data: { detail: string } }> {
  return axios.post(`/assistant/messages/${messageId}/stop/`)
}

export function submitAssistantFeedback(
  request: AssistantFeedbackRequest
): Promise<{ data: AssistantFeedbackResponse }> {
  return axios.post('/assistant/feedback/', request)
}

/** SSE 空闲超时：超过该时间未收到任何帧则中止请求。 */
const ASSISTANT_STREAM_IDLE_TIMEOUT_MS = 90_000

function parseSseFrame(frame: string): AssistantStreamEvent | null {
  let eventType = 'message'
  let dataLine = ''

  for (const line of frame.split('\n')) {
    if (line.startsWith('event: ')) {
      eventType = line.slice(7).trim()
    } else if (line.startsWith('data: ')) {
      dataLine = line.slice(6)
    }
  }

  if (!dataLine) {
    return null
  }

  return {
    event: eventType,
    data: JSON.parse(dataLine),
  } as AssistantStreamEvent
}

async function consumeSseResponse(
  response: Response,
  onEvent: (event: AssistantStreamEvent) => void,
  signal: AbortSignal,
  idleTimeoutMs: number,
): Promise<void> {
  const streamController = new AbortController()
  let idleTimer: ReturnType<typeof setTimeout> | null = null

  const clearIdleTimer = () => {
    if (idleTimer) {
      clearTimeout(idleTimer)
      idleTimer = null
    }
  }

  const resetIdleTimer = () => {
    clearIdleTimer()
    idleTimer = setTimeout(() => {
      streamController.abort(new DOMException('响应超时，请重试', 'TimeoutError'))
    }, idleTimeoutMs)
  }

  const onParentAbort = () => {
    streamController.abort()
  }
  signal.addEventListener('abort', onParentAbort)

  const notifyEvent = (event: AssistantStreamEvent) => {
    resetIdleTimer()
    onEvent(event)
  }

  resetIdleTimer()

  try {
    if (!response.body) {
      throw new Error('流式响应不可用')
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) {
        break
      }

      buffer += decoder.decode(value, { stream: true })
      const frames = buffer.split('\n\n')
      buffer = frames.pop() || ''

      for (const frame of frames) {
        const trimmed = frame.trim()
        if (!trimmed) {
          continue
        }
        const event = parseSseFrame(trimmed)
        if (event) {
          notifyEvent(event)
        }
      }
    }

    const tail = buffer.trim()
    if (tail) {
      const event = parseSseFrame(tail)
      if (event) {
        notifyEvent(event)
      }
    }
  } finally {
    clearIdleTimer()
    signal.removeEventListener('abort', onParentAbort)
  }
}

export async function streamAssistantChat(
  request: AssistantChatRequest,
  onEvent: (event: AssistantStreamEvent) => void,
  signal?: AbortSignal,
  options?: { idleTimeoutMs?: number },
): Promise<void> {
  const idleTimeoutMs = options?.idleTimeoutMs ?? ASSISTANT_STREAM_IDLE_TIMEOUT_MS
  const streamController = new AbortController()
  const parentSignal = signal ?? streamController.signal

  const response = await fetchWithAuth('/assistant/chat/stream/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
    },
    body: JSON.stringify(request),
    signal: parentSignal,
  })

  if (!response.ok) {
    let detail = '发送失败，请稍后重试'
    try {
      const payload = await response.json()
      detail = payload.detail || detail
    } catch {
      // ignore JSON parse errors
    }
    const err = new Error(detail) as Error & { status?: number }
    err.status = response.status
    throw err
  }

  await consumeSseResponse(response, onEvent, parentSignal, idleTimeoutMs)
}

export async function reconnectAssistantStream(
  assistantMessageId: string,
  onEvent: (event: AssistantStreamEvent) => void,
  signal?: AbortSignal,
  options?: { idleTimeoutMs?: number },
): Promise<void> {
  const idleTimeoutMs = options?.idleTimeoutMs ?? ASSISTANT_STREAM_IDLE_TIMEOUT_MS
  const streamController = new AbortController()
  const parentSignal = signal ?? streamController.signal

  const response = await fetchWithAuth(
    `/assistant/chat/stream/${assistantMessageId}/`,
    {
      method: 'GET',
      headers: {
        Accept: 'text/event-stream',
      },
      signal: parentSignal,
    },
  )

  if (!response.ok) {
    let detail = '重连接失败，请稍后重试'
    try {
      const payload = await response.json()
      detail = payload.detail || detail
    } catch {
      // ignore JSON parse errors
    }
    throw new Error(detail)
  }

  await consumeSseResponse(response, onEvent, parentSignal, idleTimeoutMs)
}
