<template>
  <div class="login-container">
    <el-card class="login-card" shadow="hover">
      <template #header>
        <div class="card-header">
          <h2>{{ isLogin ? '账户登录' : '手机号注册' }}</h2>
          <el-text type="info" size="small">
            {{ isLogin ? '请登录继续管理您的财务报告' : '立即注册，AI 帮您 3 分钟生成专业财务报表' }}
          </el-text>
        </div>
      </template>

      <!-- 登录表单 -->
      <div v-if="isLogin" class="login-form">
        <el-tabs v-model="loginMethod" class="login-tabs">
          <el-tab-pane label="账密登录" name="username">
            <el-form ref="usernameLoginFormRef" :model="usernameLoginForm" :rules="usernameLoginRules" label-width="0"
              @submit.prevent="handleUsernameLogin">
              <el-form-item prop="username">
                <el-input v-model="usernameLoginForm.username" placeholder="用户名 / 手机号 / 邮箱" size="large" clearable>
                  <template #prefix>
                    <el-icon>
                      <User />
                    </el-icon>
                  </template>
                </el-input>
              </el-form-item>
              <el-form-item prop="password">
                <el-input v-model="usernameLoginForm.password" type="password" placeholder="密码" size="large"
                  show-password clearable @keyup.enter="handleUsernameLogin">
                  <template #prefix>
                    <el-icon>
                      <Lock />
                    </el-icon>
                  </template>
                </el-input>
              </el-form-item>
              <el-form-item>
                <el-input v-model="usernameLoginForm.totp_code" placeholder="TOTP验证码（未设置可忽略）" size="large" maxlength="6"
                  clearable @keyup.enter="handleUsernameLogin">
                  <template #prefix>
                    <el-icon>
                      <Message />
                    </el-icon>
                  </template>
                </el-input>
              </el-form-item>
              <el-form-item>
                <el-button type="primary" size="large" class="login-button" :loading="loginLoading"
                  @click="handleUsernameLogin">
                  登录
                </el-button>
              </el-form-item>
            </el-form>
          </el-tab-pane>

          <el-tab-pane label="手机号登录" name="phone">
            <el-form ref="phoneLoginFormRef" :model="phoneLoginForm" :rules="phoneLoginRules" label-width="0">
              <el-form-item prop="phone_number">
                <el-input v-model="phoneLoginForm.phone_number" placeholder="手机号" size="large" clearable>
                  <template #prefix>
                    <el-icon>
                      <Phone />
                    </el-icon>
                  </template>
                </el-input>
              </el-form-item>
              <el-form-item prop="code">
                <div class="code-input-group">
                  <el-input v-model="phoneLoginForm.code" placeholder="验证码" size="large" maxlength="6" clearable
                    @keyup.enter="handlePhoneLoginByCode">
                    <template #prefix>
                      <el-icon>
                        <Message />
                      </el-icon>
                    </template>
                  </el-input>
                  <el-button :disabled="!canSendCode || codeSending" :loading="codeSending" @click="sendLoginCode">
                    {{ codeSending ? `${countdown}s` : '发送验证码' }}
                  </el-button>
                </div>
              </el-form-item>
              <el-form-item>
                <el-button type="primary" size="large" class="login-button" :loading="loginLoading"
                  @click="handlePhoneLoginByCode">
                  验证码登录
                </el-button>
              </el-form-item>
            </el-form>
          </el-tab-pane>

          <el-tab-pane label="邮箱登录" name="email">
            <el-form ref="emailLoginFormRef" :model="emailLoginForm" :rules="emailLoginRules" label-width="0">
              <el-form-item prop="email">
                <el-input v-model="emailLoginForm.email" placeholder="邮箱地址" size="large" clearable>
                  <template #prefix>
                    <el-icon>
                      <Message />
                    </el-icon>
                  </template>
                </el-input>
              </el-form-item>
              <el-form-item prop="code">
                <div class="code-input-group">
                  <el-input v-model="emailLoginForm.code" placeholder="验证码" size="large" maxlength="6" clearable
                    @keyup.enter="handleEmailLogin">
                    <template #prefix>
                      <el-icon>
                        <Message />
                      </el-icon>
                    </template>
                  </el-input>
                  <el-button :disabled="!canSendEmailCode || emailCodeSending" :loading="emailCodeSending"
                    @click="sendEmailLoginCode">
                    {{ emailCodeSending ? `${emailCountdown}s` : '发送验证码' }}
                  </el-button>
                </div>
              </el-form-item>
              <el-form-item>
                <el-button type="primary" size="large" class="login-button" :loading="loginLoading"
                  @click="handleEmailLogin">
                  验证码登录
                </el-button>
              </el-form-item>
            </el-form>
          </el-tab-pane>
        </el-tabs>

        <!-- OAuth登录 -->
        <el-divider>第三方登录</el-divider>
        <div class="oauth-buttons">
          <el-button type="default" size="large" class="oauth-button" @click="loginWithGitHub">
            <el-icon><svg viewBox="0 0 24 24" fill="currentColor">
                <path
                  d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
              </svg></el-icon>
            GitHub 登录
          </el-button>
        </div>
      </div>

      <!-- 注册表单 -->
      <div v-else class="register-form">
        <el-form ref="registerFormRef" :model="registerForm" :rules="registerRules" label-width="0"
          @submit.prevent="handleRegister">
          <el-form-item prop="phone_number">
            <el-input v-model="registerForm.phone_number" placeholder="手机号（必填）" size="large" clearable>
              <template #prefix>
                <el-icon>
                  <Phone />
                </el-icon>
              </template>
            </el-input>
          </el-form-item>
          <el-form-item prop="code">
            <div class="code-input-group">
              <el-input v-model="registerForm.code" placeholder="验证码" size="large" maxlength="6" clearable>
                <template #prefix>
                  <el-icon>
                    <Message />
                  </el-icon>
                </template>
              </el-input>
              <el-button :disabled="!canSendRegisterCode || codeSending" :loading="codeSending"
                @click="sendRegisterCode">
                {{ codeSending ? `${countdown}s` : '发送验证码' }}
              </el-button>
            </div>
          </el-form-item>
          <el-form-item prop="username">
            <el-input v-model="registerForm.username" placeholder="用户名（选填）" size="large" clearable>
              <template #prefix>
                <el-icon>
                  <User />
                </el-icon>
              </template>
            </el-input>
          </el-form-item>
          <el-form-item prop="password">
            <el-input v-model="registerForm.password" type="password" placeholder="密码（选填）" size="large" show-password
              clearable>
              <template #prefix>
                <el-icon>
                  <Lock />
                </el-icon>
              </template>
            </el-input>
          </el-form-item>
          <!-- <el-form-item prop="email">
            <el-input v-model="registerForm.email" type="email" placeholder="邮箱（选填）" size="large" clearable>
              <template #prefix>
                <el-icon>
                  <Message />
                </el-icon>
              </template>
            </el-input>
          </el-form-item> -->
          <el-form-item>
            <el-button type="primary" size="large" class="register-button" :loading="registerLoading"
              @click="handleRegister">
              注册
            </el-button>
          </el-form-item>
        </el-form>
      </div>

      <!-- 切换登录/注册 -->
      <div class="form-footer">
        <el-text v-if="isLogin">
          还没有账户？
          <el-link type="primary" @click="switchToRegister">立即注册</el-link>
        </el-text>
        <el-text v-else>
          已有账户？
          <el-link type="primary" @click="switchToLogin">立即登录</el-link>
        </el-text>
      </div>
    </el-card>
  </div>
