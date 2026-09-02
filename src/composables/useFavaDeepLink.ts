import axios from '../utils/request'

function openInNewTab(url: string): boolean {
  const win = window.open(url, '_blank', 'noopener,noreferrer')
  return win !== null
}

function resolveFavaPrefix(response: { status: number; data?: { url?: string; deploy_mode?: string }; request?: { responseURL?: string } }): string | null {
  const data = response.data
  if (response.status === 200 && data?.url && data.deploy_mode === 'static') {
    return data.url.replace(/\/$/, '')
  }
  if (response.request?.responseURL) {
    const parsed = new URL(response.request.responseURL, window.location.origin)
    return parsed.pathname.replace(/\/$/, '') || null
  }
  return null
}

function joinFavaUrl(prefix: string, relativePath: string): string {
  const normalizedPrefix = prefix.replace(/\/$/, '')
  const normalizedPath = relativePath.replace(/^\//, '')
  return `${normalizedPrefix}/${normalizedPath}`
}

/**
 * 先启动/解析 Fava 实例，再打开相对深链（不含 uuid 前缀的路径）。
 */
export async function ensureFavaThenOpen(relativePath: string): Promise<boolean> {
  if (!localStorage.getItem('access')) {
    return false
  }
  const response = await axios.get('/fava/', { withCredentials: true })
  const prefix = resolveFavaPrefix(response)
  if (!prefix) {
    return false
  }
  const targetUrl = joinFavaUrl(prefix, relativePath)
  const absolute = new URL(targetUrl, window.location.origin).toString()
  return openInNewTab(absolute)
}
