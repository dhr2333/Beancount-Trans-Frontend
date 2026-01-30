<!-- src/views/Callback.vue -->
<template>
    <div>
        <p>正在处理登录...</p>
    </div>
</template>

<script lang="ts" setup>
import { onMounted } from 'vue';
import axios from 'axios';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { emitTaskBannerRefresh } from '../utils/accountEvents';

const router = useRouter();
const apiUrl = import.meta.env.VITE_API_URL;

onMounted(async () => {
    try {
        // 向后端请求用户信息
        const response = await axios.get(apiUrl + '/_allauth/browser/v1/auth/github/token', {
            withCredentials: true, // 如果后端使用了 cookies 进行认证
        });

        const data = response.data;

        if (data.access) {
            const { setAuthTokens } = await import('../utils/auth');
            setAuthTokens(data.access, data.refresh || '', data.username || '');
        }

        if (Array.isArray(data.warnings)) {
            data.warnings.forEach((msg: string) => {
                if (msg) {
                    ElMessage.warning(msg);
                }
            });
        }

        if (data.is_new_user) {
            localStorage.setItem('start_tour', 'true');
            // 延迟触发待办横幅刷新，确保后端完成账户和待办的创建
            setTimeout(() => {
                emitTaskBannerRefresh();
            }, 2000); // 延迟2秒
        }

        if (data.phone_binding_required) {
            ElMessage.warning('您还未绑定手机号，绑定后可使用更多登录方式。');
            router.push('/phone-binding');
            return;
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

        ElMessage.error(error.response?.data?.message || 'GitHub 登录失败');
        router.push('/');
    }
});
</script>
