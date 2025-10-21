<template>
    <div class="community-hub">
        <!-- 数据统计展示 -->
        <div class="data-stats">
            <el-row :gutter="20">
                <el-col :span="6">
                    <el-card class="stat-card">
                        <div class="stat-content">
                            <div class="stat-number">{{ stats.totalUsers }}</div>
                            <div class="stat-label">注册用户</div>
                        </div>
                    </el-card>
                </el-col>
                <el-col :span="6">
                    <el-card class="stat-card">
                        <div class="stat-content">
                            <div class="stat-number">{{ stats.totalFiles }}</div>
                            <div class="stat-label">解析文件</div>
                        </div>
                    </el-card>
                </el-col>
                <el-col :span="6">
                    <el-card class="stat-card">
                        <div class="stat-content">
                            <div class="stat-number">{{ stats.totalTransactions }}</div>
                            <div class="stat-label">处理交易</div>
                        </div>
                    </el-card>
                </el-col>
                <el-col :span="6">
                    <el-card class="stat-card">
                        <div class="stat-content">
                            <div class="stat-number">{{ stats.avgDataPerUser }}</div>
                            <div class="stat-label">人均数据量</div>
                        </div>
                    </el-card>
                </el-col>
            </el-row>
        </div>

        <!-- 数据质量排行榜 -->
        <div class="leaderboard">
            <el-card>
                <template #header>
                    <div class="card-header">
                        <span>📊 数据贡献排行榜</span>
                        <el-tag type="info">数据越多，分析越准确</el-tag>
                    </div>
                </template>

                <el-table :data="leaderboard" stripe>
                    <el-table-column prop="rank" label="排名" width="80">
                        <template #default="{ row }">
                            <el-tag :type="getRankType(row.rank)" size="small">
                                {{ row.rank }}
                            </el-tag>
                        </template>
                    </el-table-column>
                    <el-table-column prop="username" label="用户名" />
                    <el-table-column prop="fileCount" label="文件数量" />
                    <el-table-column prop="transactionCount" label="交易条数" />
                    <el-table-column prop="dataQuality" label="数据质量" />
                    <el-table-column prop="contribution" label="贡献度">
                        <template #default="{ row }">
                            <el-progress :percentage="row.contribution" :color="getContributionColor(row.contribution)"
                                :show-text="false" />
                            <span class="contribution-text">{{ row.contribution }}%</span>
                        </template>
                    </el-table-column>
                </el-table>
            </el-card>
        </div>

        <!-- 数据分享功能 -->
        <div class="data-sharing">
            <el-card>
                <template #header>
                    <div class="card-header">
                        <span>🤝 数据分享与协作</span>
                    </div>
                </template>

                <div class="sharing-options">
                    <el-row :gutter="20">
                        <el-col :span="8">
                            <div class="sharing-card">
                                <el-icon size="40" color="#409EFF">
                                    <Share />
                                </el-icon>
                                <h4>匿名数据贡献</h4>
                                <p>匿名分享您的消费模式数据，帮助改进 AI 分类算法</p>
                                <el-button type="primary" @click="handleAnonymousShare">
                                    参与贡献
                                </el-button>
                            </div>
                        </el-col>
                        <el-col :span="8">
                            <div class="sharing-card">
                                <el-icon size="40" color="#67C23A">
                                    <Document />
                                </el-icon>
                                <h4>模板分享</h4>
                                <p>分享您的账户映射模板，帮助其他用户快速配置</p>
                                <el-button type="success" @click="handleTemplateShare">
                                    分享模板
                                </el-button>
                            </div>
                        </el-col>
                        <el-col :span="8">
                            <div class="sharing-card">
                                <el-icon size="40" color="#E6A23C">
                                    <Trophy />
                                </el-icon>
                                <h4>成就系统</h4>
                                <p>完成数据贡献任务，获得专属徽章和特权</p>
                                <el-button type="warning" @click="handleAchievements">
                                    查看成就
                                </el-button>
                            </div>
                        </el-col>
                    </el-row>
                </div>
            </el-card>
        </div>

        <!-- 数据质量提示 -->
        <div class="data-quality-tips">
            <el-alert title="💡 数据质量提升建议" type="info" :closable="false" show-icon>
                <template #default>
                    <div class="tips-content">
                        <p><strong>为了获得最佳体验，建议您：</strong></p>
                        <ul>
                            <li>📅 上传至少 3-6 个月的完整账单数据</li>
                            <li>🏦 包含多个账户（银行卡、支付宝、微信等）</li>
                            <li>💰 确保数据完整性，避免遗漏重要交易</li>
                            <li>🔄 定期更新数据，保持账本时效性</li>
                        </ul>
                        <p class="highlight">
                            <strong>数据量越大，AI 分析越准确，您的财务洞察越深入！</strong>
                        </p>
                    </div>
                </template>
            </el-alert>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Share, Document, Trophy } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import axios from '../../utils/request'

