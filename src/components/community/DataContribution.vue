<template>
    <div class="data-contribution">
        <el-card>
            <template #header>
                <div class="card-header">
                    <span>📈 数据贡献激励计划</span>
                    <el-tag type="success">帮助改进 AI，获得更好体验</el-tag>
                </div>
            </template>

            <div class="contribution-content">
                <!-- 当前贡献状态 -->
                <div class="current-status">
                    <h3>您的数据贡献状态</h3>
                    <el-row :gutter="20">
                        <el-col :span="8">
                            <div class="status-item">
                                <div class="status-icon">
                                    <el-icon size="30" color="#409EFF">
                                        <Document />
                                    </el-icon>
                                </div>
                                <div class="status-info">
                                    <div class="status-number">{{ userStats.fileCount }}</div>
                                    <div class="status-label">已上传文件</div>
                                </div>
                            </div>
                        </el-col>
                        <el-col :span="8">
                            <div class="status-item">
                                <div class="status-icon">
                                    <el-icon size="30" color="#67C23A">
                                        <TrendCharts />
                                    </el-icon>
                                </div>
                                <div class="status-info">
                                    <div class="status-number">{{ userStats.transactionCount }}</div>
                                    <div class="status-label">交易记录</div>
                                </div>
                            </div>
                        </el-col>
                        <el-col :span="8">
                            <div class="status-item">
                                <div class="status-icon">
                                    <el-icon size="30" color="#E6A23C">
                                        <Star />
                                    </el-icon>
                                </div>
                                <div class="status-info">
                                    <div class="status-number">{{ userStats.contributionScore }}</div>
                                    <div class="status-label">贡献积分</div>
                                </div>
                            </div>
                        </el-col>
                    </el-row>
                </div>

                <!-- 贡献等级 -->
                <div class="contribution-level">
                    <h3>贡献等级</h3>
                    <div class="level-progress">
                        <el-progress :percentage="levelProgress" :color="getLevelColor(currentLevel)" :stroke-width="20"
                            :text-inside="true" />
                        <div class="level-info">
                            <span class="current-level">{{ getLevelName(currentLevel) }}</span>
                            <span class="next-level">下一等级：{{ getLevelName(currentLevel + 1) }}</span>
                        </div>
                    </div>
                </div>

                <!-- 贡献任务 -->
                <div class="contribution-tasks">
                    <h3>贡献任务</h3>
                    <div class="tasks-list">
                        <div v-for="task in tasks" :key="task.id" class="task-item"
                            :class="{ 'completed': task.completed }">
                            <div class="task-icon">
                                <el-icon v-if="task.completed" color="#67C23A">
                                    <CircleCheck />
                                </el-icon>
                                <el-icon v-else color="#909399">
                                    <Clock />
                                </el-icon>
                            </div>
                            <div class="task-content">
                                <div class="task-title">{{ task.title }}</div>
                                <div class="task-description">{{ task.description }}</div>
                                <div class="task-reward">
                                    <el-tag size="small" type="warning">+{{ task.reward }} 积分</el-tag>
                                </div>
                            </div>
                            <div class="task-action">
                                <el-button v-if="!task.completed && task.available" type="primary" size="small"
                                    @click="handleTaskAction(task)">
                                    {{ task.actionText }}
                                </el-button>
                                <el-tag v-else-if="task.completed" type="success" size="small">
                                    已完成
                                </el-tag>
                                <el-tag v-else type="info" size="small">
                                    未解锁
                                </el-tag>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- 数据质量建议 -->
                <div class="data-quality-suggestions">
                    <h3>数据质量提升建议</h3>
                    <div class="suggestions">
                        <div v-for="suggestion in suggestions" :key="suggestion.id" class="suggestion-item">
                            <div class="suggestion-icon">
                                <el-icon :color="suggestion.color">
                                    <component :is="suggestion.icon" />
                                </el-icon>
                            </div>
                            <div class="suggestion-content">
                                <div class="suggestion-title">{{ suggestion.title }}</div>
                                <div class="suggestion-desc">{{ suggestion.description }}</div>
                                <div class="suggestion-impact">
                                    预计提升贡献度：<strong>{{ suggestion.impact }}%</strong>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </el-card>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { Document, TrendCharts, Star, CircleCheck, Clock, Upload, Calendar, BankCard, Trophy } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import axios from '../../utils/request'

