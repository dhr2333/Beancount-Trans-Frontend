<template>
    <div class="oauth-phone-register">
        <el-card shadow="never" class="register-card">
            <template #header>
                <div class="card-header">
                    <h2>完成手机号注册</h2>
                    <el-text type="info" size="small">将 {{ providerLabel }} 账号绑定到新的手机号账户</el-text>
                </div>
            </template>

            <el-skeleton :loading="loading" animated>
                <template #template>
                    <div class="skeleton-line" v-for="i in 4" :key="i"></div>
                </template>

                <template #default>
                    <div class="account-summary" v-if="accountDisplayName">
                        <el-avatar :size="48" :src="accountAvatar" class="account-avatar">
                            {{ accountInitials }}
                        </el-avatar>
                        <div class="account-meta">
                            <div class="account-name">{{ accountDisplayName }}</div>
                            <div class="account-email" v-if="accountEmail">{{ accountEmail }}</div>
                        </div>
                    </div>

                    <el-form :model="form" label-width="0" class="register-form" @submit.prevent>
                        <el-form-item>
                            <el-input v-model="form.phone" placeholder="手机号" size="large" clearable>
                                <template #prefix>
                                    <el-icon>
                                        <Phone />
                                    </el-icon>
                                </template>
                            </el-input>
                        </el-form-item>

                        <el-form-item>
                            <div class="code-input-group">
                                <el-input v-model="form.code" placeholder="验证码" size="large" maxlength="6" clearable>
                                    <template #prefix>
                                        <el-icon>
                                            <Message />
                                        </el-icon>
                                    </template>
                                </el-input>
                                <el-button :disabled="sendDisabled" :loading="sending" @click="sendCode">
                                    {{ sending ? `${countdown}s` : '发送验证码' }}
                                </el-button>
                            </div>
                        </el-form-item>

                        <el-form-item>
                            <el-input v-model="form.username" placeholder="用户名（可选，不填写将自动生成）" size="large" clearable>
                                <template #prefix>
                                    <el-icon>
                                        <User />
                                    </el-icon>
                                </template>
                            </el-input>
                        </el-form-item>

                        <el-form-item>
                            <el-input v-model="form.password" placeholder="设置密码（可选）" type="password" show-password
                                size="large" clearable>
                                <template #prefix>
                                    <el-icon>
                                        <Lock />
                                    </el-icon>
                                </template>
                            </el-input>
                            <div class="form-hint">不设置密码也可以，之后可在个人设置中补充</div>
                        </el-form-item>

                        <el-form-item>
                            <el-button type="primary" size="large" class="submit-button" :loading="submitting"
                                @click="handleSubmit">
                                完成注册并登录
                            </el-button>
                        </el-form-item>
                    </el-form>
                </template>
            </el-skeleton>
        </el-card>
    </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Phone, Message, User, Lock } from '@element-plus/icons-vue'
import axios from '@/utils/request'

const apiUrl = import.meta.env.VITE_API_URL
const router = useRouter()

const loading = ref(true)
const sending = ref(false)
const submitting = ref(false)
const countdown = ref(60)
let countdownTimer: number | null = null

const provider = ref('github')
const account = ref<Record<string, any>>({})

const form = reactive({
    phone: '',
    code: '',
    username: '',
    password: '',
})

const accountDisplayName = computed(() => {
    return form.username || account.value.username || account.value.extra_data?.name || account.value.extra_data?.login || ''
})

const accountEmail = computed(() => {
    return account.value.email || account.value.extra_data?.email || ''
})

const accountAvatar = computed(() => account.value.extra_data?.avatar_url || '')

const accountInitials = computed(() => {
    const name = accountDisplayName.value
    return name ? name[0]?.toUpperCase() : 'G'
})

const providerLabel = computed(() => {
    if (provider.value === 'github') {
        return 'GitHub'
    }
    return provider.value
})

const sendDisabled = computed(() => {
    const trimmed = form.phone.trim()
    return sending.value || trimmed.length < 5
})

