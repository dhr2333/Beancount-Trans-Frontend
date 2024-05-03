import axios from "axios";
import { ref } from 'vue';

export const responseData = ref('');
const apiUrl = import.meta.env.VITE_API_URL;

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
    (error) => {
        // 处理错误
        return Promise.reject(error);
    }
);
export default instance;