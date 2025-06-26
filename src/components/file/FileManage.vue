<template>
    <div class="file-management">
        <!-- 文件路径展示 -->
        <div class="path-display">
            <el-breadcrumb separator="/">
                <el-breadcrumb-item v-for="(item, index) in breadcrumb" :key="index" @click="navigateTo(item.id)">
                    {{ item.name }}
                </el-breadcrumb-item>
            </el-breadcrumb>
        </div>

        <!-- 工具栏 -->
        <div class="toolbar">
            <el-input v-model="searchQuery" placeholder="搜索文件" class="search-input" clearable>
                <template #prefix>
                    <el-icon>
                        <Search />
                    </el-icon>
                </template>
                <template #append v-if="isGlobalSearch">
                    <el-tag type="info" size="small">全局搜索</el-tag>
                </template>
            </el-input>
            <el-dropdown @command="handleNewCommand">
                <el-button type="primary">
                    <el-icon>
                        <Plus />
                    </el-icon>新建
                </el-button>
                <template #dropdown>
                    <el-dropdown-menu>
                        <el-dropdown-item command="folder">
                            <el-icon>
                                <Folder />
                            </el-icon>新建文件夹
                        </el-dropdown-item>
                        <el-dropdown-item command="file">
                            <el-icon>
                                <Document />
                            </el-icon>上传文件
                        </el-dropdown-item>
                    </el-dropdown-menu>
                </template>
            </el-dropdown>

            <!-- 隐藏的上传组件 -->
            <el-upload :show-file-list="false" :http-request="customUpload" :before-upload="validateUpload">
                <button ref="uploadTrigger" style="display: none"></button>
                <template #tip>
                    <div v-if="uploadProgress > 0" class="upload-progress">
                        <el-progress :percentage="uploadProgress" :stroke-width="6" status="success"
                            v-show="uploadProgress < 100" />
                    </div>
                </template>
            </el-upload>


            <el-select v-model="batchAction" placeholder="批量操作" class="batch-select"
                :disabled="selectedItems.length === 0" @change="executeBatchAction">
                <el-option label="解析" value="trans"></el-option>
                <el-option label="下载" value="download"></el-option>
                <el-option label="删除" value="delete"></el-option>
            </el-select>
        </div>

        <!-- 文件列表 -->
        <el-table :data="filteredItems" style="width: 100%" @selection-change="handleSelectionChange"
            highlight-current-row class="file-table">
            <el-table-column type="selection" width="55" />

            <el-table-column v-if="isGlobalSearch" prop="path" label="路径">
                <template #default="{ row }">
                    <el-text type="info">{{ row.path || '根目录' }}</el-text>
                </template>
            </el-table-column>

            <el-table-column prop="name" label="名称">
                <template #default="{ row }">
                    <div class="flex items-center cursor-pointer" @click="handleNodeClick(row)">
                        <el-icon :color="row.node_type === 'directory' ? '#F7C242' : '#409EFF'">
                            <component :is="row.node_type === 'directory' ? Folder : Document" />
                        </el-icon>
                        <span class="ml-2">{{ row.name }}</span>
                    </div>
                </template>
            </el-table-column>

            <el-table-column prop="date" label="修改日期">
                <template #default="{ row }">
                    {{ formatDateTime(row.node_type === 'directory' ? row.created_at : row.uploaded_at) }}
                </template>
            </el-table-column>

            <el-table-column prop="size" label="大小">
                <template #default="{ row }">
                    {{ row.node_type === 'file' ? row.size_display : '-' }}
                </template>
            </el-table-column>

            <el-table-column label="操作" width="120">
                <template #default="{ row }">
                    <el-tooltip content="解析" placement="top">
                        <el-button icon="Tickets" circle size="small" @click="downloadFile(row.id)" />
                    </el-tooltip>

                    <el-tooltip v-if="row.node_type === 'file'" content="下载" placement="top">
                        <el-button icon="Download" circle size="small" @click="downloadFile(row.id)" />
                    </el-tooltip>

                    <el-tooltip content="删除" placement="top">
                        <el-popconfirm title="确认删除？" @confirm="deleteItem(row)">
                            <template #reference>
                                <el-button icon="Delete" circle size="small" />
                            </template>
                        </el-popconfirm>
                    </el-tooltip>
                </template>
            </el-table-column>
        </el-table>

        <!-- 分页 -->
        <!-- <div class="pagination">
            <el-pagination background layout="total, prev, pager, next" :total="items.length" :page-size="pageSize"
                :current-page="currentPage" @current-change="handlePageChange" />
        </div> -->
        <div class="pagination" v-if="!isGlobalSearch">
            <el-pagination background layout="total, prev, pager, next" :total="items.length" :page-size="pageSize"
                :current-page="currentPage" @current-change="handlePageChange" />
        </div>

        <el-dialog v-model="createFolderDialog" title="新建文件夹">
            <el-form @submit.prevent="createFolder">
                <el-form-item label="文件夹名称">
                    <el-input v-model="newFolderName" autofocus />
                </el-form-item>
                <div class="text-right">
                    <el-button @click="createFolderDialog = false">取消</el-button>
                    <el-button type="primary" native-type="submit">创建</el-button>
                </div>
            </el-form>
        </el-dialog>
    </div>
