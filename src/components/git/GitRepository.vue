<template>
  <div class="git-repository">
    <el-card shadow="never" class="repo-card">
      <template #header>
        <div class="card-header">
          <el-icon class="header-icon">
            <i-ep-folder-opened />
          </el-icon>
          <div>
            <h3>Git 仓库管理</h3>
            <el-text type="info" size="small">管理您的 Git 仓库和同步设置</el-text>
          </div>
          <el-tag :type="SyncStatusType[repository.sync_status]" :icon="getSyncIcon(repository.sync_status)">
            {{ SyncStatusText[repository.sync_status] }}
          </el-tag>
        </div>
      </template>

      <!-- 仓库信息 -->
      <div class="repo-info-section">
        <h4 class="section-title">
          <el-icon><i-ep-info-filled /></el-icon>
          仓库信息
        </h4>

        <div class="info-grid">
          <div class="info-item">
            <label>仓库名称：</label>
            <span class="repo-name">{{ repository.repo_name }}</span>
          </div>

          <div class="info-item">
            <label>创建方式：</label>
            <el-tag :type="repository.created_with_template ? 'success' : 'info'" size="small">
              {{ repository.created_with_template ? '基于模板' : '空仓库' }}
            </el-tag>
          </div>

          <!-- <div class="info-item">
            <label>HTTPS 地址：</label>
            <div class="url-display">
              <code class="repo-url">{{ repository.repo_url }}</code>
              <el-button 
                type="primary" 
                text 
                size="small"
                @click="copyToClipboard(repository.repo_url)"
              >
                <el-icon><i-ep-copy-document /></el-icon>
                复制
              </el-button>
            </div>
          </div>
           -->
          <div class="info-item">
            <label>SSH 地址：</label>
            <div class="url-display">
              <code class="repo-url">{{ repository.ssh_clone_url }}</code>
              <el-button type="primary" text size="small" @click="copyToClipboard(repository.ssh_clone_url)">
                <el-icon><i-ep-copy-document /></el-icon>
                复制
              </el-button>
            </div>
          </div>

          <div class="info-item">
            <label>最后同步：</label>
            <span v-if="repository.last_sync_at" class="sync-time">
              {{ formatDateTime(repository.last_sync_at) }}
            </span>
            <el-text v-else type="info" size="small">尚未同步</el-text>
          </div>
        </div>

        <!-- 同步错误信息 -->
        <el-alert v-if="repository.sync_status === 'failed' && repository.sync_error" title="同步失败" type="error"
          :description="repository.sync_error" show-icon :closable="false" class="sync-error-alert" />
      </div>

      <!-- 操作按钮区域 -->
      <div class="actions-section">
        <h4 class="section-title">
          <el-icon><i-ep-setting /></el-icon>
          仓库操作
        </h4>

        <div class="action-buttons">
          <!-- 同步操作 -->
          <div class="button-group">
            <h5 class="group-title">同步管理</h5>
            <div class="buttons">
              <el-button type="primary" :loading="syncing" :disabled="repository.sync_status === 'syncing'"
                @click="triggerSync">
                <el-icon v-if="!syncing">
                  <i-ep-refresh />
                </el-icon>
                {{ syncing ? '同步中...' : '立即同步' }}
              </el-button>

              <el-button type="success" :loading="downloadingTrans" @click="downloadTrans">
                <el-icon v-if="!downloadingTrans">
                  <i-ep-download />
                </el-icon>
                下载解析结果
              </el-button>
            </div>
          </div>

          <!-- Deploy Key 操作 -->
          <div class="button-group">
            <h5 class="group-title">Deploy Key 管理</h5>
            <div class="buttons">
              <el-button type="info" :loading="downloadingKey" @click="downloadDeployKey">
                <el-icon v-if="!downloadingKey">
                  <i-ep-key />
                </el-icon>
                下载 Deploy Key
              </el-button>

              <el-button type="warning" :loading="regeneratingKey" @click="confirmRegenerateKey">
                <el-icon v-if="!regeneratingKey">
                  <i-ep-refresh />
                </el-icon>
                重新生成 Deploy Key
              </el-button>
            </div>
          </div>

          <!-- 仓库管理 -->
          <div class="button-group">
            <h5 class="group-title">仓库管理</h5>
            <div class="buttons">
              <el-button type="danger" :loading="deletingRepository" @click="confirmDeleteRepository">
                <el-icon v-if="!deletingRepository">
                  <i-ep-delete />
                </el-icon>
                删除仓库
              </el-button>
            </div>
          </div>
        </div>
      </div>

      <!-- 使用说明 -->
      <div class="instructions-section">
        <h4 class="section-title">
          <el-icon><i-ep-document /></el-icon>
          使用说明
        </h4>

        <el-collapse>
          <el-collapse-item title="配置 SSH 密钥" name="ssh">
            <div class="instruction-content">
              <p>下载 Deploy Key 后，需要配置 SSH 以使用该密钥：</p>
              <div class="code-block">
                <pre><code># 设置 SSH 密钥权限
              chmod 600 ~/Downloads/{{ username }}_deploy_key.pem

              # 添加 SSH 配置（可选）
              cat >> ~/.ssh/config << 'EOF' Host gitea-beancount HostName gitea.dhr2333.cn Port 30022 User git
                IdentityFile ~/Downloads/{{ username }}_deploy_key.pem EOF</code>
          </pre>
              </div>
            </div>
          </el-collapse-item>

          <el-collapse-item title="克隆仓库到本地" name="clone">
            <div class="instruction-content">
              <p>使用以下命令克隆仓库到本地：</p>
              <div class="code-block">
                <pre><code># 使用 SSH 并配置仓库别名（推荐）
              git clone {{ repository.ssh_clone_url }} Assets

              # 或使用配置的别名
              git clone gitea-beancount:beancount-trans/{{ repository.repo_name }}.git Assets</code></pre>
              </div>
            </div>
          </el-collapse-item>

          <el-collapse-item title="推送修改到平台" name="push">
            <div class="instruction-content">
              <p>编辑账本后，推送修改到平台：</p>
              <div class="code-block">
                <pre><code># 添加修改
              git add .

              # 提交修改
              git commit -m "更新账本"

              # 推送到平台
              git push origin main</code></pre>
              </div>
              <p><strong>注意：</strong>推送后平台会自动同步，您也可以手动点击"立即同步"按钮。</p>
            </div>
          </el-collapse-item>
        </el-collapse>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  triggerSync as apiTriggerSync,
  handleDeployKeyDownload,
  handleTransDownload,
  pollSyncStatus,
  deleteGitRepository as apiDeleteGitRepository
} from '../../api/git'
import {
  SyncStatusText,
  SyncStatusType,
  SyncStatusIcon,
  type GitRepository
} from '../../types/git'

