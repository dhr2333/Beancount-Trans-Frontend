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
      <template #title>设置</template>
      <router-link to="" class="no-underline"><el-menu-item index="">个人中心</el-menu-item></router-link>
      <router-link to="http://127.0.0.1:8002/api-auth/logout/" class="no-underline"><el-menu-item
          index="http://127.0.0.1:8002/api-auth/logout/">退出登录</el-menu-item></router-link>
    </el-sub-menu>
  </el-menu>
</template>

<script lang="ts" setup>
const handleSelect = (key: string, keyPath: string[]) => {
  console.log(key, keyPath)
}
</script>

<style>
.link.no-underline {
  text-decoration: none;
}

.flex-grow {
  flex-grow: 1;
}
</style>