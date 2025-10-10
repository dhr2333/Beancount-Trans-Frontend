<template>
  <el-menu class="el-menu-demo" mode="horizontal" :ellipsis="false" @select="handleSelect">
    <el-sub-menu index="account">
      <template #title>账本管理</template>
      <el-menu-item index="platform-ledger" @click="openFavaInstance">
        平台账本
      </el-menu-item>
      <el-menu-item index="official-ledger"
        @click="openExternal('https://fava.pythonanywhere.com/example-beancount-file/income_statement/')">
        官方账本
      </el-menu-item>
      <!-- <el-link href="http://localhost:5000/" target="_blank" rel="noopener noreferrer" class="no-underline">
        <el-menu-item index="local-ledger">本地账本</el-menu-item>
      </el-link><br></br> -->
      <!-- <el-link href="https://beancount.dhr2333.cn/" target="_blank" rel="noopener noreferrer" class="no-underline">
        <el-menu-item index="system-ledger">系统账本</el-menu-item>
      </el-link><br></br> -->
      <!-- <el-link href="https://fava.pythonanywhere.com/example-beancount-file/income_statement/" target="_blank"
        rel="noopener noreferrer" class="no-underline">
        <el-menu-item index="official-ledger">官方账本</el-menu-item>
      </el-link> -->
    </el-sub-menu>

    <router-link to="/trans" class="no-underline">
      <el-menu-item index="/trans">格式转换</el-menu-item>
    </router-link>

    <router-link to="/file" class="no-underline">
      <el-menu-item index="/file">文件管理</el-menu-item>
    </router-link>

    <el-sub-menu index="template">
      <template #title>模板管理</template>
      <router-link to="/template/accounts" class="no-underline">
        <el-menu-item index="/template/accounts">账户模板</el-menu-item>
      </router-link>
      <router-link to="/template/mappings" class="no-underline">
        <el-menu-item index="/template/mappings">映射模板</el-menu-item>
      </router-link>
    </el-sub-menu>

    <el-sub-menu index="config">
      <template #title>配置管理</template>
      <router-link to="/config/mappings" class="no-underline">
        <el-menu-item index="/config/mappings">映射管理</el-menu-item>
      </router-link>
      <router-link to="/config/accounts" class="no-underline">
        <el-menu-item index="/config/accounts">账户管理</el-menu-item>
      </router-link>
      <router-link to="/config/tags" class="no-underline">
        <el-menu-item index="/config/tags">标签管理</el-menu-item>
      </router-link>
      <router-link to="/format" class="no-underline">
        <el-menu-item index="/format">格式化输出</el-menu-item>
      </router-link>
    </el-sub-menu>


    <!-- <el-sub-menu index="bill">
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
    </router-link> -->
    <div class="flex-grow" />

    <!-- 公告弹窗 -->
    <!-- <el-dialog v-model="announceVisible" title="最新公告 & 经验分享" close-on-click-modal="true" width="70%" top="5vh"
      :close-on-click-modal="false">
      <div v-loading="loading" element-loading-text="正在加载公告...">
        <template v-if="announcements.length > 0">
          <div v-for="item in announcements" :key="item.id" class="announce-item">
            <div class="announce-header">
              <h3 class="announce-title">{{ item.title }}</h3>
              <div class="announce-time">{{ formatTime(item.createTime) }}</div>
            </div>
            <div class="announce-content" v-html="item.content"></div>
          </div>
        </template>
        <div v-else class="empty-announce">
          <el-empty description="暂无最新公告" />
        </div>
      </div>
    </el-dialog> -->
    <!-- <el-menu-item index="announcement" @click="showAnnouncements"> <el-icon :size="26">
        <svg viewBox="0 0 1024 1024">
          <path
            d="M512 128c-212.8 0-384 171.2-384 384 0 132.8 67.2 249.6 170.4 318.4l-46.4 132.8 150.4-80c32 8 64 12.8 96 12.8 212.8 0 384-171.2 384-384S724.8 128 512 128z m0 704c-32 0-64-4.8-96-12.8l-88 46.4 33.6-96C280 763.2 224 649.6 224 512 224 299.2 356.8 160 512 160s288 139.2 288 352-128.8 352-288 352z">
          </path>
        </svg>
      </el-icon></el-menu-item> -->
    <!-- <el-menu-item>
      <el-popover placement="top-start" :width="200" trigger="hover">
        <template #reference>
          <img src="/images/openai-icon-2021x2048-4rpe5x7n.png" alt="Openai Logo" style="width: 30px" />
        </template>
        <p>基于gpt-3.5-turbo</p>
        <img src="/images/wechat-channel.jpg" alt="Wechat-Channel" style="max-width: 100%" slot="content" />
      </el-popover>
    </el-menu-item> -->
    <el-menu-item>
      <el-link href="https://github.com/dhr2333/Beancount-Trans" target="_blank"
        style="display: inline-flex; align-items: center;"> <img
          src="https://img.shields.io/github/stars/dhr2333/Beancount-Trans?style=social" alt="GitHub stars"
          style="height: 30px; margin-left: 6px; vertical-align: middle;" />
      </el-link>
    </el-menu-item>
    <el-sub-menu index="manager">
      <template #title>{{ username }}</template>
      <!-- <router-link to="" class="no-underline">
        <el-menu-item index="" @click="user()">个人中心</el-menu-item>
      </router-link> -->
      <el-menu-item>
        <a href="https://trans.dhr2333.cn/docs/quick-start" class="help-link" target="_blank">用户手册</a>
      </el-menu-item>
      <el-menu-item index="logout" @click="cleanToken">退出登录</el-menu-item>
    </el-sub-menu>
  </el-menu>