// 组件属性
const props = defineProps<{
  repository: GitRepository
}>()

// 组件事件
const emit = defineEmits<{
  updated: [repository: GitRepository]
  deleted: []
}>()

// 响应式状态
const syncing = ref(false)
const downloadingKey = ref(false)
const regeneratingKey = ref(false)
const downloadingTrans = ref(false)
const deletingRepository = ref(false)

// 计算属性
const username = computed(() => localStorage.getItem('username') || 'user')

// 工具方法
const getSyncIcon = (status: string) => {
  const iconMap = {
    'pending': 'Clock',
    'syncing': 'Loading',
    'success': 'Check',
    'failed': 'Close'
  }
  return iconMap[status as keyof typeof iconMap]
}

const formatDateTime = (dateString: string) => {
  return new Date(dateString).toLocaleString('zh-CN')
}

const copyToClipboard = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text)
    ElMessage.success('已复制到剪贴板')
  } catch {
    // 降级方案
    const textArea = document.createElement('textarea')
    textArea.value = text
    document.body.appendChild(textArea)
    textArea.select()
    document.execCommand('copy')
    document.body.removeChild(textArea)
    ElMessage.success('已复制到剪贴板')
  }
}

// API 方法
const triggerSync = async () => {
  syncing.value = true

  try {
    const response = await apiTriggerSync()
    ElMessage.success(response.message)

    // 开始轮询状态
    await pollSyncStatus((status) => {
      // 更新本地状态
      const updatedRepo = {
        ...props.repository,
        sync_status: status.status,
        last_sync_at: status.last_sync_at,
        sync_error: status.error || ''
      }
      emit('updated', updatedRepo)
    })

  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'response' in error) {
      const axiosError = error as { response?: { data?: { error?: string } } }
      const message = axiosError.response?.data?.error || '同步失败，请稍后重试'
      ElMessage.error(message)
    } else {
      ElMessage.error('网络错误，请稍后重试')
    }
  } finally {
    syncing.value = false
  }
}

const downloadDeployKey = async () => {
  downloadingKey.value = true

  try {
    const result = await handleDeployKeyDownload(false)
    if (result.success) {
      ElMessage.success(result.message)
    } else {
      ElMessage.error(result.message)
    }
  } finally {
    downloadingKey.value = false
  }
}