</template>

<script setup lang="ts">
import { Folder, Document, Plus } from '@element-plus/icons-vue'
import { ref, computed, onMounted, watch } from 'vue'
import axios from '../../utils/request'
import { ElMessage } from 'element-plus'


interface FileItem {
    id: string
    name: string
    node_type: 'file' | 'directory'
    size_display?: string
    uploaded_at?: string
    updated_at?: string
    created_at?: string
}

// 状态管理
const items = ref<FileItem[]>([])
const breadcrumb = ref<Array<{ id: string | null, name: string }>>([])
const currentDirectoryId = ref<string | null>(null)
const searchQuery = ref('')
const batchAction = ref('')
const selectedItems = ref<FileItem[]>([])
const createFolderDialog = ref(false)
const moveDialog = ref(false)
const newFolderName = ref('')
const targetDirectoryId = ref<string | null>(null)
const currentPage = ref(1)
const pageSize = ref(20)
const uploadProgress = ref(0)
const isUploading = ref(false)
const rootDirectoryId = ref<string | null>(null)
const isGlobalSearch = ref(false);
const globalSearchResults = ref<FileItem[]>([]);
const uploadTrigger = ref<HTMLButtonElement | null>(null)

function handleNewCommand(command: string) {
    if (command === 'folder') {
        showCreateFolderDialog()
    } else if (command === 'file') {
        // 触发隐藏的上传按钮
        if (uploadTrigger.value) {
            uploadTrigger.value.click()
        }
    }
}

async function customUpload(options: any) {
    const { file, onProgress, onSuccess, onError } = options;

    try {
        isUploading.value = true;
        uploadProgress.value = 0;

        const formData = new FormData();
        formData.append('file', file);

        const directoryId = currentDirectoryId.value !== null
            ? currentDirectoryId.value
            : rootDirectoryId.value;

        if (directoryId) {
            formData.append('directory', directoryId);
        }

        const response = await axios.post('/files/', formData, {
            headers: {
                // 覆盖默认的Content-Type，因为我们要上传文件
                'Content-Type': 'multipart/form-data'
            },
            onUploadProgress: (progressEvent) => {
                const percent = Math.round(
                    (progressEvent.loaded * 100) / (progressEvent.total || 1)
                );
                uploadProgress.value = percent;
                onProgress({ percent });
            }
        });

        onSuccess(response);
        ElMessage.success('文件上传成功');
        await loadDirectoryContent();
    } catch (error) {
        console.error('文件上传失败:', error);
        let errorMsg = '文件上传失败';

        ElMessage.error(errorMsg);
        onError(error);
    } finally {
        isUploading.value = false;
        setTimeout(() => {
            uploadProgress.value = 0;
        }, 2000);
    }
}

// 上传前验证
function validateUpload(file: File) {
    // 验证文件大小 (限制为100MB)
    const maxSize = 100 * 1024 * 1024
    if (file.size > maxSize) {
        ElMessage.error('文件大小不能超过100MB')
        return false
    }

    // 验证目录是否已选择
    if (!currentDirectoryId.value && !rootDirectoryId.value) {
        ElMessage.error('请先选择目录或等待目录加载完成')
        return false
    }

    return true
}

function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}


// 认证头部
const headers = computed(() => ({
    Authorization: `Bearer ${localStorage.getItem('access_token')}`
}))

watch(searchQuery, async (newQuery) => {
    if (newQuery) {
        isGlobalSearch.value = true;
        globalSearchResults.value = await performGlobalSearch(newQuery);
    } else {
        isGlobalSearch.value = false;
        // 清空搜索结果，显示当前目录内容
        await loadDirectoryContent();
    }
});

