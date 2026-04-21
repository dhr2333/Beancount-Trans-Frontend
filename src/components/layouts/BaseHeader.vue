<template>
  <el-menu class="el-menu-demo" mode="horizontal" :ellipsis="false" @select="handleSelect">
    <el-sub-menu index="account" id="tour-ledger-menu">
      <template #title>财务报表</template>
      <el-menu-item index="platform-ledger" @click="openFavaInstance">
        Fava 专业报表
      </el-menu-item>
      <!-- <el-menu-item index="official-ledger"
        @click="openExternal('https://fava.pythonanywhere.com/example-beancount-file/income_statement/')">
        案例账本
      </el-menu-item> -->
    </el-sub-menu>

    <router-link to="/trans" class="no-underline">
      <el-menu-item index="/trans">账单解析</el-menu-item>
    </router-link>

    <router-link to="/file" class="no-underline">
      <el-menu-item index="/file">文件管理</el-menu-item>
    </router-link>

    <!-- <el-sub-menu index="template">
      <template #title>模板应用</template>
      <router-link to="/template/accounts" class="no-underline">
        <el-menu-item index="/template/accounts">账户模板</el-menu-item>
      </router-link>
      <router-link to="/template/mappings" class="no-underline">
        <el-menu-item index="/template/mappings">映射模板</el-menu-item>
      </router-link>
    </el-sub-menu> -->

    <el-sub-menu index="config">
      <template #title>解析配置</template>
      <router-link to="/config/accounts" class="no-underline">
        <el-menu-item index="/config/accounts">账本账户</el-menu-item>
      </router-link>
      <router-link to="/config/mappings" class="no-underline">
        <el-menu-item index="/config/mappings">关键字映射</el-menu-item>
      </router-link>
      <router-link to="/config/tags" class="no-underline">
        <el-menu-item index="/config/tags">标签管理</el-menu-item>
      </router-link>
      <router-link to="/format" class="no-underline">
        <el-menu-item index="/format">输出配置</el-menu-item>
      </router-link>
    </el-sub-menu>

    <div class="flex-grow" />
    <el-menu-item index="theme-toggle" class="theme-toggle">
      <el-switch v-model="isDark" size="small" inline-prompt :active-icon="Moon" :inactive-icon="Sunny" active-text="夜间"
        inactive-text="日间" />
    </el-menu-item>
    <el-menu-item>
      <el-link href="https://github.com/dhr2333/Beancount-Trans" target="_blank"
        style="display: inline-flex; align-items: center;"> <img
          src="https://img.shields.io/github/stars/dhr2333/Beancount-Trans?style=social" alt="GitHub stars"
          style="height: 30px; margin-left: 6px; vertical-align: middle;" />
      </el-link>
    </el-menu-item>
    <el-sub-menu index="manager" popper-class="user-menu-dropdown">
      <template #title>{{ username }}</template>
      <router-link to="/reconciliation" class="no-underline">
        <el-menu-item index="/reconciliation">待办列表</el-menu-item>
      </router-link>
      <el-menu-item>
        <a href="https://trans.dhr2333.cn/docs/quick-start" class="help-link" target="_blank">教程</a>
      </el-menu-item>
      <router-link to="/settings" class="no-underline">
        <el-menu-item index="/settings">个人设置</el-menu-item>
      </router-link>
      <el-menu-item index="logout" @click="cleanToken">退出登录</el-menu-item>
    </el-sub-menu>
  </el-menu>
</template>

<script lang="ts" setup>
// 1. 导入 Vue 相关
import { ref, onMounted, watchEffect, onUnmounted } from "vue";

// 2. 导入第三方库
import { ElMessage, ElLoading } from 'element-plus';
import { Moon, Sunny } from "@element-plus/icons-vue";

// 3. 导入工具和路由
import axios from '../../utils/request'
import router from "~/routers";
import { isDark } from "~/composables";

// 4. 常量
const apiUrl = import.meta.env.VITE_API_URL;
/** 与登录页、request 拦截器一致，避免双斜杠或缺 /api */
const apiBase = String(apiUrl || '').replace(/\/$/, '');
const USERNAME_CHECK_INTERVAL = 1000; // 1秒

// 5. 响应式数据
const username = ref<string>(localStorage.getItem("username") || "未登录");

// 6. 定时器管理
let usernameCheckInterval: ReturnType<typeof setInterval> | null = null;

// 7. 方法定义

/**
 * 清除令牌并退出登录
 */
const cleanToken = async () => {
  try {
    // 先尝试停止用户的Fava实例
    const accessToken = localStorage.getItem("access");
    if (accessToken) {
      try {
        // 由 request 拦截器附加 JWT，勿手写 Authorization（null 会变成字符串 "Bearer null" 导致 401）
        await axios.post(`${apiBase}/fava/stop/`, {});
        console.log('Fava实例已停止');
      } catch (error: unknown) {
        console.warn('停止Fava实例时出错:', error);
        // 即使停止Fava实例失败，也继续执行退出登录流程
      }
    }
  } catch (error: unknown) {
    console.warn('退出登录时出错:', error);
  } finally {
    // 清除本地存储和Cookie
    localStorage.removeItem("access");
    localStorage.removeItem("refresh");
    localStorage.removeItem("username");
    document.cookie = 'csrftoken=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
    document.cookie = 'sessionid=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
    username.value = "未登录";
    router.push("/login");
  }
};

