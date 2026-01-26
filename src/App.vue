<template>
  <el-config-provider namespace="ep" :locale="locale">
    <BaseHeader />
    <TaskBanner />
    <div class="flex main-container">
      <BaseSide />
      <div w="full" py="4">
        <Logos my="4" />
        <router-view />
      </div>
    </div>
  </el-config-provider>
</template>

<script setup lang="ts">
import zhCn from 'element-plus/dist/locale/zh-cn.mjs'
import TaskBanner from './components/common/TaskBanner.vue'

const locale = zhCn
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
</style>
