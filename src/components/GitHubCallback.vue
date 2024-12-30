<!-- src/views/Callback.vue -->
<template>
    <div>
        <p>正在处理登录...</p>
    </div>
</template>

<script lang="ts" setup>
import { onMounted } from 'vue';
import axios from 'axios';
import { useRouter, useRoute } from 'vue-router';
import { ElMessage } from 'element-plus';

const router = useRouter();
const apiUrl = import.meta.env.VITE_API_URL;

onMounted(async () => {
    // 假设后端在回调 URL 中返回了一个状态，或者您可能需要从 URL 中提取参数
    // 这里假设后端已经处理了 OAuth，并提供了一个新的 API 来获取用户信息

    try {
        // 向后端请求用户信息
        const response = await axios.get(apiUrl + '/_allauth/browser/v1/auth/github/token', {
            withCredentials: true, // 如果后端使用了 cookies 进行认证
        });

        const data = response.data;
        console.log(data);
        const storage = localStorage;
        storage.setItem('access', data.access);
        storage.setItem('refresh', data.refresh);
        storage.setItem('username', data.username);

        ElMessage.success("GitHub 登录成功");
        router.push('/map/expenses/');
    } catch (error) {
        console.error('GitHub 登录失败', error);
        ElMessage.error("GitHub 登录失败");
        router.push('/');
    }
});
</script>
