<template>
    <div class="settings-container">
        <div v-if="isAuthenticated">
            <el-card class="settings-card" shadow="hover">
                <template #header>
                    <div class="card-header">
                        <h2>个人设置</h2>
                        <el-text type="info" size="small">管理您的账户和安全设置</el-text>
                    </div>
                </template>

                <el-tabs v-model="activeTab" class="settings-tabs">
                    <!-- Git 同步 -->
                    <el-tab-pane label="Git 同步" name="git">
                        <GitSetup v-if="!gitRepository" @created="onGitRepositoryCreated" />
                        <GitRepositoryComponent v-else :repository="gitRepository" @updated="onGitRepositoryUpdated"
                            @deleted="onGitRepositoryDeleted" />
                    </el-tab-pane>

                    <!-- 账户绑定 -->
                    <el-tab-pane label="账户绑定" name="bindings">
                        <el-card shadow="never" class="section-card">
                            <template #header>
                                <h3>账户绑定</h3>
                                <!-- <el-text type="info" size="small">绑定多种登录方式，提高账户安全性</el-text> -->
                            </template>

                            <!-- 手机号绑定 -->
                            <div class="binding-item">
                                <div class="binding-info">
                                    <el-icon class="binding-icon">
                                        <Phone />
                                    </el-icon>
                                    <div class="binding-details">
                                        <div class="binding-label">手机号</div>
                                        <div class="binding-value">
                                            {{ bindings.phone_number || '未绑定' }}
                                            <el-tag v-if="bindings.phone_verified" type="success" size="small"
                                                style="margin-left: 8px">
                                                已验证
                                            </el-tag>
                                        </div>
                                    </div>
                                </div>
                                <div class="binding-actions">
                                    <el-button v-if="!bindings.phone_number" type="primary"
                                        @click="showBindPhoneDialog = true">
                                        绑定
                                    </el-button>
                                    <el-button v-else type="danger" plain @click="handleUnbindPhone">
                                        解绑
                                    </el-button>
                                </div>
                            </div>

                            <!-- 邮箱绑定 -->
                            <div class="binding-item">
                                <div class="binding-info">
                                    <el-icon class="binding-icon">
                                        <Message />
                                    </el-icon>
                                    <div class="binding-details">
                                        <div class="binding-label">邮箱</div>
                                        <div class="binding-value">
                                            {{ bindings.email || '未绑定' }}
                                            <el-tag v-if="bindings.email" type="success" size="small"
                                                style="margin-left: 8px">
                                                已验证
                                            </el-tag>
                                        </div>
                                    </div>
                                </div>
                                <div class="binding-actions">
                                    <el-button v-if="!bindings.email" type="primary"
                                        @click="showUpdateEmailDialog = true">
                                        绑定
                                    </el-button>
                                    <el-button v-else type="danger" plain @click="handleUnbindEmail">
                                        解绑
                                    </el-button>
                                </div>
                            </div>

                            <!-- GitHub OAuth绑定 -->
                            <div class="binding-item">
                                <div class="binding-info">
                                    <el-icon class="binding-icon">
                                        <svg viewBox="0 0 24 24" fill="currentColor">
                                            <path
                                                d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                                        </svg>
                                    </el-icon>
                                    <div class="binding-details">
                                        <div class="binding-label">GitHub</div>
                                        <div class="binding-value">
                                            {{ getGitHubAccount() || '未绑定' }}
                                            <el-tag v-if="getGitHubAccount()" type="success" size="small"
                                                style="margin-left: 8px">
                                                已验证
                                            </el-tag>
                                        </div>
                                    </div>
                                </div>
                                <div class="binding-actions">
                                    <el-button v-if="!getGitHubAccount()" type="primary" @click="bindGitHub">
                                        绑定
                                    </el-button>
                                    <el-button v-else type="danger" plain @click="handleUnbindSocial('github')">
                                        解绑
                                    </el-button>
                                </div>
                            </div>
                        </el-card>
                    </el-tab-pane>

                    <!-- 安全设置 -->
                    <el-tab-pane label="安全设置" name="security">
                        <!-- 用户名和密码 -->
                        <el-card shadow="never" class="section-card">
                            <template #header>
                                <h3>账户安全</h3>
                            </template>

                            <div class="security-item">
                                <div class="security-info">
                                    <el-icon class="security-icon">
                                        <User />
                                    </el-icon>
                                    <div class="security-details">
                                        <div class="security-label">用户名</div>
                                        <div class="security-value">{{ bindings.username }}</div>
                                    </div>
                                </div>
                                <div class="security-actions">
                                    <el-button type="default" @click="showUpdateUsernameDialog = true">
                                        修改
                                    </el-button>
                                </div>
                            </div>

                            <div class="security-item">
                                <div class="security-info">
                                    <el-icon class="security-icon">
                                        <Lock />
                                    </el-icon>
                                    <div class="security-details">
                                        <div class="security-label">密码</div>
                                        <div class="security-value">
                                            <el-text v-if="bindings.has_password" type="success">已设置</el-text>
                                            <el-text v-else type="info">未设置</el-text>
                                        </div>
                                    </div>
                                </div>
                                <div class="security-actions">
                                    <el-button :type="bindings.has_password ? 'default' : 'primary'"
                                        @click="showSetPasswordDialog = true">
                                        重置
                                    </el-button>
                                </div>
                            </div>

                            <!-- TOTP 认证 -->
                            <div class="security-item">
                                <div class="security-info">
                                    <el-icon class="security-icon">
                                        <Lock />
                                    </el-icon>
                                    <div class="security-details">
                                        <div class="security-label">
                                            <strong>TOTP 认证</strong>
                                            <el-text type="info" size="small" style="margin-left: 8px">
                                                （使用 Google Authenticator 等应用）
                                            </el-text>
                                        </div>
                                        <div class="security-value">
                                            <el-text v-if="twoFactorStatus.totp_enabled" type="success"
                                                size="small">已启用</el-text>
                                            <el-text v-else type="info" size="small">未启用</el-text>
                                        </div>
                                    </div>
                                </div>
                                <div class="security-actions">
                                    <el-button v-if="!twoFactorStatus.totp_enabled" type="primary"
                                        @click="handleEnableTOTP">
                                        启用
                                    </el-button>
                                    <el-button v-else type="danger" plain @click="handleDisableTOTP">
                                        禁用
                                    </el-button>
                                </div>
                            </div>
                        </el-card>

                        <!-- 危险操作 -->
                        <el-card shadow="never" class="section-card danger-card">
                            <template #header>
                                <h3>危险操作</h3>
                            </template>

                            <div class="danger-zone">
                                <div class="danger-zone__item">
                                    <div class="danger-zone__content">
                                        <div class="danger-zone__title">删除账户</div>
                                        <p>删除账户将永久删除您的所有数据，包括账单文件、账户配置、映射规则等。
                                            <strong>此操作不可恢复！</strong>
                                        </p>
                                    </div>
                                    <div class="danger-zone__actions">
                                        <el-button type="danger" plain class="danger-zone__button"
                                            @click="showDeleteAccountDialog = true">
                                            删除账户
                                        </el-button>
                                    </div>
                                </div>
                            </div>
                        </el-card>
                    </el-tab-pane>
                </el-tabs>
            </el-card>

            <!-- 绑定手机号对话框 -->
            <el-dialog v-model="showBindPhoneDialog" title="绑定手机号" width="400px">
                <el-form ref="bindPhoneFormRef" :model="bindPhoneForm" :rules="bindPhoneRules">
                    <el-form-item label="手机号" prop="phone_number">
                        <el-input v-model="bindPhoneForm.phone_number" placeholder="请输入手机号" />
                    </el-form-item>
                    <el-form-item label="验证码" prop="code">
                        <div class="code-input-group">
                            <el-input v-model="bindPhoneForm.code" placeholder="请输入验证码" maxlength="6" />
                            <el-button :disabled="!canSendCode || codeSending" :loading="codeSending"
                                @click="sendBindCode">
                                {{ codeSending ? `${countdown}s` : '发送验证码' }}
                            </el-button>
                        </div>
                    </el-form-item>
                </el-form>
                <template #footer>
                    <el-button @click="showBindPhoneDialog = false">取消</el-button>
                    <el-button type="primary" :loading="bindPhoneLoading" @click="handleBindPhone">确定</el-button>
                </template>
            </el-dialog>

            <!-- TOTP启用对话框 -->
            <el-dialog v-model="showTOTPDialog" title="启用TOTP双因素认证" width="500px">
                <div v-if="totpQRCode">
                    <el-text>请使用手机应用扫描以下二维码，或手动输入密钥：</el-text>
                    <div style="text-align: center; margin: 20px 0">
                        <img :src="totpQRCode" alt="TOTP QR Code" style="max-width: 300px" />
                    </div>
                    <el-form-item label="密钥（Secret）">
                        <el-input v-model="totpSecret" readonly>
                            <template #append>
                                <el-button @click="copySecret">
                                    <el-icon>
                                        <DocumentCopy />
                                    </el-icon>
                                    复制
                                </el-button>
                            </template>
                        </el-input>
                        <el-text type="info" size="small">如果无法扫描二维码，请手动输入此密钥</el-text>
                    </el-form-item>
                    <el-form ref="totpFormRef" :model="totpForm" :rules="totpRules">
                        <el-form-item label="验证码" prop="code">
                            <el-input v-model="totpForm.code" placeholder="请输入6位验证码" maxlength="6" />
                        </el-form-item>
                    </el-form>
                </div>
                <template #footer>
                    <el-button @click="showTOTPDialog = false">取消</el-button>
                    <el-button type="primary" :loading="totpLoading" @click="handleConfirmTOTP">确认启用</el-button>
                </template>
            </el-dialog>

            <!-- 禁用TOTP对话框 -->
            <el-dialog v-model="showDisableTOTPDialog" title="禁用TOTP双因素认证" width="400px">
                <el-form ref="disableTOTPFormRef" :model="disableTOTPForm" :rules="disableTOTPRules">
                    <el-form-item label="验证码" prop="code">
                        <el-input v-model="disableTOTPForm.code" placeholder="请输入6位验证码确认" maxlength="6" />
                    </el-form-item>
                </el-form>
                <template #footer>
                    <el-button @click="showDisableTOTPDialog = false">取消</el-button>
                    <el-button type="danger" :loading="disableTOTPLoading"
                        @click="handleConfirmDisableTOTP">确认禁用</el-button>
                </template>
            </el-dialog>

            <!-- 设置密码对话框 -->
            <el-dialog v-model="showSetPasswordDialog" title="设置密码" width="400px">
                <el-form ref="setPasswordFormRef" :model="setPasswordForm" :rules="setPasswordRules">
                    <el-form-item label="新密码" prop="new_password">
                        <el-input v-model="setPasswordForm.new_password" type="password" show-password />
                    </el-form-item>
                    <el-form-item label="确认密码" prop="confirm_password">
                        <el-input v-model="setPasswordForm.confirm_password" type="password" show-password />
                    </el-form-item>
                </el-form>
                <template #footer>
                    <el-button @click="showSetPasswordDialog = false">取消</el-button>
                    <el-button type="primary" :loading="setPasswordLoading" @click="handleSetPassword">确定</el-button>
                </template>
            </el-dialog>

            <!-- 修改用户名对话框 -->
            <el-dialog v-model="showUpdateUsernameDialog" title="修改用户名" width="400px">
                <el-form ref="updateUsernameFormRef" :model="updateUsernameForm" :rules="updateUsernameRules">
                    <el-form-item label="新用户名" prop="username">
                        <el-input v-model="updateUsernameForm.username" />
                    </el-form-item>
                </el-form>
                <template #footer>
                    <el-button @click="showUpdateUsernameDialog = false">取消</el-button>
                    <el-button type="primary" :loading="updateUsernameLoading"
                        @click="handleUpdateUsername">确定</el-button>
                </template>
            </el-dialog>

            <!-- 绑定/修改邮箱对话框（验证码） -->
            <el-dialog v-model="showUpdateEmailDialog" title="绑定邮箱" width="420px">
                <el-form ref="updateEmailFormRef" :model="updateEmailForm" :rules="updateEmailRules">
                    <el-form-item label="邮箱" prop="email">
                        <el-input v-model="updateEmailForm.email" type="email" placeholder="请输入邮箱" />
                    </el-form-item>
                    <el-form-item label="验证码" prop="code">
                        <div class="code-input-group">
                            <el-input v-model="updateEmailForm.code" placeholder="请输入验证码" maxlength="6" />
                            <el-button :disabled="!updateEmailForm.email || codeSending" :loading="codeSending"
                                @click="sendEmailBindCode">
                                {{ codeSending ? `${countdown}s` : '发送验证码' }}
                            </el-button>
                        </div>
                    </el-form-item>
                </el-form>
                <template #footer>
                    <el-button @click="showUpdateEmailDialog = false">取消</el-button>
                    <el-button type="primary" :loading="updateEmailLoading"
                        @click="handleConfirmBindEmail">确定</el-button>
                </template>
            </el-dialog>

            <!-- 删除账户对话框 -->
            <el-dialog v-model="showDeleteAccountDialog" title="删除账户" width="500px" @open="onOpenDeleteAccountDialog"
                @closed="resetDeleteAccountDialog">
                <el-alert title="警告" type="error" :closable="false" style="margin-bottom: 20px">
                    <template #default>
                        <p>此操作将永久删除您的账户和所有相关数据，包括：</p>
                        <ul>
                            <li>所有账单文件</li>
                            <li>所有账户配置</li>
                            <li>所有映射规则</li>
                            <li>所有模板</li>
                        </ul>
                        <p><strong>此操作不可恢复！</strong></p>
                        <el-text type="warning" size="small">建议在删除前导出或备份重要数据。</el-text>
                    </template>
                </el-alert>
                <el-form ref="deleteAccountFormRef" :model="deleteAccountForm" :rules="deleteAccountRules">
                    <el-form-item label="确认操作" prop="confirm">
                        <el-input v-model="deleteAccountForm.confirm" placeholder="请输入 'DELETE' 确认删除" />
                    </el-form-item>
                    <el-form-item>
                        <el-checkbox v-model="deleteAccountConfirmChecked">
                            我已了解上述信息，并确认删除后所有数据将立即清空且无法恢复
                        </el-checkbox>
                    </el-form-item>
                </el-form>
                <template #footer>
                    <el-button @click="handleCancelDeleteAccount">取消</el-button>
                    <el-button type="danger" :disabled="!canSubmitDeleteAccount" :loading="deleteAccountLoading"
                        @click="handleDeleteAccount">
                        删除账户
                    </el-button>
                </template>
            </el-dialog>
        </div>
        <el-result v-else icon="warning" title="请先登录" sub-title="登录后即可查看和调整个人设置" class="auth-required-result">
            <template #extra>
                <el-button type="primary" @click="goToLogin">前往登录</el-button>
            </template>
        </el-result>
    </div>