// 统计数据
const stats = ref({
    totalUsers: 0,
    totalFiles: 0,
    totalTransactions: 0,
    avgDataPerUser: 0
})

// 排行榜数据
const leaderboard = ref([
    {
        rank: 1,
        username: '数据达人',
        fileCount: 24,
        transactionCount: 1250,
        dataQuality: '优秀',
        contribution: 95
    },
    {
        rank: 2,
        username: '记账专家',
        fileCount: 18,
        transactionCount: 980,
        dataQuality: '良好',
        contribution: 88
    },
    {
        rank: 3,
        username: '财务分析师',
        fileCount: 15,
        transactionCount: 756,
        dataQuality: '良好',
        contribution: 82
    }
])

// 获取排名样式
const getRankType = (rank: number) => {
    if (rank === 1) return 'danger'
    if (rank === 2) return 'warning'
    if (rank === 3) return 'success'
    return 'info'
}

// 获取贡献度颜色
const getContributionColor = (percentage: number) => {
    if (percentage >= 90) return '#67C23A'
    if (percentage >= 70) return '#E6A23C'
    if (percentage >= 50) return '#F56C6C'
    return '#909399'
}

// 处理匿名分享
const handleAnonymousShare = () => {
    ElMessage.info('匿名数据贡献功能开发中...')
    // 这里可以集成数据贡献逻辑
}

// 处理模板分享
const handleTemplateShare = () => {
    ElMessage.info('模板分享功能开发中...')
    // 这里可以集成模板分享逻辑
}

// 处理成就系统
const handleAchievements = () => {
    ElMessage.info('成就系统开发中...')
    // 这里可以集成成就系统逻辑
}

// 加载统计数据
const loadStats = async () => {
    try {
        // 这里应该调用后端 API 获取真实数据
        // const response = await axios.get('/api/community/stats')
        // stats.value = response.data

        // 模拟数据
        stats.value = {
            totalUsers: 1250,
            totalFiles: 15680,
            totalTransactions: 89250,
            avgDataPerUser: 71
        }
    } catch (error) {
        console.error('加载统计数据失败:', error)
    }
}

onMounted(() => {
    loadStats()
})
</script>

<style scoped>
.community-hub {
    padding: 20px;
}

.data-stats {
    margin-bottom: 30px;
}

.stat-card {
    text-align: center;
}

.stat-content {
    padding: 20px;
}

.stat-number {
    font-size: 32px;
    font-weight: bold;
    color: #409EFF;
    margin-bottom: 8px;
}

.stat-label {
    color: #606266;
    font-size: 14px;
}

.leaderboard {
    margin-bottom: 30px;
}

.card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.contribution-text {
    margin-left: 10px;
    font-size: 12px;
    color: #606266;
}

.data-sharing {
    margin-bottom: 30px;
}

.sharing-options {
    padding: 20px 0;
}

.sharing-card {
    text-align: center;
    padding: 30px 20px;
    border: 1px solid #EBEEF5;
    border-radius: 8px;
    transition: all 0.3s;
}

.sharing-card:hover {
    border-color: #409EFF;
    box-shadow: 0 4px 12px rgba(64, 158, 255, 0.1);
}

.sharing-card h4 {
    margin: 15px 0 10px;
    color: #303133;
}

.sharing-card p {
    color: #606266;
    margin-bottom: 20px;
    line-height: 1.6;
}

.data-quality-tips {
    margin-top: 30px;
}

.tips-content ul {
    margin: 10px 0;
    padding-left: 20px;
}

.tips-content li {
    margin: 8px 0;
    color: #606266;
}

.highlight {
    margin-top: 15px;
    color: #409EFF;
    font-size: 16px;
}
</style>

