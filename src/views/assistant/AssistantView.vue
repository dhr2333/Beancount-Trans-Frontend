<template>
  <div class="assistant-page">
    <div class="assistant-header">
      <div class="header-left">
        <h2 class="page-title">AI 账本助手</h2>
        <p class="page-subtitle">用自然语言查询账本数据与汇总</p>
      </div>
      <div class="header-right">
        <el-tag v-if="statusLoading" type="info">检查中...</el-tag>
        <el-tag v-else-if="status?.api_key_configured" type="success">{{ keySourceLabel }}</el-tag>
        <el-tag v-else type="warning">未配置 Key</el-tag>
        <el-button text @click="clearMessages" :disabled="messages.length === 0">清空对话</el-button>
      </div>
    </div>

    <el-alert
      v-if="!statusLoading && status && !status.api_key_configured"
      type="warning"
      :closable="false"
      show-icon
      class="setup-alert"
      title="尚未配置 DeepSeek API Key"
    >
      <template #default>
        请在
        <router-link to="/format" class="alert-link">输出配置</router-link>
        中填写 DeepSeek API Key，或联系管理员配置平台 Key。
      </template>
    </el-alert>

    <el-alert
      v-if="!statusLoading && status && !status.ledger_exists"
      type="info"
      :closable="false"
      show-icon
      class="setup-alert"
      title="账本尚未就绪"
    >
      <template #default>
        请先在
        <router-link to="/file" class="alert-link">文件管理</router-link>
        上传并解析账单，生成账本后再使用助手。
      </template>
    </el-alert>

    <div class="chat-container" ref="chatContainerRef">
      <div v-if="messages.length === 0" class="welcome-panel">
        <el-icon :size="48" color="var(--ep-color-primary)">
          <ChatDotRound />
        </el-icon>
        <p class="welcome-text">你好，我可以帮你查询支出、收入、余额等账本信息。</p>
        <div class="example-chips">
          <el-button
            v-for="q in exampleQuestions"
            :key="q"
            size="small"
            round
            :disabled="!canChat || loading"
            @click="handleExample(q)"
          >
            {{ q }}
          </el-button>
        </div>
      </div>

      <div v-for="(msg, index) in messages" :key="index" class="message-row" :class="msg.role">
        <div class="message-bubble">
          <div class="message-role">{{ msg.role === 'user' ? '你' : '助手' }}</div>
          <div class="message-content">{{ msg.content }}</div>
          <el-collapse v-if="msg.role === 'assistant' && msg.queries?.length" class="query-collapse">
            <el-collapse-item title="查看查询详情" name="queries">
              <div v-for="(q, qi) in msg.queries" :key="qi" class="query-block">
                <pre class="query-bql">{{ q.bql }}</pre>
                <pre class="query-result">{{ q.result_preview }}</pre>
              </div>
            </el-collapse-item>
          </el-collapse>
        </div>
      </div>

      <div v-if="loading" class="message-row assistant">
        <div class="message-bubble loading-bubble">
          <el-icon class="is-loading"><Loading /></el-icon>
          <span>正在查询账本...</span>
        </div>
      </div>
    </div>

    <div class="input-area">
      <el-input
        v-model="inputText"
        type="textarea"
        :rows="2"
        placeholder="输入问题，例如：本月餐饮支出多少？"
        :disabled="!canChat || loading"
        resize="none"
        @keydown.enter.exact.prevent="handleSend"
      />
      <el-button
        type="primary"
        :loading="loading"
        :disabled="!canChat || !inputText.trim()"
        @click="handleSend"
      >
        发送
      </el-button>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { nextTick, onMounted, ref, watch } from 'vue'
import { ChatDotRound, Loading } from '@element-plus/icons-vue'
import { useAssistantChat } from '../../composables/useAssistantChat'

const {
  messages,
  loading,
  status,
  statusLoading,
  canChat,
  keySourceLabel,
  exampleQuestions,
  fetchStatus,
  send,
  clearMessages,
} = useAssistantChat()

