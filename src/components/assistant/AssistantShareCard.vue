<script setup lang="ts">
import { computed } from 'vue'
import MarkdownContent from './MarkdownContent.vue'

const props = defineProps<{
  userMessage: string
  assistantContent: string
}>()

const shareDate = computed(() => {
  return new Date().toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
})
</script>

<template>
  <div class="assistant-share-card">
    <div class="share-card__header">AI 账本助手</div>

    <div class="share-card__section">
      <div class="share-card__label">你的问题</div>
      <div class="share-card__user-text">{{ userMessage }}</div>
    </div>

    <div class="share-card__section">
      <div class="share-card__label">助手回答</div>
      <MarkdownContent :content="assistantContent" class="share-card__markdown" />
    </div>

    <div class="share-card__footer">
      <span>来自 Beancount-Trans</span>
      <span>{{ shareDate }}</span>
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
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 20px;
  padding-top: 12px;
  border-top: 1px solid #ebeef5;
  font-size: 12px;
  color: #909399;
}
</style>
