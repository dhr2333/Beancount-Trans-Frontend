import axios from "axios";

const apiUrl = import.meta.env.VITE_API_URL;

// 手动刷新令牌的函数（用于特殊情况）
const handleRefresh = async () => {
    const refresh = localStorage.getItem('refresh');
    if (!refresh) {
        throw new Error('No refresh token available');
    }

    try {
        const refreshRes = await axios.post(apiUrl + '/auth/token/refresh/', { 
            "refresh": refresh 
        });

        const newToken = refreshRes.data.access;
        localStorage.setItem('access', newToken);
        console.log("Token refreshed successfully");
        return newToken;
    } catch (error) {
        console.error("Failed to refresh Access Token: ", error);
        // 清除所有认证信息
        localStorage.removeItem('access');
        localStorage.removeItem('refresh');
        localStorage.removeItem('username');
        throw error;
    }
}

export default handleRefresh