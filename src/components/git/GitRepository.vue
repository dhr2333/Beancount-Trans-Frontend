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
        <el-alert v-if="isLinkedRemote && showLinkedRemoteIntro" type="info" show-icon :closable="false"
          class="linked-remote-intro">
          <template #title>关联远程：完成平台侧对接</template>
          <p class="linked-intro-text">
            请按顺序展开下方<strong>步骤 1、步骤 2</strong>，在托管平台配置公钥与 Webhook。本地 Git 的克隆与推送由您自行完成，此处仅说明如何让平台从您的远程仓库拉取。
          </p>
          <el-text type="warning" size="small" class="mt-2">
            Webhook Secret 仅首次展示，请务必及时复制保存。刷新或重新进入页面后通常不再显示。如丢失请删除仓库后重新关联。
          </el-text>
        </el-alert>

        <el-descriptions border :column="3" class="repo-descriptions">
          <el-descriptions-item label="仓库名称">
            <span class="repo-name">{{ repository.repo_name }}</span>
          </el-descriptions-item>

          <el-descriptions-item label="创建方式">
            <el-tag :type="creationMethodTagType" size="small" effect="light">
              {{ creationMethodLabel }}
            </el-tag>
          </el-descriptions-item>

          <el-descriptions-item label="最后同步">
            <span v-if="repository.last_sync_at" class="sync-time">
              {{ formatDateTime(repository.last_sync_at) }}
            </span>
            <el-text v-else type="info" size="small">尚未同步</el-text>
          </el-descriptions-item>

          <el-descriptions-item label="SSH 克隆地址" :span="3">
            <el-input :model-value="repository.ssh_clone_url" readonly class="ssh-url-input">
              <template #append>
                <el-button @click="copyToClipboard(repository.ssh_clone_url)">
                  <el-icon><i-ep-copy-document /></el-icon>
                  复制
                </el-button>
              </template>
            </el-input>
          </el-descriptions-item>

          <el-descriptions-item v-if="!isLinkedRemote && repository.webhook_callback_url" label="Webhook URL" :span="3">
            <el-input :model-value="repository.webhook_callback_url" readonly class="ssh-url-input">
              <template #append>
                <el-button @click="copyToClipboard(repository.webhook_callback_url!)">
                  <el-icon><i-ep-copy-document /></el-icon>
                  复制
                </el-button>
              </template>
            </el-input>
          </el-descriptions-item>

          <el-descriptions-item v-if="!isLinkedRemote && repository.webhook_secret" label="Webhook Secret" :span="3">
            <el-alert type="warning" :closable="false" show-icon class="webhook-secret-alert" title="仅首次展示，请立即复制保存"
              description="填入远程 Webhook 的 Secret / Token / 密钥字段。刷新或重新进入页面后通常不再显示；若未保存，可删除本 Git 仓库重新关联。" />
            <el-input :model-value="repository.webhook_secret" readonly class="ssh-url-input mt-2" />
            <el-button class="mt-2" size="small" type="primary" plain
              @click="copyToClipboard(repository.webhook_secret!)">
              <el-icon><i-ep-copy-document /></el-icon>
              复制 Secret
            </el-button>
          </el-descriptions-item>

          <el-descriptions-item v-if="!isLinkedRemote && repository.deploy_key_public && !isPlatformHosted"
            label="Deploy Key 公钥" :span="3">
            <el-input type="textarea" :rows="3" :model-value="repository.deploy_key_public" readonly
              class="ssh-url-input" />
            <el-button class="mt-2" size="small" @click="copyToClipboard(repository.deploy_key_public!)">
              <el-icon><i-ep-copy-document /></el-icon>
              复制公钥
            </el-button>
          </el-descriptions-item>
        </el-descriptions>

        <div v-if="repository.setup_instructions?.length && !isLinkedRemote" class="setup-hints">
          <h4 class="section-title small-title">
            <el-icon><i-ep-info-filled /></el-icon>
            Webhook 与远程配置提示
          </h4>
          <ul class="hint-list">
            <li v-for="(line, idx) in repository.setup_instructions" :key="idx">{{ line }}</li>
          </ul>
        </div>

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
        <el-button v-if="!isLinkedRemote" type="primary" plain :loading="downloadingKey" @click="downloadDeployKey"
          class="action-btn-main">
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

        <el-collapse v-model="instructionActivePanels">
          <!-- 关联远程：仅平台对接（与「平台创建仓库」的克隆/推送说明区分） -->
          <el-collapse-item v-if="isLinkedRemote" title="步骤 1：添加 Deploy Key 公钥（平台拉取）" name="link-deploy-key">
            <div class="instruction-content link-step-panel">
              <p>平台通过 Deploy Key 公钥从您的远程仓库拉取账本，与您在本地执行 <code>git push</code> 时使用的账户或 SSH
                密钥<strong>无关</strong>。</p>
              <p>在 <strong>GitHub / GitLab / Gitea</strong> 打开该仓库 → <strong>Settings</strong> → <strong>Deploy
                  keys</strong>（或同类入口）→
                粘贴下方公钥，并勾选<strong>只读</strong>。</p>
              <template v-if="repository.deploy_key_public">
                <el-input type="textarea" :rows="4" :model-value="repository.deploy_key_public" readonly
                  class="ssh-url-input" />
                <el-button class="mt-2" size="small" type="primary" plain
                  @click="copyToClipboard(repository.deploy_key_public!)">
                  <el-icon><i-ep-copy-document /></el-icon>
                  复制公钥
                </el-button>
              </template>
              <el-text v-else type="warning" size="small">未返回公钥时请联系管理员或刷新页面后重试。</el-text>
            </div>
          </el-collapse-item>

          <el-collapse-item v-if="isLinkedRemote" title="步骤 2：配置 Webhook（推送后自动拉取）" name="link-webhook">
            <div class="instruction-content link-step-panel">
              <p>
                在仓库的 <strong>Webhooks</strong> 中新增一条：<strong>Payload URL</strong> 使用下方地址；<strong>Content type</strong>
                选择
                <code>application/json</code>；事件勾选 <strong>push</strong>。将平台提供的 Secret 填入托管方要求的字段。
              </p>
              <p>
                仅当推送分支为默认分支 <code>{{ defaultBranch }}</code> 时，平台才会执行拉取；也可随时使用页头的 <strong>立即同步</strong> 手动拉取。
              </p>
              <template v-if="repository.webhook_callback_url">
                <p class="mono-label">Webhook URL</p>
                <el-input :model-value="repository.webhook_callback_url" readonly class="ssh-url-input">
                  <template #append>
                    <el-button @click="copyToClipboard(repository.webhook_callback_url!)">
                      <el-icon><i-ep-copy-document /></el-icon>
                      复制
                    </el-button>
                  </template>
                </el-input>
              </template>
              <template v-if="repository.webhook_secret">
                <el-alert type="warning" :closable="false" show-icon class="webhook-secret-alert mt-2"
                  title="Webhook Secret 仅首次展示，请立即复制保存"
                  description="刷新或重新进入页面后通常不再显示。若未保存，需删除本 Git 配置后重新关联，并在远程更新 Webhook。" />
                <el-input :model-value="repository.webhook_secret" readonly class="ssh-url-input mt-2" />
                <el-button class="mt-2" size="small" type="primary" plain
                  @click="copyToClipboard(repository.webhook_secret!)">
                  <el-icon><i-ep-copy-document /></el-icon>
                  复制 Secret
                </el-button>
              </template>
              <p v-else-if="repository.webhook_callback_url" class="secret-missing-hint">
                若此处未显示 Secret，可能已刷新过页面；请在各托管平台按文档更新密钥，或删除仓库后重新关联以获取新 Secret。
              </p>
            </div>
          </el-collapse-item>

          <el-collapse-item v-if="!isLinkedRemote" title="配置 SSH 密钥" name="ssh">
            <div class="instruction-content">
              <template v-if="isPlatformHosted">
                <p>下载 Deploy Key 后，需要配置 SSH 以访问平台 Gitea：</p>
                <div class="code-block">
                  <pre><code># 设置 SSH 密钥权限
