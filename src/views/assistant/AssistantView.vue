<template>
  <div class="assistant-page" :class="{ 'assistant-page--share-select': shareSelectMode }">
    <div class="assistant-header">
      <div class="header-left">
        <h2 class="page-title">AI 账本助手</h2>
        <p class="page-subtitle">用自然语言查询账本数据与汇总</p>
      </div>
      <div class="header-right">
        <el-tag v-if="statusLoading" type="info">检查中...</el-tag>
        <el-tag v-else-if="status?.api_key_configured" type="success">{{ keySourceLabel }}</el-tag>
        <el-tag v-else type="warning">未配置 Key</el-tag>
        <el-button text @click="handleClearMessages" :disabled="messages.length === 0">清空对话</el-button>
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

      <div
        v-for="(msg, index) in messages"
        :key="index"
        class="message-row"
        :class="{
          [msg.role]: true,
          'share-selectable': shareSelectMode && canShareAssistantMessage(msg),
          'is-selected': shareSelectMode && selectedIndices.has(index),
        }"
        @click="handleShareRowClick(index, msg)"
      >
        <el-checkbox
          v-if="shareSelectMode && canShareAssistantMessage(msg)"
          class="share-checkbox"
          :model-value="selectedIndices.has(index)"
          :disabled="sharing"
          @click.stop
          @change="(val: CheckboxValueType) => toggleShareSelection(index, val === true)"
        />
        <div class="message-bubble">
          <div class="message-role">{{ msg.role === 'user' ? '你' : '助手' }}</div>
          <div v-if="msg.role === 'user'" class="message-content message-content--user">{{ msg.content }}</div>
          <template v-else>
            <div
              v-if="msg.streaming"
              class="message-content message-content--assistant message-content--streaming"
            >
              <template v-if="!msg.content">
                <span class="status-hint">{{ statusHint(msg.status) }}</span>
              </template>
              <template v-else>
                <span class="streaming-text">{{ msg.content }}</span>
                <span class="streaming-cursor">▍</span>
              </template>
            </div>
            <MarkdownContent
              v-else
              :content="msg.content"
              class="message-content message-content--assistant"
            />
            <div
              v-if="msg.role === 'assistant' && !msg.streaming && msg.content"
              class="feedback-bar"
              @click.stop
            >
              <el-button
                size="small"
                text
                @click="handleCopyMarkdown(index)"
              >
                <el-icon><DocumentCopy /></el-icon>
                复制
              </el-button>
              <el-button
                v-if="!shareSelectMode"
                size="small"
                text
                :disabled="sharing"
                @click="handleShareClick(index)"
              >
                <el-icon><Share /></el-icon>
                分享
              </el-button>
              <span class="feedback-divider" />
              <el-button
                size="small"
                text
                :type="msg.feedback === 'like' ? 'primary' : 'default'"
                :loading="msg.feedbackSubmitting"
                :disabled="msg.feedbackSubmitting || sharing"
                @click="handleLike(index)"
              >
                <el-icon><CircleCheck /></el-icon>
                喜欢
              </el-button>
              <el-button
                size="small"
                text
                :type="msg.feedback === 'dislike' ? 'danger' : 'default'"
                :loading="msg.feedbackSubmitting"
                :disabled="msg.feedbackSubmitting || sharing"
                @click="handleDislike(index)"
              >
                <el-icon><CircleClose /></el-icon>
                不喜欢
              </el-button>
            </div>
          </template>
          <el-collapse
            v-if="msg.role === 'assistant' && msg.queries?.length"
            class="query-collapse"
            @click.stop
          >
            <el-collapse-item title="查看查询详情" name="queries">
              <div v-for="(q, qi) in msg.queries" :key="qi" class="query-block">
                <pre class="query-bql">{{ q.bql }}</pre>
                <pre class="query-result">{{ q.result_preview }}</pre>
              </div>
            </el-collapse-item>
          </el-collapse>
        </div>
      </div>
    </div>

    <div v-if="!shareSelectMode" class="input-area">
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
        v-if="loading"
        @click="stop"
      >
        停止
      </el-button>
      <el-button
        v-else
        type="primary"
        :disabled="!canChat || !inputText.trim()"
        @click="handleSend"
      >
        发送
      </el-button>
    </div>

    <div v-if="shareSelectMode" class="share-select-bar">
      <span class="share-select-count">已选 {{ selectedIndices.size }} 条对话</span>
      <el-button :disabled="sharing" @click="exitShareSelectMode">取消</el-button>
      <el-button
        type="primary"
        :loading="sharing"
        :disabled="selectedIndices.size === 0"
        @click="handleGenerateShareImage"
      >
        生成分享图
      </el-button>
    </div>

    <Teleport to="body">
      <div v-if="sharePreview" ref="shareCardHostRef" class="share-card-host">
        <AssistantShareCard :turns="sharePreview.turns" />
      </div>
    </Teleport>
  </div>
</template>

<script lang="ts" setup>
import { nextTick, onMounted, ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { CheckboxValueType } from 'element-plus'
import { ChatDotRound, CircleCheck, CircleClose, DocumentCopy, Share } from '@element-plus/icons-vue'
import AssistantShareCard from '../../components/assistant/AssistantShareCard.vue'
import MarkdownContent from '../../components/assistant/MarkdownContent.vue'
import { useAssistantChat } from '../../composables/useAssistantChat'
import { copyText } from '../../utils/clipboard'
import {
  buildShareTurns,
  canShareAssistantMessage,
  MAX_SHARE_TURNS,
  validateShareTurnCount,
} from '../../utils/assistantShare'
import { captureElementAsPng, sharePngBlob } from '../../utils/shareImage'
import type { AssistantPhase, AssistantShareTurn, ChatMessage } from '../../types/assistant'

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
  stop,
  submitFeedback,
  clearMessages,
} = useAssistantChat()