const startCountdown = () => {
    sending.value = true
    countdown.value = 60
    if (countdownTimer) {
        clearInterval(countdownTimer)
    }
    countdownTimer = window.setInterval(() => {
        countdown.value -= 1
        if (countdown.value <= 0) {
            sending.value = false
            if (countdownTimer) {
                clearInterval(countdownTimer)
                countdownTimer = null
            }
        }
    }, 1000)
}

const normalizePhone = (value: string) => {
    const trimmed = value.trim()
    if (!trimmed) return trimmed
    if (trimmed.startsWith('+')) return trimmed
    if (trimmed.startsWith('86')) return `+${trimmed}`
    return `+86${trimmed}`
}

const fetchContext = async () => {
    try {
        const resp = await axios.get(apiUrl + '/auth/phone/oauth-context/', { withCredentials: true })
        provider.value = resp.data?.provider || 'github'
        account.value = resp.data?.account || {}
        if (account.value?.username) {
            form.username = account.value.username
        }
    } catch (error: any) {
        ElMessage.error(error.response?.data?.error || '未检测到待处理的 GitHub 登录，请重新登录')
        router.push('/login')
    } finally {
        loading.value = false
    }
}

const sendCode = async () => {
    if (sendDisabled.value) return
    try {
        await axios.post(apiUrl + '/auth/phone/send-code/', {
            phone_number: normalizePhone(form.phone),
        })
        ElMessage.success('验证码已发送')
        startCountdown()
    } catch (error: any) {
        ElMessage.error(error.response?.data?.error || '验证码发送失败')
    }
}

const handleSubmit = async () => {
    if (!form.phone.trim() || !form.code.trim()) {
        ElMessage.warning('请先填写手机号和验证码')
        return
    }

    submitting.value = true
    try {
        const payload: Record<string, any> = {
            phone_number: normalizePhone(form.phone),
            code: form.code.trim(),
        }

        if (form.username.trim()) {
            payload.username = form.username.trim()
        }
        if (form.password.trim()) {
            payload.password = form.password.trim()
        }
        if (accountEmail.value) {
            payload.email = accountEmail.value
        }

        const resp = await axios.post(apiUrl + '/auth/phone/oauth-register/', payload, { withCredentials: true })
        if (resp.status === 201) {
            const { setAuthTokens } = await import('@/utils/auth')
            setAuthTokens(resp.data.access, resp.data.refresh, resp.data.user.username)
            localStorage.setItem('start_tour', 'true')
            sessionStorage.removeItem('oauthProvider')
            sessionStorage.removeItem('oauthAccount')
            ElMessage.success('注册成功，已为您绑定 GitHub 账号')
            router.push('/file')
        }
    } catch (error: any) {
        ElMessage.error(error.response?.data?.error || '注册失败，请重试')
    } finally {
        submitting.value = false
    }
}

onMounted(() => {
    const storedAccount = sessionStorage.getItem('oauthAccount')
    if (storedAccount) {
        try {
            account.value = JSON.parse(storedAccount)
            if (account.value?.username) {
                form.username = account.value.username
            }
        } catch (e) {
            account.value = {}
        }
    }
    const storedProvider = sessionStorage.getItem('oauthProvider')
    if (storedProvider) {
        provider.value = storedProvider
    }

    fetchContext()
})
</script>

<style scoped>
.oauth-phone-register {
    min-height: calc(100vh - 80px);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
}

.register-card {
    width: 100%;
    max-width: 480px;
    border-radius: 12px;
}

.card-header {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.account-summary {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 16px;
}

.account-avatar {
    background-color: #f2f6fc;
    color: #409eff;
}

.account-name {
    font-weight: 600;
    font-size: 16px;
}

.account-email {
    font-size: 13px;
    color: #909399;
}

.code-input-group {
    display: flex;
    gap: 8px;
}

.code-input-group :deep(.el-input) {
    flex: 1;
}

.submit-button {
    width: 100%;
}

.form-hint {
    font-size: 12px;
    color: #909399;
    margin-top: 4px;
}

.skeleton-line {
    height: 18px;
    border-radius: 4px;
    background: var(--el-border-color-lighter);
    margin-bottom: 12px;
}
</style>
