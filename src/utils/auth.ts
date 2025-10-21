// 设置JWT令牌
export const setAuthTokens = () => {
  const tokens = {
    access: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbl90eXBlIjoiYWNjZXNzIiwiZXhwIjoxNzU4NjgwMjQ0LCJpYXQiOjE3NTg2NzY2NDQsImp0aSI6IjI0ZmQ3NzE5YjE0MTRiNjU4MDcwYTBkNTU5N2YyMDk0IiwidXNlcl9pZCI6M30.UDdBcwxrRv7ANpA8_1CvO7Xvu4L1tchfQt3AItpills",
    refresh: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbl90eXBlIjoicmVmcmVzaCIsImV4cCI6MTc1ODkzNTg0NCwiaWF0IjoxNzU4Njc2NjQ0LCJqdGkiOiIwNDFjOGNhMGM4Yjc0ZjRiOGQ0OTg4MmMzMDcxZDM3NSIsInVzZXJfaWQiOjN9.ZseEVHENwHZe_Ty2fy_BWj0Sms2H6dmMCBe5M2lmpKI"
  }
  
  localStorage.setItem('access', tokens.access)
  localStorage.setItem('refresh', tokens.refresh)
  
  console.log('JWT令牌已设置')
}

// 清除JWT令牌
export const clearAuthTokens = () => {
  localStorage.removeItem('access')
  localStorage.removeItem('refresh')
  console.log('JWT令牌已清除')
}

// 检查令牌是否存在
export const hasAuthTokens = () => {
  return !!(localStorage.getItem('access') && localStorage.getItem('username'))
}
