import { ElMessage } from 'element-plus'
import type { AssistantShareTurn, ChatMessage } from '../types/assistant'

export const MAX_SHARE_TURNS = 10

function findUserMessageBefore(messages: ChatMessage[], index: number): string {
  for (let i = index - 1; i >= 0; i -= 1) {
    const message = messages[i]
    if (message.role === 'user') {
      return message.content
    }
  }
  return ''
}

function isShareableAssistantMessage(message: ChatMessage): boolean {
  return message.role === 'assistant' && !message.streaming && Boolean(message.content?.trim())
}

export function buildShareTurns(
  messages: ChatMessage[],
  assistantIndices: number[],
): AssistantShareTurn[] {
  const uniqueSorted = [...new Set(assistantIndices)].sort((a, b) => a - b)
  const turns: AssistantShareTurn[] = []

  for (const index of uniqueSorted) {
    const message = messages[index]
    if (!message || !isShareableAssistantMessage(message)) {
      continue
    }
    turns.push({
      userMessage: findUserMessageBefore(messages, index),
      assistantContent: message.content,
    })
  }

  return turns
}

export function canShareAssistantMessage(message: ChatMessage): boolean {
  return isShareableAssistantMessage(message)
}

export function validateShareTurnCount(count: number): boolean {
  if (count > MAX_SHARE_TURNS) {
    ElMessage.warning(`最多选择 ${MAX_SHARE_TURNS} 条对话`)
    return false
  }
  if (count === 0) {
    return false
  }
  return true
}