// 用户统计数据
const userStats = ref({
    fileCount: 0,
    transactionCount: 0,
    contributionScore: 0
})

// 当前等级
const currentLevel = ref(1)

// 等级进度
const levelProgress = computed(() => {
    const score = userStats.value.contributionScore
    if (score < 100) return (score / 100) * 100
    if (score < 500) return ((score - 100) / 400) * 100
    if (score < 1000) return ((score - 500) / 500) * 100
    return 100
})

// 获取等级名称
const getLevelName = (level: number) => {
    const levels = {
        1: '新手贡献者',
        2: '活跃用户',
        3: '数据专家',
        4: '社区领袖',
        5: '数据大师'
    }
    return levels[level] || '未知等级'
}

// 获取等级颜色
const getLevelColor = (level: number) => {
    const colors = {
        1: '#909399',
        2: '#409EFF',
        3: '#67C23A',
        4: '#E6A23C',
        5: '#F56C6C'
    }
    return colors[level] || '#909399'
}

// 贡献任务
const tasks = ref([
    {
        id: 1,
        title: '上传第一个账单文件',
        description: '上传任意一个账单文件开始您的贡献之旅',
        reward: 10,
        completed: false,
        available: true,
        actionText: '立即上传'
    },
    {
        id: 2,
        title: '上传 3 个月数据',
        description: '上传至少 3 个月的连续账单数据',
        reward: 50,
        completed: false,
        available: false,
        actionText: '继续上传'
    },
    {
        id: 3,
        title: '多账户整合',
        description: '上传包含银行卡、支付宝、微信的完整数据',
        reward: 100,
        completed: false,
        available: false,
        actionText: '添加账户'
    },
    {
        id: 4,
        title: '数据质量优化',
        description: '确保所有交易记录完整且准确',
        reward: 80,
        completed: false,
        available: false,
        actionText: '检查数据'
    },
    {
        id: 5,
        title: '长期数据贡献',
        description: '持续上传 6 个月以上的数据',
        reward: 200,
        completed: false,
        available: false,
        actionText: '持续贡献'
    }
])

// 数据质量建议
const suggestions = ref([
    {
        id: 1,
        title: '增加数据时间跨度',
        description: '上传更长时间跨度的数据，帮助 AI 学习您的消费模式',
        impact: 30,
        icon: 'Calendar',
        color: '#409EFF'
    },
    {
        id: 2,
        title: '多账户数据整合',
        description: '包含所有常用支付方式的数据，获得更全面的财务视图',
        impact: 25,
        icon: 'BankCard',
        color: '#67C23A'
    },
    {
        id: 3,
        title: '数据完整性检查',
        description: '确保没有遗漏重要交易，提高数据质量',
        impact: 20,
        icon: 'CircleCheck',
        color: '#E6A23C'
    },
    {
        id: 4,
        title: '定期数据更新',
        description: '保持数据的时效性，定期上传最新账单',
        impact: 15,
        icon: 'Upload',
        color: '#F56C6C'
    }
])

// 处理任务操作
const handleTaskAction = (task: any) => {
    switch (task.id) {
        case 1:
            ElMessage.info('请前往文件管理页面上传账单文件')
            break
        case 2:
            ElMessage.info('请继续上传更多月份的账单数据')
            break
        case 3:
            ElMessage.info('请添加其他支付方式的账单数据')
            break
        case 4:
            ElMessage.info('请检查并完善您的账单数据')
            break
        case 5:
            ElMessage.info('请保持定期上传账单数据')
            break
    }
}