chmod 600 ~/Downloads/{{ username }}_deploy_key.pem

# 添加 SSH 配置（示例，HostName/Port 以实际部署为准）
cat >> ~/.ssh/config &lt;&lt; 'EOF'
Host gitea-beancount
        HostName gitea.dhr2333.cn
        Port 30022
        User git
        IdentityFile ~/Downloads/{{ username }}_deploy_key.pem
EOF</code></pre>
                </div>
              </template>
              <template v-else>
                <p>下载 Deploy Key 私钥后，在本地配置 <code>IdentityFile</code> 指向该文件，或使用 <code>ssh-agent</code> 加载密钥，确保能访问上方「SSH
                  克隆地址」。</p>
                <p>在 GitHub / GitLab / Gitea 仓库设置中添加 Deploy Key，并粘贴「Deploy Key 公钥」。</p>
              </template>
            </div>
          </el-collapse-item>

          <el-collapse-item v-if="!isLinkedRemote" title="克隆仓库到本地" name="clone">
            <div class="instruction-content">
              <p>使用 SSH 克隆地址：</p>
              <div class="code-block">
                <pre><code>git clone {{ repository.ssh_clone_url }} Assets</code></pre>
              </div>
              <p v-if="isPlatformHosted">若已按上文配置 <code>Host gitea-beancount</code>，也可使用别名形式克隆。</p>
            </div>
          </el-collapse-item>

          <el-collapse-item v-if="!isLinkedRemote" title="推送与同步" name="push">
            <div class="instruction-content">
              <p>编辑账本后推送到默认分支 <code>{{ defaultBranch }}</code>：</p>
              <div class="code-block">
                <pre><code>git add .