/**
 * 打开外部链接
 */
const openExternal = (url: string) => {
  window.open(url, '_blank', 'noopener,noreferrer');
};

/**
 * 处理菜单选择事件
 */
const handleSelect = (_key: string, _keyPath: string[]) => {
  // 预留扩展点
};


/**
 * 打开 Fava 实例
 */
const openFavaInstance = async () => {
  if (!localStorage.getItem('access')) {
    ElMessage.info('请先登录');
    return;
  }
  if (!apiBase) {
    ElMessage.error('未配置 VITE_API_URL，无法请求 Fava 入口');
    return;
  }

  const loading = ElLoading.service({
    lock: true,
    text: '正在为您生成专属加密空间，请稍候',
  });

  try {
    // 使用绝对路径，避免 baseURL 组合异常；JWT 仅由 request 拦截器注入
    const response = await axios.get(`${apiBase}/fava/`, {
      withCredentials: true,
    });

    // 静态多实例（FAVA_DEPLOY_MODE=static）：后端返回 JSON { url, deploy_mode }
    const data = response.data as { url?: string; deploy_mode?: string } | undefined
    if (response.status === 200 && data?.url && data.deploy_mode === 'static') {
      window.location.href = data.url
      return
    }

    if (response.status === 200 && response.request.responseURL) {
      // 动态容器：302 跟随后的最终 URL
      const redirectPath = response.request.responseURL;
      const newUrl = new URL(redirectPath, window.location.origin);
      window.location.href = newUrl.toString();
    } else {
      throw new Error('未收到重定向响应');
    }
  } catch (error: unknown) {
    // 类型安全的错误处理
    if (error && typeof error === 'object' && 'response' in error) {
      const axiosError = error as {
        response?: { status?: number; data?: { error?: string; code?: string } }
      };
      if (axiosError.response?.status === 401) {
        ElMessage.info('未认证，请登录后重试');
      } else if (axiosError.response?.status === 404 && axiosError.response.data?.code === 'FAVA_STATIC_NOT_CONFIGURED') {
        ElMessage.error(axiosError.response.data?.error || '未配置静态 Fava 入口');
      } else {
        ElMessage.error('加载账本失败');
      }
    } else {
      ElMessage.error('网络错误，请稍后重试');
      console.error('打开Fava实例失败:', error);
    }
  } finally {
    loading.close();
  }
};

// 8. 生命周期钩子

/**
 * 组件挂载时初始化
 */
onMounted(() => {
  const accessToken = localStorage.getItem("access");
  if (accessToken) {
    // JWT 令牌的有效性会在 API 调用时自动验证
    username.value = localStorage.getItem("username") || "未登录";
  } else {
    username.value = "未登录";
  }
});

/**
 * 监听用户名变化
 */
watchEffect(() => {
  // 清理旧的定时器
  if (usernameCheckInterval) {
    clearInterval(usernameCheckInterval);
    usernameCheckInterval = null;
  }

  // 设置新的定时器
  usernameCheckInterval = setInterval(() => {
    const storedUsername = localStorage.getItem("username");
    if (storedUsername !== username.value) {
      username.value = storedUsername || "未登录";
    }
  }, USERNAME_CHECK_INTERVAL);
});

/**
 * 组件卸载时清理所有定时器
 */
onUnmounted(() => {
  if (usernameCheckInterval) {
    clearInterval(usernameCheckInterval);
    usernameCheckInterval = null;
  }
});

</script>

<style scoped lang="scss">
.flex-grow {
  flex-grow: 1;
}


.help-link {
  display: block;
  height: 100%;
  width: 100%;
  color: inherit;
  text-decoration: none;
}

.theme-toggle {
  display: flex;
  align-items: center;

  .el-switch {
    --el-switch-on-color: var(--ep-color-primary);
    --el-switch-off-color: var(--ep-fill-color-dark);
  }
}
</style>

<!-- 全局样式：下拉框样式优化，防止出现滚动条 -->
<style lang="scss">
.user-menu-dropdown {
  // 增加宽度，确保菜单项文本完整显示
  width: 140px !important;
  min-width: 140px !important;
  max-width: 140px !important;

  // 防止出现滚动条
  overflow: hidden !important;
  max-height: none !important;

  .el-menu {
    width: 100%;
    min-width: 100%;
    border: none;
    overflow: hidden;
  }

  .el-menu-item {
    display: flex;
    align-items: center;
    padding: 0 10px !important;
    position: relative;
    white-space: nowrap; // 确保文本不换行
    overflow: hidden; // 防止文本溢出
    text-overflow: ellipsis; // 如果文本过长，显示省略号
  }
}
</style>
