// 设置JWT令牌
export const setAuthTokens = (accessToken: string, refreshToken: string, username?: string) => {
  localStorage.setItem('access', accessToken)
  localStorage.setItem('refresh', refreshToken)
  if (username) {
    localStorage.setItem('username', username)
  }
  console.log('JWT令牌已设置')
}

// 清除JWT令牌
export const clearAuthTokens = () => {
  localStorage.removeItem('access')
  localStorage.removeItem('refresh')
  localStorage.removeItem('username')
  console.log('JWT令牌已清除')
}

// 检查令牌是否存在
export const hasAuthTokens = () => {
  return !!(localStorage.getItem('access') && localStorage.getItem('username'))
}

// 获取访问令牌
export const getAccessToken = () => {
  return localStorage.getItem('access')
}

// 获取刷新令牌
export const getRefreshToken = () => {
  return localStorage.getItem('refresh')
}

// 获取用户名
export const getUsername = () => {
  return localStorage.getItem('username')
}

// 检查令牌是否即将过期（提前5分钟刷新）
export const isTokenExpiringSoon = () => {
  const token = getAccessToken()
  if (!token) return true
  
  try {
    // 解析JWT令牌
    const payload = JSON.parse(atob(token.split('.')[1]))
    const currentTime = Math.floor(Date.now() / 1000)
    const expirationTime = payload.exp
    const timeUntilExpiry = expirationTime - currentTime
    
    // 如果令牌在5分钟内过期，返回true
    return timeUntilExpiry < 300 // 5分钟 = 300秒
  } catch (error) {
    console.error('Error parsing token:', error)
    return true
  }
}
