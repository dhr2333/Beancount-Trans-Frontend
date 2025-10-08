<template>
    <div class="tag-management">
        <div class="management-header">
            <h2>标签管理</h2>
            <div class="header-actions">
                <el-button type="primary" @click="showAddDialog">
                    <el-icon>
                        <Plus />
                    </el-icon>
                    新增标签
                </el-button>
                <el-button @click="loadTagTree">
                    <el-icon>
                        <Refresh />
                    </el-icon>
                    刷新
                </el-button>
            </div>
        </div>

        <div class="management-content">
            <!-- 左侧：标签树 -->
            <div class="tag-tree-panel">
                <div class="tree-toolbar">
                    <el-input v-model="searchKeyword" placeholder="搜索标签" clearable @input="handleSearch">
                        <template #prefix>
                            <el-icon>
                                <Search />
                            </el-icon>
                        </template>
                    </el-input>
                </div>

                <el-tree :data="filteredTagTree" :props="treeProps" node-key="id" :expand-on-click-node="false"
                    :default-expand-all="false" :default-expanded-keys="defaultExpandedKeys" @node-click="handleNodeClick"
                    @node-expand="handleNodeExpand" @node-collapse="handleNodeCollapse" class="tag-tree"
                    v-loading="loading">
                    <template #default="{ node, data }">
                        <div class="tree-node">
                            <span class="node-label">{{ data.full_path }}</span>
                            <div class="node-actions">
                                <el-tag v-if="data.has_children" size="small" type="info">
                                    {{ data.children?.length || 0 }}子标签
                                </el-tag>
                                <el-switch v-model="data.enable" size="small" @change="updateTagStatus(data)"
                                    style="margin-left: 8px;" />
                            </div>
                        </div>
                    </template>
                </el-tree>
            </div>

            <!-- 右侧：标签详情 -->
            <div class="tag-detail-panel">
                <div v-if="selectedTag" class="tag-detail">
                    <h3>{{ selectedTag.full_path }}</h3>

                    <!-- 基本信息 -->
                    <el-card class="info-card">
                        <template #header>
                            <span>基本信息</span>
                        </template>
                        <el-descriptions :column="2" border>
                            <el-descriptions-item label="标签名称">
                                {{ selectedTag.name }}
                            </el-descriptions-item>
                            <el-descriptions-item label="完整路径">
                                <code>{{ selectedTag.full_path }}</code>
                            </el-descriptions-item>
                            <el-descriptions-item label="启用状态">
                                <el-switch v-model="selectedTag.enable" @change="updateTagStatus(selectedTag)" />
                            </el-descriptions-item>
                            <el-descriptions-item label="子标签">
                                {{ selectedTag.has_children ? (selectedTag.children?.length || 0) : 0 }}
                            </el-descriptions-item>
                            <el-descriptions-item label="父标签" :span="2">
                                {{ selectedTag.parent_name || '无（根标签）' }}
                            </el-descriptions-item>
                            <el-descriptions-item label="描述" :span="2">
                                {{ selectedTag.description || '暂无描述' }}
                            </el-descriptions-item>
                            <el-descriptions-item label="创建时间">
                                {{ formatDateTime(selectedTag.created) }}
                            </el-descriptions-item>
                            <el-descriptions-item label="修改时间">
                                {{ formatDateTime(selectedTag.modified) }}
                            </el-descriptions-item>
                        </el-descriptions>
                    </el-card>

                    <!-- 操作按钮 -->
                    <div class="detail-actions">
                        <el-button type="primary" @click="showEditDialog(selectedTag)">
                            <el-icon>
                                <Edit />
                            </el-icon>
                            编辑
                        </el-button>
                        <el-button type="danger" @click="handleDelete(selectedTag)">
                            <el-icon>
                                <Delete />
                            </el-icon>
                            删除
                        </el-button>
                    </div>
                </div>

                <el-empty v-else description="请选择一个标签查看详情" />
            </div>
        </div>

        <!-- 新增/编辑标签对话框 -->
        <el-dialog v-model="dialogVisible" :title="dialogTitle" width="600px" @close="resetForm">
            <el-form :model="tagForm" :rules="formRules" ref="formRef" label-width="100px">
                <el-form-item label="标签名称" prop="name">
                    <el-input v-model="tagForm.name" placeholder="请输入标签名称（不能包含空格、#等特殊字符）" />
                </el-form-item>
                <el-form-item label="父标签" prop="parent">
                    <TagSelector v-model="tagForm.parent" :multiple="false" placeholder="不选择则为根标签" />
                    <div class="form-help-text">
                        选择父标签后，完整路径将为：父标签/{{ tagForm.name || '标签名称' }}
                    </div>
                </el-form-item>
                <el-form-item label="描述" prop="description">
                    <el-input v-model="tagForm.description" type="textarea" :rows="3" placeholder="请输入标签描述（可选）" />
                </el-form-item>
                <el-form-item label="启用状态" prop="enable">
                    <el-switch v-model="tagForm.enable" active-text="启用" inactive-text="禁用" />
                </el-form-item>
            </el-form>
            <template #footer>
                <el-button @click="dialogVisible = false">取消</el-button>
                <el-button type="primary" @click="handleSubmit" :loading="submitting">确定</el-button>
            </template>
        </el-dialog>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import { Plus, Refresh, Search, Edit, Delete } from '@element-plus/icons-vue'