</template>

<script lang="ts" setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import { User, Phone, Message, Lock, DocumentCopy } from '@element-plus/icons-vue'
import axios from '../../utils/request'
import { hasAuthTokens } from '../../utils/auth'
import router from '~/routers'
import { getGitRepository } from '../../api/git'
import type { GitRepository } from '../../types/git'
import GitSetup from '../../components/git/GitSetup.vue'
import GitRepositoryComponent from '../../components/git/GitRepository.vue'

const apiUrl = import.meta.env.VITE_API_URL

const isAuthenticated = ref(hasAuthTokens())
const unauthorizedNotified = ref(false)

// Git 仓库状态
const gitRepository = ref<GitRepository | null>(null)

const handleUnauthorized = () => {
    if (!unauthorizedNotified.value) {
        ElMessage.warning('请登录后访问个人设置')
        unauthorizedNotified.value = true
    }
    isAuthenticated.value = false
}

const goToLogin = () => {
    router.push('/login')
}

const activeTab = ref('bindings')
const showBindPhoneDialog = ref(false)
const showSetPasswordDialog = ref(false)
const showTOTPDialog = ref(false)
const showDisableTOTPDialog = ref(false)
const showUpdateUsernameDialog = ref(false)
const showUpdateEmailDialog = ref(false)
const showDeleteAccountDialog = ref(false)

