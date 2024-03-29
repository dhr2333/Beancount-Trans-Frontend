import axios from "axios";
import { ref } from 'vue';
// function getCookie(name) {
//     var value = '; ' + document.cookie;
//     var parts = value.split('; ' + name + '=');
//     if (parts.length === 2) return parts.pop().split(';').shift()
// };

// async function getCsrfToken() {
//   const response = await axios.get('http:127.0.0.1:8002/api/get_csrf_token/'); // 替换为获取CSRF Token的接口
//   return response.data.csrfToken;
// }
export const responseData = ref('');
const apiUrl = import.meta.env.VITE_API_URL;
console.log(apiUrl);
// app.config.globalProperties.$axios = axios
const instance = axios.create({
    baseURL: apiUrl,
    // baseURL: "http://localhost:8002",  // npm run dev地址
    // baseURL: "http://127.0.0.1:38001/api",  // docker地址
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
        const token = localStorage.getItem("token");
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