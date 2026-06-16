import axios from '../utils/request'
import type {
  AssistantChatRequest,
  AssistantChatResponse,
  AssistantStatus
} from '../types/assistant'

export function getAssistantStatus(): Promise<{ data: AssistantStatus }> {
  return axios.get('/assistant/status/')
}

export function sendAssistantChat(
  request: AssistantChatRequest
): Promise<{ data: AssistantChatResponse }> {
  return axios.post('/assistant/chat/', request)
}