const defaultConfirmOptions = {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning' as const,
    center: false,
    customClass: 'settings-confirm-dialog',
    confirmButtonClass: 'settings-confirm-primary',
    cancelButtonClass: 'settings-confirm-cancel'
}

const bindings = ref<any>({
    username: '',
    email: '',
    phone_number: null,
    phone_verified: false,
    social_accounts: [],
    has_password: false
})

const twoFactorStatus = ref({
    totp_enabled: false,
    has_2fa: false
})

const bindPhoneFormRef = ref<FormInstance>()
const totpFormRef = ref<FormInstance>()
const disableTOTPFormRef = ref<FormInstance>()
const setPasswordFormRef = ref<FormInstance>()
const updateUsernameFormRef = ref<FormInstance>()
const updateEmailFormRef = ref<FormInstance>()
const deleteAccountFormRef = ref<FormInstance>()

const bindPhoneForm = reactive({
    phone_number: '',
    code: ''
})

const totpForm = reactive({
    code: ''
})

const disableTOTPForm = reactive({
    code: ''
})

const setPasswordForm = reactive({
    new_password: '',
    confirm_password: ''
})

const updateUsernameForm = reactive({
    username: ''
})

const updateEmailForm = reactive({
    email: '',
    code: ''
})

const deleteAccountForm = reactive({
    confirm: ''
})

