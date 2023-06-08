<script lang="ts" setup>
import { ref, getCurrentInstance } from 'vue';
import { toggleDark } from "~/composables";

</script>

<template>
  <el-menu class="el-menu-demo" mode="horizontal">
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
    <!-- <el-menu-item index="5" disabled>Info</el-menu-item> -->
    <el-menu-item h="full" @click="toggleDark()">
      <button class="border-none w-full bg-transparent cursor-pointer" style="height: var(--ep-menu-item-height)">
        <i inline-flex i="dark:ep-moon ep-sunny" />
      </button>
    </el-menu-item>
  </el-menu>
</template>

<style>
.link.no-underline {
  text-decoration: none;
}
</style>