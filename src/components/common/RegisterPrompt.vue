<template>
    <el-dialog v-model="visible" title="🎉 解析完成！" width="500px" :close-on-click-modal="false"
        :close-on-press-escape="false" center>
        <div class="register-prompt">
            <div class="success-icon">
                <el-icon size="60" color="#67C23A">
                    <CircleCheck />
                </el-icon>
            </div>

            <div class="prompt-content">
                <h3>您的账单已成功解析！</h3>
                <p class="description">
                    系统已为您生成了 <strong>{{ parsedCount }}</strong> 条 Beancount 格式记录。
                    注册账号可以：
                </p>

                <div class="benefits">
                    <div class="benefit-item">
                        <el-icon color="#409EFF">
                            <Document />
                        </el-icon>
                        <span>永久保存您的账本数据</span>
                    </div>
                    <div class="benefit-item">
                        <el-icon color="#67C23A">
                            <TrendCharts />
                        </el-icon>
                        <span>随时查看专业的财务报表</span>
                    </div>
                    <div class="benefit-item">
                        <el-icon color="#E6A23C">
                            <Upload />
                        </el-icon>
                        <span>批量管理多个账单文件</span>
                    </div>
                    <div class="benefit-item">
                        <el-icon color="#F56C6C">
                            <Star />
                        </el-icon>
                        <span>享受 AI 智能分类优化</span>
                    </div>
                </div>

                <div class="data-highlight">
                    <el-alert title="数据越多，体验越好！" type="info" :closable="false" show-icon>
                        <template #default>
                            我们建议您上传 <strong>3-6 个月</strong> 的账单数据，这样 AI 可以：
                            <ul>
                                <li>更准确地识别您的消费模式</li>
                                <li>提供更智能的分类建议</li>
                                <li>生成更完整的财务分析</li>
                            </ul>
                        </template>
                    </el-alert>
                </div>
            </div>
        </div>

        <template #footer>
            <div class="dialog-footer">
                <el-button @click="handleSkip" size="large">
                    稍后再说
                </el-button>
                <el-button type="primary" @click="handleRegister" size="large" :loading="registerLoading">
                    <el-icon>
                        <User />
                    </el-icon>
                    立即注册
                </el-button>
            </div>
        </template>
    </el-dialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { CircleCheck, Document, TrendCharts, Upload, Star, User } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import router from '~/routers'

interface Props {
    modelValue: boolean
    parsedCount: number
}

interface Emits {
    (e: 'update:modelValue', value: boolean): void
    (e: 'skip'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const visible = ref(props.modelValue)
const registerLoading = ref(false)

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

    // 记录用户跳过注册的行为
    trackUserAction('register_prompt_skipped', {
        parsedCount: props.parsedCount,
        timestamp: new Date().toISOString()
    })
}

const handleRegister = () => {
    registerLoading.value = true

    // 记录用户点击注册的行为
    trackUserAction('register_prompt_clicked', {
        parsedCount: props.parsedCount,
        timestamp: new Date().toISOString()
    })

    // 跳转到注册页面
    setTimeout(() => {
        registerLoading.value = false
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
.register-prompt {
    text-align: center;
    padding: 20px 0;
}

.success-icon {
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