// 计算属性
const filteredItems = computed(() => {
    if (isGlobalSearch.value && searchQuery.value) {
        // 全局搜索模式 - 显示全局结果
        return globalSearchResults.value;
    } else {
        // 本地搜索模式 - 在当前目录中搜索
        let result = items.value.filter(item =>
            item.name.toLowerCase().includes(searchQuery.value.toLowerCase())
        );

        // 分页处理
        const start = (currentPage.value - 1) * pageSize.value;
        return result.slice(start, start + pageSize.value);
    }
});


// 初始化加载
onMounted(async () => {
    await loadDirectoryContent()
})

// 加载当前目录内容
async function loadDirectoryContent() {
    try {
        let response;
        if (currentDirectoryId.value) {
            // 已有目录ID时获取内容
            response = await axios.get(`/directories/${currentDirectoryId.value}/contents/`, {
                headers: headers.value
            });
        } else {
            // 使用新的根目录专用接口
            response = await axios.get('/directories/root_contents/', {
                headers: headers.value
            });
            if (response.data.id) {
                rootDirectoryId.value = response.data.id;

                // 仅在根目录时初始化面包屑
                if (breadcrumb.value.length === 0) {
                    breadcrumb.value = [{
                        id: rootDirectoryId.value,
                        name: response.data.root_name || '根目录'
                    }];
                }
            }
        }

        // 处理响应数据（保持原逻辑）
        const directory = Array.isArray(response.data.directory)
            ? response.data.directory.map((dir: any) => ({
                id: dir.id,
                name: dir.name,
                node_type: 'directory',
                created_at: dir.created_at,
            }))
            : [];

        const files = Array.isArray(response.data.files)
            ? response.data.files.map((file: any) => ({
                id: file.id,
                name: file.name,
                node_type: 'file',
                size: file.size,
                size_display: formatFileSize(file.size),
                uploaded_at: file.uploaded_at,
                content_type: file.content_type
            }))
            : [];

        items.value = [...directory, ...files];
    } catch (error: any) {
        console.error(error);
        if (error.response && error.response.status == 401) {
            ElMessage.info('未认证，请登录后重试');
        }
        else {
            ElMessage.error('加载文件失败');
        }
    }
}

// 导航到指定目录
function navigateTo(dirId: string | null) {
    // 找到点击的面包屑索引
    const index = breadcrumb.value.findIndex(item => item.id === dirId);

    if (index !== -1) {
        // 截断到点击的面包屑项
        breadcrumb.value = breadcrumb.value.slice(0, index + 1);
        currentDirectoryId.value = dirId;
        loadDirectoryContent();
    } else if (dirId === rootDirectoryId.value) {
        // 处理根目录点击
        breadcrumb.value = breadcrumb.value.slice(0, 1);
        currentDirectoryId.value = null;
        loadDirectoryContent();
    }
}


// 节点点击处理
function handleNodeClick(node: FileItem) {
    if (node.node_type === 'directory') {
        // 重置全局搜索状态
        isGlobalSearch.value = false;
        searchQuery.value = '';

        // 更新面包屑：添加当前目录
        breadcrumb.value.push({
            id: node.id,
            name: node.name
        });

        currentDirectoryId.value = node.id;
        loadDirectoryContent();
    }
}

// 显示创建文件夹对话框
function showCreateFolderDialog() {
    createFolderDialog.value = true
    newFolderName.value = ''
}

// 创建文件夹
async function createFolder() {
    try {
        // 确定父目录ID：
        // - 如果在根目录视图：使用根目录ID (6)
        // - 如果在子目录：使用当前目录ID
        const parentId = currentDirectoryId.value
            ? currentDirectoryId.value
            : rootDirectoryId.value;

        if (!parentId) {
            ElMessage.error('无法确定父目录');
            return;
        }

        await axios.post('/directories/', {
            name: newFolderName.value,
            parent: parentId
        }, { headers: headers.value });

        ElMessage.success('文件夹创建成功');
        createFolderDialog.value = false;
        await loadDirectoryContent();
    } catch (error) {
        ElMessage.error('文件夹创建失败');
        console.error(error);
    }
}

