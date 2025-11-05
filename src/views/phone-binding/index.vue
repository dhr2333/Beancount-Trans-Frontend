<template>
    <div class="phone-binding-container">
        <el-card shadow="never" class="binding-card">
            <template #header>
                <div class="card-header">
                    <h2>{{ isLoggedIn ? '绑定手机号' : '完成手机号注册' }}</h2>
                    <el-text type="info" size="small">
                        {{ isLoggedIn ? '为您的账户绑定手机号' : '使用手机号完成注册并登录' }}
                    </el-text>
                </div>
            </template>

            <el-form :model="form" label-width="0" class="binding-form" @submit.prevent>
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

                <el-form-item v-if="!isLoggedIn">
                    <el-input v-model="form.username" placeholder="用户名（可选，不填写将自动生成）" size="large" clearable>
                        <template #prefix>
                            <el-icon>
                                <User />
                            </el-icon>
                        </template>
                    </el-input>
                </el-form-item>

                <el-form-item v-if="!isLoggedIn">
                    <el-input v-model="form.password" placeholder="设置密码（可选）" type="password" show-password size="large"
                        clearable>
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
                        {{ isLoggedIn ? '绑定手机号' : '完成注册并登录' }}
                    </el-button>
                </el-form-item>
            </el-form>
        </el-card>
    </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Phone, Message, User, Lock } from '@element-plus/icons-vue'
import axios from '../../utils/request'

const apiUrl = import.meta.env.VITE_API_URL
const router = useRouter()

const isLoggedIn = ref(false)
const sending = ref(false)
const submitting = ref(false)
const countdown = ref(60)
let countdownTimer: number | null = null

const form = reactive({
    phone: '',
    code: '',
    username: '',
    password: '',
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
        if (isLoggedIn.value) {
            // 已登录用户，执行绑定操作
            const resp = await axios.post(apiUrl + '/auth/bindings/bind-phone/', {
                phone_number: normalizePhone(form.phone),
                code: form.code.trim(),
            })
            if (resp.status === 200) {
                ElMessage.success('手机号绑定成功')

                // 检查是否有待返回的路径
                const redirectPath = sessionStorage.getItem('redirectAfterPhoneBinding')
                if (redirectPath) {
                    sessionStorage.removeItem('redirectAfterPhoneBinding')
                    router.push(redirectPath)
                } else {
                    router.push('/file')
                }
            }
        } else {
            // 未登录用户，执行注册操作
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

            const resp = await axios.post(apiUrl + '/auth/phone/register/', payload)
            if (resp.status === 201) {
                const { setAuthTokens } = await import('../../utils/auth')
                setAuthTokens(resp.data.access, resp.data.refresh, resp.data.user.username)
                localStorage.setItem('start_tour', 'true')
                ElMessage.success('注册成功')
                router.push('/file')
            }
        }
    } catch (error: any) {
        // 如果绑定失败且错误提示手机号已被注册，且用户已登录，尝试注册逻辑
        if (isLoggedIn.value && error.response?.data?.error?.includes('已被注册')) {
            ElMessage.warning('该手机号已被注册，请使用其他手机号')
        } else if (error.response?.data?.error?.includes('已被注册')) {
            ElMessage.error('该手机号已被注册，请使用其他手机号或直接登录')
        } else {
            ElMessage.error(error.response?.data?.error || (isLoggedIn.value ? '绑定失败，请重试' : '注册失败，请重试'))
        }
    } finally {
        submitting.value = false
    }
}

onMounted(() => {
    // 检查用户是否已登录
    const token = localStorage.getItem('access')
    isLoggedIn.value = !!token
})
</script>

<style scoped>
.phone-binding-container {
    min-height: calc(100vh - 80px);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
}

.binding-card {
    width: 100%;
    max-width: 480px;
    border-radius: 12px;
}

.card-header {
    display: flex;
    flex-direction: column;
    gap: 8px;
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
</style>