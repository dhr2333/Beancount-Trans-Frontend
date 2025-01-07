<template>
  <el-menu class="el-menu-demo" mode="horizontal" :ellipsis="false" @select="handleSelect">
    <el-sub-menu index="account">
      <template #title>账本管理</template>
      <el-link href="http://localhost:5000/" target="_blank" rel="noopener noreferrer" class="no-underline">
        <el-menu-item index="local-ledger">本地账本</el-menu-item>
      </el-link><br></br>
      <el-link href="https://beancount.dhr2333.cn/" target="_blank" rel="noopener noreferrer" class="no-underline">
        <el-menu-item index="system-ledger">系统账本</el-menu-item>
      </el-link><br></br>
      <el-link href="https://fava.pythonanywhere.com/example-beancount-file/income_statement/" target="_blank"
        rel="noopener noreferrer" class="no-underline">
        <el-menu-item index="official-ledger">官方账本</el-menu-item>
      </el-link>
    </el-sub-menu>

    <router-link to="/trans" class="no-underline">
      <el-menu-item index="/trans">格式转换</el-menu-item>
    </router-link>

    <el-sub-menu index="map">
      <template #title>映射管理</template>
      <router-link to="/map/expenses" class="no-underline">
        <el-menu-item index="/map/expense">支出映射</el-menu-item>
      </router-link>
      <router-link to="/map/income" class="no-underline">
        <el-menu-item index="/map/income">收入映射</el-menu-item>
      </router-link>
      <router-link to="/map/assets" class="no-underline">
        <el-menu-item index="/map/assets">资产映射</el-menu-item>
      </router-link>
    </el-sub-menu>

    <el-sub-menu index="bill">
      <template #title>账单管理</template>
      <router-link to="/bill/account" class="no-underline">
        <el-menu-item index="/bill/account">账户管理</el-menu-item>
      </router-link>
      <router-link to="/bill/event" class="no-underline">
        <el-menu-item index="/bill/event">事件管理</el-menu-item>
      </router-link>
      <router-link to="/bill/commodity" class="no-underline">
        <el-menu-item index="/bill/commodity">通货管理</el-menu-item>
      </router-link>
    </el-sub-menu>

    <router-link to="/assets/account" class="no-underline">
      <el-menu-item index="/account">资产总表</el-menu-item>
    </router-link>
    <div class="flex-grow" />

    <el-menu-item>
      <el-popover placement="top-start" :width="200" trigger="hover">
        <template #reference>
          <img src="/images/openai-icon-2021x2048-4rpe5x7n.png" alt="Openai Logo" style="width: 30px" />
        </template>
        <p>基于gpt-3.5-turbo</p>
        <img src="/images/wechat-channel.jpg" alt="Wechat-Channel" style="max-width: 100%" slot="content" />
      </el-popover>
    </el-menu-item>
    <el-menu-item>
      <el-link href="https://github.com/dhr2333/Beancount-Trans" target="_blank">
        <img src="/images/github-logo.png" alt="GitHub Logo" style="width: 30px" />
      </el-link>
    </el-menu-item>
    <el-sub-menu index="manager">
      <template #title>{{ username }}</template>
      <router-link to="" class="no-underline">
        <el-menu-item index="" @click="user()">个人中心</el-menu-item>
      </router-link>
      <el-menu-item>
        <a href="https://www.dhr2333.cn/category/beancountfu-shi-ji-zhang.html" class="help-link"
          target="_blank">帮助手册</a>
      </el-menu-item>
      <el-menu-item index="logout" @click="cleanToken">退出登录</el-menu-item>
    </el-sub-menu>
  </el-menu>
</template>

<script lang="ts" setup>
import { ref, onMounted, watchEffect } from "vue";
import axios from 'axios'; // 导入 axios
import router from "~/routers";

// 定义响应式的用户名
const username = ref(localStorage.getItem("username") || "未登录");

// 获取 API 基础 URL
const apiUrl = import.meta.env.VITE_API_URL;

// 定义验证令牌的函数
const verifyToken = async (token: string): Promise<boolean> => {
  try {
    const res = await axios.post(`${apiUrl}/token/verify/`, { token });
    return res.status === 200;
  } catch (error) {
    console.error('Token 验证失败:', error);
    return false;
  }
};

// 定义清除令牌并退出登录的函数
const cleanToken = () => {
  localStorage.removeItem("access");
  localStorage.removeItem("username");
  document.cookie = 'csrftoken=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
  document.cookie = 'sessionid=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
  username.value = "未登录";
  router.push("/login");
};

// 定义用户中心跳转的函数
const user = () => {
  if (!localStorage.getItem("access") || !localStorage.getItem("username")) {
    router.push("/login");
  } else {
    router.push("/trans");
  }
};

// 在组件挂载时验证令牌
onMounted(async () => {
  const accessToken = localStorage.getItem("access");
  if (accessToken) {
    const isValid = await verifyToken(accessToken);
    if (!isValid) {
      cleanToken();
    } else {
      // 如果令牌有效，确保用户名显示正确
      username.value = localStorage.getItem("username") || "未登录";
    }
  } else {
    username.value = "未登录";
  }
});
watchEffect(() => {
  const interval = setInterval(() => {
    const storedUsername = localStorage.getItem("username");
    if (storedUsername !== username.value) {
      username.value = storedUsername || "未登录";
    }
  }, 1000); // 检查更新的频率（这里是每秒一次）

  return () => {
    clearInterval(interval); // 组件卸载时清理计时器
  };
});

// 处理菜单选择事件（可选）
const handleSelect = (key: string, keyPath: string[]) => {
  // 你可以在这里添加自定义逻辑
};
</script>

<style>
.link.no-underline {
  text-decoration: none;
}

.flex-grow {
  flex-grow: 1;
}

.no-left-padding {
  padding-left: 0px;
}

.help-link {
  display: block;
  height: 100%;
  width: 100%;
  color: inherit;
  text-decoration: none;
}
</style>
