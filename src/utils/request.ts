import axios from "axios";
import { ref } from 'vue';

export const responseData = ref('');
const apiUrl = import.meta.env.VITE_API_URL;

// 刷新令牌的函数
const refreshToken = async () => {
    const refresh = localStorage.getItem('refresh');
    if (!refresh) {
        throw new Error('No refresh token available');
    }

    try {
        const refreshRes = await axios.post(apiUrl + '/api/token/refresh/', { 
            "refresh": refresh 
        });
        
        const newToken = refreshRes.data.access;
        localStorage.setItem('access', newToken);
        return newToken;
    } catch (error) {
        console.error("Failed to refresh Access Token: ", error);
        // 清除所有认证信息
        localStorage.removeItem('access');
        localStorage.removeItem('refresh');
        localStorage.removeItem('username');
        // 重定向到登录页面
        window.location.href = '/';
        throw error;
    }
};

const instance = axios.create({
    baseURL: apiUrl,
    timeout: 100000,
    withCredentials: true,  // 传递csrf令牌
    headers: {
        "Content-Type": "application/json;charset=UTF-8",
        // "X-CSRFToken": Token,
    },
});

// 添加请求拦截器
instance.interceptors.request.use(
    (config) => {
        // 添加Token到请求头中
        const token = localStorage.getItem("access");
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
            // config.headers["X-CSRFToken"] = token
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// 添加响应拦截器
instance.interceptors.response.use(
    (response) => {
        responseData.value = response.data;
        return response;
    },
    async (error) => {
        const originalRequest = error.config;
        
        // 如果是401错误且不是刷新令牌的请求，尝试刷新令牌
        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;
            
            try {
                const newToken = await refreshToken();
                // 更新请求头中的令牌
                originalRequest.headers.Authorization = `Bearer ${newToken}`;
                // 重新发送原始请求
                return instance(originalRequest);
            } catch (refreshError) {
                // 刷新失败，重定向到登录页面
                console.error('Token refresh failed:', refreshError);
                return Promise.reject(refreshError);
            }
        }
        
        return Promise.reject(error);
    }
);

export default instance;