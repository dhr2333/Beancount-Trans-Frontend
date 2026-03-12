/**
 * 从后端（DRF）API 错误响应中提取可展示给用户的错误消息。
 * 支持多种 DRF/视图返回格式。
 */
export function extractApiErrorMessage(
  responseData: unknown,
  fallbackMessage: string
): string {
  if (!responseData || typeof responseData !== 'object') return fallbackMessage

  const data = responseData as Record<string, unknown>

  // 格式1: {"error": "..."}
  if (typeof data.error === 'string') return data.error

  // 格式2: {"detail": "..."}
  if (typeof data.detail === 'string') return data.detail

  // 格式3: {"message": "..."}
  if (typeof data.message === 'string') return data.message

  // 格式4: {"field": ["msg1", "msg2"]} — DRF 序列化器字段级错误
  // 提取第一个字段的第一条错误消息
  const firstFieldErrors = Object.values(data).find(
    (v) => Array.isArray(v) && v.length > 0 && typeof v[0] === 'string'
  )
  if (firstFieldErrors) return (firstFieldErrors as string[])[0]

  return fallbackMessage
}
