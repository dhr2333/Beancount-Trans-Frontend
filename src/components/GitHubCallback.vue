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

        // 使用新的认证函数设置令牌
        const { setAuthTokens } = await import('@/utils/auth');
        setAuthTokens(data.access, data.refresh, data.username);

        // 🔔 关键：为 GitHub 第三方登录也设置引导标记
        // 检查是否是首次登录（通过后端返回的 is_new_user 字段判断）
        if (data.is_new_user) {
            storage.setItem('start_tour', 'true');
        }

        ElMessage.success("GitHub 登录成功");
        router.push('/file');
    } catch (error) {
        console.error('GitHub 登录失败', error);
        ElMessage.error("GitHub 登录失败");
        router.push('/');
    }
});
</script>
