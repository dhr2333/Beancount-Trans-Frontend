<template>
    <div class="phone-binding">
        <h2>绑定手机号</h2>
        <el-form @submit.prevent="onSubmit" label-width="100px">
            <el-form-item label="手机号">
                <el-input v-model="phone" placeholder="例如 13800138000 或 +8613800138000" />
            </el-form-item>
            <el-form-item label="验证码">
                <el-input v-model="code" placeholder="6位数字" />
                <el-button :disabled="sending" @click="sendCode" style="margin-left:8px">{{ sending ? countdown + 's' :
                    '发送验证码' }}</el-button>
            </el-form-item>
            <el-form-item>
                <el-button type="primary" @click="onSubmit">绑定</el-button>
            </el-form-item>
        </el-form>
    </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import axios from 'axios'
import { ElMessage } from 'element-plus'
import { useRouter } from 'vue-router'

const apiUrl = import.meta.env.VITE_API_URL
const router = useRouter()
const phone = ref('')
const code = ref('')
const sending = ref(false)
const countdown = ref(60)
let timer: any = null

const startCountdown = () => {
    sending.value = true
    countdown.value = 60
    timer && clearInterval(timer)
    timer = setInterval(() => {
        countdown.value -= 1
        if (countdown.value <= 0) {
            sending.value = false
            clearInterval(timer)
        }
    }, 1000)
}

const normalizePhone = (p: string) => {
    const trimmed = p.trim()
    return trimmed.startsWith('+') ? trimmed : (trimmed.startsWith('86') ? '+' + trimmed : '+86' + trimmed)
}

const sendCode = async () => {
    if (sending.value) return
    try {
        const resp = await axios.post(apiUrl + '/auth/phone/send-code/', { phone_number: normalizePhone(phone.value) })
        if (resp.status === 200) {
            ElMessage.success('验证码已发送')
            startCountdown()
        }
    } catch (e: any) {
        ElMessage.error(e?.response?.data?.error || '发送失败')
    }
}

const onSubmit = async () => {
    try {
        const resp = await axios.post(apiUrl + '/auth/bindings/bind-phone/', {
            phone_number: normalizePhone(phone.value),
            code: code.value
        }, { headers: { Authorization: `Bearer ${localStorage.getItem('access')}` } })
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
    } catch (e: any) {
        ElMessage.error(e?.response?.data?.error || e?.response?.data?.message || '绑定失败')
    }
}
</script>

<style scoped>
.phone-binding {
    padding: 24px;
    max-width: 520px;
    margin: 0 auto;
}
</style>