// 加载用户数据
const loadUserStats = async () => {
    try {
        // 这里应该调用后端 API 获取用户真实数据
        // const response = await axios.get('/api/user/contribution-stats')
        // userStats.value = response.data

        // 模拟数据
        userStats.value = {
            fileCount: 5,
            transactionCount: 234,
            contributionScore: 45
        }

        // 更新任务状态
        updateTaskStatus()
    } catch (error) {
        console.error('加载用户统计数据失败:', error)
    }
}

// 更新任务状态
const updateTaskStatus = () => {
    const stats = userStats.value

    // 根据用户数据更新任务完成状态
    tasks.value[0].completed = stats.fileCount > 0
    tasks.value[1].available = stats.fileCount > 0
    tasks.value[1].completed = stats.fileCount >= 3
    tasks.value[2].available = stats.fileCount >= 3
    tasks.value[2].completed = stats.fileCount >= 5
    tasks.value[3].available = stats.fileCount >= 5
    tasks.value[4].available = stats.fileCount >= 10
}

onMounted(() => {
    loadUserStats()
})
</script>

<style scoped>
.data-contribution {
    padding: 20px;
}

.card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.contribution-content {
    padding: 20px 0;
}

.current-status {
    margin-bottom: 30px;
}

.current-status h3 {
    margin-bottom: 20px;
    color: #303133;
}

.status-item {
    display: flex;
    align-items: center;
    padding: 20px;
    background: #f8f9fa;
    border-radius: 8px;
}

.status-icon {
    margin-right: 15px;
}

.status-number {
    font-size: 24px;
    font-weight: bold;
    color: #303133;
}

.status-label {
    color: #606266;
    font-size: 14px;
}

.contribution-level {
    margin-bottom: 30px;
}

.contribution-level h3 {
    margin-bottom: 15px;
    color: #303133;
}

.level-progress {
    margin-bottom: 15px;
}

.level-info {
    display: flex;
    justify-content: space-between;
    font-size: 14px;
}

.current-level {
    color: #409EFF;
    font-weight: bold;
}

.next-level {
    color: #909399;
}

.contribution-tasks {
    margin-bottom: 30px;
}

.contribution-tasks h3 {
    margin-bottom: 20px;
    color: #303133;
}

.tasks-list {
    display: flex;
    flex-direction: column;
    gap: 15px;
}

.task-item {
    display: flex;
    align-items: center;
    padding: 20px;
    border: 1px solid #EBEEF5;
    border-radius: 8px;
    transition: all 0.3s;
}

.task-item.completed {
    background: #f0f9ff;
    border-color: #67C23A;
}

.task-icon {
    margin-right: 15px;
}

.task-content {
    flex: 1;
}

.task-title {
    font-weight: bold;
    color: #303133;
    margin-bottom: 5px;
}

.task-description {
    color: #606266;
    font-size: 14px;
    margin-bottom: 8px;
}

.task-reward {
    margin-bottom: 0;
}

.task-action {
    margin-left: 15px;
}

.data-quality-suggestions h3 {
    margin-bottom: 20px;
    color: #303133;
}

.suggestions {
    display: flex;
    flex-direction: column;
    gap: 15px;
}

.suggestion-item {
    display: flex;
    align-items: flex-start;
    padding: 20px;
    background: #f8f9fa;
    border-radius: 8px;
}

.suggestion-icon {
    margin-right: 15px;
    margin-top: 5px;
}

.suggestion-content {
    flex: 1;
}

.suggestion-title {
    font-weight: bold;
    color: #303133;
    margin-bottom: 5px;
}

.suggestion-desc {
    color: #606266;
    font-size: 14px;
    margin-bottom: 8px;
    line-height: 1.5;
}

.suggestion-impact {
    color: #409EFF;
    font-size: 14px;
}
</style>

