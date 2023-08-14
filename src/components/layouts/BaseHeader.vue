<template>
  <el-menu class="el-menu-demo" mode="horizontal" :ellipsis="false" @select="handleSelect">
    <el-menu-item index="/account"><el-link href="http://127.0.0.1:5000">我的账本</el-link></el-menu-item>
    <router-link to="/trans" class="no-underline"><el-menu-item index="/trans">格式转换</el-menu-item></router-link>

    <el-sub-menu index="map">
      <template #title>映射管理</template>
      <router-link to="/map/income" class="no-underline"><el-menu-item
          index="/map/income">收入映射</el-menu-item></router-link>
      <router-link to="/map/expense" class="no-underline"><el-menu-item
          index="/map/expense">支出映射</el-menu-item></router-link>
      <router-link to="/map/payee" class="no-underline"><el-menu-item index="/map/payee">商家映射</el-menu-item></router-link>
    </el-sub-menu>
    <el-sub-menu index="bill">
      <template #title>账单管理</template>
      <router-link to="/bill/event" class="no-underline"><el-menu-item
          index="/bill/event">事件管理</el-menu-item></router-link>
      <router-link to="/bill/commodity" class="no-underline"><el-menu-item
          index="/bill/commodity">通货管理</el-menu-item></router-link>
    </el-sub-menu>
    <router-link to="/assets/account" class="no-underline"><el-menu-item
        index="/account">资产总表</el-menu-item></router-link>

    <div class="flex-grow" />
    <el-sub-menu index="manager">
      <template #title>{{ getUser() }}</template>
      <router-link to="" class="no-underline"><el-menu-item index="" @click="user()">个人中心</el-menu-item></router-link>
      <el-menu-item index="logout" @click="cleanToken">退出登录</el-menu-item>
    </el-sub-menu>
  </el-menu>
</template>

<script lang="ts" setup>
import { computed } from 'vue'
import router from '~/routers'

const handleSelect = (key: string, keyPath: string[]) => {
  console.log(key, keyPath)
}
const decodeJWT = (token: string) => {
  const base64Url = token.split('.')[1]
  const base64 = base64Url.replace('-', '+').replace('_', '/')
  return JSON.parse(window.atob(base64))
}
const getUserId = () => {
  const token = localStorage.getItem('token')
  if (token) {
    const user = decodeJWT(token)
    return user.user_id
  }
  return null
}
computed(() => {
  getUserId()
  getUser()
})
const getUser = () => {
  if (!localStorage.getItem('token')) {
    return '未登录'
  } else {
    return localStorage.getItem('username')
  }
}
const cleanToken = () => {
  localStorage.removeItem('token')
  localStorage.removeItem('username')
}
const user = () => {
  if (!localStorage.getItem('token') && !localStorage.getItem('username')) {
    router.push('/login')
  } else {
    router.push('/trans')
  }
}
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