</template>

<script lang="ts" setup>
import { ref, reactive, computed } from 'vue'
import { ElMessage } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import { User, Lock, Phone, Message } from '@element-plus/icons-vue'
import axios from '../../utils/request'
import router from '~/routers'

const apiUrl = import.meta.env.VITE_API_URL

// 登录/注册切换
const isLogin = ref(true)
const loginMethod = ref('username')
const loginLoading = ref(false)
const registerLoading = ref(false)

// 验证码相关
const codeSending = ref(false)
const countdown = ref(60)
let countdownTimer: number | null = null
const emailCodeSending = ref(false)
const emailCountdown = ref(60)
let emailCountdownTimer: number | null = null

// 表单引用
const usernameLoginFormRef = ref<FormInstance>()
const phoneLoginFormRef = ref<FormInstance>()
const emailLoginFormRef = ref<FormInstance>()
const registerFormRef = ref<FormInstance>()

// 用户名登录表单
const usernameLoginForm = reactive({
  username: '',
  password: '',
  totp_code: ''
})

// 手机号登录表单
const phoneLoginForm = reactive({
  phone_number: '',
  code: ''
})

// 邮箱登录表单
const emailLoginForm = reactive({
  email: '',
  code: ''
})

// 注册表单
const registerForm = reactive({
  phone_number: '',
  code: '',
  username: '',
  password: '',
  email: ''
})