const inputText = ref('')
const chatContainerRef = ref<HTMLElement | null>(null)

async function handleSend() {
  const text = inputText.value
  if (!text.trim()) return
  inputText.value = ''
  await send(text)
  await scrollToBottom()
}

async function handleExample(question: string) {
  await send(question)
  await scrollToBottom()
}

async function scrollToBottom() {
  await nextTick()
  if (chatContainerRef.value) {
    chatContainerRef.value.scrollTop = chatContainerRef.value.scrollHeight
  }
}

watch(messages, () => {
  scrollToBottom()
}, { deep: true })

onMounted(() => {
  fetchStatus()
})
</script>

<style scoped lang="scss">
.assistant-page {
  max-width: 900px;
  margin: 0 auto;
  padding: 0 16px 24px;
  display: flex;
  flex-direction: column;
  height: calc(100vh - 120px);
  text-align: left;
}

.assistant-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16px;
  flex-shrink: 0;
}

.page-title {
  margin: 0;
  font-size: 1.5rem;
  color: var(--ep-text-color-primary);
}

.page-subtitle {
  margin: 4px 0 0;
  font-size: 0.875rem;
  color: var(--ep-text-color-secondary);
}

.header-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.setup-alert {
  margin-bottom: 12px;
  flex-shrink: 0;
}

.alert-link {
  color: var(--ep-color-primary);
  text-decoration: none;
  font-weight: 500;

  &:hover {
    text-decoration: underline;
  }
}

.chat-container {
  flex: 1;
  overflow-y: auto;
  border: 1px solid var(--ep-border-color-light);
  border-radius: 12px;
  padding: 16px;
  background: var(--ep-fill-color-blank);
  min-height: 0;
}

.welcome-panel {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 16px;
  text-align: center;
}

.welcome-text {
  margin: 16px 0 24px;
  color: var(--ep-text-color-regular);
}

.example-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: center;
}

.message-row {
  display: flex;
  margin-bottom: 12px;

  &.user {
    justify-content: flex-end;

    .message-bubble {
      background: var(--ep-color-primary-light-9);
      border-color: var(--ep-color-primary-light-7);
    }
  }

  &.assistant {
    justify-content: flex-start;

    .message-bubble {
      background: var(--ep-fill-color-light);
      border-color: var(--ep-border-color);
    }
  }
}

.message-bubble {
  max-width: 85%;
  padding: 10px 14px;
  border-radius: 12px;
  border: 1px solid transparent;
}

.message-role {
  font-size: 0.75rem;
  color: var(--ep-text-color-secondary);
  margin-bottom: 4px;
}

.message-content {
  white-space: pre-wrap;
  word-break: break-word;
  line-height: 1.6;
  color: var(--ep-text-color-primary);
}

.loading-bubble {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--ep-text-color-secondary);
}

.query-collapse {
  margin-top: 8px;
  border: none;

  :deep(.ep-collapse-item__header) {
    font-size: 0.8rem;
    height: 32px;
    background: transparent;
    border: none;
  }

  :deep(.ep-collapse-item__wrap) {
    border: none;
    background: transparent;
  }
}

.query-block {
  margin-bottom: 8px;
}

.query-bql,
.query-result {
  margin: 0;
  padding: 8px;
  font-size: 0.75rem;
  border-radius: 6px;
  overflow-x: auto;
  white-space: pre-wrap;
  word-break: break-all;
}

.query-bql {
  background: var(--ep-fill-color-darker);
  color: var(--ep-color-primary);
}

.query-result {
  background: var(--ep-fill-color);
  color: var(--ep-text-color-regular);
}

.input-area {
  display: flex;
  gap: 12px;
  align-items: flex-end;
  margin-top: 12px;
  flex-shrink: 0;

  .ep-textarea {
    flex: 1;
  }
}
</style>
