<template>
  <el-config-provider namespace="ep" :locale="locale">
    <BaseHeader />
    <TaskBanner />
    <div class="flex main-container">
      <BaseSide />
      <div
        class="main-content"
        :class="{ 'main-content--assistant': isAssistantRoute }"
        w="full"
      >
        <Logos v-if="!isAssistantRoute" my="4" />
        <router-view />
      </div>
    </div>
  </el-config-provider>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import zhCn from 'element-plus/dist/locale/zh-cn.mjs'
import TaskBanner from './components/common/TaskBanner.vue'

const locale = zhCn
const route = useRoute()
const isAssistantRoute = computed(() => route.path.startsWith('/assistant'))
</script>

<style>
#app {
  text-align: center;
  color: var(--ep-text-color-primary);
  height: 100vh;
  display: flex;
  flex-direction: column;
}

.main-container {
  flex: 1;
  display: flex;
  min-height: 0;
}

.main-content {
  min-width: 0;
  min-height: 0;
}

.main-content:not(.main-content--assistant) {
  padding-top: 1rem;
  padding-bottom: 1rem;
}

.main-content--assistant {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.main-content--assistant > * {
  flex: 1;
  min-height: 0;
}
</style>