import TagSelector from '../common/TagSelector.vue'
import {
    fetchTagTree,
    createTag,
    updateTag,
    deleteTag,
    toggleTagEnable
} from '../../api/tags'
import type { Tag, TagForm } from '../../types/tag'

// 响应式数据
const tagTree = ref<Tag[]>([])
const selectedTag = ref<Tag | null>(null)
const loading = ref(false)
const searchKeyword = ref('')
const dialogVisible = ref(false)
const dialogTitle = ref('新增标签')
const submitting = ref(false)
const formRef = ref<FormInstance>()
const defaultExpandedKeys = ref<number[]>([])

// 树形配置
const treeProps = {
    label: 'name',
    children: 'children'
}

// 表单数据
const tagForm = ref<TagForm>({
    name: '',
    parent: null,
    description: '',
    enable: true
})

// 表单验证规则
const formRules: FormRules = {
    name: [
        { required: true, message: '请输入标签名称', trigger: 'blur' },
        { min: 1, max: 64, message: '标签名称长度在 1 到 64 个字符', trigger: 'blur' },
        {
            pattern: /^[a-zA-Z0-9\u4e00-\u9fa5_-]+$/,
            message: '标签名称不能包含空格、#等特殊字符',
            trigger: 'blur'
        }
    ]
}

// 过滤后的标签树（用于搜索）
const filteredTagTree = computed(() => {
    if (!searchKeyword.value) {
        return tagTree.value
    }
    return filterTree(tagTree.value, searchKeyword.value.toLowerCase())
})

// 过滤树节点
const filterTree = (nodes: Tag[], keyword: string): Tag[] => {
    const result: Tag[] = []
    for (const node of nodes) {
        const matches = node.name.toLowerCase().includes(keyword) ||
            node.full_path.toLowerCase().includes(keyword) ||
            (node.description && node.description.toLowerCase().includes(keyword))

        if (matches) {
            result.push(node)
        } else if (node.children && node.children.length > 0) {
            const filteredChildren = filterTree(node.children, keyword)
            if (filteredChildren.length > 0) {
                result.push({
                    ...node,
                    children: filteredChildren
                })
            }
        }
    }
    return result
}

// 加载标签树
const loadTagTree = async () => {
    try {
        loading.value = true
        const response = await fetchTagTree()
        tagTree.value = response.data || []
        console.log('标签树加载完成:', tagTree.value)
    } catch (error: any) {
        console.error('加载标签树失败:', error)
        ElMessage.error('加载标签树失败')
    } finally {
        loading.value = false
    }
}

// 搜索处理
const handleSearch = () => {
    // 搜索时自动展开所有匹配的节点
    if (searchKeyword.value) {
        const expandKeys: number[] = []
        const collectKeys = (nodes: Tag[]) => {
            nodes.forEach(node => {
                expandKeys.push(node.id)
                if (node.children) {
                    collectKeys(node.children)
                }
            })
        }
        collectKeys(filteredTagTree.value)
        defaultExpandedKeys.value = expandKeys
    }
}

// 点击节点
const handleNodeClick = (tag: Tag) => {
    selectedTag.value = tag
    console.log('选中标签:', tag)
}

// 节点展开
const handleNodeExpand = (data: Tag) => {
    if (!defaultExpandedKeys.value.includes(data.id)) {
        defaultExpandedKeys.value.push(data.id)
    }
}

// 节点折叠
const handleNodeCollapse = (data: Tag) => {
    const index = defaultExpandedKeys.value.indexOf(data.id)
    if (index > -1) {
        defaultExpandedKeys.value.splice(index, 1)
    }
}

// 显示新增对话框
const showAddDialog = () => {
    dialogTitle.value = '新增标签'
    resetForm()
    dialogVisible.value = true
}

// 显示编辑对话框
const showEditDialog = (tag: Tag) => {
    dialogTitle.value = '编辑标签'
    tagForm.value = {
        name: tag.name,
        parent: tag.parent,
        description: tag.description,
        enable: tag.enable
    }
    dialogVisible.value = true
}

// 重置表单
const resetForm = () => {
    tagForm.value = {
        name: '',
        parent: null,
        description: '',
        enable: true
    }
    formRef.value?.clearValidate()
}

