<script setup lang="ts">
import { computed } from 'vue'
import type { AssistantShareTurn } from '../../types/assistant'
import MarkdownContent from './MarkdownContent.vue'

const props = defineProps<{
  turns: AssistantShareTurn[]
}>()

const shareDate = computed(() => {
  return new Date().toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
})

const showTurnNumber = computed(() => props.turns.length > 1)
</script>

<template>
  <div class="assistant-share-card">
    <div class="share-card__header">Beancount-Trans</div>

    <template v-for="(turn, index) in turns" :key="index">
      <div v-if="index > 0" class="share-card__divider" />

      <div class="share-card__turn">
        <div v-if="showTurnNumber" class="share-card__turn-title">对话 {{ index + 1 }}</div>

        <div class="share-card__section">
          <div class="share-card__label">你的问题</div>
          <div class="share-card__user-text">{{ turn.userMessage }}</div>
        </div>

        <div class="share-card__section">
          <div class="share-card__label">助手回答</div>
          <MarkdownContent :content="turn.assistantContent" class="share-card__markdown" />
        </div>
      </div>
    </template>

    <div class="share-card__footer">
      <p class="share-card__notice">
        隐私提示：本图可能包含个人账本信息，请勿随意分享给陌生人。
      </p>
      <p class="share-card__notice">
        以上内容由 AI 生成，仅供参考，请注意甄别。
      </p>
      <p class="share-card__date">{{ shareDate }}</p>
    </div>
  </div>
</template>

<style scoped lang="scss">
.assistant-share-card {
  width: 640px;
  padding: 24px;
  background: #ffffff;
  color: #303133;
  color-scheme: light;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  box-sizing: border-box;
}

.share-card__header {
  font-size: 18px;
  font-weight: 700;
  color: #303133;
  margin-bottom: 20px;
  padding-bottom: 12px;
  padding-left: 12px;
  border-bottom: 1px solid #ebeef5;
  border-left: 4px solid #409eff;
}

.share-card__divider {
  margin: 20px 0;
  border-top: 1px dashed #dcdfe6;
}

.share-card__turn-title {
  font-size: 13px;
  font-weight: 600;
  color: #606266;
  margin-bottom: 12px;
}

.share-card__section {
  margin-bottom: 16px;
}

.share-card__label {
  font-size: 12px;
  font-weight: 600;
  color: #909399;
  margin-bottom: 8px;
  text-transform: uppercase;
  letter-spacing: 0.02em;
}

.share-card__user-text {
  font-size: 14px;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
  color: #303133;
}

.share-card__markdown {
  font-size: 14px;
  color: #303133;

  :deep(.markdown-body) {
    color: #303133;
  }

  :deep(h1),
  :deep(h2),
  :deep(h3),
  :deep(h4),
  :deep(h5),
  :deep(h6) {
    color: #303133;
  }

  :deep(p),
  :deep(li) {
    color: #303133;
  }

  :deep(strong) {
    color: #303133;
  }

  :deep(blockquote) {
    color: #606266;
    border-left-color: #dcdfe6;
  }

  :deep(hr) {
    border-top-color: #ebeef5;
  }

  :deep(code) {
    background: #f5f7fa;
    color: #409eff;
  }

  :deep(pre) {
    background: #f5f7fa;
    overflow-x: auto;

    code {
      color: #606266;
    }
  }

  :deep(th) {
    background: #f5f7fa;
    color: #303133;
  }

  :deep(td),
  :deep(th) {
    border-color: #ebeef5;
    color: #303133;
  }

  :deep(tr:nth-child(even) td) {
    background: #fafafa;
  }

  :deep(a) {
    color: #409eff;
  }
}

.share-card__footer {
  margin-top: 20px;
  padding-top: 12px;
  border-top: 1px solid #ebeef5;
}

.share-card__notice {
  margin: 0 0 6px;
  font-size: 12px;
  line-height: 1.5;
  color: #909399;
}

.share-card__date {
  margin: 8px 0 0;
  font-size: 12px;
  color: #c0c4cc;
  text-align: right;
}
</style>