function statusHint(phase?: AssistantPhase): string {
  if (phase === 'querying') return '正在查询账本...'
  if (phase === 'writing') return '正在撰写回答...'
  return '正在思考...'
}

async function handleCopyMarkdown(index: number) {
  const message = messages.value[index]
  if (!message?.content) {
    return
  }
  try {
    await copyText(message.content)
    ElMessage.success('已复制 Markdown')
  } catch {
    ElMessage.error('复制失败')
  }
}

const shareSelectMode = ref(false)
const selectedIndices = ref<Set<number>>(new Set())
const sharing = ref(false)
const sharePreview = ref<{ turns: AssistantShareTurn[] } | null>(null)
const shareCardHostRef = ref<HTMLElement | null>(null)

function exitShareSelectMode() {
  shareSelectMode.value = false
  selectedIndices.value = new Set()
}

function handleShareClick(index: number) {
  if (sharing.value || !canShareAssistantMessage(messages.value[index])) {
    return
  }
  shareSelectMode.value = true
  selectedIndices.value = new Set([index])
}

function toggleShareSelection(index: number, checked: boolean) {
  if (sharing.value) {
    return
  }

  const next = new Set(selectedIndices.value)
  if (checked) {
    if (next.size >= MAX_SHARE_TURNS) {
      ElMessage.warning(`最多选择 ${MAX_SHARE_TURNS} 条对话`)
      return
    }
    next.add(index)
  } else {
    next.delete(index)
  }
  selectedIndices.value = next
}

function handleShareRowClick(index: number, msg: ChatMessage) {
  if (!shareSelectMode.value || !canShareAssistantMessage(msg) || sharing.value) {
    return
  }
  toggleShareSelection(index, !selectedIndices.value.has(index))
}

async function renderAndShare(turns: AssistantShareTurn[]) {
  if (!validateShareTurnCount(turns.length)) {
    return
  }

  sharing.value = true
  sharePreview.value = { turns }

  try {
    await nextTick()
    const card = shareCardHostRef.value?.firstElementChild as HTMLElement | null
    if (!card) {
      throw new Error('分享卡片渲染失败')
    }
    const blob = await captureElementAsPng(card)
    const timestamp = new Date().toISOString().slice(0, 10)
    await sharePngBlob(blob, `assistant-${turns.length}turns-${timestamp}.png`)
    ElMessage.success('分享图片已生成')
    exitShareSelectMode()
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      return
    }
    ElMessage.error(error instanceof Error ? error.message : '生成分享图片失败')
  } finally {
    sharing.value = false
    sharePreview.value = null
  }
}

async function handleGenerateShareImage() {
  const indices = [...selectedIndices.value]
  const turns = buildShareTurns(messages.value, indices)
  await renderAndShare(turns)
}

function handleClearMessages() {
  exitShareSelectMode()
  clearMessages()
}

async function handleLike(index: number) {
  await submitFeedback(index, 'like')
}

async function handleDislike(index: number) {
  const message = messages.value[index]
  if (!message || message.role !== 'assistant') {
    return
  }

  if (message.feedback === 'dislike') {
    await submitFeedback(index, 'dislike')
    return
  }

  try {
    const { value } = await ElMessageBox.prompt(
      '可以告诉我们哪里不满意（可选）',
      '反馈原因',
      {
        confirmButtonText: '提交',
        cancelButtonText: '取消',
        inputType: 'textarea',
        inputPlaceholder: '例如：数据不准确、回答不完整...',
        inputValidator: (value: string) => !value || value.length <= 500 || '原因不超过 500 字',
      },
    )
    await submitFeedback(index, 'dislike', value?.trim() || '')
  } catch {
    // 用户取消弹窗
  }
}

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

  &--share-select {
    padding-bottom: 88px;
  }
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

  &.share-selectable {
    align-items: flex-start;
    gap: 8px;
    cursor: pointer;

    &.is-selected .message-bubble {
      border-color: var(--ep-color-primary);
      box-shadow: 0 0 0 1px var(--ep-color-primary-light-7);
    }
  }
}

.share-checkbox {
  margin-top: 10px;
  flex-shrink: 0;
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
  word-break: break-word;
  line-height: 1.6;
  color: var(--ep-text-color-primary);

  &--user {
    white-space: pre-wrap;
  }

  &--streaming {
    white-space: pre-wrap;
  }
}

.status-hint {
  color: var(--ep-text-color-secondary);
}

.streaming-text {
  white-space: pre-wrap;
}

.streaming-cursor {
  animation: blink 1s step-end infinite;
  color: var(--ep-color-primary);
}

@keyframes blink {
  50% {
    opacity: 0;
  }
}

.feedback-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px;
  margin-top: 8px;
  padding-top: 4px;
  border-top: 1px solid var(--ep-border-color-lighter);
}

.feedback-divider {
  width: 1px;
  height: 16px;
  margin: 0 4px;
  background: var(--ep-border-color-lighter);
}

.share-select-bar {
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 2000;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 20px;
  background: var(--ep-bg-color);
  border: 1px solid var(--ep-border-color-light);
  border-radius: 12px;
  box-shadow: var(--ep-box-shadow-light);
}

.share-select-count {
  font-size: 14px;
  color: var(--ep-text-color-regular);
  margin-right: 4px;
  white-space: nowrap;
}

.share-card-host {
  position: fixed;
  left: -9999px;
  top: 0;
  z-index: -1;
  pointer-events: none;
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
