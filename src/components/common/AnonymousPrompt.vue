<template>
    <el-dialog v-model="visible" title="🔐 需要登录访问" width="500px" :close-on-click-modal="false"
        :close-on-press-escape="false" center>
        <div class="anonymous-prompt">
            <div class="info-icon">
                <el-icon size="60" color="#409EFF">
                    <Lock />
                </el-icon>
            </div>

            <div class="prompt-content">
                <h3>配置管理需要登录</h3>
                <p class="description">
                    您正在访问配置管理功能，该功能需要登录后才能使用。
                    当前显示的是 <strong>admin</strong> 用户的共享配置。
                </p>

                <div class="benefits">
                    <div class="benefit-item">
                        <el-icon color="#67C23A">
                            <User />
                        </el-icon>
                        <span>登录后可管理个人专属配置</span>
                    </div>
                    <div class="benefit-item">
                        <el-icon color="#E6A23C">
                            <Setting />
                        </el-icon>
                        <span>自定义账户、标签和映射规则</span>
                    </div>
                    <div class="benefit-item">
                        <el-icon color="#F56C6C">
                            <Document />
                        </el-icon>
                        <span>保存和管理个人账本数据</span>
                    </div>
                    <div class="benefit-item">
                        <el-icon color="#909399">
                            <View />
                        </el-icon>
                        <span>查看基于个人数据的财务报表</span>
                    </div>
                </div>

                <div class="data-highlight">
                    <el-alert title="关于 admin 用户" type="info" :closable="false" show-icon>
                        <template #default>
                            <strong>admin</strong> 用户是系统提供的共享配置账户，所有用户都可以登录使用：
                            <ul>
                                <li>提供基础的账户结构和映射配置</li>
                                <li>适合新用户快速上手</li>
                                <li>登录admin用户后修改的配置对所有用户可见</li>
                            </ul>
                        </template>
                    </el-alert>
                </div>
            </div>
        </div>

        <template #footer>
            <div class="dialog-footer">
                <el-button @click="handleSkip" size="large">
                    继续使用共享配置
                </el-button>
                <el-button type="primary" @click="handleLogin" size="large" :loading="loginLoading">
                    <el-icon>
                        <User />
                    </el-icon>
                    立即登录
                </el-button>
            </div>
        </template>
    </el-dialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { Lock, User, Setting, Document, View } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import router from '~/routers'

interface Props {
    modelValue: boolean
}

interface Emits {
    (e: 'update:modelValue', value: boolean): void
    (e: 'skip'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const visible = ref(props.modelValue)
const loginLoading = ref(false)

// 监听 modelValue 变化
watch(() => props.modelValue, (newVal) => {
    visible.value = newVal
})

// 监听 visible 变化
watch(visible, (newVal) => {
    emit('update:modelValue', newVal)
})

const handleSkip = () => {
    visible.value = false
    emit('skip')

    // 记录用户跳过登录的行为
    trackUserAction('anonymous_prompt_skipped', {
        timestamp: new Date().toISOString()
    })
}

const handleLogin = () => {
    loginLoading.value = true

    // 记录用户点击登录的行为
    trackUserAction('anonymous_prompt_login_clicked', {
        timestamp: new Date().toISOString()
    })

    // 跳转到登录页面
    setTimeout(() => {
        loginLoading.value = false
        visible.value = false
        router.push('/login')
    }, 500)
}

// 用户行为追踪
const trackUserAction = (action: string, data: any) => {
    // 这里可以集成 Google Analytics、百度统计等
    console.log('User action:', action, data)

    // 可以发送到后端进行数据分析
    // axios.post('/api/analytics/track', { action, data })
}
</script>

<style scoped>
.anonymous-prompt {
    text-align: center;
    padding: 20px 0;
}

.info-icon {
    margin-bottom: 20px;
}

.prompt-content h3 {
    color: #303133;
    margin-bottom: 15px;
    font-size: 20px;
}

.description {
    color: #606266;
    margin-bottom: 20px;
    line-height: 1.6;
}

.benefits {
    display: flex;
    flex-direction: column;
    gap: 12px;
    margin-bottom: 20px;
    text-align: left;
}

.benefit-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 0;
    color: #606266;
}

.benefit-item .el-icon {
    font-size: 18px;
}

.data-highlight {
    margin-top: 20px;
}

.data-highlight ul {
    margin: 10px 0 0 20px;
    text-align: left;
}

.data-highlight li {
    margin: 5px 0;
    color: #606266;
}

.dialog-footer {
    display: flex;
    justify-content: center;
    gap: 15px;
}

.dialog-footer .el-button {
    min-width: 120px;
}
</style>
