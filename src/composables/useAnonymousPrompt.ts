/**
 * 匿名提示 Composable
 * 管理匿名用户提示的显示状态，确保用户只在首次访问时看到提示
 */

const STORAGE_KEY = 'anonymous_prompt_shown'

/**
 * 检查用户是否已经看过匿名提示
 * @returns 是否已经看过提示
 */
export function hasSeenAnonymousPrompt(): boolean {
  return localStorage.getItem(STORAGE_KEY) === 'true'
}

/**
 * 标记用户已经看过匿名提示
 * 在用户点击"跳过"或"登录"时调用
 */
export function markAnonymousPromptAsShown(): void {
  localStorage.setItem(STORAGE_KEY, 'true')
}

/**
 * 清除匿名提示标记（用于测试或重置）
 */
export function clearAnonymousPromptMark(): void {
  localStorage.removeItem(STORAGE_KEY)
}

/**
 * 检查是否应该显示匿名提示
 * @param isAuthenticated 用户是否已登录
 * @returns 是否应该显示提示
 */
export function shouldShowAnonymousPrompt(isAuthenticated: boolean): boolean {
  // 如果已登录，不显示
  if (isAuthenticated) {
    return false
  }
  // 如果未登录且未看过提示，显示
  return !hasSeenAnonymousPrompt()
}

/**
 * 匿名提示 Composable
 * @param isAuthenticated 用户是否已登录
 */
export function useAnonymousPrompt(isAuthenticated: boolean) {
  const shouldShow = shouldShowAnonymousPrompt(isAuthenticated)

  const markAsShown = () => {
    markAnonymousPromptAsShown()
  }

  return {
    shouldShow,
    markAsShown
  }
}

