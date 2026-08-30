import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import {
  deleteAssistantSession,
  listAssistantSessions,
  updateAssistantSessionTitle,
} from '../api/assistant'
import type { AssistantSessionSummary } from '../types/assistant'

export function useAssistantSessions() {
  const sessions = ref<AssistantSessionSummary[]>([])
  const sessionsLoading = ref(false)
  const searchQuery = ref('')

  async function fetchSessions() {
    sessionsLoading.value = true
    try {
      const { data } = await listAssistantSessions(searchQuery.value.trim())
      sessions.value = data
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string } } }
      ElMessage.error(err.response?.data?.detail || '加载会话列表失败')
    } finally {
      sessionsLoading.value = false
    }
  }

  async function renameSession(sessionId: string, title: string) {
    const { data } = await updateAssistantSessionTitle(sessionId, title)
    const index = sessions.value.findIndex((item) => item.id === sessionId)
    if (index >= 0) {
      sessions.value[index] = {
        id: data.id,
        title: data.title,
        created: data.created,
        modified: data.modified,
      }
    }
    ElMessage.success('标题已更新')
    return data
  }

  async function removeSession(sessionId: string) {
    await deleteAssistantSession(sessionId)
    sessions.value = sessions.value.filter((item) => item.id !== sessionId)
    ElMessage.success('会话已删除')
  }

  return {
    sessions,
    sessionsLoading,
    searchQuery,
    fetchSessions,
    renameSession,
    removeSession,
  }
}
