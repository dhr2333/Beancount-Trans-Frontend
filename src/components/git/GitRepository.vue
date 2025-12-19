<template>
  <div class="git-repository">
    <el-card shadow="never" class="repo-card">
      <template #header>
        <div class="card-header">
          <div class="header-left">
            <div class="title-row">
              <el-icon class="header-icon">
                <i-ep-folder-opened />
              </el-icon>
              <span class="title">Git 仓库管理</span>
            </div>
            <el-text type="info" size="small" class="subtitle">管理您的 Git 仓库和同步设置</el-text>
          </div>
          <div class="header-right">
            <el-tag :type="SyncStatusType[repository.sync_status]" :icon="getSyncIcon(repository.sync_status)"
              effect="plain">
              {{ SyncStatusText[repository.sync_status] }}
            </el-tag>
            <el-button type="primary" link :loading="syncing" :disabled="repository.sync_status === 'syncing'"
              @click="triggerSync">
              <el-icon class="el-icon--left"><i-ep-refresh /></el-icon>
              {{ syncing ? '同步中...' : '立即同步' }}
            </el-button>
          </div>
        </div>
      </template>

      <!-- 仓库信息 -->
      <div class="repo-info-section">
        <el-descriptions border :column="3" class="repo-descriptions">
          <el-descriptions-item label="仓库名称">
            <span class="repo-name">{{ repository.repo_name }}</span>
          </el-descriptions-item>

          <el-descriptions-item label="创建方式">
            <el-tag :type="repository.created_with_template ? 'success' : 'info'" size="small" effect="light">
              {{ repository.created_with_template ? '基于模板' : '空仓库' }}
            </el-tag>
          </el-descriptions-item>

          <el-descriptions-item label="最后同步">
            <span v-if="repository.last_sync_at" class="sync-time">
              {{ formatDateTime(repository.last_sync_at) }}
            </span>
            <el-text v-else type="info" size="small">尚未同步</el-text>
          </el-descriptions-item>

          <el-descriptions-item label="SSH 地址" :span="3">
            <el-input :model-value="repository.ssh_clone_url" readonly class="ssh-url-input">
              <template #append>
                <el-button @click="copyToClipboard(repository.ssh_clone_url)">
                  <el-icon><i-ep-copy-document /></el-icon>
                  复制
                </el-button>
              </template>
            </el-input>
          </el-descriptions-item>
        </el-descriptions>

        <!-- 同步错误信息 -->
        <el-alert v-if="repository.sync_status === 'failed' && repository.sync_error" title="同步失败" type="error"
          :description="repository.sync_error" show-icon :closable="false" class="sync-error-alert" />
      </div>

      <!-- 操作按钮区域 -->
      <div class="actions-section">
        <el-button type="success" plain :loading="downloadingTrans" @click="downloadTrans" class="action-btn-main">
          <el-icon class="el-icon--left"><i-ep-download /></el-icon>
          下载解析结果
        </el-button>
        <el-button plain :loading="downloadingKey" @click="downloadDeployKey" class="action-btn-main">
          <el-icon class="el-icon--left"><i-ep-key /></el-icon>
          下载 Deploy Key
        </el-button>
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

# 添加 SSH 配置
cat >> ~/.ssh/config &lt;&lt; 'EOF'
Host gitea-beancount
        HostName gitea.dhr2333.cn
        Port 30022
        User git
        IdentityFile ~/Downloads/{{ username }}_deploy_key.pem
EOF</code></pre>
              </div>
            </div>
          </el-collapse-item>

          <el-collapse-item title="克隆仓库到本地" name="clone">
            <div class="instruction-content">
              <p>使用以下命令克隆仓库到本地：</p>
              <div class="code-block">
                <pre><code># 使用 SSH 并配置仓库别名
git clone gitea-beancount:beancount-trans/{{ repository.repo_name }}.git Assets
</code></pre>
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

# 推送到平台（二选一）
git push origin main

git push gitea-beancount:beancount-trans/c3965d-assets.git main</code></pre>
              </div>
              <p><strong>注意：</strong>推送后平台会自动同步，您也可以手动点击"立即同步"按钮。</p>
            </div>
          </el-collapse-item>

          <!-- 高级设置 -->
          <el-collapse-item name="advanced">
            <template #title>
              <div class="advanced-title">
                高级设置
                <el-text type="info" size="small" class="ml-2">（Deploy Key 重置、删除仓库）</el-text>
              </div>
            </template>
            <div class="advanced-settings">
              <!-- Deploy Key 重置 -->
              <div class="setting-item first-item">
                <div class="setting-info">
                  <span class="setting-label">重置 Deploy Key</span>
                  <span class="setting-desc">重置后旧密钥将失效，需要重新配置 SSH 访问</span>
                </div>
                <div class="setting-actions">
                  <el-popconfirm title="确定重置密钥吗？旧密钥将立即失效。" @confirm="confirmRegenerateKey" width="260">
                    <template #reference>
                      <el-button type="warning" plain size="small" :loading="regeneratingKey">
                        <el-icon class="el-icon--left"><i-ep-refresh /></el-icon>
                        重置 Key
                      </el-button>
                    </template>
                  </el-popconfirm>
                </div>
              </div>

              <div class="setting-divider"></div>

              <!-- 删除仓库 -->
              <div class="setting-item">
                <div class="setting-info">
                  <span class="setting-label text-danger">删除仓库</span>
                  <span class="setting-desc">永久删除 Git 仓库配置，此操作不可恢复</span>
                </div>
                <div class="setting-actions">
                  <el-popconfirm title="确定要删除仓库吗？这将停止同步并清除配置。" @confirm="confirmDeleteRepository" width="260">
                    <template #reference>
                      <el-button type="danger" plain size="small" :loading="deletingRepository">
                        <el-icon class="el-icon--left"><i-ep-delete /></el-icon>
                        删除仓库
                      </el-button>
                    </template>
                  </el-popconfirm>
                </div>
              </div>
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

