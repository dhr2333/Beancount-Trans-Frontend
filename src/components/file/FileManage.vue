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
                <template #append>
                    <el-select v-model="selectedStatusFilter" placeholder="状态筛选" clearable style="width: 120px;"
                        class="status-filter-select">
                        <el-option v-for="option in statusFilterOptions" :key="option.value || 'all'"
                            :label="option.label" :value="option.value">
                        </el-option>
                    </el-select>
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
            </el-upload>

            <el-select v-model="batchAction" placeholder="批量操作" class="batch-select"
                :disabled="selectedItems.length === 0" @change="executeBatchAction">
                <el-option label="解析" value="parse"></el-option>
                <el-option label="取消解析" value="cancel"></el-option>
                <el-option label="下载" value="download"></el-option>
                <el-option label="删除" value="delete"></el-option>
            </el-select>
        </div>

        <!-- 上传进度条（独立显示，不影响工具栏布局） -->
        <div v-if="uploadProgress > 0 && uploadProgress < 100" class="upload-progress-container">
            <el-progress :percentage="uploadProgress" :stroke-width="6" status="success" />
        </div>

        <!-- 任务状态对话框  -->
        <el-dialog v-model="parseDialogVisible" title="解析任务进度" width="600px">
            <el-progress :percentage="parseProgressPercentage" :status="parseStatus" />
            <div class="task-info">
                <p>任务组ID: {{ currentTaskGroupId }}</p>
                <p>状态: {{ parseStatusText }}</p>
                <p>进度: {{ completedTasks }}/{{ totalTasks }}</p>
            </div>
            <el-table :data="taskDetails" height="200px" border>
                <el-table-column prop="file_id" label="文件ID" width="120" />
                <el-table-column prop="file_name" label="文件名" />
                <el-table-column prop="status" label="状态" width="100">
                    <template #default="{ row }">
                        <el-tag :type="statusTagType(row.status)">
                            {{ translateStatus(row.status) }}
                        </el-tag>
                    </template>
                </el-table-column>
                <el-table-column label="操作" width="100">
                    <template #default="{ row }">
                        <el-button
                            v-if="row.status === 'pending' || row.status === 'processing' || row.status === 'parsed'"
                            size="small" type="warning" @click="cancelParse([row.file_id])">
                            取消
                        </el-button>
                    </template>
                </el-table-column>
            </el-table>
            <template #footer>
                <el-button @click="parseDialogVisible = false" :disabled="isProcessing">关闭</el-button>
            </template>
        </el-dialog>

        <!-- 文件列表 -->
        <el-table :data="filteredItems" style="width: 100%" @selection-change="handleSelectionChange"
            highlight-current-row class="file-table" id="tour-file-table">
            <el-table-column type="selection" width="55" />

            <el-table-column v-if="isGlobalSearch" prop="path" label="路径">
                <template #default="{ row }">
                    <el-text type="info">{{ row.path || '根目录' }}</el-text>
                </template>
            </el-table-column>

            <el-table-column prop="name" label="名称">
                <template #default="{ row }">
                    <div class="flex items-center cursor-pointer" @click="handleNodeClick(row)">
                        <el-icon
                            :color="row.node_type === 'directory' ? 'var(--ep-color-warning)' : 'var(--ep-color-primary)'">
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

            <el-table-column prop="status" label="状态">
                <template #default="{ row }">
                    <el-tag :type="getStatusColor(row.parse_status || row.status)">
                        {{ translateStatus(row.parse_status || row.status) }}
                    </el-tag>
                </template>
            </el-table-column>

            <el-table-column label="操作" width="120">
                <template #default="{ row, $index }">
                    <!-- 解析/取消按钮（根据状态切换，parsed状态也可以取消以清除.bean文件内容） -->
                    <el-tooltip
                        v-if="row.node_type === 'file' && (row.parse_status === 'pending' || row.parse_status === 'processing' || row.parse_status === 'parsed')"
                        :content="row.parse_status === 'parsed' ? '清除解析结果' : '取消解析'" placement="top">
                        <el-button icon="Tickets" circle size="small" @click="cancelSingleFile(row)">
                        </el-button>
                    </el-tooltip>
                    <el-tooltip v-else-if="row.node_type === 'file'" content="解析" placement="top">
                        <el-button icon="Tickets" circle size="small" :class="{ 'tour-parse-first-file': $index === 0 }"
                            @click="parseSingleFile(row)">
                        </el-button>
                    </el-tooltip>

                    <el-button v-if="row.node_type === 'file'" icon="Download" circle size="small"
                        @click="downloadFile(row.id)" />

                    <el-tooltip content="删除" placement="top">
                        <el-popconfirm title="将同时清除此文件的解析结果，是否继续？" @confirm="deleteItem(row)">
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
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import axios from '../../utils/request'
import { ElMessage } from 'element-plus'
import type { TagProps } from 'element-plus'
import { parse } from 'path'
import { startUserTour, continueUserTour } from '../../utils/userTour'
import { emitTaskBannerRefresh } from '../../utils/accountEvents'


