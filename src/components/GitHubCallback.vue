<template>
    <div>正在登录...</div>
</template>

<script lang="ts" setup>
import { onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';

const router = useRouter();
const route = useRoute();

onMounted(async () => {
    const code = route.query.code;

    if (code) {
        try {
            // 向后端发送 POST 请求以交换 JWT 令牌
            const response = await fetch('http://127.0.0.1:8002/auth/social/github/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    code: code,
                    redirect_uri: 'http://localhost:5173/auth/social/github/callback',
                }),
            });

            const data = await response.json();

            if (response.ok) {
                // 假设后端返回一个 JWT 令牌
                const token = data.key;
                // 存储 JWT 令牌，例如在 localStorage 中
                localStorage.setItem('authToken', token);

                // 重定向到首页或其他页面
                router.push('/');
            } else {
                console.error('登录失败:', data);
            }
        } catch (error) {
            console.error('请求失败:', error);
        }
    } else {
        console.error('没有收到授权码');
    }
});
</script>