git commit -m "更新账本"
git push origin {{ defaultBranch }}</code></pre>
              </div>
              <p v-if="repository.webhook_callback_url"><strong>Webhook：</strong>推送至上述分支且远程已配置 Webhook
                后，平台会尝试自动拉取；也可手动点击「立即同步」。</p>
              <p v-else><strong>注意：</strong>平台托管仓库由 Gitea 触发同步；您也可随时使用「立即同步」。</p>
            </div>
          </el-collapse-item>

          <!-- 高级设置 -->
          <el-collapse-item name="advanced">
            <template #title>
              <div class="advanced-title">
                高级设置
                <el-text type="info" size="small" class="ml-2">
                  （{{ isLinkedRemote ? '删除仓库' : 'Deploy Key 重置、删除仓库' }}）
                </el-text>
              </div>
            </template>
            <div class="advanced-settings">
              <!-- Deploy Key 重置（平台托管 / 其他非关联远程场景） -->
              <template v-if="!isLinkedRemote">
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
              </template>

              <!-- 删除仓库 -->
              <div class="setting-item" :class="{ 'first-item': isLinkedRemote }">
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
import { ref, computed, watch, onBeforeUnmount } from 'vue'
import { ElMessage } from 'element-plus'
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

const defaultBranch = computed(() => (props.repository.default_branch || 'main').trim() || 'main')

const isPlatformHosted = computed(
  () =>
    props.repository.provider === 'gitea_hosted' &&
    !(props.repository.remote_ssh_url || '').trim()
)

/** 关联已有远程：显式 link，或未返回 setup_mode 时由非平台托管 + SSH 地址推断 */
const isLinkedRemote = computed(() => {
  const mode = props.repository.setup_mode
  if (mode === 'link') return true
  if (mode === 'create') return false
  const url = (props.repository.remote_ssh_url || '').trim()
  return url.length > 0 && props.repository.provider !== 'gitea_hosted'
})