</template>

<script lang="ts" setup>
import { ref, onMounted, watchEffect } from "vue";
import axios from '../../utils/request'
import router from "~/routers";
import { ElMessage, ElLoading } from 'element-plus';

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

// 新增的公告相关代码
const announceVisible = ref(false)
const announcements = ref<Array<{ id: number; title: string; content: string; createTime: string }>>([])
const loading = ref(false)

// 只有点击事件才会触发显示
const showAnnouncements = async () => {
  // ...获取数据后手动设置为 true
  announceVisible.value = true
}

// 时间格式化函数
const formatTime = (timestamp: string) => {
  const date = new Date(timestamp)
  return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`
}

// 定义打开外部链接的函数
const openExternal = (url: string) => {
  window.open(url, '_blank', 'noopener,noreferrer');
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

// 临时测试数据
announcements.value = [{
  id: 1,
  title: "系统使用指南",
  content: "<ul><li>建议所有交易有优惠时尽量使用优惠</li><li>线下交易建议使用 \"微信+备注\" 的形式，如\"食物\"、\"停车\"、\"装修尾款 #DECORATION\"等</li><li>线上交易建议使用 \"支付宝\" (支付宝商业信息较全，但是转账备注信息在账单中无法体现)</li></li></ul>",
  createTime: "2025-03-18T16:12:11"
}]


const openFavaInstance = async () => {
  const loading = ElLoading.service({
    lock: true,
    text: '正在启动您的专属账本...',
  });

  try {
    const response = await axios.get('fava/', {
      headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` },
      withCredentials: true,
      // maxRedirects: 5,
    });

    console.log('Response:', response);

    if (response.status === 200 && response.request.responseURL) {
      // 确保使用完整的重定向URL
      const redirectPath = response.request.responseURL;
      const newUrl = new URL(redirectPath, window.location.origin);
      window.location.href = newUrl.toString();

    } else {
      throw new Error('未收到重定向响应');
    }
  } catch (error: any) {
    if (error.response && error.response.status === 401) {
      ElMessage.info('未认证，请登录后重试');
    }
  } finally {
    loading.close();
  }
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

/* 公告弹窗样式 */
.announce-item {
  padding: 20px;
  margin-bottom: 15px;
  border-radius: 8px;
  background: #f8f9fa;
  transition: all 0.3s;

  &:hover {
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
    transform: translateY(-2px);
  }

  .announce-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
  }

  .announce-title {
    margin: 0;
    color: #2c3e50;
    font-size: 1.1em;
  }

  .announce-time {
    color: #95a5a6;
    font-size: 0.9em;
  }

  .announce-content {
    line-height: 1.6;
    color: #34495e;

    /* 处理富文本内容样式 */
    & p {
      margin: 8px 0;
    }

    & ul {
      padding-left: 20px;
    }
  }
}

.empty-announce {
  padding: 40px 0;
}
</style>
