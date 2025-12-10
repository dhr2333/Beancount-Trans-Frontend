<template>
  <div class="git-setup">
    <!-- Git 功能介绍 -->
    <el-card v-if="!showOptions" shadow="never" class="intro-card">
      <template #header>
        <div class="card-header">
          <el-icon class="header-icon">
            <i-ep-connection />
          </el-icon>
          <div>
            <h3>启用 Git 同步功能</h3>
            <el-text type="info" size="small">版本控制 · 本地编辑 · 多设备同步</el-text>
          </div>
        </div>
      </template>

      <div class="intro-content">
        <div class="features-list">
          <div class="feature-item">
            <el-icon class="feature-icon">
              <i-ep-edit />
            </el-icon>
            <div>
              <h4>本地编辑</h4>
              <p>使用 VS Code 等编辑器编辑账本，享受语法高亮和智能提示</p>
            </div>
          </div>

          <div class="feature-item">
            <el-icon class="feature-icon">
              <i-ep-clock />
            </el-icon>
            <div>
              <h4>版本控制</h4>
              <p>通过 Git 管理账本变更历史，支持历史回溯和变更追踪</p>
            </div>
          </div>

          <div class="feature-item">
            <el-icon class="feature-icon">
              <i-ep-refresh />
            </el-icon>
            <div>
              <h4>多设备同步</h4>
              <p>在不同设备间同步账本数据，随时随地访问和编辑</p>
            </div>
          </div>

          <div class="feature-item">
            <el-icon class="feature-icon">
              <i-ep-cpu />
            </el-icon>
            <div>
              <h4>平台解析</h4>
              <p>继续享受平台的 AI 解析、可视化报表等强大功能</p>
            </div>
          </div>
        </div>

        <el-alert
          title="注意事项"
          type="info"
          :closable="false"
          show-icon
          class="notice-alert"
        >
          <ul class="notice-list">
            <li>Git 功能启用后，您的账本将托管在平台的私有 Git 仓库中</li>
            <li>平台会自动生成 SSH 密钥，用于安全的 Git 操作</li>
            <li>仓库大小限制为 20MB，适合个人账本使用</li>
          </ul>
        </el-alert>

        <div class="action-buttons">
          <el-button 
            type="primary" 
            size="large"
            :loading="loading"
            @click="showCreateOptions"
          >
            <el-icon>
              <i-ep-plus />
            </el-icon>
            启用 Git 同步
          </el-button>
        </div>
      </div>
    </el-card>

    <!-- 创建方式选择 -->
    <el-card v-if="showOptions" shadow="never" class="options-card">
      <template #header>
        <div class="card-header">
          <el-button 
            text 
            type="info"
            @click="backToIntro"
          >
            <el-icon>
              <i-ep-arrow-left />
            </el-icon>
            返回
          </el-button>
          <div>
            <h3>选择仓库创建方式</h3>
            <el-text type="info" size="small">根据您的需求选择合适的创建方式</el-text>
          </div>
        </div>
      </template>

      <div class="options-content">
        <div class="option-cards">
          <!-- 基于模板创建 -->
          <el-card 
            :class="['option-card', { 'selected': selectedOption === true }]"
            :body-style="{ padding: '20px' }"
            @click="selectOption(true)"
          >
            <div class="option-header">
              <el-icon class="option-icon template-icon">
                <i-ep-document-add />
              </el-icon>
              <div class="option-titles">
                <h4>基于模板创建</h4>
                <el-tag type="success" size="small">推荐新手</el-tag>
              </div>
              <el-radio 
                :model-value="selectedOption" 
                :label="true"
                @click.stop
              />
            </div>
            
            <div class="option-description">
              <p>适合刚开始使用 Beancount 或希望遵循最佳实践的用户</p>
              <ul class="feature-list">
                <li>✅ 包含标准目录结构和示例文件</li>
                <li>✅ 预配置账户体系和模板</li>
                <li>✅ 开箱即用，无需额外配置</li>
                <li>✅ 遵循 Beancount 最佳实践</li>
              </ul>
            </div>
          </el-card>

          <!-- 空仓库创建 -->
          <el-card 
            :class="['option-card', { 'selected': selectedOption === false }]"
            :body-style="{ padding: '20px' }"
            @click="selectOption(false)"
          >
            <div class="option-header">
              <el-icon class="option-icon empty-icon">
                <i-ep-folder />
              </el-icon>
              <div class="option-titles">
                <h4>空仓库创建</h4>
                <el-tag type="info" size="small">推荐迁移用户</el-tag>
              </div>
              <el-radio 
                :model-value="selectedOption" 
                :label="false"
                @click.stop
              />
            </div>
            
            <div class="option-description">
              <p>适合已有 Beancount 账本需要迁移的用户</p>
              <ul class="feature-list">
                <li>📁 创建空仓库，等待推送现有账本</li>
                <li>🔄 保留您现有的目录结构和配置</li>
                <li>⚡ 快速迁移，无需重新组织</li>
                <li>🛡️ 完全控制账本内容和结构</li>
              </ul>
            </div>
          </el-card>
        </div>

        <div class="action-buttons">
          <el-button 
            size="large"
            @click="backToIntro"
          >
            取消
          </el-button>
          <el-button 
            type="primary" 
            size="large"
            :loading="loading"
            :disabled="selectedOption === null"
            @click="createRepository"
          >
            <el-icon>
              <i-ep-check />
            </el-icon>
            创建仓库
          </el-button>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { createGitRepository } from '../../api/git'
