<template>
  <el-menu class="el-menu-demo" mode="horizontal" :ellipsis="false" @select="handleSelect">
    <el-menu-item index="/account"><el-link href="http://127.0.0.1:5000">我的账本</el-link></el-menu-item>
    <router-link to="/trans" class="no-underline"><el-menu-item index="/trans">格式转换</el-menu-item></router-link>

    <el-sub-menu index="map">
      <template #title>映射管理</template>
      <router-link to="/map/expenses" class="no-underline"><el-menu-item
          index="/map/expense">支出映射</el-menu-item></router-link>
      <router-link to="/map/income" class="no-underline"><el-menu-item
          index="/map/income">收入映射</el-menu-item></router-link>
      <router-link to="/map/assets" class="no-underline"><el-menu-item
          index="/map/assets">资产映射</el-menu-item></router-link>
      <!-- <router-link to="/map/Liabilities" class="no-underline"><el-menu-item
          index="/map/Liabilities">负债映射</el-menu-item></router-link> -->
    </el-sub-menu>
    <el-sub-menu index="bill">
      <template #title>账单管理</template>
      <router-link to="/bill/account" class="no-underline"><el-menu-item
          index="/bill/account">账户管理</el-menu-item></router-link>
      <router-link to="/bill/event" class="no-underline"><el-menu-item
          index="/bill/event">事件管理</el-menu-item></router-link>
      <router-link to="/bill/commodity" class="no-underline"><el-menu-item
          index="/bill/commodity">通货管理</el-menu-item></router-link>
    </el-sub-menu>
    <router-link to="/assets/account" class="no-underline"><el-menu-item
        index="/account">资产总表</el-menu-item></router-link>
    <div class="flex-grow" />
    <el-menu-item>
      <el-link href="https://github.com/dhr2333/Beancount-Trans" target="_blank">
        <img src="/assets/github-logo.png" alt="GitHub Logo" style="width: 30px;">
        <!-- <i class="el-icon-github"></i> GitHub -->
      </el-link>
    </el-menu-item>
    <el-sub-menu index="manager">
      <template #title>{{ username }}</template>
      <router-link to="" class="no-underline"><el-menu-item index="" @click="user()">个人中心</el-menu-item></router-link>
      <el-menu-item index="logout" @click="cleanToken">退出登录</el-menu-item>
    </el-sub-menu>
  </el-menu>
</template>

<script lang="ts" setup>
// import axios from 'axios'
import { computed, ref, onMounted, watch, watchEffect } from 'vue'
import router from '~/routers'
import axios from '../../utils/request'

const handleSelect = (key: string, keyPath: string[]) => {
  console.log(key, keyPath)
}
// const decodeJWT = (token: string) => {
//   const base64Url = token.split('.')[1]
//   const base64 = base64Url.replace('-', '+').replace('_', '/')
//   return JSON.parse(window.atob(base64))
// }
// const getUserId = () => {
//   const token = localStorage.getItem('token')
//   if (token) {
//     const user = decodeJWT(token)
//     return user.user_id
//   }
//   return null
// }
// computed(() => {
//   getUserId()
//   getUser()
// })
const username = ref<string | null>(null)

// export async function getUser() {
//   try {
//     const response = await axios.get("expense/");
//     const username = localStorage.getItem('username');
//     return username;
//   } catch (error: any) {
//     console.error(error);
//     return "未登录";
//   }
// }

const getUser = async () => {
  try {
    const tokenExpiration: number = parseInt(localStorage.getItem('exp') || '0');
    const currentTimestamp: number = Math.floor(Date.now() / 1000);
    if (currentTimestamp <= tokenExpiration && localStorage.getItem('username')) {
      username.value = localStorage.getItem('username');
    }
    else {
      username.value = "未登录";
    }
  } catch (error: any) {
    console.error(error);
    username.value = "未登录";
  }
};

// watchEffect(() => {
//   // 监听localStorage中的username变化，自动更新组件内的username值
//   username.value = localStorage.getItem('username') || '未登录1';
// });

// watch(() => localStorage.getItem('username'), () => {
//   getUser();
// });

const cleanToken = () => {
  localStorage.removeItem('token')
  localStorage.removeItem('username')
  username.value = "未登录";
  router.push('/login')
}
const user = () => {
  if (!localStorage.getItem('token') && !localStorage.getItem('username')) {
    router.push('/login')
  } else {
    router.push('/trans')
  }
}
onMounted(() => {
  getUser();
});

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
</style>