interface FileItem {
    id: string
    name: string
    node_type: 'file' | 'directory'
    parse_status?: string
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
const selectedStatusFilter = ref<string | null>(null)

// 状态筛选选项配置
const statusFilterOptions = [
    { value: null, label: '全部状态' },
    { value: 'unprocessed', label: '未解析' },
    { value: 'pending', label: '待解析' },
    { value: 'processing', label: '解析中' },
    { value: 'parsed', label: '已解析' },
    { value: 'failed', label: '解析失败' },
    { value: 'cancelled', label: '取消解析' }
]

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
    const uploadedFileName = file.name;

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
    } catch (error: unknown) {
        console.error('文件上传失败:', error);
        let errorMsg = '文件上传失败';

        // 类型安全的错误处理
        if (error && typeof error === 'object' && 'response' in error) {
            const axiosError = error as {
                response?: {
                    data?: {
                        error?: string,
                        existing_files?: Array<{ directory_path: string, directory_id: number }>
                    },
                    status?: number
                }
            };
            const errorData = axiosError.response?.data;
            const errorText = errorData?.error || '';

            // 检测同名文件冲突错误
            if (errorData?.existing_files && errorData.existing_files.length > 0) {
                const directoryPaths = errorData.existing_files.map(f => f.directory_path).join('、');
                errorMsg = `文件名 "${uploadedFileName}" 在以下目录已存在：${directoryPaths}。为避免解析结果冲突，请重命名文件后上传。`;
            }
            // 检测同一目录重复文件错误（数据库唯一约束）
            else if (errorText.includes('duplicate key') || errorText.includes('already exists')) {
                // 提取文件名，格式：Key (name, directory_id)=(文件名, 目录ID) already exists
                const match = errorText.match(/\(name, directory_id\)=\(([^,]+),\s*\d+\)/);
                if (match && match[1]) {
                    const fileName = match[1].trim();
                    errorMsg = `文件名 "${fileName}" 在当前目录下已存在，请勿重复上传`;
                } else {
                    errorMsg = '文件在当前目录下已存在，请勿重复上传';
                }
            } else if (errorText) {
                // 其他错误，使用后端返回的错误信息
                errorMsg = errorText;
            }
        }

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
    Authorization: `Bearer ${localStorage.getItem('access')}`
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
    let result: FileItem[] = [];

    if (isGlobalSearch.value && searchQuery.value) {
        // 全局搜索模式 - 显示全局结果
        result = globalSearchResults.value;
    } else {
        // 本地搜索模式 - 在当前目录中搜索
        result = items.value.filter(item =>
            item.name.toLowerCase().includes(searchQuery.value.toLowerCase())
        );
    }

    // 应用状态筛选（仅对文件类型生效，目录不受影响）
    if (selectedStatusFilter.value !== null) {
        result = result.filter(item => {
            // 目录始终显示
            if (item.node_type === 'directory') {
                return true;
            }
            // 文件需要匹配状态筛选
            return item.parse_status === selectedStatusFilter.value;
        });
    }

    // 分页处理（仅对本地搜索模式生效）
    if (!isGlobalSearch.value || !searchQuery.value) {
        const start = (currentPage.value - 1) * pageSize.value;
        return result.slice(start, start + pageSize.value);
    }

    return result;
});


