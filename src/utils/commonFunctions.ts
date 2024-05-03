import axios from "axios";

const apiUrl = import.meta.env.VITE_API_URL;
// console.log("apiUrl = ", apiUrl)


const handleRefresh = async () => {
    const refresh = localStorage.getItem('refresh');

    try {
        const refreshRes = await axios.post(apiUrl + '/token/refresh/', { "refresh": refresh });

        const newToken = refreshRes.data.access;
        // 更新本地存储中的 Access Token
        localStorage.setItem('access', newToken);
        // console.log("newToken = ", newToken)

        // 可以根据需要更新其他信息或执行其他操作

    } catch (error) {
        console.error("Failed to refresh Access Token: ", error);
        // 可以执行其他处理逻辑
    }
}

export default handleRefresh 