// 验证规则
const usernameLoginRules: FormRules = {
  username: [
    { required: true, message: '请输入用户名或手机号', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' }
  ]
}

const phoneLoginRules: FormRules = {
  phone_number: [
    { required: true, message: '请输入手机号', trigger: 'blur' },
    { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号', trigger: 'blur' }
  ],
  code: [
    { required: true, message: '请输入验证码', trigger: 'blur' },
    { pattern: /^\d{6}$/, message: '验证码为6位数字', trigger: 'blur' }
  ]
}

const emailLoginRules: FormRules = {
  email: [
    { required: true, message: '请输入邮箱地址', trigger: 'blur' },
    { type: 'email', message: '请输入正确的邮箱地址', trigger: ['blur', 'change'] }
  ],
  code: [
    { required: true, message: '请输入验证码', trigger: 'blur' },
    { pattern: /^\d{6}$/, message: '验证码为6位数字', trigger: 'blur' }
  ]
}

const registerRules: FormRules = {
  phone_number: [
    { required: true, message: '请输入手机号', trigger: 'blur' },
    { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号', trigger: 'blur' }
  ],
  code: [
    { required: true, message: '请输入验证码', trigger: 'blur' },
    { pattern: /^\d{6}$/, message: '验证码为6位数字', trigger: 'blur' }
  ],
  username: [
    {
      validator: (_rule, value, callback) => {
        const trimmed = (value || '').trim()
        if (!trimmed) {
          callback()
          return
        }
        if (trimmed.length < 3 || trimmed.length > 150) {
          callback(new Error('用户名长度为3-150个字符'))
          return
        }
        callback()
      },
      trigger: 'blur'
    }
  ],
  password: [
    {
      validator: (_rule, value, callback) => {
        const trimmed = (value || '').trim()
        if (!trimmed) {
          callback()
          return
        }
        if (trimmed.length < 8) {
          callback(new Error('密码长度至少8个字符'))
          return
        }
        callback()
      },
      trigger: 'blur'
    }
  ],
  email: [
    { type: 'email', message: '请输入正确的邮箱地址', trigger: ['blur', 'change'] }
  ]
}

// 手机号格式化
const normalizePhone = (phone: string): string => {
  const trimmed = phone.trim()
  if (trimmed.startsWith('+')) return trimmed
  if (trimmed.startsWith('86')) return '+' + trimmed
  return '+86' + trimmed
}

// 是否可以发送验证码（登录）
const canSendCode = computed(() => {
  return phoneLoginForm.phone_number.length === 11
})

// 是否可以发送验证码（注册）
const canSendRegisterCode = computed(() => {
  return registerForm.phone_number.length === 11
})

// 是否可以发送邮箱验证码
const canSendEmailCode = computed(() => {
  return emailLoginForm.email.trim().length > 0
})

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

const startEmailCountdown = () => {
  emailCodeSending.value = true
  emailCountdown.value = 60
  if (emailCountdownTimer) clearInterval(emailCountdownTimer)
  emailCountdownTimer = window.setInterval(() => {
    emailCountdown.value--
    if (emailCountdown.value <= 0) {
      emailCodeSending.value = false
      if (emailCountdownTimer) clearInterval(emailCountdownTimer)
    }
  }, 1000)
}

// 发送登录验证码
const sendLoginCode = async () => {
  if (!phoneLoginFormRef.value) return
  await phoneLoginFormRef.value.validateField('phone_number')

  try {
    const resp = await axios.post(apiUrl + '/auth/phone/send-code/', {
      phone_number: normalizePhone(phoneLoginForm.phone_number)
    })
    if (resp.status === 200) {
      ElMessage.success('验证码已发送')
      startCountdown()
    }
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.error || '发送失败')
  }
}

// 发送注册验证码
const sendRegisterCode = async () => {
  if (!registerFormRef.value) return
  await registerFormRef.value.validateField('phone_number')

  try {
    const resp = await axios.post(apiUrl + '/auth/phone/send-code/', {
      phone_number: normalizePhone(registerForm.phone_number)
    })
    if (resp.status === 200) {
      ElMessage.success('验证码已发送')
      startCountdown()
    }
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.error || '发送失败')
  }
}

// 发送邮箱登录验证码
const sendEmailLoginCode = async () => {
  if (!emailLoginFormRef.value) return
  await emailLoginFormRef.value.validateField('email')

  try {
    const resp = await axios.post(apiUrl + '/auth/email/send-code/', {
      email: emailLoginForm.email.trim()
    })
    if (resp.status === 200) {
      ElMessage.success('验证码已发送')
      startEmailCountdown()
    }
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.error || '发送失败')
  }
}