// 文件下载
async function downloadFile(fileId: string) {
    try {
        const response = await axios.get(`/files/${fileId}/download/`, {
            headers: headers.value,
            responseType: 'blob'
        });

        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;

        // 从Content-Disposition头获取文件名
        const contentDisposition = response.headers['content-disposition'] || '';
        let fileName = 'file'; // 默认文件名

        // 优先解析 RFC 5987 格式 (filename*=)
        const rfc5987Match = contentDisposition.match(/filename\*=utf-8''([^;]+)/i);
        if (rfc5987Match && rfc5987Match[1]) {
            // URL 解码文件名
            fileName = decodeURIComponent(rfc5987Match[1]);
        }
        // 如果没有 RFC 5987 格式，尝试解析传统格式
        else {
            const fileNameMatch = contentDisposition.match(/filename="([^"]+)"/i);
            if (fileNameMatch && fileNameMatch[1]) {
                fileName = decodeURIComponent(fileNameMatch[1]);
            }
        }

        link.setAttribute('download', fileName);
        document.body.appendChild(link);
        link.click();
        link.remove();
    } catch (error) {
        ElMessage.error('文件下载失败');
        console.error(error);
    }
}

// 删除项目
async function deleteItem(item: FileItem) {
    try {
        if (item.node_type === 'directory') {
            await axios.delete(`/directories/${item.id}/`, { headers: headers.value });
        } else {
            await axios.delete(`/files/${item.id}/`, { headers: headers.value });
        }

        ElMessage.success('删除成功');
        await loadDirectoryContent();
    } catch (error) {
        ElMessage.error('删除失败');
        console.error(error);
    }
}


// 批量操作
function handleSelectionChange(selection: FileItem[]) {
    selectedItems.value = selection
}

// 执行批量操作
function executeBatchAction(action: string) {
    if (action === 'delete') {
        batchDelete()
    } else if (action === 'move') {
        moveDialog.value = true
        targetDirectoryId.value = null
    }
    batchAction.value = ''
}

// 批量删除
async function batchDelete() {
    if (!selectedItems.value.length) return;

    try {
        const deletePromises = selectedItems.value.map(item => {
            if (item.node_type === 'directory') {
                return axios.delete(`/directories/${item.id}/`, { headers: headers.value });
            } else {
                return axios.delete(`/files/${item.id}/`, { headers: headers.value });
            }
        });

        await Promise.all(deletePromises);
        ElMessage.success(`成功删除 ${selectedItems.value.length} 个项目`);
        selectedItems.value = [];
        await loadDirectoryContent();
    } catch (error) {
        ElMessage.error('批量删除失败');
        console.error(error);
    }
}


// 分页处理
function handlePageChange(page: number) {
    currentPage.value = page
}

async function performGlobalSearch(query: string) {
    try {
        const response = await axios.get('/files/search/', {
            params: { q: query },
            headers: headers.value
        });

        // 处理搜索结果
        return [
            ...response.data.directories.map((dir: any) => ({
                id: dir.id,
                name: dir.name,
                node_type: 'directory',
                created_at: dir.created_at,
                path: dir.path // 添加路径信息
            })),
            ...response.data.files.map((file: any) => ({
                id: file.id,
                name: file.name,
                node_type: 'file',
                size: file.size,
                size_display: formatFileSize(file.size),
                uploaded_at: file.uploaded_at,
                content_type: file.content_type,
                path: file.directory_name // 添加路径信息
            }))
        ];
    } catch (error) {
        ElMessage.error('搜索失败');
        console.error(error);
        return [];
    }
}

// 添加日期格式化函数
function formatDateTime(dateString: string): string {
    if (!dateString) return '';

    const date = new Date(dateString);

    // 确保日期有效
    if (isNaN(date.getTime())) return '';

    const pad = (num: number) => num.toString().padStart(2, '0');

    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ` +
        `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}
</script>

<style scoped>
.upload-progress {
    margin-top: 10px;
    width: 200px;
}

.file-management {
    padding: 20px;
    background-color: #ffffff;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
    animation: fadeIn 0.6s ease;
}

.path-display {
    margin-bottom: 15px;
    font-size: 14px;
    color: #606266;
    padding: 10px;
    background: #f5f7fa;
    border-radius: 4px;
}

.toolbar {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 20px;
}

.batch-select {
    width: 140px;
}

.search-input {
    width: 220px;
    margin-left: auto;
}

.flex {
    display: flex;
    align-items: center;
}

.cursor-pointer {
    cursor: pointer;
}

.file-table {
    transition: all 0.3s ease;
}

.file-table:hover {
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.pagination {
    margin-top: 20px;
    display: flex;
    justify-content: flex-end;
}

.directory-tree {
    max-height: 400px;
    overflow-y: auto;
}

.text-right {
    text-align: right;
    margin-top: 20px;
}

@keyframes fadeIn {
    from {
        opacity: 0;
        transform: translateY(-10px);
    }

    to {
        opacity: 1;
        transform: translateY(0);
    }
}
</style>