const creationMethodLabel = computed(() => {
  if (isLinkedRemote.value) return '关联'
  if (props.repository.created_with_template) return '模板创建'
  return '空仓库'
})

const creationMethodTagType = computed<'success' | 'warning' | 'info'>(() => {
  if (isLinkedRemote.value) return 'warning'
  if (props.repository.created_with_template) return 'success'
  return 'info'
})

const instructionActivePanels = ref<string[]>([])

/** 关联远程顶部引导：每个仓库 id 仅首次进入时展示，之后写入 localStorage 不再出现 */
const showLinkedRemoteIntro = ref(false)

function linkedRemoteIntroStorageKey(repoId: number): string {
  const u = localStorage.getItem('username') || 'anon'
  return `git_linked_remote_intro_seen_${u}_${repoId}`
}

/**
 * 必须在「根据 storage 设置 showLinkedRemoteIntro」的 watch 之前注册。
 * 否则后者 immediate 会把 ref 直接设为 true，本 watch 看不到 false→true，永远不会写入 localStorage。
 */
watch(
  showLinkedRemoteIntro,
  (show) => {
    if (!show || !isLinkedRemote.value || !props.repository.id) return
    const key = linkedRemoteIntroStorageKey(props.repository.id)
    if (localStorage.getItem(key)) return
    localStorage.setItem(key, '1')
  },
  { immediate: true }
)

watch(
  () => [isLinkedRemote.value, props.repository.id] as const,
  ([linked, repoId]) => {
    if (!linked || !repoId) {
      showLinkedRemoteIntro.value = false
      return
    }
    const key = linkedRemoteIntroStorageKey(repoId)
    showLinkedRemoteIntro.value = !localStorage.getItem(key)
  },
  { immediate: true }
)

onBeforeUnmount(() => {
  if (
    showLinkedRemoteIntro.value &&
    isLinkedRemote.value &&
    props.repository.id
  ) {
    localStorage.setItem(
      linkedRemoteIntroStorageKey(props.repository.id),
      '1'
    )
  }
})

/** 关联远程：使用说明默认全部折叠 */
watch(
  isLinkedRemote,
  (linked) => {
    if (linked) {
      instructionActivePanels.value = []
    }
  },
  { immediate: true }
)

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

.linked-remote-intro {
  margin-bottom: 16px;

  .linked-intro-text {
    margin: 0;
    line-height: 1.6;
    font-size: 13px;
    color: var(--ep-text-color-regular);
  }
}

.field-hint-below {
  display: block;
  margin-top: 8px;
  line-height: 1.5;
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

.webhook-secret-alert {
  margin-bottom: 8px;
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
.setup-hints {
  margin: 16px 0;
  padding: 12px 16px;
  border-radius: 8px;
  background: var(--ep-fill-color-lighter);
  border: 1px solid var(--ep-border-color-lighter);
}

.hint-list {
  margin: 8px 0 0;
  padding-left: 20px;
  font-size: 13px;
  line-height: 1.55;
  color: var(--ep-text-color-regular);
}

.mono-text {
  font-family: 'Monaco', 'Consolas', monospace;
  font-size: 13px;
}

.small-title {
  margin: 0 0 8px 0;
  font-size: 14px;
}

.mt-2 {
  margin-top: 8px;
}

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

.link-step-panel {
  .mono-label {
    margin: 12px 0 6px 0;
    font-size: 12px;
    font-weight: 500;
    color: var(--ep-text-color-secondary);
  }

  .secret-missing-hint {
    margin: 8px 0 0 0;
    font-size: 13px;
    color: var(--ep-text-color-secondary);
  }
}

.link-platform-list {
  margin: 0;
  padding-left: 20px;
  line-height: 1.55;
  font-size: 13px;
  color: var(--ep-text-color-regular);
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