// 提交表单
const handleSubmit = async () => {
    if (!formRef.value) return

    try {
        await formRef.value.validate()
        submitting.value = true

        if (dialogTitle.value === '新增标签') {
            await createTag(tagForm.value)
            ElMessage.success('标签创建成功')
        } else {
            if (selectedTag.value) {
                await updateTag(selectedTag.value.id, tagForm.value)
                ElMessage.success('标签更新成功')
            }
        }

        dialogVisible.value = false
        await loadTagTree()

        // 如果是编辑，重新选中该标签
        if (selectedTag.value) {
            const updatedTag = findTagById(tagTree.value, selectedTag.value.id)
            if (updatedTag) {
                selectedTag.value = updatedTag
            }
        }
    } catch (error: any) {
        console.error('提交失败:', error)
        if (error.response?.data) {
            const errorMsg = JSON.stringify(error.response.data)
            ElMessage.error(`操作失败: ${errorMsg}`)
        } else {
            ElMessage.error('操作失败')
        }
    } finally {
        submitting.value = false
    }
}

// 更新标签状态
const updateTagStatus = async (tag: Tag) => {
    try {
        await toggleTagEnable(tag.id)
        ElMessage.success(`标签已${tag.enable ? '启用' : '禁用'}`)
        await loadTagTree()
    } catch (error) {
        console.error('更新标签状态失败:', error)
        ElMessage.error('更新状态失败')
        // 恢复状态
        tag.enable = !tag.enable
    }
}

// 删除标签
const handleDelete = async (tag: Tag) => {
    try {
        const hasChildren = tag.has_children
        const confirmMsg = hasChildren
            ? `标签 "${tag.full_path}" 包含子标签，是否强制删除（包括所有子标签）？`
            : `确定要删除标签 "${tag.full_path}" 吗？`

        await ElMessageBox.confirm(confirmMsg, '删除确认', {
            confirmButtonText: '确定',
            cancelButtonText: '取消',
            type: 'warning'
        })

        await deleteTag(tag.id, { force: hasChildren })
        ElMessage.success('标签删除成功')
        selectedTag.value = null
        await loadTagTree()
    } catch (error: any) {
        if (error !== 'cancel') {
            console.error('删除标签失败:', error)
            if (error.response?.data?.error) {
                ElMessage.error(error.response.data.error)
            } else {
                ElMessage.error('删除标签失败')
            }
        }
    }
}

// 根据ID查找标签
const findTagById = (tags: Tag[], id: number): Tag | null => {
    for (const tag of tags) {
        if (tag.id === id) return tag
        if (tag.children) {
            const found = findTagById(tag.children, id)
            if (found) return found
        }
    }
    return null
}

// 格式化日期时间
const formatDateTime = (dateStr: string) => {
    if (!dateStr) return '-'
    const date = new Date(dateStr)
    return date.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    })
}

// 组件挂载
onMounted(() => {
    loadTagTree()
})
</script>

<style scoped>
.tag-management {
    padding: 20px;
    height: 100vh;
    display: flex;
    flex-direction: column;
    background-color: #f5f7fa;
}

.management-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
    padding: 16px 20px;
    background: white;
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.management-header h2 {
    margin: 0;
    font-size: 24px;
    color: #303133;
}

.header-actions {
    display: flex;
    gap: 12px;
}

.management-content {
    flex: 1;
    display: grid;
    grid-template-columns: 450px 1fr;
    gap: 20px;
    overflow: hidden;
}

.tag-tree-panel,
.tag-detail-panel {
    background: white;
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    overflow: hidden;
    display: flex;
    flex-direction: column;
}

.tree-toolbar {
    padding: 16px;
    border-bottom: 1px solid #ebeef5;
}

.tag-tree {
    flex: 1;
    overflow-y: auto;
    padding: 16px;
}

.tree-node {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 14px;
    padding: 4px 8px;
}

.node-label {
    flex: 1;
    font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
    font-weight: 500;
}

.node-actions {
    display: flex;
    align-items: center;
    gap: 8px;
}

.tag-detail-panel {
    padding: 20px;
    overflow-y: auto;
}

.tag-detail h3 {
    margin: 0 0 20px 0;
    font-size: 20px;
    color: #303133;
    font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
}

.info-card {
    margin-bottom: 20px;
}

.info-card code {
    background: #f5f7fa;
    padding: 2px 8px;
    border-radius: 4px;
    font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
}

.detail-actions {
    display: flex;
    gap: 12px;
}

.form-help-text {
    font-size: 12px;
    color: #909399;
    margin-top: 4px;
}

/* 响应式设计 */
@media (max-width: 1200px) {
    .management-content {
        grid-template-columns: 1fr;
    }

    .tag-tree-panel {
        max-height: 400px;
    }
}

@media (max-width: 768px) {
    .tag-management {
        padding: 10px;
    }

    .management-header {
        flex-direction: column;
        gap: 12px;
        align-items: stretch;
    }

    .header-actions {
        width: 100%;
        justify-content: space-between;
    }

    .tree-node {
        flex-direction: column;
        align-items: flex-start;
        gap: 8px;
    }
}
</style>


