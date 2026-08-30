<template>
  <aside class="assistant-sidebar">
    <div class="sidebar-header">
      <el-button type="primary" class="new-chat-btn" @click="emit('new-chat')">
        新对话
      </el-button>
      <el-input
        v-model="searchModel"
        placeholder="搜索会话"
        clearable
        size="small"
        @input="handleSearchInput"
      />
    </div>

    <div v-loading="sessionsLoading" class="session-list">
      <div v-if="sessions.length === 0 && !sessionsLoading" class="empty-sessions">
        暂无历史会话
      </div>
      <div
        v-for="session in sessions"
        :key="session.id"
        class="session-item"
        :class="{ active: session.id === activeSessionId }"
        @click="emit('select', session.id)"
      >
        <div class="session-title" :title="session.title">{{ session.title || '新对话' }}</div>
        <div class="session-actions" @click.stop>
          <el-button text size="small" @click="emit('rename', session)">
            重命名
          </el-button>
          <el-button text size="small" type="danger" @click="emit('delete', session.id)">
            删除
          </el-button>
        </div>
      </div>
    </div>
  </aside>
</template>

<script lang="ts" setup>
import { computed } from 'vue'
import type { AssistantSessionSummary } from '../../types/assistant'

const props = defineProps<{
  sessions: AssistantSessionSummary[]
  sessionsLoading: boolean
  searchQuery: string
  activeSessionId?: string
}>()

const emit = defineEmits<{
  'new-chat': []
  select: [sessionId: string]
  rename: [session: AssistantSessionSummary]
  delete: [sessionId: string]
  'update:searchQuery': [value: string]
  search: []
}>()

const searchModel = computed({
  get: () => props.searchQuery,
  set: (value: string) => emit('update:searchQuery', value),
})

let searchTimer: ReturnType<typeof setTimeout> | null = null

function handleSearchInput() {
  if (searchTimer) {
    clearTimeout(searchTimer)
  }
  searchTimer = setTimeout(() => {
    emit('search')
  }, 300)
}
</script>

<style scoped lang="scss">
.assistant-sidebar {
  width: 260px;
  flex-shrink: 0;
  border-right: 1px solid var(--ep-border-color-light);
  display: flex;
  flex-direction: column;
  min-height: 0;
  background: var(--ep-bg-color);
}

.sidebar-header {
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  border-bottom: 1px solid var(--ep-border-color-lighter);
}

.new-chat-btn {
  width: 100%;
}

.session-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.empty-sessions {
  padding: 24px 12px;
  color: var(--ep-text-color-secondary);
  font-size: 13px;
  text-align: center;
}

.session-item {
  padding: 10px 12px;
  border-radius: 8px;
  cursor: pointer;
  margin-bottom: 4px;
  transition: background-color 0.15s ease;

  &:hover,
  &.active {
    background: var(--ep-fill-color-light);
  }

  &.active {
    border: 1px solid var(--ep-color-primary-light-5);
  }
}

.session-title {
  font-size: 14px;
  color: var(--ep-text-color-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-bottom: 4px;
}

.session-actions {
  display: flex;
  gap: 4px;
  opacity: 0;
  transition: opacity 0.15s ease;
}

.session-item:hover .session-actions,
.session-item.active .session-actions {
  opacity: 1;
}
</style>
