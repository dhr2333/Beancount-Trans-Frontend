import axios from '../utils/request'
import type {
  GitRepository,
  CreateRepositoryRequest,
  SyncStatusInfo,
  SyncResponse,
  DeployKeyResponse
} from '../types/git'

const API_BASE = import.meta.env.VITE_API_URL

/**
 * Git 仓库相关 API 调用
 */

/**
 * 获取用户 Git 仓库信息
 * GET /api/git/repository/
 */
export const getGitRepository = async (): Promise<GitRepository> => {
  const response = await axios.get(`${API_BASE}/git/repository/`)
  return response.data
}

/**
 * 启用 Git 功能，创建仓库
 * POST /api/git/repository/
 */
export const createGitRepository = async (data: CreateRepositoryRequest): Promise<GitRepository> => {
  const response = await axios.post(`${API_BASE}/git/repository/`, data)
  return response.data
}

/**
 * 下载 Deploy Key 私钥文件
 * GET /api/git/repository/deploy-key/
 */
export const downloadDeployKey = async (): Promise<Blob> => {
  const response = await axios.get(`${API_BASE}/git/repository/deploy-key/`, {
    responseType: 'blob'
  })
  return response.data
}

/**
 * 重新生成并下载 Deploy Key
 * POST /api/git/repository/deploy-key/
 */
export const regenerateDeployKey = async (): Promise<Blob> => {
  const response = await axios.post(`${API_BASE}/git/repository/deploy-key/`, {}, {
    responseType: 'blob'
  })
  return response.data
}

/**
 * 手动触发同步
 * POST /api/git/sync/
 */
export const triggerSync = async (): Promise<SyncResponse> => {
  const response = await axios.post(`${API_BASE}/git/sync/`)
  return response.data
}

/**
 * 获取同步状态
 * GET /api/git/sync/status/
 */
export const getSyncStatus = async (): Promise<SyncStatusInfo> => {
  const response = await axios.get(`${API_BASE}/git/sync/status/`)
  return response.data
}

/**
 * 下载 trans 目录压缩包
 * GET /api/git/trans/download/
 */
export const downloadTransArchive = async (): Promise<Blob> => {
  const response = await axios.get(`${API_BASE}/git/trans/download/`, {
    responseType: 'blob'
  })
  return response.data
}

/**
 * 工具函数：下载文件到用户设备
 */
export const downloadFile = (blob: Blob, filename: string) => {
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  window.URL.revokeObjectURL(url)
}

/**
 * 工具函数：处理 Deploy Key 下载
 */
export const handleDeployKeyDownload = async (regenerate: boolean = false) => {
  try {
    const blob = regenerate 
      ? await regenerateDeployKey()
      : await downloadDeployKey()
    
    const username = localStorage.getItem('username') || 'user'
    const suffix = regenerate ? '_new' : ''
    const filename = `${username}_deploy_key${suffix}.pem`
    
    downloadFile(blob, filename)
    
    return {
      success: true,
      message: regenerate ? 'Deploy Key 已重新生成并下载' : 'Deploy Key 已下载'
    }
  } catch (error: any) {
    return {
      success: false,
      message: error.response?.data?.error || '下载失败'
    }
  }
}

/**
 * 工具函数：处理 Trans 目录下载
 */
export const handleTransDownload = async () => {
  try {
    const blob = await downloadTransArchive()
    const username = localStorage.getItem('username') || 'user'
    const filename = `${username}_trans.zip`
    
    downloadFile(blob, filename)
    
    return {
      success: true,
      message: 'Trans 目录已下载'
    }
  } catch (error: any) {
    return {
      success: false,
      message: error.response?.data?.error || '下载失败'
    }
  }
}

/**
 * 工具函数：轮询同步状态
 */
export const pollSyncStatus = (
  onStatusUpdate: (status: SyncStatusInfo) => void,
  intervalMs: number = 2000,
  maxAttempts: number = 30
): Promise<SyncStatusInfo> => {
  return new Promise((resolve, reject) => {
    let attempts = 0
    
    const poll = async () => {
      try {
        attempts++
        const status = await getSyncStatus()
        onStatusUpdate(status)
        
        // 如果同步完成（成功或失败），停止轮询
        if (status.status === 'success' || status.status === 'failed') {
          resolve(status)
          return
        }
        
        // 如果超过最大尝试次数，停止轮询
        if (attempts >= maxAttempts) {
          resolve(status)
          return
        }
        
        // 继续轮询
        setTimeout(poll, intervalMs)
        
      } catch (error) {
        reject(error)
      }
    }
    
    poll()
  })
}

