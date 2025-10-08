<template>
    <div class="tag-selector">
        <!-- 多选模式：使用下拉多选框 -->
        <el-select v-if="multiple" v-model="selectedValues" multiple filterable :placeholder="placeholder"
            @change="handleChange" style="width: 100%;" :disabled="disabled" v-loading="loading">
            <el-option v-for="tag in enabledFlatTags" :key="tag.id" :label="tag.full_path" :value="tag.id">
                <div class="tag-option">
                    <span class="tag-label">{{ tag.full_path }}</span>
                    <el-tag v-if="tag.description" size="small" type="info" class="tag-desc">
                        {{ tag.description }}
                    </el-tag>
                </div>
            </el-option>
        </el-select>

        <!-- 单选模式：使用级联选择器 -->
        <el-cascader v-else v-model="selectedValue" :options="tagTree" :props="cascaderProps" filterable clearable
            :placeholder="placeholder" @change="handleChange" style="width: 100%;" :disabled="disabled"
            v-loading="loading">
            <template #default="{ node, data }">
                <div class="cascader-node">
                    <span class="node-label">{{ data.name }}</span>
                    <el-tag v-if="data.has_children" size="small" type="info" class="children-tag">
                        {{ data.children?.length || 0 }}子标签
                    </el-tag>
                </div>
            </template>
        </el-cascader>

        <!-- 已选标签预览（多选模式） -->
        <div v-if="multiple && selectedValues.length > 0 && showPreview" class="selected-tags-preview">
            <el-tag v-for="tagId in selectedValues" :key="tagId" closable @close="removeTag(tagId)" size="small"
                class="selected-tag">
                {{ getTagFullPath(tagId) }}
            </el-tag>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { fetchTagTree } from '../../api/tags'
import type { Tag } from '../../types/tag'

// Props 定义
interface Props {
    modelValue?: number | number[] | null
    multiple?: boolean
    placeholder?: string
    disabled?: boolean
    showPreview?: boolean
    enabledOnly?: boolean // 是否只显示启用的标签
}

const props = withDefaults(defineProps<Props>(), {
    modelValue: null,
    multiple: false,
    placeholder: '请选择标签',
    disabled: false,
    showPreview: true,
    enabledOnly: true
})

// Emits
const emit = defineEmits<{
    'update:modelValue': [value: number | number[] | null]
    'change': [tags: Tag | Tag[] | null]
}>()

// 响应式数据
const tagTree = ref<Tag[]>([])
const selectedValue = ref<number | null>(null)
const selectedValues = ref<number[]>([])
const loading = ref(false)

// 级联选择器配置
const cascaderProps = {
    value: 'id',
    label: 'name',
    children: 'children',
    emitPath: false,
    checkStrictly: true,
    expandTrigger: 'hover' as const
}

// 扁平化标签列表（用于多选模式）
const flatTags = computed(() => {
    const flatten = (tags: Tag[], result: Tag[] = []): Tag[] => {
        tags.forEach(tag => {
            result.push(tag)
            if (tag.children && tag.children.length > 0) {
                flatten(tag.children, result)
            }
        })
        return result
    }
    return flatten(tagTree.value)
})

// 只显示启用的标签（用于多选模式）
const enabledFlatTags = computed(() => {
    if (props.enabledOnly) {
        return flatTags.value.filter(tag => tag.enable)
    }
    return flatTags.value
})

// 获取标签树形数据
const loadTagTree = async () => {
    try {
        loading.value = true
        const response = await fetchTagTree()
        console.log('标签树数据:', response.data)

        if (Array.isArray(response.data)) {
            // 如果设置了只显示启用的标签，过滤树结构
            if (props.enabledOnly) {
                tagTree.value = filterEnabledTags(response.data)
            } else {
                tagTree.value = response.data
            }
        } else {
            console.warn('标签树数据格式异常:', response.data)
            tagTree.value = []
        }
    } catch (error: any) {
        console.error('获取标签树失败:', error)
        if (error.response?.status === 401) {
            ElMessage.info('未认证，请登录后重试')
        } else {
            ElMessage.error('获取标签数据失败')
        }
        tagTree.value = []
    } finally {
        loading.value = false
    }
}

// 过滤只启用的标签（递归）
const filterEnabledTags = (tags: Tag[]): Tag[] => {
    return tags.filter(tag => {
        if (!tag.enable) return false
        if (tag.children && tag.children.length > 0) {
            tag.children = filterEnabledTags(tag.children)
        }
        return true
    })
}

// 根据ID查找标签
const findTagById = (id: number): Tag | null => {
    return flatTags.value.find(tag => tag.id === id) || null
}

// 获取标签完整路径
const getTagFullPath = (id: number): string => {
    const tag = findTagById(id)
    return tag?.full_path || `标签#${id}`
}

// 处理选择变化
const handleChange = () => {
    if (props.multiple) {
        emit('update:modelValue', selectedValues.value)
        const tags = selectedValues.value
            .map(id => findTagById(id))
            .filter(Boolean) as Tag[]
        emit('change', tags)
    } else {
        emit('update:modelValue', selectedValue.value)
        const tag = selectedValue.value ? findTagById(selectedValue.value) : null
        emit('change', tag)
    }
}

// 移除标签（多选模式）
const removeTag = (tagId: number) => {
    selectedValues.value = selectedValues.value.filter(id => id !== tagId)
    handleChange()
}

// 监听外部值变化
watch(() => props.modelValue, (newValue) => {
    if (props.multiple) {
        if (Array.isArray(newValue)) {
            selectedValues.value = newValue.filter(v => typeof v === 'number')
        } else {
            selectedValues.value = []
        }
    } else {
        if (typeof newValue === 'number') {
            selectedValue.value = newValue
        } else {
            selectedValue.value = null
        }
    }
}, { immediate: true })

// 组件挂载时初始化
onMounted(() => {
    loadTagTree()
})

// 暴露方法供外部调用
defineExpose({
    loadTagTree,
    findTagById
})
</script>

<style scoped>
.tag-selector {
    width: 100%;
}

.tag-option {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
}

.tag-label {
    flex: 1;
    font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
    font-size: 13px;
}

.tag-desc {
    margin-left: 8px;
    max-width: 150px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.cascader-node {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
}

.node-label {
    flex: 1;
    font-weight: 500;
}

.children-tag {
    margin: 0;
}

.selected-tags-preview {
    margin-top: 8px;
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
}

.selected-tag {
    font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
}

/* 响应式设计 */
@media (max-width: 768px) {
    .tag-option {
        flex-direction: column;
        align-items: flex-start;
        gap: 4px;
    }

    .tag-desc {
        max-width: none;
        width: 100%;
    }
}
</style>