// 判断输入是否为手机号
const isPhoneNumber = (input: string): boolean => {
  return /^1[3-9]\d{9}$/.test(input.trim())
}

// 判断输入是否为邮箱
const isEmail = (input: string): boolean => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.trim())
}

// 账密登录（支持用户名/手机号/邮箱+密码+TOTP）
const handleUsernameLogin = async () => {
  if (!usernameLoginFormRef.value) return
  await usernameLoginFormRef.value.validate()

  loginLoading.value = true

  // 判断输入的是手机号、邮箱还是用户名
  const isPhone = isPhoneNumber(usernameLoginForm.username)
  const isEmailAddr = isEmail(usernameLoginForm.username)

  try {
    let res: any

    if (isPhone) {
      // 手机号+密码登录（支持TOTP）
      const payload: any = {
        phone_number: normalizePhone(usernameLoginForm.username),
        password: usernameLoginForm.password
      }
      if (usernameLoginForm.totp_code) {
        payload.totp_code = usernameLoginForm.totp_code
      }

      res = await axios.post(apiUrl + '/auth/phone/login-by-password/', payload)

      const { setAuthTokens } = await import('../../utils/auth')
      setAuthTokens(
        res.data.access,
        res.data.refresh,
        res.data.user.username
      )

      ElMessage.success('登录成功')
      router.push('/file')
    } else {
      // 用户名/邮箱+密码登录（支持TOTP）
      const payload: any = {
        username: usernameLoginForm.username,
        password: usernameLoginForm.password
      }
      if (usernameLoginForm.totp_code) {
        payload.totp_code = usernameLoginForm.totp_code
      }

      res = await axios.post(apiUrl + '/auth/username/login-by-password/', payload)

      const { setAuthTokens } = await import('../../utils/auth')
      setAuthTokens(
        res.data.access,
        res.data.refresh,
        res.data.user.username
      )

      ElMessage.success('登录成功')

      // 检查手机号绑定状态
      try {
        await axios.get(apiUrl + '/auth/profile/me/', {
          headers: { Authorization: `Bearer ${res.data.access}` }
        })
        router.push('/file')
      } catch (profileError: any) {
        if (profileError.response?.status === 403 && profileError.response?.data?.code === 'PHONE_NUMBER_REQUIRED') {
          ElMessage.warning('请先绑定手机号')
          router.push('/phone-binding')
        } else {
          router.push('/file')
        }
      }
    }
  } catch (error: any) {
    if (error.response?.status === 403 && error.response?.data?.code === 'PHONE_NUMBER_REQUIRED') {
      ElMessage.warning('请先绑定手机号')
      router.push('/phone-binding')
    } else if (error.response?.data?.requires_totp) {
      ElMessage.warning(error.response?.data?.error || '该账户已启用TOTP二次验证，请输入TOTP验证码')
    } else {
      ElMessage.error(error.response?.data?.error || error.response?.data?.message || '登录失败')
    }
  } finally {
    loginLoading.value = false
  }
}

// 手机号验证码登录
const handlePhoneLoginByCode = async () => {
  if (!phoneLoginFormRef.value) return
  await phoneLoginFormRef.value.validateField('phone_number')
  await phoneLoginFormRef.value.validateField('code')

  loginLoading.value = true
  try {
    const res = await axios.post(apiUrl + '/auth/phone/login-by-code/', {
      phone_number: normalizePhone(phoneLoginForm.phone_number),
      code: phoneLoginForm.code
    })

    const { setAuthTokens } = await import('../../utils/auth')
    setAuthTokens(
      res.data.access,
      res.data.refresh,
      res.data.user.username
    )

    ElMessage.success('登录成功')

    // 检查是否需要2FA
    // if (res.data.requires_2fa) {
    //   ElMessage.info('请完成双因素认证')
    //   // TODO: 跳转到2FA验证页面
    // }

    router.push('/file')
  } catch (error: any) {
    ElMessage.error(error.response?.data?.error || '登录失败')
  } finally {
    loginLoading.value = false
  }
}