const deleteAccountConfirmChecked = ref(false)

const totpQRCode = ref('')
const totpSecret = ref('')
const codeSending = ref(false)
const countdown = ref(60)
let countdownTimer: number | null = null

const bindPhoneLoading = ref(false)
const totpLoading = ref(false)
const disableTOTPLoading = ref(false)
const setPasswordLoading = ref(false)
const updateUsernameLoading = ref(false)
const updateEmailLoading = ref(false)
const deleteAccountLoading = ref(false)

const bindPhoneRules: FormRules = {
    phone_number: [
        { required: true, message: '请输入手机号', trigger: 'blur' },
        { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号', trigger: 'blur' }
    ],
    code: [
        { required: true, message: '请输入验证码', trigger: 'blur' },
        { pattern: /^\d{6}$/, message: '验证码为6位数字', trigger: 'blur' }
    ]
}

const updateUsernameRules: FormRules = {
    username: [
        { required: true, message: '请输入用户名', trigger: 'blur' },
        { min: 3, max: 150, message: '用户名长度为3-150个字符', trigger: 'blur' },
        { pattern: /^[a-zA-Z0-9_]+$/, message: '用户名只能包含字母、数字和下划线', trigger: 'blur' }
    ]
}

const updateEmailRules: FormRules = {
    email: [
        { required: true, message: '请输入邮箱', trigger: 'blur' },
        { type: 'email', message: '请输入正确的邮箱地址', trigger: 'blur' }
    ],
    code: [
        { required: true, message: '请输入验证码', trigger: 'blur' },
        { pattern: /^\d{6}$/, message: '验证码为6位数字', trigger: 'blur' }
    ]
}

const deleteAccountRules: FormRules = {
    confirm: [
        { required: true, message: '请输入确认信息', trigger: 'blur' },
        {
            validator: (rule, value, callback) => {
                if (value !== 'DELETE') {
                    callback(new Error("请输入 'DELETE' 确认删除"))
                } else {
                    callback()
                }
            },
            trigger: 'blur'
        }
    ]
}

const totpRules: FormRules = {
    code: [
        { required: true, message: '请输入验证码', trigger: 'blur' },
        { pattern: /^\d{6}$/, message: '验证码为6位数字', trigger: 'blur' }
    ]
}

const disableTOTPRules: FormRules = {
    code: [
        { required: true, message: '请输入验证码', trigger: 'blur' },
        { pattern: /^\d{6}$/, message: '验证码为6位数字', trigger: 'blur' }
    ]
}

const setPasswordRules: FormRules = {
    new_password: [
        { required: true, message: '请输入新密码', trigger: 'blur' },
        { min: 8, message: '密码长度至少8个字符', trigger: 'blur' }
    ],
    confirm_password: [
        { required: true, message: '请确认密码', trigger: 'blur' },
        {
            validator: (rule, value, callback) => {
                if (value !== setPasswordForm.new_password) {
                    callback(new Error('两次输入的密码不一致'))
                } else {
                    callback()
                }
            },
            trigger: 'blur'
        }
    ]
}

const canSendCode = computed(() => {
    return bindPhoneForm.phone_number.length === 11
})

const canSubmitDeleteAccount = computed(() => {
    return (
        deleteAccountForm.confirm.trim() === 'DELETE' &&
        deleteAccountConfirmChecked.value &&
        !deleteAccountLoading.value
    )
})

// 手机号格式化
const normalizePhone = (phone: string): string => {
    const trimmed = phone.trim()
    if (trimmed.startsWith('+')) return trimmed
    if (trimmed.startsWith('86')) return '+' + trimmed
    return '+86' + trimmed
}

// 开始倒计时
const startCountdown = () => {
    codeSending.value = true
    countdown.value = 60
    if (countdownTimer) clearInterval(countdownTimer)
    countdownTimer = window.setInterval(() => {
        countdown.value--
        if (countdown.value <= 0) {
            codeSending.value = false
            if (countdownTimer) clearInterval(countdownTimer)
        }
    }, 1000)
}

// 获取绑定信息
const fetchBindings = async () => {
    try {
        const res = await axios.get(apiUrl + '/auth/bindings/')
        bindings.value = res.data
        // 初始化表单
        updateUsernameForm.username = res.data.username || ''
        updateEmailForm.email = res.data.email || ''
    } catch (error: any) {
        if (error?.response?.status === 401) {
            handleUnauthorized()
        } else {
            ElMessage.error('获取绑定信息失败')
        }
    }
}

// 获取2FA状态
const fetch2FAStatus = async () => {
    try {
        const res = await axios.get(apiUrl + '/auth/2fa/status/')
        twoFactorStatus.value = res.data
    } catch (error: any) {
        if (error?.response?.status === 401) {
            handleUnauthorized()
        } else {
            ElMessage.error('获取2FA状态失败')
        }
    }
}

// 获取GitHub账号
const getGitHubAccount = () => {
    const githubAccount = bindings.value.social_accounts?.find((acc: any) => acc.provider === 'github')
    return githubAccount ? githubAccount.uid : null
}

// 发送绑定手机号验证码
const sendBindCode = async () => {
    if (!bindPhoneFormRef.value) return
    await bindPhoneFormRef.value.validateField('phone_number')

    try {
        const resp = await axios.post(apiUrl + '/auth/phone/send-code/', {
            phone_number: normalizePhone(bindPhoneForm.phone_number)
        })
        if (resp.status === 200) {
            ElMessage.success('验证码已发送')
            startCountdown()
        }
    } catch (e: any) {
        ElMessage.error(e?.response?.data?.error || '发送失败')
    }
}

// 绑定手机号
const handleBindPhone = async () => {
    if (!bindPhoneFormRef.value) return
    await bindPhoneFormRef.value.validate()

    bindPhoneLoading.value = true
    try {
        await axios.post(apiUrl + '/auth/bindings/bind-phone/', {
            phone_number: normalizePhone(bindPhoneForm.phone_number),
            code: bindPhoneForm.code
        })
        ElMessage.success('手机号绑定成功')
        showBindPhoneDialog.value = false
        Object.assign(bindPhoneForm, { phone_number: '', code: '' })
        await fetchBindings()
    } catch (error: any) {
        ElMessage.error(error.response?.data?.error || '绑定失败')
    } finally {
        bindPhoneLoading.value = false
    }
}

// 解绑手机号
const handleUnbindPhone = async () => {
    try {
        await ElMessageBox.confirm('确定要解绑手机号吗？', '提示', {
            ...defaultConfirmOptions
        })
        await axios.delete(apiUrl + '/auth/bindings/unbind-phone/')
        ElMessage.success('手机号解绑成功')
        await fetchBindings()
    } catch (error: any) {
        if (error !== 'cancel') {
            ElMessage.error(error.response?.data?.error || '解绑失败')
        }
    }
}

// 解绑社交账号
const handleUnbindSocial = async (provider: string) => {
    try {
        await ElMessageBox.confirm(`确定要解绑${provider === 'github' ? 'GitHub' : provider}吗？`, '提示', {
            ...defaultConfirmOptions
        })
        await axios.delete(apiUrl + `/auth/bindings/unbind-social/${provider}/`)
        ElMessage.success('解绑成功')
        await fetchBindings()
    } catch (error: any) {
        if (error !== 'cancel') {
            ElMessage.error(error.response?.data?.error || '解绑失败')
        }
    }
}

// 绑定GitHub
const bindGitHub = () => {
    const providerId = 'github'
    const callbackURL = window.location.origin + '/auth/github/token'

    const form = document.createElement('form')
    form.method = 'POST'
    form.action = apiUrl + '/_allauth/browser/v1/auth/provider/redirect'
    form.style.display = 'none'

    const providerInput = document.createElement('input')
    providerInput.type = 'hidden'
    providerInput.name = 'provider'
    providerInput.value = providerId
    form.appendChild(providerInput)

    const callbackInput = document.createElement('input')
    callbackInput.type = 'hidden'
    callbackInput.name = 'callback_url'
    callbackInput.value = callbackURL
    form.appendChild(callbackInput)

    const processInput = document.createElement('input')
    processInput.type = 'hidden'
    processInput.name = 'process'
    processInput.value = 'connect'
    form.appendChild(processInput)

    document.body.appendChild(form)
    form.submit()
}

// 修改用户名
const handleUpdateUsername = async () => {
    if (!updateUsernameFormRef.value) return
    await updateUsernameFormRef.value.validate()

    updateUsernameLoading.value = true
    try {
        const newUsername = updateUsernameForm.username
        await axios.patch(apiUrl + '/auth/profile/update_me/', {
            username: newUsername
        })
        ElMessage.success('用户名修改成功')
        showUpdateUsernameDialog.value = false
        await fetchBindings()
        // 更新本地存储的用户名
        localStorage.setItem('username', newUsername)
        Object.assign(updateUsernameForm, { username: '' })
    } catch (error: any) {
        ElMessage.error(error.response?.data?.error || '修改失败')
    } finally {
        updateUsernameLoading.value = false
    }
}

// 发送邮箱绑定验证码
const sendEmailBindCode = async () => {
    if (!updateEmailFormRef.value) return
    await updateEmailFormRef.value.validateField('email')
    try {
        const resp = await axios.post(apiUrl + '/auth/bindings/send-email-code/', {
            email: updateEmailForm.email
        })
        if (resp.status === 200) {
            ElMessage.success('验证码已发送')
            startCountdown()
        }
    } catch (e: any) {
        ElMessage.error(e?.response?.data?.error || '发送失败')
    }
}

// 确认绑定邮箱
const handleConfirmBindEmail = async () => {
    if (!updateEmailFormRef.value) return
    await updateEmailFormRef.value.validate()

    updateEmailLoading.value = true
    try {
        await axios.post(apiUrl + '/auth/bindings/bind-email/', {
            email: updateEmailForm.email,
            code: updateEmailForm.code
        })
        ElMessage.success('邮箱绑定成功')
        showUpdateEmailDialog.value = false
        Object.assign(updateEmailForm, { email: '', code: '' })
        await fetchBindings()
    } catch (error: any) {
        ElMessage.error(error.response?.data?.error || '绑定失败')
    } finally {
        updateEmailLoading.value = false
    }
}

// 解绑邮箱
const handleUnbindEmail = async () => {
    try {
        await ElMessageBox.confirm('确定要解绑邮箱吗？', '提示', {
            ...defaultConfirmOptions
        })
        await axios.delete(apiUrl + '/auth/bindings/unbind-email/')
        ElMessage.success('邮箱解绑成功')
        await fetchBindings()
    } catch (error: any) {
        if (error !== 'cancel') {
            ElMessage.error(error.response?.data?.error || '解绑失败')
        }
    }
}

// 设置密码
const handleSetPassword = async () => {
    if (!setPasswordFormRef.value) return
    await setPasswordFormRef.value.validate()

    setPasswordLoading.value = true
    try {
        await axios.post(apiUrl + '/auth/profile/set_password/', {
            new_password: setPasswordForm.new_password
        })
        ElMessage.success('密码设置成功')
        showSetPasswordDialog.value = false
        Object.assign(setPasswordForm, { new_password: '', confirm_password: '' })
        await fetchBindings()
    } catch (error: any) {
        ElMessage.error(error.response?.data?.error || '设置失败')
    } finally {
        setPasswordLoading.value = false
    }
}

// 删除账户
const handleDeleteAccount = async () => {
    if (!deleteAccountFormRef.value) return
    await deleteAccountFormRef.value.validate()

    try {
        await ElMessageBox.confirm('确定要删除账户吗？此操作不可恢复！', '最终确认', {
            ...defaultConfirmOptions,
            confirmButtonText: '确定删除',
            type: 'error',
            confirmButtonClass: 'settings-confirm-danger'
        })

        deleteAccountLoading.value = true
        try {
            await axios.delete(apiUrl + '/auth/profile/delete_account/')
            ElMessage.success('账户已删除')
            // 清除本地存储
            localStorage.clear()
            sessionStorage.clear()
            // 跳转到登录页面
            showDeleteAccountDialog.value = false
            router.push('/login')
            resetDeleteAccountDialog()
        } catch (error: any) {
            ElMessage.error(error.response?.data?.error || '删除失败')
        } finally {
            deleteAccountLoading.value = false
        }
    } catch (error: any) {
        if (error !== 'cancel') {
            ElMessage.error('操作已取消')
        }
    }
}

const resetDeleteAccountDialog = () => {
    deleteAccountForm.confirm = ''
    deleteAccountConfirmChecked.value = false
}

const onOpenDeleteAccountDialog = () => {
    resetDeleteAccountDialog()
}

const handleCancelDeleteAccount = () => {
    resetDeleteAccountDialog()
    showDeleteAccountDialog.value = false
}

// 启用TOTP
const handleEnableTOTP = async () => {
    try {
        const res = await axios.get(apiUrl + '/auth/2fa/totp/qrcode/')
        totpQRCode.value = res.data.qr_code
        totpSecret.value = res.data.secret
        showTOTPDialog.value = true
    } catch (error: any) {
        ElMessage.error(error.response?.data?.error || '获取二维码失败')
    }
}

// 复制Secret密钥
const copySecret = async () => {
    try {
        await navigator.clipboard.writeText(totpSecret.value)
        ElMessage.success('密钥已复制到剪贴板')
    } catch (error) {
        ElMessage.error('复制失败，请手动复制')
    }
}

// 确认启用TOTP
const handleConfirmTOTP = async () => {
    if (!totpFormRef.value) return
    await totpFormRef.value.validate()

    totpLoading.value = true
    try {
        await axios.post(apiUrl + '/auth/2fa/totp/enable/', {
            code: totpForm.code
        })
        ElMessage.success('TOTP已启用')
        showTOTPDialog.value = false
        Object.assign(totpForm, { code: '' })
        totpQRCode.value = ''
        totpSecret.value = ''
        await fetch2FAStatus()
    } catch (error: any) {
        ElMessage.error(error.response?.data?.error || '启用失败')
    } finally {
        totpLoading.value = false
    }
}

// 禁用TOTP
const handleDisableTOTP = () => {
    showDisableTOTPDialog.value = true
}

// 确认禁用TOTP
const handleConfirmDisableTOTP = async () => {
    if (!disableTOTPFormRef.value) return
    await disableTOTPFormRef.value.validate()

    disableTOTPLoading.value = true
    try {
        await axios.post(apiUrl + '/auth/2fa/totp/disable/', {
            code: disableTOTPForm.code
        })
        ElMessage.success('TOTP已禁用')
        showDisableTOTPDialog.value = false
        Object.assign(disableTOTPForm, { code: '' })
        await fetch2FAStatus()
    } catch (error: any) {
        ElMessage.error(error.response?.data?.error || '禁用失败')
    } finally {
        disableTOTPLoading.value = false
    }
}

// Git 仓库相关
const fetchGitRepository = async () => {
    try {
        gitRepository.value = await getGitRepository()
    } catch (error: any) {
        // 404 表示未启用 Git，这是正常的
        if (error.response?.status !== 404) {
            console.error('Failed to fetch git repository:', error)
        }
        gitRepository.value = null
    }
}

const onGitRepositoryCreated = (repository: GitRepository) => {
    gitRepository.value = repository
    // 切换到Git tab以显示新创建的仓库
    activeTab.value = 'git'
}

const onGitRepositoryUpdated = (repository: GitRepository) => {
    gitRepository.value = repository
}

const onGitRepositoryDeleted = () => {
    gitRepository.value = null
}

onMounted(() => {
    if (!isAuthenticated.value) {
        handleUnauthorized()
        return
    }
    fetchBindings()
    fetch2FAStatus()
    fetchGitRepository()
})
</script>

<style scoped>
.settings-container {
    padding: 20px;
    max-width: 1000px;
    margin: 0 auto;
    background: var(--ep-bg-color);
    border-radius: 16px;
}

.settings-card {
    border-radius: 12px;
}

.card-header {
    text-align: center;
}

.card-header h2 {
    margin: 0 0 8px 0;
    color: var(--ep-text-color-primary);
    font-size: 24px;
}

.settings-tabs {
    margin-top: 20px;
}

.section-card {
    margin-top: 20px;
}

.danger-card {
    border: 1px solid var(--ep-border-color);
    padding: 0;
    background: var(--ep-fill-color-light);
}

.danger-zone {
    display: flex;
    flex-direction: column;
    gap: 16px;
    padding: 16px;
}

.danger-zone__item {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    border: 1px solid var(--ep-color-danger-light-7);
    background: var(--ep-color-danger-light-9);
    border-radius: 8px;
    padding: 20px 24px;
    gap: 24px;
}

.danger-zone__content {
    flex: 1;
    color: var(--ep-text-color-regular);
    line-height: 1.6;
}

.danger-zone__title {
    font-weight: 600;
    color: var(--ep-text-color-primary);
    margin-bottom: 6px;
    font-size: 16px;
}

.danger-zone__content p {
    margin: 0;
}

.danger-zone__content p strong {
    color: var(--ep-color-danger);
}

.danger-zone__actions {
    display: flex;
    align-items: center;
}

.danger-zone__button {
    border-color: var(--ep-color-danger);
    color: var(--ep-color-danger);
    font-weight: 600;
    padding: 10px 20px;
}

.danger-zone__button:hover,
.danger-zone__button:focus {
    background: var(--ep-color-danger-light-7);
    color: var(--ep-color-danger);
    border-color: var(--ep-color-danger);
}

.binding-item,
.security-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px 0;
    border-bottom: 1px solid var(--ep-border-color);
}