const downloadTrans = async () => {
  downloadingTrans.value = true

  try {
    const result = await handleTransDownload()
    if (result.success) {
      ElMessage.success(result.message)
    } else {
      ElMessage.error(result.message)
    }
  } catch (error) {
    // 理论上 handleTransDownload 内部已经 catch 了所有 error 并返回 { success: false }，
    // 但为了保险起见，这里还是 catch 一下
    console.error(error)
    ElMessage.error('下载失败')
  } finally {
    downloadingTrans.value = false
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
  // 兼容 popconfirm 调用或直接调用，这里主要用于 logic 复用
  // 注意：template 中使用了 popconfirm，所以这里不需要 ElMessageBox 二次确认，
  // 除非逻辑需要保留双重确认。
  // Popconfirm 是 template 层的确认，触发 confirm 事件后会调用这个方法。
  // 因此这里直接执行业务逻辑。

  // 但是，如果直接移除 ElMessageBox，原来的 logic 就变了。
  // 让我检查 template。
  // <el-popconfirm @confirm="confirmRegenerateKey">
  // 那么 confirmRegenerateKey 里面就不应该再有 ElMessageBox 了，否则会弹两次。
  // 我将移除 confirmRegenerateKey 中的 ElMessageBox。

  regeneratingKey.value = true

  try {
    const result = await handleDeployKeyDownload(true)
    if (result.success) {
      ElMessage.success(result.message)
    } else {
      ElMessage.error(result.message)
    }
  } catch (error) {
    // handle error
    console.error(error)
  } finally {
    regeneratingKey.value = false
  }
}

// 删除仓库相关方法
const confirmDeleteRepository = async () => {
  // 同理，template 使用了 popconfirm
  await deleteRepository()
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

<style scoped lang="scss">
.git-repository {
  max-width: 900px;
  margin: 0 auto;
}

.repo-card {
  margin-bottom: 20px;
}

// Header Styles
.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;

  .header-left {
    display: flex;
    flex-direction: column;
    gap: 4px;

    .title-row {
      display: flex;
      align-items: center;
      gap: 8px;

      .header-icon {
        color: var(--ep-color-success);
        font-size: 20px;
      }

      .title {
        font-size: 16px;
        font-weight: 600;
        color: var(--ep-text-color-primary);
      }
    }
  }

  .header-right {
    display: flex;
    align-items: center;
    gap: 16px;
  }
}

// Info Section Styles
.repo-info-section {
  margin-bottom: 24px;
}

.repo-descriptions {
  :deep(.el-descriptions__label) {
    width: 120px;
  }
}

.repo-name {
  font-family: 'Monaco', 'Consolas', monospace;
  font-weight: 500;
  color: var(--ep-text-color-primary);
}

.sync-time {
  font-family: 'Monaco', 'Consolas', monospace;
  font-size: 13px;
}

.ssh-url-input {
  :deep(.el-input__inner) {
    font-family: 'Monaco', 'Consolas', monospace;
    font-size: 12px;
    color: var(--ep-text-color-regular);
  }
}

.sync-error-alert {
  margin-top: 16px;
}

// Actions Section Styles
.actions-section {
  padding-bottom: 24px;
  border-bottom: 1px solid var(--ep-border-color-lighter);
  margin-bottom: 24px;
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.action-btn-main {
  @media (max-width: 640px) {
    width: 100%;
  }
}

// Advanced Settings Styles
.advanced-title {
  display: flex;
  align-items: center;
}

.mr-2 {
  margin-right: 8px;
}

.ml-2 {
  margin-left: 8px;
}

.advanced-settings {
  padding: 8px;
}

.setting-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;

  &.first-item {
    padding-top: 4px;
  }

  @media (max-width: 640px) {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;

    .setting-actions {
      width: 100%;
      display: flex;
      justify-content: flex-end;
    }
  }
}

.setting-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding-right: 24px;
}

.setting-label {
  font-size: 14px;
  font-weight: 500;
  color: var(--ep-text-color-primary);

  &.text-danger {
    color: var(--ep-color-danger);
  }
}

.setting-desc {
  font-size: 13px;
  color: var(--ep-text-color-secondary);
}

.setting-actions {
  display: flex;
  gap: 12px;
  align-items: center;
  flex-shrink: 0;
}

.setting-divider {
  height: 1px;
  background-color: var(--ep-border-color-lighter);
  margin: 12px 0;
}

// Instructions Styles
.instructions-section {
  .section-title {
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 0 0 16px 0;
    font-size: 15px;
    font-weight: 600;
    color: var(--ep-text-color-primary);
  }
}

.instruction-content {
  padding: 0 8px;

  p {
    margin: 0 0 12px 0;
    line-height: 1.6;
    color: var(--ep-text-color-regular);
  }
}

.code-block {
  background-color: var(--ep-fill-color-light);
  border-radius: 6px;
  padding: 16px;
  margin: 12px 0;
  border: 1px solid var(--ep-border-color-lighter);

  pre {
    margin: 0;
    overflow-x: auto;
    font-family: 'Monaco', 'Consolas', monospace;

    code {
      font-family: inherit;
      font-size: 13px;
      line-height: 1.6;
      color: var(--ep-text-color-primary);
      background-color: transparent;
      display: block;
      white-space: pre;
    }
  }
}

// Responsive
@media (max-width: 768px) {
  .card-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;

    .header-right {
      width: 100%;
      justify-content: space-between;
    }
  }
}
</style>