const confirmRegenerateKey = async () => {
  try {
    await ElMessageBox.confirm(
      '重新生成 Deploy Key 后，您需要重新配置 SSH 密钥。确定继续吗？',
      '确认重新生成',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      }
    )

    regeneratingKey.value = true

    try {
      const result = await handleDeployKeyDownload(true)
      if (result.success) {
        ElMessage.success(result.message)
      } else {
        ElMessage.error(result.message)
      }
    } finally {
      regeneratingKey.value = false
    }

  } catch {
    // 用户取消
  }
}

const downloadTrans = async () => {
  downloadingTrans.value = true

  try {
    const result = await handleTransDownload()
    if (result.success) {
      ElMessage.success(result.message)
    } else {
      ElMessage.error(result.message)
    }
  } finally {
    downloadingTrans.value = false
  }
}

// 删除仓库相关方法
const confirmDeleteRepository = async () => {
  try {
    await ElMessageBox.confirm(
      '删除仓库将停止 Git 同步功能，同时删除远程仓库和数据库记录，并将本地目录结构恢复为未启用 Git 之前的状态。确定继续吗？',
      '确认删除仓库',
      {
        confirmButtonText: '确定删除',
        cancelButtonText: '取消',
        type: 'warning',
        closeOnClickModal: false
      }
    )

    await deleteRepository()

  } catch {
    // 用户取消
  }
}

const deleteRepository = async () => {
  deletingRepository.value = true

  try {
    const response = await apiDeleteGitRepository()
    ElMessage.success('仓库删除成功')

    // 通知父组件仓库已删除
    emit('deleted')
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'response' in error) {
      const axiosError = error as { response?: { data?: { error?: string } } }
      const message = axiosError.response?.data?.error || '仓库删除失败，请稍后重试'
      ElMessage.error(message)
    } else {
      ElMessage.error('网络错误，请稍后重试')
    }
  } finally {
    deletingRepository.value = false
  }
}
</script>

<style scoped>
.git-repository {
  max-width: 900px;
  margin: 0 auto;
}

.repo-card {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-icon {
  color: #67C23A;
  font-size: 24px;
}

.card-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  flex: 1;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 16px 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.repo-info-section {
  padding-bottom: 24px;
  border-bottom: 1px solid var(--el-border-color-lighter);
  margin-bottom: 24px;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 16px;
}

.info-item {
  display: flex;
  align-items: flex-start;
  gap: 8px;
}

.info-item label {
  font-weight: 500;
  min-width: 80px;
  color: var(--el-text-color-secondary);
}

.repo-name {
  font-family: 'Monaco', 'Consolas', monospace;
  font-weight: 500;
}

.url-display {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
}

.repo-url {
  font-family: 'Monaco', 'Consolas', monospace;
  font-size: 12px;
  background-color: var(--el-fill-color-light);
  padding: 4px 8px;
  border-radius: 4px;
  flex: 1;
  word-break: break-all;
}

.sync-time {
  font-family: 'Monaco', 'Consolas', monospace;
  font-size: 13px;
}

.sync-error-alert {
  margin-top: 16px;
}

.actions-section {
  padding-bottom: 24px;
  border-bottom: 1px solid var(--el-border-color-lighter);
  margin-bottom: 24px;
}

.action-buttons {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 24px;
}

.button-group {
  padding: 16px;
  background-color: var(--el-fill-color-lighter);
  border-radius: 8px;
}

.group-title {
  margin: 0 0 12px 0;
  font-size: 14px;
  font-weight: 500;
  color: var(--el-text-color-secondary);
}

.buttons {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.instructions-section .section-title {
  margin-bottom: 12px;
}

.instruction-content {
  padding: 0 8px;
}

.instruction-content p {
  margin: 0 0 12px 0;
  line-height: 1.6;
}

.code-block {
  background-color: #f5f7fa;
  border-radius: 6px;
  padding: 12px;
  margin: 12px 0;
  font-family: 'Monaco', 'Consolas', monospace;
  font-size: 12px;
  line-height: 1.4;
  overflow-x: auto;
}

.code-block pre {
  margin: 0;
}

@media (max-width: 768px) {
  .info-grid {
    grid-template-columns: 1fr;
  }

  .info-item {
    flex-direction: column;
  }

  .info-item label {
    min-width: auto;
  }

  .action-buttons {
    grid-template-columns: 1fr;
  }

  .buttons {
    flex-direction: column;
  }
}
</style>