.binding-item:last-child,
.security-item:last-child {
    border-bottom: none;
}

.binding-info,
.security-info {
    display: flex;
    align-items: center;
    flex: 1;
}

.binding-icon,
.security-icon {
    font-size: 24px;
    margin-right: 12px;
    color: var(--ep-color-primary);
}

.binding-details,
.security-details {
    flex: 1;
}

.binding-label,
.security-label {
    font-weight: 500;
    margin-bottom: 4px;
}

.binding-value,
.security-value {
    color: var(--ep-text-color-regular);
    font-size: 14px;
}

.binding-actions,
.security-actions {
    margin-left: 16px;
}

.code-input-group {
    display: flex;
    gap: 8px;
}

.code-input-group :deep(.el-input) {
    flex: 1;
}

:deep(.el-tabs__item) {
    font-size: 16px;
}

:deep(.el-form-item) {
    margin-bottom: 20px;
}

.auth-required-result {
    margin: 80px auto 0;
    max-width: 420px;
}

:global(.settings-confirm-dialog) {
    border-radius: 12px;
    padding: 20px 24px 24px;
    max-width: 420px;
}

:global(.settings-confirm-dialog .ep-message-box__header) {
    justify-content: flex-start;
    padding-bottom: 12px;
}

:global(.settings-confirm-dialog .ep-message-box__title) {
    font-weight: 600;
    font-size: 18px;
    color: var(--ep-text-color-primary);
}

:global(.settings-confirm-dialog .ep-message-box__content) {
    color: var(--ep-text-color-regular);
    line-height: 1.6;
    text-align: left;
    padding: 12px 0 0;
}

:global(.settings-confirm-dialog .ep-message-box__btns) {
    justify-content: flex-end;
    gap: 12px;
    padding-top: 24px;
}

:global(.settings-confirm-primary) {
    background-color: var(--ep-color-success);
    border-color: var(--ep-color-success);
    border-radius: 6px;
    min-width: 96px;
    font-weight: 600;
}

:global(.settings-confirm-primary:hover) {
    filter: brightness(0.95);
}

:global(.settings-confirm-cancel) {
    border-radius: 6px;
    min-width: 96px;
}

:global(.settings-confirm-danger) {
    background-color: var(--ep-color-danger);
    border-color: var(--ep-color-danger);
    border-radius: 6px;
    min-width: 110px;
    font-weight: 600;
}

:global(.settings-confirm-danger:hover) {
    filter: brightness(0.92);
}
</style>