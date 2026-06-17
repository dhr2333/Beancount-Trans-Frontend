<script setup lang="ts">
import { computed } from 'vue'
import { renderMarkdown } from '@/utils/markdown'

const props = defineProps<{ content: string }>()
const html = computed(() => renderMarkdown(props.content))
</script>

<template>
  <div class="markdown-body" v-html="html" />
</template>

<style scoped lang="scss">
.markdown-body {
  word-break: break-word;
  line-height: 1.6;
  color: var(--ep-text-color-primary);

  :deep(p) {
    margin: 0 0 0.5em;

    &:last-child {
      margin-bottom: 0;
    }
  }

  :deep(h1),
  :deep(h2),
  :deep(h3),
  :deep(h4),
  :deep(h5),
  :deep(h6) {
    margin: 0.75em 0 0.4em;
    font-weight: 600;
    line-height: 1.4;
    color: var(--ep-text-color-primary);

    &:first-child {
      margin-top: 0;
    }
  }

  :deep(h1) { font-size: 1.25em; }
  :deep(h2) { font-size: 1.15em; }
  :deep(h3) { font-size: 1.05em; }

  :deep(ul),
  :deep(ol) {
    margin: 0.4em 0;
    padding-left: 1.5em;
  }

  :deep(li) {
    margin: 0.2em 0;
  }

  :deep(strong) {
    font-weight: 600;
    color: var(--ep-text-color-primary);
  }

  :deep(code) {
    padding: 0.1em 0.35em;
    font-size: 0.9em;
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    background: var(--ep-fill-color-darker);
    border-radius: 4px;
    color: var(--ep-color-primary);
  }

  :deep(pre) {
    margin: 0.5em 0;
    padding: 10px 12px;
    overflow-x: auto;
    font-size: 0.85em;
    line-height: 1.5;
    background: var(--ep-fill-color-darker);
    border-radius: 6px;

    code {
      padding: 0;
      background: transparent;
      color: var(--ep-text-color-regular);
    }
  }

  :deep(blockquote) {
    margin: 0.5em 0;
    padding-left: 12px;
    border-left: 3px solid var(--ep-border-color);
    color: var(--ep-text-color-secondary);
  }

  :deep(hr) {
    margin: 0.75em 0;
    border: none;
    border-top: 1px solid var(--ep-border-color-light);
  }

  :deep(a) {
    color: var(--ep-color-primary);
    text-decoration: none;

    &:hover {
      text-decoration: underline;
    }
  }

  :deep(table) {
    width: 100%;
    margin: 0.5em 0;
    border-collapse: collapse;
    font-size: 0.9em;
    display: block;
    overflow-x: auto;
  }

  :deep(th),
  :deep(td) {
    padding: 6px 10px;
    border: 1px solid var(--ep-border-color-light);
    text-align: left;
    white-space: nowrap;
  }

  :deep(th) {
    font-weight: 600;
    background: var(--ep-fill-color);
    color: var(--ep-text-color-primary);
  }

  :deep(tr:nth-child(even) td) {
    background: var(--ep-fill-color-lighter);
  }
}
</style>
