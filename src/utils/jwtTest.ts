// JWT令牌刷新功能测试
import instance from './request'
import { setAuthTokens, clearAuthTokens, isTokenExpiringSoon } from './auth'

// 测试JWT刷新功能
export const testJWTRefresh = async () => {
  console.log('开始测试JWT刷新功能...')
  
  // 1. 清除现有令牌
  clearAuthTokens()
  
  // 2. 设置测试令牌（这里需要真实的令牌）
  // 注意：在实际测试中，你需要先登录获取真实的令牌
  const testAccessToken = 'your-test-access-token'
  const testRefreshToken = 'your-test-refresh-token'
  
  if (testAccessToken === 'your-test-access-token') {
    console.log('请先登录获取真实的令牌进行测试')
    return
  }
  
  setAuthTokens(testAccessToken, testRefreshToken, 'testuser')
  
  // 3. 检查令牌是否即将过期
  const isExpiring = isTokenExpiringSoon()
  console.log('令牌是否即将过期:', isExpiring)
  
  // 4. 发送一个需要认证的请求
  try {
    const response = await instance.get('/api/account/')
    console.log('请求成功:', response.data)
  } catch (error) {
    console.error('请求失败:', error)
  }
}

// 测试令牌过期处理
export const testTokenExpiration = async () => {
  console.log('测试令牌过期处理...')
  
  // 模拟令牌过期的情况
  const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbl90eXBlIjoiYWNjZXNzIiwiZXhwIjoxNjAwMDAwMDAwLCJpYXQiOjE2MDAwMDAwMDAsImp0aSI6InRlc3QiLCJ1c2VyX2lkIjoxfQ.expired'
  const refreshToken = 'your-refresh-token'
  
  localStorage.setItem('access', expiredToken)
  localStorage.setItem('refresh', refreshToken)
  
  try {
    // 这个请求应该会触发自动刷新
    const response = await instance.get('/api/account/')
    console.log('自动刷新成功:', response.data)
  } catch (error) {
    console.error('自动刷新失败:', error)
  }
}

// 导出测试函数
export default {
  testJWTRefresh,
  testTokenExpiration
}
