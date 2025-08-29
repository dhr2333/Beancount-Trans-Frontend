<template>
    <div class="template-container">
        <div class="template-header">
            <h1>官方模板库</h1>
            <el-button type="info" plain disabled>仅限查看</el-button>
        </div>

        <el-tabs v-model="activeType">
            <el-tab-pane label="支出模板" name="expense"></el-tab-pane>
            <el-tab-pane label="收入模板" name="income"></el-tab-pane>
            <el-tab-pane label="资产模板" name="assets"></el-tab-pane>
        </el-tabs>

        <div v-if="loading" class="empty-state">
            <el-icon class="is-loading" size="32">
                <Loading />
            </el-icon>
            <p>加载中...</p>
        </div>

        <div v-else-if="templates.length === 0" class="empty-state">
            <el-icon size="32">
                <DocumentDelete />
            </el-icon>
            <p>暂无官方模板</p>
        </div>

        <div v-else>
            <el-card v-for="template in templates" :key="template.id" class="template-card">
                <template #header>
                    <div class="template-card__header">
                        <span>{{ template.name }}</span>
                        <el-tag v-if="template.is_official" type="success" class="official-tag">官方</el-tag>
                    </div>
                </template>

                <div class="template-meta">
                    <div class="template-meta-item">
                        <el-tag :type="getTypeTag(template.type)" class="template-type-tag">
                            {{ getTypeText(template.type) }}
                        </el-tag>
                        <span>版本: {{ template.version }}</span>
                    </div>
                    <div class="template-meta-item">
                        <el-icon>
                            <User />
                        </el-icon>
                        <span>创建者: {{ template.owner_name || '系统' }}</span>
                    </div>
                    <div class="template-meta-item">
                        <el-icon>
                            <Clock />
                        </el-icon>
                        <span>更新: {{ formatDate(template.modified) }}</span>
                    </div>
                </div>

                <div class="template-description">
                    {{ template.description || '暂无描述' }}
                </div>

                <el-collapse v-if="template.items && template.items.length > 0">
                    <el-collapse-item title="查看映射条目">
                        <el-table :data="template.items" class="items-table" stripe>
                            <el-table-column label="关键字" prop="key" width="120"></el-table-column>

                            <!-- 支出模板特有字段 -->
                            <el-table-column v-if="template.type === 'expense'" label="商家"
                                prop="payee"></el-table-column>
                            <el-table-column v-if="template.type === 'expense'" label="支出账户"
                                prop="account"></el-table-column>
                            <el-table-column v-if="template.type === 'expense'" label="货币" prop="currency"
                                width="80"></el-table-column>

                            <!-- 收入模板特有字段 -->
                            <!-- <el-table-column v-if="template.type === 'income'" label="付款方" prop="payer"></el-table-column> -->
                            <el-table-column v-if="template.type === 'income'" label="收入账户"
                                prop="account"></el-table-column>

                            <!-- 资产模板特有字段 -->
                            <el-table-column v-if="template.type === 'assets'" label="账户全称"
                                prop="full"></el-table-column>
                            <el-table-column v-if="template.type === 'assets'" label="资产账户"
                                prop="account"></el-table-column>
                        </el-table>
                    </el-collapse-item>
                </el-collapse>

                <div v-if="template.update_notes" style="margin-top: 15px;">
                    <el-text type="info" size="small">更新说明: {{ template.update_notes }}</el-text>
                </div>
            </el-card>
        </div>
    </div>
</template>

<script lang="ts" setup>
import { ref, onMounted, watch } from 'vue'
import { ElMessage, ElLoading } from 'element-plus'
import { User, Clock, DocumentDelete, Loading } from '@element-plus/icons-vue'
import axios from '../../utils/request'

// 响应式数据
const activeType = ref('expense')
const templates = ref([])
const loading = ref(false)

// 获取模板类型文本
const getTypeText = (type: string) => {
    const typeMap: Record<string, string> = {
        'expense': '支出',
        'income': '收入',
        'assets': '资产'
    }
    return typeMap[type] || type
}

// 获取模板类型标签样式
const getTypeTag = (type: string) => {
    const typeTagMap: Record<string, string> = {
        'expense': 'danger',
        'income': 'success',
        'assets': 'warning'
    }
    return typeTagMap[type] || ''
}

// 格式化日期
const formatDate = (dateString: string) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`
}

// 获取模板数据
const fetchTemplates = async () => {
    loading.value = true
    try {
        const response = await axios.get('/templates/', {
            params: {
                type: activeType.value,
                is_official: true
            }
        })
        templates.value = response.data

        // 为每个模板获取详细条目信息
        for (let template of templates.value) {
            try {
                const detailResponse = await axios.get(`/templates/${template.id}/`)
                template.items = detailResponse.data.items || []
            } catch (error) {
                console.error(`获取模板 ${template.name} 的详情失败:`, error)
                template.items = []
            }
        }
    } catch (error) {
        console.error('获取模板列表失败:', error)
        ElMessage.error('获取模板数据失败')
    } finally {
        loading.value = false
    }
}

// 初始化时获取数据
// onMounted(() => {
//     fetchTemplates()
// })

// 监听标签页变化
watch(activeType, () => {
    fetchTemplates()
}, { immediate: true })
</script>

<style scoped>
.template-container {
    padding: 20px;
    max-width: 1200px;
    margin: 0 auto;
}

.template-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
}

.template-card {
    margin-bottom: 20px;
    border-radius: 8px;
    box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
}

.template-card__header {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.template-meta {
    display: flex;
    align-items: center;
    margin-bottom: 10px;
    color: #909399;
    font-size: 14px;
}

.template-meta-item {
    margin-right: 15px;
    display: flex;
    align-items: center;
}

.template-description {
    margin: 10px 0;
    color: #606266;
}

.items-table {
    margin-top: 15px;
}

.official-tag {
    margin-left: 10px;
}

.template-type-tag {
    margin-right: 10px;
}

.empty-state {
    text-align: center;
    padding: 40px 0;
    color: #909399;
}

.collapse-content {
    padding: 0;
}
</style>