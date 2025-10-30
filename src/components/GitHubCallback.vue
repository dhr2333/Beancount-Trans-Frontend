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
    try {
        // 向后端请求用户信息
        const response = await axios.get(apiUrl + '/_allauth/browser/v1/auth/github/token', {
            withCredentials: true, // 如果后端使用了 cookies 进行认证
        });

        const data = response.data;
        console.log(data);

        // 检查是否需要绑定手机号
        if (data.requires_phone_binding || data.code === 'PHONE_NUMBER_REQUIRED') {
            // 先保存token（如果有的话）
            if (data.access) {
                const { setAuthTokens } = await import('@/utils/auth');
                setAuthTokens(data.access, data.refresh || '', data.username);
            }

            ElMessage.warning('请先绑定手机号');
            router.push('/phone-binding');
            return;
        }

        // 使用新的认证函数设置令牌
        const { setAuthTokens } = await import('@/utils/auth');
        setAuthTokens(data.access, data.refresh, data.username);

        // 🔔 关键：为 GitHub 第三方登录也设置引导标记
        // 检查是否是首次登录（通过后端返回的 is_new_user 字段判断）
        if (data.is_new_user) {
            const storage = localStorage;
            storage.setItem('start_tour', 'true');
        }

        ElMessage.success("GitHub 登录成功");

        // 检查是否有待返回的路径
        const redirectPath = sessionStorage.getItem('redirectAfterPhoneBinding');
        if (redirectPath) {
            sessionStorage.removeItem('redirectAfterPhoneBinding');
            router.push(redirectPath);
        } else {
            router.push('/file');
        }
    } catch (error: any) {
        console.error('GitHub 登录失败', error);

        // 检查是否是手机号绑定错误
        if (error.response?.status === 403 && error.response?.data?.code === 'PHONE_NUMBER_REQUIRED') {
            ElMessage.warning('请先绑定手机号');
            router.push('/phone-binding');
        } else {
            ElMessage.error(error.response?.data?.message || "GitHub 登录失败");
            router.push('/');
        }
    }
});
</script>