// 初始化加载
onMounted(async () => {
    await loadDirectoryContent()

    // 检查引导标记
    const shouldStartTour = localStorage.getItem('start_tour');
    if (shouldStartTour === 'true') {
        localStorage.removeItem('start_tour'); // 立即清除标记

        // 等待 DOM 渲染
        await nextTick();

        // 确保文件列表已加载
        if (items.value.length > 0) {
            startUserTour();
        }
    }

    stopPolling();
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
                parse_status: file.parse_status,
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
    if (action === 'parse') {
        batchParse();
    } else if (action === 'cancel') {
        batchCancel();
    } else if (action === 'delete') {
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
                parse_status: file.parse_status, // 添加解析状态
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


const parseDialogVisible = ref(false);
const currentTaskGroupId = ref('');
const completedTasks = ref(0);
const totalTasks = ref(0);
const taskDetails = ref<any[]>([]);
const pollingInterval = ref<NodeJS.Timeout | null>(null);
const isProcessing = ref(false);

// 计算属性
const parseProgressPercentage = computed(() => {
    return totalTasks.value > 0 ? Math.round((completedTasks.value / totalTasks.value) * 100) : 0;
});

const parseStatus = computed<'' | 'success' | 'warning' | 'exception'>(() => {
    if (parseProgressPercentage.value === 100) return 'success';
    if (isProcessing.value) return 'warning';
    return parseProgressPercentage.value > 0 ? 'exception' : '';
});

const parseStatusText = computed(() => {
    if (parseProgressPercentage.value === 100) return '解析完成';
    return isProcessing.value ? '处理中...' : '等待开始';
});

async function parseSingleFile(fileItem: FileItem) {
    // 确保是文件类型
    if (fileItem.node_type !== 'file') {
        ElMessage.warning('请选择文件进行解析');
        return;
    }

    // 调用解析方法，传入单个文件ID
    await submitParseTask([fileItem.id]);
}

async function submitParseTask(fileIds: string[]) {
    try {
        const response = await axios.post('/translate/multi', {
            file_ids: fileIds
        }, { headers: headers.value });

        // 处理任务状态（保持原有逻辑）
        if (response.status === 202) {
            currentTaskGroupId.value = response.data.task_group_id;
            totalTasks.value = fileIds.length;
            completedTasks.value = 0;

            // 构建任务详情（兼容全局搜索模式）
            taskDetails.value = fileIds.map(id => {
                // 在文件列表中查找对应文件
                const file = items.value.find(item => item.id === id) ||
                    globalSearchResults.value.find(item => item.id === id);
                return {
                    file_id: id,
                    file_name: file ? file.name : id,
                    status: 'pending'
                };
            });

            parseDialogVisible.value = true;
            startPollingTaskStatus();
        }
    } catch (error: any) {
        // 错误处理（保持原有逻辑）
        if (error.response?.status === 400) {
            const pendingFiles = error.response.data.pending_files || [];
            const pendingFileNames = pendingFiles.map((id: string) => {
                const file = items.value.find(f => f.id === id) ||
                    globalSearchResults.value.find(f => f.id === id);
                return file ? file.name : id;
            });
            ElMessage.error(`部分文件已在处理中：${pendingFileNames.join(', ')}`);
        } else {
            ElMessage.error('提交解析任务失败');
        }
        console.error(error);
    }
}

// 批量解析方法
async function batchParse() {
    // 只筛选文件类型
    const selectedFiles = selectedItems.value.filter(item => item.node_type === 'file');

    if (selectedFiles.length === 0) {
        ElMessage.warning('请选择至少一个文件进行解析');
        return;
    }

    // 调用共用的解析方法
    await submitParseTask(selectedFiles.map(file => file.id));
}

// 批量取消解析
async function batchCancel() {
    // 只筛选文件类型
    const selectedFiles = selectedItems.value.filter(item => item.node_type === 'file');

    if (selectedFiles.length === 0) {
        ElMessage.warning('请选择至少一个文件进行取消解析');
        return;
    }

    // 筛选出可以取消的文件（pending/processing/parsed状态）
    const cancellableFiles = selectedFiles.filter(file =>
        ['pending', 'processing', 'parsed'].includes(file.parse_status || '')
    );

    if (cancellableFiles.length === 0) {
        ElMessage.warning('所选文件中没有可以取消解析的文件');
        return;
    }

    if (cancellableFiles.length < selectedFiles.length) {
        ElMessage.warning(`部分文件无法取消解析，将处理 ${cancellableFiles.length} 个文件`);
    }

    // 调用取消解析方法
    await cancelParse(cancellableFiles.map(file => file.id));
}

// 取消解析
async function cancelParse(fileIds: string[]) {
    try {
        const response = await axios.post('/translate/cancel', {
            file_ids: fileIds
        }, { headers: headers.value });

        ElMessage.success(response.data.message || '已取消解析');
        await loadDirectoryContent();
    } catch (error: any) {
        ElMessage.error(error.response?.data?.error || '取消解析失败');
        console.error(error);
    }
}

// 取消单个文件解析（或清除已解析文件的内容）
async function cancelSingleFile(fileItem: FileItem) {
    if (fileItem.node_type !== 'file') {
        ElMessage.warning('只能取消文件的解析');
        return;
    }

    if (!['pending', 'processing', 'parsed'].includes(fileItem.parse_status || '')) {
        ElMessage.warning('只能取消待解析、解析中或已解析的文件');
        return;
    }

    await cancelParse([fileItem.id]);
}

// 开始轮询任务状态
function startPollingTaskStatus() {
    isProcessing.value = true;

    if (pollingInterval.value) {
        clearInterval(pollingInterval.value);
    }

    pollingInterval.value = setInterval(async () => {
        try {
            const response = await axios.get('/translate/task_group_status', {
                params: { task_group_id: currentTaskGroupId.value },
                headers: headers.value
            });

            const statusData = response.data;
            completedTasks.value = 0;

            // 更新任务状态
            let hasNewPendingReview = false;
            taskDetails.value = taskDetails.value.map(task => {
                const taskStatus = statusData.tasks.find((t: any) => t.file_id === task.file_id);
                if (taskStatus) {
                    const oldStatus = task.status;
                    const newStatus = taskStatus.status;

                    // 检测是否有新进入 pending_review 状态的任务
                    if (oldStatus !== 'pending_review' && newStatus === 'pending_review') {
                        hasNewPendingReview = true;
                    }

                    // pending_review 表示解析已完成，只是需要审核，应该计入已完成
                    if (newStatus === 'parsed' || newStatus === 'failed' || newStatus === 'cancelled' || newStatus === 'pending_review') {
                        completedTasks.value++;
                    }
                    return { ...task, status: newStatus };
                }
                return task;
            });

            // 如果有新任务进入待审核状态，触发横幅更新
            if (hasNewPendingReview) {
                emitTaskBannerRefresh();
            }

            // 检查任务组是否完成
            // 如果任务组状态为 completed，或者所有任务都是已完成状态（包括 pending_review），则关闭弹窗
            const allTasksCompleted = statusData.tasks.every((task: any) =>
                ['parsed', 'failed', 'cancelled', 'pending_review'].includes(task.status)
            );

            if (statusData.status === 'completed' || allTasksCompleted) {
                stopPolling();
                ElMessage.success('所有文件解析完成');

                // 注意：导览步骤由横幅更新时自动触发，不需要在这里调用
                // 横幅更新会检测到新任务并触发导览步骤4（立即处理按钮）

                setTimeout(() => {
                    parseDialogVisible.value = false;
                    // 刷新文件列表
                    loadDirectoryContent();
                }, 2000);
            }
        } catch (error) {
            console.error('获取任务状态失败', error);
        }
    }, 2000); // 每2秒轮询一次
}

// 停止轮询
function stopPolling() {
    if (pollingInterval.value) {
        clearInterval(pollingInterval.value);
        pollingInterval.value = null;
    }
    isProcessing.value = false;
}

// 状态标签类型
function statusTagType(status: string): TagProps['type'] {
    switch (status) {
        case 'parsed':
            return 'success'
        case 'failed':
            return 'danger'
        case 'processing':
            return 'primary'
        case 'pending':
            return 'warning'
        case 'cancelled':
            return 'info'
        default:
            return 'info' // 其他状态
    }
}


// 状态翻译函数
function translateStatus(status: string | undefined): string {
    if (!status) return '-';
    const statusMap: Record<string, string> = {
        'unprocessed': '未解析',
        'pending': '待解析',
        'processing': '解析中',
        'parsed': '已解析',
        'failed': '解析失败',
        'cancelled': '取消解析',
        'pending_review': '待审核'
    };
    return statusMap[status] || status;
}

function getStatusColor(status: string | undefined): TagProps['type'] {
    if (!status) return 'info'

    const statusMap: Record<string, TagProps['type']> = {
        unprocessed: 'info',
        pending: 'primary',
        processing: 'warning',
        parsed: 'success',
        failed: 'danger',
        cancelled: 'info'
    }

    return statusMap[status] || 'info'
}

</script>

<style scoped>
.upload-progress-container {
    margin-top: 10px;
    margin-bottom: 20px;
    width: 100%;
    max-width: 400px;
}

.file-management {
    padding: 20px;
    background-color: var(--ep-bg-color);
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
    animation: fadeIn 0.6s ease;
}

.path-display {
    margin-bottom: 15px;
    font-size: 14px;
    color: var(--ep-text-color-regular);
    padding: 10px;
    background: var(--ep-fill-color-light);
    border-radius: 4px;
}

.toolbar {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 20px;
    flex-wrap: nowrap;
}

.batch-select {
    width: 140px;
}

.search-input {
    width: 400px;
    min-width: 200px;
    margin-left: auto;
    flex-shrink: 0;
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

.task-info {
    margin: 15px 0;
    line-height: 1.8;
}
</style>