import type { GitRepository } from '../../types/git'

// 组件属性
defineProps<{}>()

// 组件事件
const emit = defineEmits<{
  created: [repository: GitRepository]
}>()

// 响应式状态
const showOptions = ref(false)
const selectedOption = ref<boolean | null>(null)
const loading = ref(false)

// 方法
const showCreateOptions = () => {
  showOptions.value = true
  selectedOption.value = null
}

const backToIntro = () => {
  showOptions.value = false
  selectedOption.value = null
}

const selectOption = (option: boolean) => {
  selectedOption.value = option
}

const createRepository = async () => {
  if (selectedOption.value === null) {
    ElMessage.warning('请选择创建方式')
    return
  }

  loading.value = true
  
  try {
    const repository = await createGitRepository({
      template: selectedOption.value
    })
    
    ElMessage.success('Git 仓库创建成功！')
    emit('created', repository)
    
  } catch (error: any) {
    const message = error.response?.data?.error || '创建失败，请稍后重试'
    ElMessage.error(message)
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.git-setup {
  max-width: 800px;
  margin: 0 auto;
}

.intro-card,
.options-card {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-icon {
  color: #409EFF;
  font-size: 24px;
}

.card-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
}

.intro-content {
  padding: 0 8px;
}

.features-list {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 20px;
  margin-bottom: 24px;
}

.feature-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 16px;
  border-radius: 8px;
  background-color: var(--el-fill-color-lighter);
}

.feature-icon {
  color: #409EFF;
  font-size: 20px;
  margin-top: 2px;
  flex-shrink: 0;
}

.feature-item h4 {
  margin: 0 0 4px 0;
  font-size: 14px;
  font-weight: 600;
}

.feature-item p {
  margin: 0;
  font-size: 13px;
  color: var(--el-text-color-regular);
  line-height: 1.5;
}

.notice-alert {
  margin-bottom: 24px;
}

.notice-list {
  margin: 0;
  padding-left: 16px;
}

.notice-list li {
  margin-bottom: 4px;
  font-size: 13px;
  line-height: 1.4;
}

.action-buttons {
  text-align: center;
}

.options-content {
  padding: 0 8px;
}

.option-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 20px;
  margin-bottom: 32px;
}

.option-card {
  cursor: pointer;
  transition: all 0.2s;
  border: 2px solid transparent;
}

.option-card:hover {
  border-color: var(--el-border-color-hover);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.option-card.selected {
  border-color: #409EFF;
  box-shadow: 0 4px 12px rgba(64, 158, 255, 0.2);
}

.option-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.option-icon {
  font-size: 24px;
  flex-shrink: 0;
}

.template-icon {
  color: #67C23A;
}

.empty-icon {
  color: #909399;
}

.option-titles {
  flex: 1;
}

.option-titles h4 {
  margin: 0 0 4px 0;
  font-size: 16px;
  font-weight: 600;
}

.option-description p {
  margin: 0 0 12px 0;
  font-size: 14px;
  color: var(--el-text-color-regular);
  line-height: 1.5;
}

.feature-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.feature-list li {
  margin-bottom: 6px;
  font-size: 13px;
  line-height: 1.4;
  color: var(--el-text-color-regular);
}

.action-buttons {
  display: flex;
  justify-content: center;
  gap: 16px;
}

@media (max-width: 768px) {
  .features-list {
    grid-template-columns: 1fr;
  }
  
  .option-cards {
    grid-template-columns: 1fr;
  }
  
  .action-buttons {
    flex-direction: column;
    align-items: center;
  }
  
  .action-buttons .el-button {
    width: 100%;
    max-width: 200px;
  }
}
</style>

