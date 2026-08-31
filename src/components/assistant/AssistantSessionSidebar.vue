<template>
  <aside class="assistant-sidebar">
    <div class="sidebar-header">
      <el-button type="primary" class="new-chat-btn" @click="emit('new-chat')">
        新对话
      </el-button>
      <el-input
        ref="searchInputRef"
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
        :class="{
          active: session.id === activeSessionId,
          'is-menu-open': openMenuId === session.id,
        }"
        @click="emit('select', session.id)"
      >
        <div class="session-title" :title="session.title">{{ session.title || '新对话' }}</div>
        <el-dropdown
          trigger="click"
          @command="(command) => handleCommand(command, session)"
          @visible-change="(visible) => onMenuVisible(session.id, visible)"
          @click.stop
        >
          <el-button class="session-more" text size="small" title="更多" @click.stop>
            <el-icon><More /></el-icon>
          </el-button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="rename">重命名</el-dropdown-item>
              <el-dropdown-item command="delete" divided>
                <span class="session-delete">删除</span>
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
    </div>
  </aside>
</template>

<script lang="ts" setup>
import { computed, ref } from 'vue'
import { More } from '@element-plus/icons-vue'
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

const searchInputRef = ref<{ focus: () => void } | null>(null)
const openMenuId = ref<string | null>(null)
let searchTimer: ReturnType<typeof setTimeout> | null = null

function handleCommand(command: string, session: AssistantSessionSummary) {
  if (command === 'rename') {
    emit('rename', session)
    return
  }
  if (command === 'delete') {
    emit('delete', session.id)
  }
}

function onMenuVisible(sessionId: string, visible: boolean) {
  openMenuId.value = visible ? sessionId : null
}

function handleSearchInput() {
  if (searchTimer) {
    clearTimeout(searchTimer)
  }
  searchTimer = setTimeout(() => {
    emit('search')
  }, 300)
}

function focusSearch() {
  searchInputRef.value?.focus()
}

defineExpose({ focusSearch })
</script>

<style scoped lang="scss">
.assistant-sidebar {
  width: 260px;
  flex-shrink: 0;
  align-self: stretch;
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
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 8px 4px 8px 12px;
  border-radius: 8px;
  cursor: pointer;
  margin-bottom: 4px;
  transition: background-color 0.15s ease;

  &:hover,
  &.active,
  &.is-menu-open {
    background: var(--ep-fill-color-light);
  }

  &.active {
    border: 1px solid var(--ep-color-primary-light-5);
  }
}

.session-title {
  flex: 1;
  min-width: 0;
  font-size: 14px;
  color: var(--ep-text-color-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.session-more {
  flex-shrink: 0;
  width: 28px;
  height: 28px;
  padding: 0;
  opacity: 0;
  transition: opacity 0.15s ease;
}

.session-item:hover .session-more,
.session-item.active .session-more,
.session-item.is-menu-open .session-more {
  opacity: 1;
}

.session-delete {
  color: var(--ep-color-danger);
}
</style>
