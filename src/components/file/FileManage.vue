<template>
    <div class="file-manager-container">
        <!-- 文件上传区域 -->
        <el-upload class="upload-area" drag multiple :action="uploadUrl" :headers="headers"
            :on-success="handleUploadSuccess" :on-error="handleUploadError" :show-file-list="false">
            <el-icon class="upload-icon"><upload-filled /></el-icon>
            <div class="upload-text">
                拖拽文件到此处或<em>点击上传</em>
            </div>
            <template #tip>
                <div class="upload-tip">
                    支持上传任意格式文件，单个文件不超过 10MB
                </div>
            </template>
        </el-upload>

        <!-- 文件列表区域 -->
        <div class="file-list-container">
            <el-table :data="fileList" v-loading="loading" style="width: 100%" height="calc(100vh - 250px)">
                <el-table-column prop="original_name" label="文件名" min-width="200">
                    <template #default="{ row }">
                        <div class="file-name-cell">
                            <el-icon class="file-icon">
                                <files />
                            </el-icon>
                            <span class="file-name">{{ row.original_name }}</span>
                        </div>
                    </template>
                </el-table-column>

                <el-table-column prop="file_size" label="大小" width="120">
                    <template #default="{ row }">
                        {{ formatFileSize(row.file_size) }}
                    </template>
                </el-table-column>
                <el-table-column prop="uploaded_at" label="上传时间" width="180">
                    <template #default="{ row }">
                        {{ formatDateTime(row.uploaded_at) }}
                    </template>
                </el-table-column>
                <el-table-column label="操作" width="150" fixed="right">
                    <template #default="{ row }">
                        <el-button type="primary" size="small" @click="handleDownload(row.id)"
                            :loading="downloadingId === row.id">
                            <el-icon>
                                <download />
                            </el-icon>下载
                        </el-button>
                        <el-button type="danger" size="small" @click="handleDelete(row.id)"
                            :loading="deletingId === row.id">
                            <el-icon>
                                <delete />
                            </el-icon>删除
                        </el-button>
                    </template>
                </el-table-column>
            </el-table>
        </div>
    </div>
</template>

<script lang="ts" setup>
import { ref, computed, onMounted } from 'vue'
import {
    UploadFilled,
    Picture,
    Document,
    Files,
    Download,
    Delete
} from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import axios from 'axios'
import type { UploadFile, UploadFiles } from 'element-plus'

// 文件类型定义
interface FileItem {
    id: string;  // 改为 string 类型以匹配 UUID
    original_name: string;  // 改为后端返回的字段名
    file_size: number;
    uploaded_at: string;
    download_url: string;
    is_active: boolean;
}

// API基础URL
const apiUrl = import.meta.env.VITE_API_URL

// 响应式数据
const fileList = ref<FileItem[]>([])
const loading = ref(false)
const currentPage = ref(1)
const pageSize = ref(10)
const totalFiles = ref(0)
const downloadingId = ref<number | null>(null)
const deletingId = ref<number | null>(null)

// 计算上传URL和请求头
const uploadUrl = computed(() => `${apiUrl}/files/`)
const headers = computed(() => ({
    Authorization: `Bearer ${localStorage.getItem('access')}`,
    'X-CSRFToken': getCookie('csrftoken')
}))

// 获取文件列表
const fetchFiles = async () => {
    try {
        loading.value = true;
        const response = await axios.get(`${apiUrl}/files/`, {
            headers: {
                Authorization: `Bearer ${localStorage.getItem('access')}`
            }
        });

        // 直接使用返回的数组，无需 .results
        fileList.value = response.data.map((file: any) => ({
            ...file,
            // 如果需要可以在这里做字段名转换
            filename: file.original_name,
            size: file.file_size,
            created_at: file.uploaded_at,
            url: file.download_url
        }));

        // 如果没有分页，可以设置固定值或移除分页功能
        totalFiles.value = response.data.length;
    } catch (error) {
        console.error('获取文件列表失败:', error);
        ElMessage.error('获取文件列表失败');
    } finally {
        loading.value = false;
    }
};

// 文件上传成功处理
const handleUploadSuccess = (response: any, file: UploadFile) => {
  if (response.status === 200) {
    // 文件已存在的情况
    ElMessage.success(response.data.message)
    if (response.data.existing_file) {
      // 更新文件列表显示
      const index = fileList.value.findIndex(f => f.id === response.data.existing_file.id)
      if (index >= 0) {
        fileList.value[index] = response.data.existing_file
      } else {
        fileList.value.unshift(response.data.existing_file)
      }
    }
  } else {
    // 新文件上传成功
    ElMessage.success(`${file.name} 上传成功`)
    fetchFiles()
  }
}

// 文件上传失败处理
const handleUploadError = (error: Error) => {
    console.error('上传失败:', error)
    ElMessage.error('文件上传失败')
}

// 下载文件
const handleDownload = async (fileId: string) => {  // 改为 string 类型
  try {
    downloadingId.value = fileId;
    const file = fileList.value.find(f => f.id === fileId);
    if (!file) return;

    // 直接使用 download_url
    window.open(file.download_url, '_blank');
    ElMessage.success('文件下载已开始');
  } catch (error) {
    console.error('下载失败:', error);
    ElMessage.error('文件下载失败');
  } finally {
    downloadingId.value = null;
  }
};


// 删除文件
const handleDelete = (fileId: number) => {
    ElMessageBox.confirm('确定要删除此文件吗？', '警告', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
    }).then(async () => {
        try {
            deletingId.value = fileId
            await axios.delete(`${apiUrl}/files/${fileId}/`, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('access')}`
                }
            })

            ElMessage.success('文件删除成功')
            fetchFiles()
        } catch (error) {
            console.error('删除失败:', error)
            ElMessage.error('文件删除失败')
        } finally {
            deletingId.value = null
        }
    }).catch(() => { })
}

// 格式化文件大小
const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2) + ' ' + sizes[i])
}

// 格式化日期时间
const formatDateTime = (dateString: string): string => {
    const date = new Date(dateString)
    return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`
}

// 获取Cookie
const getCookie = (name: string): string | null => {
    const value = `; ${document.cookie}`
    const parts = value.split(`; ${name}=`)
    if (parts.length === 2) return parts.pop()?.split(';').shift() || null
    return null
}

// 组件挂载时获取文件列表
onMounted(() => {
    fetchFiles()
})
</script>

<style scoped>
.file-manager-container {
    padding: 20px;
    height: 100%;
    display: flex;
    flex-direction: column;
}

.upload-area {
    margin-bottom: 20px;
}

.upload-icon {
    font-size: 48px;
    color: var(--el-color-primary);
    margin-bottom: 16px;
}

.upload-text {
    font-size: 16px;
    color: var(--el-text-color-regular);
}

.upload-tip {
    margin-top: 10px;
    font-size: 14px;
    color: var(--el-text-color-secondary);
}

.file-list-container {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
}

.file-name-cell {
    display: flex;
    align-items: center;
}

.file-icon {
    margin-right: 8px;
    font-size: 18px;
    color: var(--el-color-primary);
}

.file-name {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.pagination-container {
    margin-top: 20px;
    display: flex;
    justify-content: flex-end;
}
</style>