// 邮箱验证码登录
const handleEmailLogin = async () => {
  if (!emailLoginFormRef.value) return
  await emailLoginFormRef.value.validate()

  loginLoading.value = true
  try {
    const res = await axios.post(apiUrl + '/auth/email/login-by-code/', {
      email: emailLoginForm.email.trim(),
      code: emailLoginForm.code
    })

    const { setAuthTokens } = await import('../../utils/auth')
    setAuthTokens(
      res.data.access,
      res.data.refresh,
      res.data.user.username
    )

    ElMessage.success('登录成功')

    // if (res.data.requires_2fa) {
    //   ElMessage.info('请完成双因素认证')
    //   // TODO: 跳转到2FA验证页面
    // }

    router.push('/file')
  } catch (error: any) {
    ElMessage.error(error.response?.data?.error || '登录失败')
  } finally {
    loginLoading.value = false
  }
}

// 注册
const handleRegister = async () => {
  if (!registerFormRef.value) return
  await registerFormRef.value.validate()

  registerLoading.value = true
  try {
    const payload: Record<string, string> = {
      phone_number: normalizePhone(registerForm.phone_number),
      code: registerForm.code
    }

    const username = registerForm.username.trim()
    if (username) {
      payload.username = username
    }

    const password = registerForm.password.trim()
    if (password) {
      payload.password = password
    }

    const email = registerForm.email.trim()
    if (email) {
      payload.email = email
    }

    const res = await axios.post(apiUrl + '/auth/phone/register/', payload)

    const { setAuthTokens } = await import('../../utils/auth')
    setAuthTokens(
      res.data.access,
      res.data.refresh,
      res.data.user.username
    )

    ElMessage.success('注册成功')

    // 标记为新用户
    localStorage.setItem('start_tour', 'true')

    router.push('/file')
  } catch (error: any) {
    ElMessage.error(error.response?.data?.error || '注册失败')
  } finally {
    registerLoading.value = false
  }
}

// GitHub OAuth登录
const loginWithGitHub = () => {
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
  processInput.value = 'login'
  form.appendChild(processInput)

  document.body.appendChild(form)
  form.submit()
}

// 切换登录/注册
const switchToLogin = () => {
  isLogin.value = true
  loginMethod.value = 'username'
  // 清空表单
  Object.assign(registerForm, {
    phone_number: '',
    code: '',
    username: '',
    password: '',
    email: ''
  })
  Object.assign(usernameLoginForm, { username: '', password: '', totp_code: '' })
  Object.assign(emailLoginForm, { email: '', code: '' })
}

const switchToRegister = () => {
  isLogin.value = false
  // 清空表单
  Object.assign(usernameLoginForm, { username: '', password: '', totp_code: '' })
  Object.assign(phoneLoginForm, { phone_number: '', code: '' })
  Object.assign(emailLoginForm, { email: '', code: '' })
  Object.assign(registerForm, { phone_number: '', code: '', username: '', password: '', email: '' })
}
</script>

<style scoped>
.login-container {
  min-height: calc(100vh - 80px);
  /* 假定 header 48px，如需具体请调整 */
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 0;
  overflow: auto;
  box-sizing: border-box;
}

.login-card {
  width: 100%;
  max-width: 480px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
}

.card-header {
  text-align: center;
}

.card-header h2 {
  margin: 0 0 8px 0;
  color: #303133;
  font-size: 24px;
}

.login-tabs {
  margin-bottom: 20px;
}

.code-input-group {
  display: flex;
  gap: 8px;
}

.code-input-group :deep(.el-input) {
  flex: 1;
}

.login-button,
.register-button {
  width: 100%;
  margin-top: 10px;
}

.oauth-buttons {
  display: flex;
  justify-content: center;
  gap: 12px;
}

.oauth-button {
  width: 100%;
}

.form-footer {
  text-align: center;
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid #ebeef5;
}

:deep(.el-tabs__item) {
  font-size: 16px;
}

:deep(.el-form-item) {
  margin-bottom: 20px;
}

:deep(.el-input__wrapper) {
  box-shadow: 0 0 0 1px #dcdfe6 inset;
}

:deep(.el-input__wrapper:hover) {
  box-shadow: 0 0 0 1px #c0c4cc inset;
}

:deep(.el-input.is-focus .el-input__wrapper) {
  box-shadow: 0 0 0 1px #409eff inset;
}
</style>
